"""
Logic tests — math and expected behavior between invoices.

Scenarios
---------
 1. اضافه  creates correct location quantities and FIFO price layers
 2. صرف   consumes FIFO, creates price details, updates quantities
 3. FIFO spanning — one withdrawal pulls from two price layers
 4. Price propagation — changing اضافه unit_price cascades to صرف
 5. Delete صرف  — restores location qty and FIFO layers
 6. Delete اضافه — reverses location qty and removes FIFO layers
 7. Warranty (أمانات) partial + full return tracking
 8. Booking (حجز) reserves without deducting physical inventory
 9. Invoice status workflow  draft → accreditation → confirmed
10. Transfer (تحويل) moves quantities between locations
11. Insufficient quantity — صرف fails when stock is too low
"""

import pytest

from src.services.invoice.invoice_service import InvoiceService
from src.repositories import UnitOfWork
from src.models import (
    Employee,
    Warehouse,
    ItemLocations,
    Prices,
    Invoice,
    InvoiceItem,
    InvoicePriceDetail,
    WarrantyReturn,
)
from src.api.invoices import propagate_fifo_price


# ---------------------------------------------------------------------------
# Payload helpers
# ---------------------------------------------------------------------------


def _addition(items: list[dict]) -> dict:
    return {"type": "اضافه", "items": items}


def _sales(items: list[dict]) -> dict:
    return {"type": "صرف", "items": items}


def _warranty(items: list[dict]) -> dict:
    return {"type": "أمانات", "items": items}


def _booking(items: list[dict], client: str = "TestClient") -> dict:
    return {"type": "حجز", "items": items, "client_name": client}


def _transfer(items: list[dict]) -> dict:
    return {"type": "تحويل", "items": items}


# ===========================================================================
# 1.  اضافه  — location quantities + FIFO price layers
# ===========================================================================


class TestAddition:
    """اضافه invoice creates locations and FIFO price layers correctly."""

    @pytest.mark.asyncio
    async def test_creates_locations_and_fifo_layers(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemA", "item_bar": "A001"}
        )
        await test_uow.session.flush()

        svc = InvoiceService(test_uow)
        r = await svc.create_invoice(
            _addition([
                {"item_name": "ItemA", "item_bar": "A001", "location": "raf1", "quantity": 10, "unit_price": 5.0},
                {"item_name": "ItemA", "item_bar": "A001", "location": "raf2", "quantity": 6,  "unit_price": 8.0},
            ]),
            test_user,
        )
        assert r.success is True
        inv = r.data["invoice"]

        # --- location quantities ---
        raf1 = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        raf2 = await test_uow.item_locations.get_by_item_and_location(item.id, "raf2")
        assert raf1.quantity == 10
        assert raf2.quantity == 6

        # --- FIFO price layers ---
        p_raf1 = await test_uow.prices.get_fifo_prices(item.id, "raf1")
        p_raf2 = await test_uow.prices.get_fifo_prices(item.id, "raf2")
        assert len(p_raf1) == 1
        assert p_raf1[0].quantity == 10
        assert p_raf1[0].unit_price == 5.0
        assert len(p_raf2) == 1
        assert p_raf2[0].quantity == 6
        assert p_raf2[0].unit_price == 8.0

        # --- invoice totals  (10×5 + 6×8 = 98) ---
        assert inv.total_amount == 98.0
        assert inv.residual == 98.0


# ===========================================================================
# 2.  صرف  — FIFO consumption + price details
# ===========================================================================


