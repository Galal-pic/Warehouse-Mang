"""Integration tests for invoice API endpoints"""

import pytest
import pytest_asyncio
from httpx import AsyncClient

from src.models import Invoice, Warehouse, Machine, Mechanism


class TestInvoiceAPI:
    """Test cases for invoice API endpoints"""

    @pytest.mark.asyncio
    async def test_list_invoices(self, authenticated_client: AsyncClient):
        """Test listing invoices"""
        response = await authenticated_client.get("/invoice/")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total_items" in data

    @pytest.mark.asyncio
    async def test_list_invoices_pagination(self, authenticated_client: AsyncClient):
        """Test invoice list pagination"""
        response = await authenticated_client.get(
            "/invoice/",
            params={"page": 1, "page_size": 5, "all": False},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 5

    @pytest.mark.asyncio
    async def test_get_last_id(self, authenticated_client: AsyncClient):
        """Test getting last invoice ID"""
        response = await authenticated_client.get("/invoice/last-id")

        assert response.status_code == 200
        data = response.json()
        assert "last_id" in data

    @pytest.mark.asyncio
    async def test_get_invoice(
        self, authenticated_client: AsyncClient, sample_invoice: Invoice
    ):
        """Test getting invoice by ID"""
        response = await authenticated_client.get(f"/invoice/{sample_invoice.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_invoice.id

    @pytest.mark.asyncio
    async def test_get_invoice_not_found(self, authenticated_client: AsyncClient):
        """Test getting non-existent invoice"""
        response = await authenticated_client.get("/invoice/99999")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_purchase_invoice(
        self,
        authenticated_client: AsyncClient,
        sample_warehouse_item: Warehouse,
    ):
        """Test creating a purchase invoice"""
        response = await authenticated_client.post(
            "/invoice/",
            json={
                "type": "اضافه",
                "items": [
                    {
                        "item_id": sample_warehouse_item.id,
                        "location": "MAIN",
                        "quantity": 50,
                        "unit_price": 10.0,
                        "total_price": 500.0,
                    }
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "اضافه"

    @pytest.mark.asyncio
    async def test_create_sales_invoice(
        self,
        authenticated_client: AsyncClient,
        sample_warehouse_item: Warehouse,
        sample_machine: Machine,
        sample_mechanism: Mechanism,
    ):
        """Test creating a sales invoice"""
        response = await authenticated_client.post(
            "/invoice/",
            json={
                "type": "صرف",
                "machine_id": sample_machine.id,
                "mechanism_id": sample_mechanism.id,
                "items": [
                    {
                        "item_id": sample_warehouse_item.id,
                        "location": "MAIN",
                        "quantity": 5,
                    }
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "صرف"

    @pytest.mark.asyncio
    async def test_update_invoice(
        self, authenticated_client: AsyncClient, sample_invoice: Invoice
    ):
        """Test updating an invoice"""
        response = await authenticated_client.put(
            f"/invoice/{sample_invoice.id}",
            json={
                "client_name": "Updated Client",
                "comment": "Updated comment",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["client_name"] == "Updated Client"
        assert data["comment"] == "Updated comment"

    @pytest.mark.asyncio
    async def test_confirm_invoice(
        self, authenticated_client: AsyncClient, sample_invoice: Invoice
    ):
        """Test confirming an invoice"""
        response = await authenticated_client.post(
            f"/invoice/{sample_invoice.id}/confirm"
        )

        assert response.status_code == 200
        data = response.json()
        # Draft -> accreditation
        assert data["status"] == "accreditation"

    @pytest.mark.asyncio
    async def test_delete_invoice(
        self, authenticated_client: AsyncClient, sample_invoice: Invoice
    ):
        """Test deleting an invoice"""
        response = await authenticated_client.delete(
            f"/invoice/{sample_invoice.id}"
        )

        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_list_invoices_by_type(self, authenticated_client: AsyncClient):
        """Test listing invoices by type"""
        response = await authenticated_client.get("/invoice/type/صرف")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    @pytest.mark.asyncio
    async def test_get_inventory_value(self, authenticated_client: AsyncClient):
        """Test getting inventory value"""
        response = await authenticated_client.get("/invoice/inventory-value")

        assert response.status_code == 200
        data = response.json()
        assert "total_value" in data
        assert "items" in data

    @pytest.mark.asyncio
    async def test_get_fifo_prices(
        self,
        authenticated_client: AsyncClient,
        sample_warehouse_item: Warehouse,
    ):
        """Test getting FIFO prices for an item"""
        response = await authenticated_client.get(
            f"/invoice/fifo-prices/{sample_warehouse_item.id}",
            params={"location": "MAIN"},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
