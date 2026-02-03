"""Invoice service - handles invoice creation and business logic"""

from datetime import datetime
from typing import Any

from src.services.base import BaseService, ServiceResult
from src.repositories import UnitOfWork
from src.models import Employee, Invoice


class InvoiceService(BaseService):
    """Service for invoice operations"""

    # Invoice types that consume inventory (FIFO consumers)
    FIFO_CONSUMER_TYPES = ["صرف", "توالف", "أمانات"]

    # Invoice types that add inventory
    INVENTORY_ADD_TYPES = ["اضافه", "مرتجع"]

    # Map permissions to invoice types
    PERMISSION_MAP = {
        "view_additions": "اضافه",
        "view_withdrawals": "صرف",
        "view_returns": "مرتجع",
        "view_damages": "توالف",
        "view_deposits": "امانات",
        "view_reservations": "حجز",
        "view_purchase_requests": "طلب شراء",
        "view_transfers": "تحويل",
    }

    async def create_invoice(
        self,
        data: dict,
        employee: Employee,
    ) -> ServiceResult:
        """
        Create a new invoice based on type.
        Routes to specific operation handlers.
        """
        invoice_type = data.get("type")

        # Get machine and mechanism for non-addition/transfer types
        machine = None
        mechanism = None

        if invoice_type not in ["اضافه", "تحويل"]:
            if data.get("machine_name"):
                machine = await self.uow.machines.get_by_name(data["machine_name"])
                if not machine:
                    return ServiceResult.not_found(f"Machine '{data['machine_name']}' not found")

            if data.get("mechanism_name"):
                mechanism = await self.uow.mechanisms.get_by_name(data["mechanism_name"])
                if not mechanism:
                    return ServiceResult.not_found(f"Mechanism '{data['mechanism_name']}' not found")

        # Route to specific operation handler based on type
        if invoice_type == "صرف":
            return await self._process_sales(data, machine, mechanism, employee)
        elif invoice_type == "اضافه":
            return await self._process_purchase(data, machine, mechanism, employee)
        elif invoice_type == "أمانات":
            return await self._process_warranty(data, machine, mechanism, employee)
        elif invoice_type == "مرتجع":
            return await self._process_return(data, machine, mechanism, employee)
        elif invoice_type == "توالف":
            return await self._process_void(data, machine, mechanism, employee)
        elif invoice_type == "حجز":
            return await self._process_booking(data, machine, mechanism, employee)
        elif invoice_type == "طلب شراء":
            return await self._process_purchase_request(data, machine, mechanism, employee)
        elif invoice_type == "تحويل":
            return await self._process_transfer(data, machine, mechanism, employee)
        else:
            return ServiceResult.error(f"Invalid invoice type: {invoice_type}")

    async def _create_base_invoice(
        self,
        data: dict,
        machine: Any,
        mechanism: Any,
        employee: Employee,
    ) -> Invoice:
        """Create base invoice object"""
        invoice_data = {
            "type": data["type"],
            "client_name": data.get("client_name"),
            "warehouse_manager": data.get("warehouse_manager"),
            "accreditation_manager": data.get("accreditation_manager"),
            "total_amount": 0,
            "paid": data.get("paid", 0),
            "residual": 0,
            "comment": data.get("comment"),
            "status": "draft",
            "employee_name": data.get("employee_name") or employee.username,
            "employee_id": employee.id,
            "machine_id": machine.id if machine else None,
            "mechanism_id": mechanism.id if mechanism else None,
            "payment_method": data.get("payment_method"),
            "custody_person": data.get("custody_person"),
        }
        return await self.uow.invoices.create(invoice_data)

    async def _process_sales(
        self,
        data: dict,
        machine: Any,
        mechanism: Any,
        employee: Employee,
    ) -> ServiceResult:
        """
        Process sales invoice (صرف).
        Uses FIFO pricing and deducts from inventory.
        """
        try:
            # Create base invoice
            invoice = await self._create_base_invoice(data, machine, mechanism, employee)
            await self.uow.session.flush()

            item_ids = []
            total_invoice_amount = 0.0

            for item_data in data.get("items", []):
                # Get warehouse item (try barcode first, then name)
                warehouse_item = None
                barcode = item_data.get("barcode") or item_data.get("item_bar")
                if barcode:
                    warehouse_item = await self.uow.warehouse.get_by_barcode(barcode)
                if not warehouse_item and item_data.get("item_name"):
                    warehouse_item = await self.uow.warehouse.get_by_name(item_data["item_name"])
                if not warehouse_item:
                    return ServiceResult.not_found(
                        f"Item '{item_data.get('item_name') or barcode}' not found in warehouse"
                    )

                # Get location
                item_location = await self.uow.item_locations.get_by_item_and_location(
                    warehouse_item.id, item_data["location"]
                )
                if not item_location:
                    return ServiceResult.not_found(
                        f"Item '{item_data['item_name']}' not found in location '{item_data['location']}'"
                    )

                # Check for duplicates
                if (warehouse_item.id, item_data["location"]) in item_ids:
                    return ServiceResult.error(
                        f"Item '{item_data['item_name']}' already added to invoice"
                    )
                item_ids.append((warehouse_item.id, item_data["location"]))

                # Check quantity and handle booking deductions if needed
                requested_quantity = item_data["quantity"]
                main_available = item_location.quantity
                borrowed_from_bookings = 0
                booking_deduction_info = None

                if main_available < requested_quantity:
                    # Try to supplement from booking invoices (best-effort)
                    shortage = requested_quantity - main_available
                    deduction_result = await self._deduct_from_bookings(
                        warehouse_item.id,
                        shortage,
                        invoice.id,
                        warehouse_item.item_name,
                    )

                    if deduction_result["success"]:
                        borrowed_from_bookings = deduction_result["total_deducted"]
                        booking_deduction_info = deduction_result["deductions"]

                    total_available = main_available + borrowed_from_bookings
                    if total_available < requested_quantity:
                        return ServiceResult.error(
                            f"Not enough quantity for item '{item_data.get('item_name') or item_data.get('item_bar')}' "
                            f"in location '{item_data['location']}'. "
                            f"Available: {total_available}, Requested: {requested_quantity}"
                        )

                # Deduct from main warehouse
                actual_from_main = min(requested_quantity, main_available)
                item_location.quantity -= actual_from_main

                # Process FIFO pricing
                fifo_result = await self._process_fifo_pricing(
                    invoice.id,
                    warehouse_item.id,
                    item_data["location"],
                    actual_from_main,
                    borrowed_from_bookings,
                    booking_deduction_info,
                )

                if not fifo_result["success"]:
                    return ServiceResult.error(fifo_result["message"])

                fifo_total = fifo_result["total"]
                effective_unit_price = (
                    round(fifo_total / requested_quantity, 3)
                    if requested_quantity > 0
                    else 0
                )

                # Create invoice item
                description_parts = [item_data.get("description", "")]
                if borrowed_from_bookings > 0:
                    description_parts.append(
                        f"Deducted {borrowed_from_bookings} from booking invoices"
                    )

                await self.uow.invoice_items.create({
                    "invoice_id": invoice.id,
                    "item_id": warehouse_item.id,
                    "quantity": requested_quantity,
                    "location": item_data["location"],
                    "unit_price": effective_unit_price,
                    "total_price": round(fifo_total, 3),
                    "description": " | ".join(filter(None, description_parts)),
                    "supplier_id": item_data.get("supplier_id", 0),
                    "supplier_name": item_data.get("supplier_name"),
                })

                total_invoice_amount += fifo_total

            # Update invoice totals
            invoice.total_amount = round(total_invoice_amount, 3)
            invoice.residual = round(total_invoice_amount - (invoice.paid or 0), 3)

            await self.uow.commit()

            # Fetch complete invoice for response
            complete_invoice = await self.uow.invoices.get_with_items(invoice.id)
            return ServiceResult.created(data={"invoice": complete_invoice})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error processing sale: {str(e)}", 500)

    async def _process_purchase(
        self,
        data: dict,
        machine: Any,
        mechanism: Any,
        employee: Employee,
    ) -> ServiceResult:
        """
        Process purchase/addition invoice (اضافه).
        Adds inventory and creates price records.
        """
        try:
            invoice = await self._create_base_invoice(data, machine, mechanism, employee)
            await self.uow.session.flush()

            total_invoice_amount = 0.0

            for item_data in data.get("items", []):
                # Get or create warehouse item
                warehouse_item = await self.uow.warehouse.get_by_barcode(
                    item_data.get("barcode", item_data.get("item_bar", ""))
                )

                if not warehouse_item:
                    # Create new warehouse item
                    warehouse_item = await self.uow.warehouse.create({
                        "item_name": item_data["item_name"],
                        "item_bar": item_data.get("barcode", item_data.get("item_bar", "")),
                    })
                    await self.uow.session.flush()

                # Add to location
                await self.uow.item_locations.add_quantity(
                    warehouse_item.id,
                    item_data["location"],
                    item_data["quantity"],
                )

                # Create price record for FIFO
                unit_price = item_data.get("unit_price", 0)
                total_price = item_data.get("total_price", unit_price * item_data["quantity"])

                await self.uow.prices.create({
                    "invoice_id": invoice.id,
                    "item_id": warehouse_item.id,
                    "location": item_data["location"],
                    "supplier_id": item_data.get("supplier_id", 0),
                    "quantity": item_data["quantity"],
                    "unit_price": unit_price,
                })

                # Create invoice item
                await self.uow.invoice_items.create({
                    "invoice_id": invoice.id,
                    "item_id": warehouse_item.id,
                    "quantity": item_data["quantity"],
                    "location": item_data["location"],
                    "unit_price": unit_price,
                    "total_price": total_price,
                    "description": item_data.get("description"),
                    "supplier_id": item_data.get("supplier_id", 0),
                    "supplier_name": item_data.get("supplier_name"),
                })

                total_invoice_amount += total_price

            # Update invoice totals
            invoice.total_amount = round(total_invoice_amount, 3)
            invoice.residual = round(total_invoice_amount - (invoice.paid or 0), 3)

            await self.uow.commit()

            complete_invoice = await self.uow.invoices.get_with_items(invoice.id)
            return ServiceResult.created(data={"invoice": complete_invoice})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error processing purchase: {str(e)}", 500)

    async def _process_warranty(
        self,
        data: dict,
        machine: Any,
        mechanism: Any,
        employee: Employee,
    ) -> ServiceResult:
        """
        Process warranty invoice (أمانات).
        Similar to sales but tracks warranty returns.
        """
        # Warranty uses same logic as sales (FIFO consumption)
        return await self._process_sales(data, machine, mechanism, employee)

    async def _process_return(
        self,
        data: dict,
        machine: Any,
        mechanism: Any,
        employee: Employee,
    ) -> ServiceResult:
        """
        Process return invoice (مرتجع).
        Returns items to inventory.
        """
        try:
            invoice = await self._create_base_invoice(data, machine, mechanism, employee)
            await self.uow.session.flush()

            total_invoice_amount = 0.0

            for item_data in data.get("items", []):
                warehouse_item = await self.uow.warehouse.get_by_name(item_data["item_name"])
                if not warehouse_item:
                    return ServiceResult.not_found(
                        f"Item '{item_data['item_name']}' not found in warehouse"
                    )

                # Add quantity back to location
                await self.uow.item_locations.add_quantity(
                    warehouse_item.id,
                    item_data["location"],
                    item_data["quantity"],
                )

                # Create invoice item
                unit_price = item_data.get("unit_price", 0)
                total_price = item_data.get("total_price", unit_price * item_data["quantity"])

                await self.uow.invoice_items.create({
                    "invoice_id": invoice.id,
                    "item_id": warehouse_item.id,
                    "quantity": item_data["quantity"],
                    "location": item_data["location"],
                    "unit_price": unit_price,
                    "total_price": total_price,
                    "description": item_data.get("description"),
                    "supplier_id": item_data.get("supplier_id", 0),
                    "supplier_name": item_data.get("supplier_name"),
                })

                # Also add back to prices for FIFO
                await self.uow.prices.create({
                    "invoice_id": invoice.id,
                    "item_id": warehouse_item.id,
                    "location": item_data["location"],
                    "supplier_id": item_data.get("supplier_id", 0),
                    "quantity": item_data["quantity"],
                    "unit_price": unit_price,
                })

                total_invoice_amount += total_price

            # Link to original sales invoice if provided
            if data.get("original_invoice_id"):
                await self.uow.return_sales.create({
                    "sales_invoice_id": data["original_invoice_id"],
                    "return_invoice_id": invoice.id,
                })

            invoice.total_amount = round(total_invoice_amount, 3)
            invoice.residual = round(total_invoice_amount - (invoice.paid or 0), 3)

            await self.uow.commit()

            complete_invoice = await self.uow.invoices.get_with_items(invoice.id)
            return ServiceResult.created(data={"invoice": complete_invoice})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error processing return: {str(e)}", 500)

    async def _process_void(
        self,
        data: dict,
        machine: Any,
        mechanism: Any,
        employee: Employee,
    ) -> ServiceResult:
        """
        Process void/damage invoice (توالف).
        Similar to sales - removes from inventory using FIFO.
        """
        return await self._process_sales(data, machine, mechanism, employee)

    async def _process_booking(
        self,
        data: dict,
        machine: Any,
        mechanism: Any,
        employee: Employee,
    ) -> ServiceResult:
        """
        Process booking/reservation invoice (حجز).
        Reserves items without removing from physical inventory.
        """
        try:
            invoice = await self._create_base_invoice(data, machine, mechanism, employee)
            await self.uow.session.flush()

            total_invoice_amount = 0.0

            for item_data in data.get("items", []):
                warehouse_item = await self.uow.warehouse.get_by_name(item_data["item_name"])
                if not warehouse_item:
                    return ServiceResult.not_found(
                        f"Item '{item_data['item_name']}' not found in warehouse"
                    )

                # Check availability
                item_location = await self.uow.item_locations.get_by_item_and_location(
                    warehouse_item.id, item_data["location"]
                )
                if not item_location or item_location.quantity < item_data["quantity"]:
                    available = item_location.quantity if item_location else 0
                    return ServiceResult.error(
                        f"Not enough quantity for item '{item_data['item_name']}'. "
                        f"Available: {available}, Requested: {item_data['quantity']}"
                    )

                unit_price = item_data.get("unit_price", 0)
                total_price = item_data.get("total_price", unit_price * item_data["quantity"])

                # Create invoice item
                await self.uow.invoice_items.create({
                    "invoice_id": invoice.id,
                    "item_id": warehouse_item.id,
                    "quantity": item_data["quantity"],
                    "location": item_data["location"],
                    "unit_price": unit_price,
                    "total_price": total_price,
                    "description": item_data.get("description"),
                })

                # Create rented item record
                await self.uow.rented_items.create({
                    "rental_invoice_id": invoice.id,
                    "item_id": warehouse_item.id,
                    "quantity": item_data["quantity"],
                    "unit_price": unit_price,
                    "total_price": total_price,
                    "status": "reserved",
                    "customer_name": data.get("client_name", ""),
                    "customer_phone": data.get("customer_phone"),
                    "customer_id_number": data.get("customer_id_number"),
                    "expected_return_date": data.get("expected_return_date"),
                })

                total_invoice_amount += total_price

            invoice.total_amount = round(total_invoice_amount, 3)
            invoice.residual = round(total_invoice_amount - (invoice.paid or 0), 3)

            await self.uow.commit()

            complete_invoice = await self.uow.invoices.get_with_items(invoice.id)
            return ServiceResult.created(data={"invoice": complete_invoice})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error processing booking: {str(e)}", 500)

    async def _process_purchase_request(
        self,
        data: dict,
        machine: Any,
        mechanism: Any,
        employee: Employee,
    ) -> ServiceResult:
        """
        Process purchase request invoice (طلب شراء).
        Creates a purchase request without affecting inventory.
        """
        try:
            invoice = await self._create_base_invoice(data, machine, mechanism, employee)
            await self.uow.session.flush()

            total_invoice_amount = 0.0

            for item_data in data.get("items", []):
                warehouse_item = await self.uow.warehouse.get_by_name(item_data["item_name"])
                if not warehouse_item:
                    return ServiceResult.not_found(
                        f"Item '{item_data['item_name']}' not found in warehouse"
                    )

                unit_price = item_data.get("unit_price", 0)
                total_price = item_data.get("total_price", unit_price * item_data["quantity"])

                # Create invoice item
                await self.uow.invoice_items.create({
                    "invoice_id": invoice.id,
                    "item_id": warehouse_item.id,
                    "quantity": item_data["quantity"],
                    "location": item_data.get("location", "N/A"),
                    "unit_price": unit_price,
                    "total_price": total_price,
                    "description": item_data.get("description"),
                })

                # Create purchase request record
                await self.uow.purchase_requests.create({
                    "invoice_id": invoice.id,
                    "item_id": warehouse_item.id,
                    "requested_quantity": item_data["quantity"],
                    "status": "pending",
                    "machine_id": machine.id if machine else None,
                    "mechanism_id": mechanism.id if mechanism else None,
                    "employee_id": employee.id,
                    "subtotal": total_price,
                })

                total_invoice_amount += total_price

            invoice.total_amount = round(total_invoice_amount, 3)
            invoice.residual = round(total_invoice_amount - (invoice.paid or 0), 3)

            await self.uow.commit()

            complete_invoice = await self.uow.invoices.get_with_items(invoice.id)
            return ServiceResult.created(data={"invoice": complete_invoice})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error processing purchase request: {str(e)}", 500)

    async def _process_transfer(
        self,
        data: dict,
        machine: Any,
        mechanism: Any,
        employee: Employee,
    ) -> ServiceResult:
        """
        Process transfer invoice (تحويل).
        Moves items between locations.
        """
        try:
            invoice = await self._create_base_invoice(data, machine, mechanism, employee)
            await self.uow.session.flush()

            for item_data in data.get("items", []):
                warehouse_item = await self.uow.warehouse.get_by_name(item_data["item_name"])
                if not warehouse_item:
                    return ServiceResult.not_found(
                        f"Item '{item_data['item_name']}' not found in warehouse"
                    )

                # Check source location
                source_location = await self.uow.item_locations.get_by_item_and_location(
                    warehouse_item.id, item_data["location"]
                )
                if not source_location or source_location.quantity < item_data["quantity"]:
                    available = source_location.quantity if source_location else 0
                    return ServiceResult.error(
                        f"Not enough quantity for item '{item_data['item_name']}' "
                        f"in source location '{item_data['location']}'. "
                        f"Available: {available}, Requested: {item_data['quantity']}"
                    )

                # Deduct from source
                source_location.quantity -= item_data["quantity"]

                # Add to destination
                new_location = item_data.get("new_location")
                if not new_location:
                    return ServiceResult.error(
                        f"New location required for transfer of '{item_data['item_name']}'"
                    )

                await self.uow.item_locations.add_quantity(
                    warehouse_item.id,
                    new_location,
                    item_data["quantity"],
                )

                # Create invoice item
                await self.uow.invoice_items.create({
                    "invoice_id": invoice.id,
                    "item_id": warehouse_item.id,
                    "quantity": item_data["quantity"],
                    "location": item_data["location"],
                    "new_location": new_location,
                    "unit_price": 0,
                    "total_price": 0,
                    "description": item_data.get("description"),
                })

            invoice.total_amount = 0
            invoice.residual = 0

            await self.uow.commit()

            complete_invoice = await self.uow.invoices.get_with_items(invoice.id)
            return ServiceResult.created(data={"invoice": complete_invoice})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error processing transfer: {str(e)}", 500)

    async def _deduct_from_bookings(
        self,
        item_id: int,
        shortage_quantity: int,
        deducted_invoice_id: int,
        item_name: str,
    ) -> dict:
        """
        Deduct from booking invoices when main warehouse is insufficient.
        Uses FIFO (oldest booking first).
        """
        try:
            # Find available booking invoices
            rental_items = await self.uow.rented_items.get_available_for_deduction(item_id)

            if not rental_items:
                return {
                    "success": False,
                    "message": f"No available booking invoices found for item '{item_name}'",
                }

            deductions = []
            remaining_shortage = shortage_quantity
            price_total = 0.0

            for rented_item in rental_items:
                if remaining_shortage <= 0:
                    break

                available = rented_item.quantity - (rented_item.borrowed_to_main_quantity or 0)
                if available <= 0:
                    continue

                qty_to_deduct = min(remaining_shortage, available)

                # Update RentedItems
                rented_item.borrowed_to_main_quantity = (
                    (rented_item.borrowed_to_main_quantity or 0) + qty_to_deduct
                )

                # Update booking invoice deduction status
                booking_invoice = await self.uow.invoices.get(rented_item.rental_invoice_id)
                if booking_invoice and booking_invoice.deduction_status is None:
                    booking_invoice.deduction_status = "minus"

                # Get price from booking invoice
                booking_item = await self.uow.invoice_items.get_by_invoice_and_item(
                    rented_item.rental_invoice_id, item_id
                )

                if not booking_item:
                    return {
                        "success": False,
                        "message": f"No price found for item in booking invoice #{rented_item.rental_invoice_id}",
                    }

                price_from_booking = booking_item.unit_price or 0

                # Record deduction
                await self.uow.booking_deductions.create({
                    "booking_invoice_id": rented_item.rental_invoice_id,
                    "deducted_invoice_id": deducted_invoice_id,
                    "item_id": item_id,
                    "quantity_deducted": qty_to_deduct,
                    "price_used": price_from_booking,
                })

                deductions.append({
                    "booking_invoice_id": rented_item.rental_invoice_id,
                    "quantity": qty_to_deduct,
                    "unit_price": price_from_booking,
                    "subtotal": qty_to_deduct * price_from_booking,
                })

                price_total += qty_to_deduct * price_from_booking
                remaining_shortage -= qty_to_deduct

            if remaining_shortage > 0:
                return {
                    "success": False,
                    "message": f"Insufficient stock for '{item_name}'. Still need {remaining_shortage} more units.",
                }

            return {
                "success": True,
                "deductions": deductions,
                "total_deducted": shortage_quantity - remaining_shortage,
                "price_total": price_total,
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Error deducting from bookings: {str(e)}",
            }

    async def _process_fifo_pricing(
        self,
        invoice_id: int,
        item_id: int,
        location: str,
        quantity_from_main: int,
        quantity_from_bookings: int,
        booking_deductions: list | None,
    ) -> dict:
        """
        Process FIFO pricing for sales/void/warranty operations.
        """
        try:
            fifo_total = 0.0

            # Process main warehouse quantity using FIFO
            if quantity_from_main > 0:
                price_entries = await self.uow.prices.get_fifo_prices(item_id, location)

                if not price_entries:
                    # Try getting prices from any location
                    price_entries = await self.uow.prices.get_by_item(item_id)

                if not price_entries:
                    return {
                        "success": False,
                        "message": f"No price information found for item",
                    }

                remaining = quantity_from_main
                for price_entry in price_entries:
                    if remaining <= 0:
                        break

                    if price_entry.quantity <= 0:
                        continue

                    qty_from_entry = min(remaining, price_entry.quantity)
                    subtotal = round(qty_from_entry * price_entry.unit_price, 3)

                    # Create price detail record
                    await self.uow.price_details.create({
                        "invoice_id": invoice_id,
                        "item_id": item_id,
                        "source_price_invoice_id": price_entry.invoice_id,
                        "source_price_item_id": price_entry.item_id,
                        "source_price_location": price_entry.location,
                        "source_price_supplier_id": price_entry.supplier_id,
                        "quantity": qty_from_entry,
                        "unit_price": round(price_entry.unit_price, 3),
                        "subtotal": subtotal,
                    })

                    fifo_total += subtotal
                    remaining -= qty_from_entry
                    price_entry.quantity -= qty_from_entry

                if remaining > 0:
                    return {
                        "success": False,
                        "message": f"Insufficient priced inventory. Missing price data for {remaining} units.",
                    }

            # Add prices from booking deductions
            if quantity_from_bookings > 0 and booking_deductions:
                for deduction in booking_deductions:
                    fifo_total += deduction["subtotal"]

            return {
                "success": True,
                "total": round(fifo_total, 3),
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Error processing FIFO pricing: {str(e)}",
            }

    async def confirm_invoice(self, invoice_id: int) -> ServiceResult:
        """Confirm an invoice (move through workflow states)"""
        invoice = await self.uow.invoices.get(invoice_id)
        if not invoice:
            return ServiceResult.not_found("Invoice not found")

        if invoice.status == "draft":
            invoice.status = "accreditation"
        elif invoice.status == "accreditation":
            invoice.status = "confirmed"
        else:
            return ServiceResult.error(f"Cannot confirm invoice with status '{invoice.status}'")

        await self.uow.commit()
        complete_invoice = await self.uow.invoices.get_with_items(invoice_id)
        return ServiceResult.ok(data={"invoice": complete_invoice})

    async def delete_invoice(self, invoice_id: int) -> ServiceResult:
        """Delete an invoice and restore inventory if needed"""
        invoice = await self.uow.invoices.get(invoice_id)
        if not invoice:
            return ServiceResult.not_found("Invoice not found")

        # Load items via repo to avoid stale relationship on cached invoice
        items = await self.uow.invoice_items.get_by_invoice(invoice_id)

        try:
            # Restore inventory based on invoice type
            if invoice.type in self.FIFO_CONSUMER_TYPES:
                await self._restore_sales_inventory(invoice, items)
            elif invoice.type in self.INVENTORY_ADD_TYPES:
                await self._reverse_purchase_inventory(invoice, items)

            await self.uow.invoices.delete(invoice)
            await self.uow.commit()
            return ServiceResult.ok(message="Invoice deleted successfully")

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error deleting invoice: {str(e)}", 500)

    async def _restore_sales_inventory(self, invoice: Invoice, items: list) -> None:
        """Restore inventory when deleting a sales/void/warranty invoice"""
        # Restore booking deductions
        deductions = await self.uow.booking_deductions.get_by_deducted_invoice(invoice.id)
        for deduction in deductions:
            rented_item = await self.uow.rented_items.get_by_invoice_and_item(
                deduction.booking_invoice_id, deduction.item_id
            )
            if rented_item:
                rented_item.borrowed_to_main_quantity -= deduction.quantity_deducted
            await self.uow.booking_deductions.delete(deduction)

        # Restore prices and quantities
        for item in items:
            # Restore quantity to location
            await self.uow.item_locations.add_quantity(
                item.item_id, item.location, item.quantity
            )

            # Restore FIFO price layers consumed by this invoice
            price_details = await self.uow.price_details.get_by_invoice_and_item(
                invoice.id, item.item_id
            )
            for detail in price_details:
                price_entry = await self.uow.prices.get_by_composite_key(
                    detail.source_price_invoice_id,
                    detail.source_price_item_id,
                    detail.source_price_location,
                    detail.source_price_supplier_id,
                )
                if price_entry:
                    price_entry.quantity += detail.quantity

    async def _reverse_purchase_inventory(self, invoice: Invoice, items: list) -> None:
        """Reverse inventory when deleting a purchase/return invoice"""
        for item in items:
            # Remove quantity from location
            location = await self.uow.item_locations.get_by_item_and_location(
                item.item_id, item.location
            )
            if location:
                location.quantity -= item.quantity

            # Remove price records
            await self.uow.prices.delete_by_invoice_and_item(invoice.id, item.item_id)