class TestWithdrawal:
    """صرف deducts inventory, creates InvoicePriceDetail, updates totals."""

    @pytest.mark.asyncio
    async def test_deducts_qty_and_creates_price_details(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemB", "item_bar": "B001"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        # addition: 20 @ 10.0
        add_r = await svc.create_invoice(
            _addition([
                {"item_name": "ItemB", "item_bar": "B001", "location": "raf1", "quantity": 20, "unit_price": 10.0},
            ]),
            test_user,
        )
        assert add_r.success
        add_inv = add_r.data["invoice"]

        # withdrawal: 7
        sale_r = await svc.create_invoice(
            _sales([
                {"item_name": "ItemB", "location": "raf1", "quantity": 7},
            ]),
            test_user,
        )
        assert sale_r.success
        sale_inv = sale_r.data["invoice"]

        # --- location: 20 − 7 = 13 ---
        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 13

        # --- FIFO layer remaining: 13 ---
        layer = await test_uow.prices.get_by_composite_key(add_inv.id, item.id, "raf1", 0)
        assert layer.quantity == 13

        # --- price details: 7 @ 10.0 = 70 ---
        details = await test_uow.price_details.get_by_invoice_and_item(sale_inv.id, item.id)
        assert len(details) == 1
        assert details[0].quantity == 7
        assert details[0].unit_price == 10.0
        assert details[0].subtotal == 70.0

        # --- invoice item ---
        inv_items = await test_uow.invoice_items.get_by_invoice(sale_inv.id)
        assert inv_items[0].quantity == 7
        assert inv_items[0].unit_price == 10.0
        assert inv_items[0].total_price == 70.0

        # --- invoice totals ---
        assert sale_inv.total_amount == 70.0
        assert sale_inv.residual == 70.0


# ===========================================================================
# 3.  FIFO spanning — one withdrawal crosses two price layers
# ===========================================================================


class TestFIFOSpanning:
    """Withdrawal that exhausts the first layer and partially consumes the second."""

    @pytest.mark.asyncio
    async def test_withdrawal_spans_two_layers(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemC", "item_bar": "C001"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        # layer 1: 5 @ 4.0
        r1 = await svc.create_invoice(
            _addition([
                {"item_name": "ItemC", "item_bar": "C001", "location": "raf1", "quantity": 5, "unit_price": 4.0},
            ]),
            test_user,
        )
        assert r1.success
        inv1 = r1.data["invoice"]

        # layer 2: 5 @ 10.0
        r2 = await svc.create_invoice(
            _addition([
                {"item_name": "ItemC", "item_bar": "C001", "location": "raf1", "quantity": 5, "unit_price": 10.0},
            ]),
            test_user,
        )
        assert r2.success
        inv2 = r2.data["invoice"]

        # location should be 10
        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 10

        # withdraw 8  →  5 @ 4.0  +  3 @ 10.0
        sale_r = await svc.create_invoice(
            _sales([
                {"item_name": "ItemC", "location": "raf1", "quantity": 8},
            ]),
            test_user,
        )
        assert sale_r.success
        sale_inv = sale_r.data["invoice"]

        # --- location: 10 − 8 = 2 ---
        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 2

        # --- layer 1 exhausted; layer 2 has 2 remaining ---
        active = await test_uow.prices.get_fifo_prices(item.id, "raf1")
        assert len(active) == 1
        assert active[0].invoice_id == inv2.id
        assert active[0].quantity == 2

        # --- two price-detail rows ---
        details = await test_uow.price_details.get_by_invoice_and_item(sale_inv.id, item.id)
        assert len(details) == 2
        # first layer consumed fully
        assert details[0].quantity == 5
        assert details[0].unit_price == 4.0
        assert details[0].subtotal == 20.0
        # second layer partially consumed
        assert details[1].quantity == 3
        assert details[1].unit_price == 10.0
        assert details[1].subtotal == 30.0

        # --- totals: 20 + 30 = 50; weighted unit_price = 50/8 = 6.25 ---
        assert sale_inv.total_amount == 50.0
        inv_items = await test_uow.invoice_items.get_by_invoice(sale_inv.id)
        assert inv_items[0].total_price == 50.0
        assert inv_items[0].unit_price == 6.25


# ===========================================================================
# 4.  Price propagation — اضافه unit_price change cascades downstream
# ===========================================================================


class TestPricePropagation:
    """Changing unit_price on an اضافه updates Prices, InvoicePriceDetail,
    InvoiceItem and Invoice on every downstream صرف that consumed from it."""

    @pytest.mark.asyncio
    async def test_unit_price_change_cascades_to_withdrawal(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemD", "item_bar": "D001"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        # addition: 10 @ 5.0
        add_r = await svc.create_invoice(
            _addition([
                {"item_name": "ItemD", "item_bar": "D001", "location": "raf1", "quantity": 10, "unit_price": 5.0},
            ]),
            test_user,
        )
        assert add_r.success
        add_inv = add_r.data["invoice"]

        # withdrawal: 6  →  6 × 5.0 = 30
        sale_r = await svc.create_invoice(
            _sales([
                {"item_name": "ItemD", "location": "raf1", "quantity": 6},
            ]),
            test_user,
        )
        assert sale_r.success
        sale_inv = sale_r.data["invoice"]
        assert sale_inv.total_amount == 30.0

        # --- propagate: 5.0 → 12.0 ---
        await propagate_fifo_price(test_uow, add_inv.id, item.id, "raf1", 0, 12.0)
        await test_uow.session.flush()

        # Prices layer
        layer = await test_uow.prices.get_by_composite_key(add_inv.id, item.id, "raf1", 0)
        assert layer.unit_price == 12.0

        # InvoicePriceDetail updated
        details = await test_uow.price_details.get_by_invoice_and_item(sale_inv.id, item.id)
        assert details[0].unit_price == 12.0
        assert details[0].subtotal == 72.0   # 6 × 12

        # InvoiceItem recalculated
        inv_items = await test_uow.invoice_items.get_by_invoice(sale_inv.id)
        assert inv_items[0].total_price == 72.0
        assert inv_items[0].unit_price == 12.0

        # Invoice totals recalculated (paid = 0)
        updated = await test_uow.invoices.get(sale_inv.id)
        assert updated.total_amount == 72.0
        assert updated.residual == 72.0

    @pytest.mark.asyncio
    async def test_propagation_spans_two_withdrawals(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        """Two صرف invoices consume from the same اضافه layer; price change
        must cascade to both."""
        item = await test_uow.warehouse.create(
            {"item_name": "ItemD2", "item_bar": "D002"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        # addition: 20 @ 5.0
        add_r = await svc.create_invoice(
            _addition([
                {"item_name": "ItemD2", "item_bar": "D002", "location": "raf1", "quantity": 20, "unit_price": 5.0},
            ]),
            test_user,
        )
        assert add_r.success
        add_inv = add_r.data["invoice"]

        # withdrawal A: 4
        sale_a = await svc.create_invoice(
            _sales([{"item_name": "ItemD2", "location": "raf1", "quantity": 4}]),
            test_user,
        )
        assert sale_a.success
        inv_a = sale_a.data["invoice"]

        # withdrawal B: 6
        sale_b = await svc.create_invoice(
            _sales([{"item_name": "ItemD2", "location": "raf1", "quantity": 6}]),
            test_user,
        )
        assert sale_b.success
        inv_b = sale_b.data["invoice"]

        # propagate 5.0 → 8.0
        await propagate_fifo_price(test_uow, add_inv.id, item.id, "raf1", 0, 8.0)
        await test_uow.session.flush()

        # Invoice A: 4 × 8 = 32
        updated_a = await test_uow.invoices.get(inv_a.id)
        assert updated_a.total_amount == 32.0

        # Invoice B: 6 × 8 = 48
        updated_b = await test_uow.invoices.get(inv_b.id)
        assert updated_b.total_amount == 48.0


# ===========================================================================
# 5.  Delete صرف  — restores location qty and FIFO layers
# ===========================================================================


class TestDeleteWithdrawal:
    """Deleting a صرف invoice adds quantities back and restores consumed
    FIFO price-layer quantities."""

    @pytest.mark.asyncio
    async def test_delete_sales_restores_everything(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemE", "item_bar": "E001"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        # addition: 15 @ 7.0
        add_r = await svc.create_invoice(
            _addition([
                {"item_name": "ItemE", "item_bar": "E001", "location": "raf1", "quantity": 15, "unit_price": 7.0},
            ]),
            test_user,
        )
        assert add_r.success
        add_inv = add_r.data["invoice"]

        # withdrawal: 9
        sale_r = await svc.create_invoice(
            _sales([
                {"item_name": "ItemE", "location": "raf1", "quantity": 9},
            ]),
            test_user,
        )
        assert sale_r.success
        sale_inv = sale_r.data["invoice"]

        # --- pre-delete state ---
        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 6          # 15 − 9
        layer = await test_uow.prices.get_by_composite_key(add_inv.id, item.id, "raf1", 0)
        assert layer.quantity == 6

        # --- delete صرف ---
        del_r = await svc.delete_invoice(sale_inv.id)
        assert del_r.success

        # location restored to 15
        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 15

        # FIFO layer restored to 15
        layer = await test_uow.prices.get_by_composite_key(add_inv.id, item.id, "raf1", 0)
        assert layer.quantity == 15


# ===========================================================================
# 6.  Delete اضافه — reverses location qty and removes FIFO layers
# ===========================================================================


class TestDeleteAddition:
    """Deleting an اضافه invoice subtracts its quantities from locations and
    removes the associated Prices rows."""

    @pytest.mark.asyncio
    async def test_delete_addition_reverses_inventory(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemF", "item_bar": "F001"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        # addition: 12 @ 3.0
        add_r = await svc.create_invoice(
            _addition([
                {"item_name": "ItemF", "item_bar": "F001", "location": "raf1", "quantity": 12, "unit_price": 3.0},
            ]),
            test_user,
        )
        assert add_r.success
        add_inv = add_r.data["invoice"]

        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 12

        # --- delete اضافه ---
        del_r = await svc.delete_invoice(add_inv.id)
        assert del_r.success

        # location reversed to 0
        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 0

        # FIFO layers removed
        layers = await test_uow.prices.get_fifo_prices(item.id, "raf1")
        assert len(layers) == 0


# ===========================================================================
# 7.  Warranty (أمانات) — partial + full return
# ===========================================================================


class TestWarrantyReturn:
    """أمانات deducts like صرف.  WarrantyReturn records track partial and
    full returns; location qty is restored incrementally."""

    @pytest.mark.asyncio
    async def test_partial_then_full_return(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemG", "item_bar": "G001"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        # addition: 20 @ 6.0
        await svc.create_invoice(
            _addition([
                {"item_name": "ItemG", "item_bar": "G001", "location": "raf1", "quantity": 20, "unit_price": 6.0},
            ]),
            test_user,
        )

        # warranty: take 10  →  deducts like صرف
        war_r = await svc.create_invoice(
            _warranty([
                {"item_name": "ItemG", "location": "raf1", "quantity": 10},
            ]),
            test_user,
        )
        assert war_r.success
        war_inv = war_r.data["invoice"]
        assert war_inv.type == "أمانات"

        # location: 20 − 10 = 10
        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 10

        # warranty cost: 10 × 6.0 = 60
        assert war_inv.total_amount == 60.0

        # --- partial return: 4 items ---
        test_uow.session.add(WarrantyReturn(
            warranty_invoice_id=war_inv.id,
            item_id=item.id,
            location="raf1",
            returned_quantity=4,
            returned_by_employee_id=test_user.id,
        ))
        await test_uow.item_locations.add_quantity(item.id, "raf1", 4)
        await test_uow.session.commit()

        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 14   # 10 + 4

        total_ret = await test_uow.warranty_returns.get_total_returned(
            war_inv.id, item.id, "raf1"
        )
        assert total_ret == 4

        # --- full return: remaining 6 ---
        test_uow.session.add(WarrantyReturn(
            warranty_invoice_id=war_inv.id,
            item_id=item.id,
            location="raf1",
            returned_quantity=6,
            returned_by_employee_id=test_user.id,
        ))
        await test_uow.item_locations.add_quantity(item.id, "raf1", 6)
        await test_uow.session.commit()

        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 20   # fully restored

        total_ret = await test_uow.warranty_returns.get_total_returned(
            war_inv.id, item.id, "raf1"
        )
        assert total_ret == 10   # == original warranty qty


# ===========================================================================
# 8.  Booking (حجز) — reserves without deducting physical inventory
# ===========================================================================


class TestBooking:
    """حجز creates a RentedItems record but leaves ItemLocations unchanged."""

    @pytest.mark.asyncio
    async def test_booking_preserves_inventory(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemH", "item_bar": "H001"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        # addition: 10
        await svc.create_invoice(
            _addition([
                {"item_name": "ItemH", "item_bar": "H001", "location": "raf1", "quantity": 10, "unit_price": 5.0},
            ]),
            test_user,
        )

        # booking: reserve 5
        book_r = await svc.create_invoice(
            _booking([
                {"item_name": "ItemH", "location": "raf1", "quantity": 5, "unit_price": 5.0},
            ]),
            test_user,
        )
        assert book_r.success
        book_inv = book_r.data["invoice"]

        # physical qty unchanged
        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 10

        # RentedItems created with correct status
        rented = await test_uow.rented_items.get_by_invoice(book_inv.id)
        assert len(rented) == 1
        assert rented[0].quantity == 5
        assert rented[0].status == "reserved"
        assert rented[0].customer_name == "TestClient"


# ===========================================================================
# 9.  Invoice status workflow
# ===========================================================================


class TestStatusWorkflow:
    """Status transitions: draft → accreditation → confirmed → error."""

    @pytest.mark.asyncio
    async def test_draft_to_accreditation_to_confirmed(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemI", "item_bar": "I001"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        r = await svc.create_invoice(
            _addition([
                {"item_name": "ItemI", "item_bar": "I001", "location": "raf1", "quantity": 5, "unit_price": 1.0},
            ]),
            test_user,
        )
        assert r.success
        inv = r.data["invoice"]
        assert inv.status == "draft"

        # draft → accreditation
        r1 = await svc.confirm_invoice(inv.id)
        assert r1.success is True
        assert r1.data["invoice"].status == "accreditation"

        # accreditation → confirmed
        r2 = await svc.confirm_invoice(inv.id)
        assert r2.success is True
        assert r2.data["invoice"].status == "confirmed"

        # confirmed → cannot confirm further
        r3 = await svc.confirm_invoice(inv.id)
        assert r3.success is False


# ===========================================================================
# 10.  Transfer (تحويل) — move qty between locations
# ===========================================================================


class TestTransfer:
    """تحويل deducts from source location and adds to destination."""

    @pytest.mark.asyncio
    async def test_transfer_moves_qty(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemJ", "item_bar": "J001"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        # addition: 10 in raf1
        await svc.create_invoice(
            _addition([
                {"item_name": "ItemJ", "item_bar": "J001", "location": "raf1", "quantity": 10, "unit_price": 2.0},
            ]),
            test_user,
        )

        # transfer: 4 from raf1 → raf2
        t_r = await svc.create_invoice(
            _transfer([
                {"item_name": "ItemJ", "location": "raf1", "quantity": 4, "new_location": "raf2"},
            ]),
            test_user,
        )
        assert t_r.success
        t_inv = t_r.data["invoice"]

        # raf1: 10 − 4 = 6
        raf1 = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert raf1.quantity == 6

        # raf2: 4
        raf2 = await test_uow.item_locations.get_by_item_and_location(item.id, "raf2")
        assert raf2.quantity == 4

        # transfer invoice carries no monetary value
        assert t_inv.total_amount == 0
        assert t_inv.residual == 0


# ===========================================================================
# 11.  Insufficient quantity — صرف fails when stock is too low
# ===========================================================================


class TestInsufficientQuantity:
    """صرف should fail with an error when requested qty > available qty
    and no booking invoices can cover the shortage."""

    @pytest.mark.asyncio
    async def test_withdrawal_fails_on_insufficient_stock(
        self, test_uow: UnitOfWork, test_user: Employee
    ):
        item = await test_uow.warehouse.create(
            {"item_name": "ItemK", "item_bar": "K001"}
        )
        await test_uow.session.flush()
        svc = InvoiceService(test_uow)

        # addition: only 3
        await svc.create_invoice(
            _addition([
                {"item_name": "ItemK", "item_bar": "K001", "location": "raf1", "quantity": 3, "unit_price": 5.0},
            ]),
            test_user,
        )

        # try to withdraw 5 — should fail
        r = await svc.create_invoice(
            _sales([
                {"item_name": "ItemK", "location": "raf1", "quantity": 5},
            ]),
            test_user,
        )
        assert r.success is False
        assert "quantity" in r.message.lower() or "available" in r.message.lower()

        # location unchanged
        loc = await test_uow.item_locations.get_by_item_and_location(item.id, "raf1")
        assert loc.quantity == 3
