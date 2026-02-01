"""Tests for invoice service"""

import pytest
import pytest_asyncio

from src.services.invoice import InvoiceService
from src.repositories import UnitOfWork
from src.models import Warehouse, Machine, Mechanism, Employee, Invoice


class TestInvoiceService:
    """Test cases for InvoiceService"""

    @pytest.mark.asyncio
    async def test_create_purchase_invoice(
        self,
        test_uow: UnitOfWork,
        test_user: Employee,
    ):
        """Test creating a purchase invoice"""
        service = InvoiceService(test_uow)

        # First create a warehouse item
        item = await test_uow.warehouse.create({
            "item_name": "Purchase Test Item",
            "item_bar": "PUR001",
        })
        await test_uow.session.flush()

        data = {
            "type": "اضافه",
            "items": [
                {
                    "item_name": "Purchase Test Item",
                    "barcode": "PUR001",
                    "location": "MAIN",
                    "quantity": 50,
                    "unit_price": 10.0,
                    "total_price": 500.0,
                }
            ],
        }

        result = await service.create_invoice(data, test_user)

        assert result.success is True
        assert result.status_code == 201
        assert result.data["invoice"] is not None

    @pytest.mark.asyncio
    async def test_create_sales_invoice(
        self,
        test_uow: UnitOfWork,
        test_user: Employee,
        sample_warehouse_item: Warehouse,
        sample_machine: Machine,
        sample_mechanism: Mechanism,
    ):
        """Test creating a sales invoice with FIFO pricing"""
        service = InvoiceService(test_uow)

        data = {
            "type": "صرف",
            "machine_name": sample_machine.name,
            "mechanism_name": sample_mechanism.name,
            "items": [
                {
                    "item_name": sample_warehouse_item.item_name,
                    "location": "MAIN",
                    "quantity": 10,
                }
            ],
        }

        result = await service.create_invoice(data, test_user)

        assert result.success is True
        assert result.status_code == 201

    @pytest.mark.asyncio
    async def test_create_sales_invoice_insufficient_stock(
        self,
        test_uow: UnitOfWork,
        test_user: Employee,
        sample_warehouse_item: Warehouse,
        sample_machine: Machine,
        sample_mechanism: Mechanism,
    ):
        """Test sales invoice with insufficient stock fails"""
        service = InvoiceService(test_uow)

        data = {
            "type": "صرف",
            "machine_name": sample_machine.name,
            "mechanism_name": sample_mechanism.name,
            "items": [
                {
                    "item_name": sample_warehouse_item.item_name,
                    "location": "MAIN",
                    "quantity": 9999,  # More than available
                }
            ],
        }

        result = await service.create_invoice(data, test_user)

        assert result.success is False
        # Error can be about insufficient stock, not enough quantity, or no booking invoices
        assert any(phrase in result.message for phrase in [
            "Not enough", "Insufficient", "No available booking", "not found"
        ])

    @pytest.mark.asyncio
    async def test_create_transfer_invoice(
        self,
        test_uow: UnitOfWork,
        test_user: Employee,
        sample_warehouse_item: Warehouse,
    ):
        """Test creating a transfer invoice"""
        service = InvoiceService(test_uow)

        data = {
            "type": "تحويل",
            "items": [
                {
                    "item_name": sample_warehouse_item.item_name,
                    "location": "MAIN",
                    "new_location": "WAREHOUSE_B",
                    "quantity": 10,
                }
            ],
        }

        result = await service.create_invoice(data, test_user)

        assert result.success is True
        assert result.status_code == 201

    @pytest.mark.asyncio
    async def test_confirm_invoice(
        self,
        test_uow: UnitOfWork,
        sample_invoice: Invoice,
    ):
        """Test confirming an invoice"""
        service = InvoiceService(test_uow)

        # First confirmation: draft -> accreditation
        result = await service.confirm_invoice(sample_invoice.id)

        assert result.success is True
        assert result.data["invoice"].status == "accreditation"

        # Second confirmation: accreditation -> confirmed
        result = await service.confirm_invoice(sample_invoice.id)

        assert result.success is True
        assert result.data["invoice"].status == "confirmed"

    @pytest.mark.asyncio
    async def test_confirm_invoice_not_found(self, test_uow: UnitOfWork):
        """Test confirming non-existent invoice"""
        service = InvoiceService(test_uow)

        result = await service.confirm_invoice(99999)

        assert result.success is False
        assert result.status_code == 404

    @pytest.mark.asyncio
    async def test_invalid_invoice_type(
        self,
        test_uow: UnitOfWork,
        test_user: Employee,
    ):
        """Test creating invoice with invalid type"""
        service = InvoiceService(test_uow)

        data = {
            "type": "invalid_type",
            "items": [],
        }

        result = await service.create_invoice(data, test_user)

        assert result.success is False
        assert "Invalid invoice type" in result.message

    @pytest.mark.asyncio
    async def test_machine_not_found(
        self,
        test_uow: UnitOfWork,
        test_user: Employee,
        sample_warehouse_item: Warehouse,
        sample_mechanism: Mechanism,
    ):
        """Test sales invoice with non-existent machine"""
        service = InvoiceService(test_uow)

        data = {
            "type": "صرف",
            "machine_name": "NonExistentMachine",
            "mechanism_name": sample_mechanism.name,
            "items": [
                {
                    "item_name": sample_warehouse_item.item_name,
                    "location": "MAIN",
                    "quantity": 5,
                }
            ],
        }

        result = await service.create_invoice(data, test_user)

        assert result.success is False
        assert "not found" in result.message.lower()
