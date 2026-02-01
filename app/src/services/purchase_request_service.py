"""Purchase request service - handles purchase request operations"""

from src.services.base import BaseService, ServiceResult
from src.repositories import UnitOfWork


class PurchaseRequestService(BaseService):
    """Service for purchase request operations"""

    async def get_pending_requests(self) -> ServiceResult:
        """Get all pending purchase requests"""
        try:
            requests = await self.uow.purchase_requests.get_by_status("pending")

            result = []
            for pr in requests:
                item = await self.uow.warehouse.get(pr.item_id)
                machine = await self.uow.machines.get(pr.machine_id) if pr.machine_id else None
                mechanism = (
                    await self.uow.mechanisms.get(pr.mechanism_id)
                    if pr.mechanism_id
                    else None
                )
                employee = await self.uow.users.get(pr.employee_id) if pr.employee_id else None

                result.append({
                    "id": pr.id,
                    "invoice_id": pr.invoice_id,
                    "item_id": pr.item_id,
                    "item_name": item.item_name if item else None,
                    "requested_quantity": pr.requested_quantity,
                    "status": pr.status,
                    "machine": machine.name if machine else None,
                    "mechanism": mechanism.name if mechanism else None,
                    "employee": employee.username if employee else None,
                    "subtotal": pr.subtotal,
                    "created_at": pr.created_at.isoformat() if pr.created_at else None,
                })

            return ServiceResult.ok(data={"requests": result})

        except Exception as e:
            return ServiceResult.error(f"Error getting pending requests: {str(e)}", 500)

    async def confirm_request(self, invoice_id: int) -> ServiceResult:
        """Confirm a purchase request invoice"""
        try:
            invoice = await self.uow.invoices.get(invoice_id)
            if not invoice:
                return ServiceResult.not_found("Invoice not found")

            if invoice.type != "طلب شراء":
                return ServiceResult.error("Invoice is not a purchase request")

            # Get and update all purchase requests for this invoice
            requests = await self.uow.purchase_requests.get_by_invoice(invoice_id)
            for req in requests:
                req.status = "confirmed"

            # Update invoice status
            invoice.status = "confirmed"

            await self.uow.commit()

            return ServiceResult.ok(message="Purchase request confirmed")

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error confirming request: {str(e)}", 500)

    async def reject_request(self, invoice_id: int, reason: str | None = None) -> ServiceResult:
        """Reject a purchase request invoice"""
        try:
            invoice = await self.uow.invoices.get(invoice_id)
            if not invoice:
                return ServiceResult.not_found("Invoice not found")

            if invoice.type != "طلب شراء":
                return ServiceResult.error("Invoice is not a purchase request")

            # Update all purchase requests for this invoice
            requests = await self.uow.purchase_requests.get_by_invoice(invoice_id)
            for req in requests:
                req.status = "rejected"

            # Update invoice status and add rejection reason
            invoice.status = "rejected"
            if reason:
                invoice.comment = (invoice.comment or "") + f" | Rejected: {reason}"

            await self.uow.commit()

            return ServiceResult.ok(message="Purchase request rejected")

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error rejecting request: {str(e)}", 500)

    async def convert_to_purchase(self, invoice_id: int, items_data: list[dict]) -> ServiceResult:
        """Convert confirmed purchase request to actual purchase"""
        try:
            invoice = await self.uow.invoices.get_with_items(invoice_id)
            if not invoice:
                return ServiceResult.not_found("Invoice not found")

            if invoice.type != "طلب شراء":
                return ServiceResult.error("Invoice is not a purchase request")

            if invoice.status != "confirmed":
                return ServiceResult.error("Purchase request must be confirmed first")

            # Get purchase requests
            requests = await self.uow.purchase_requests.get_by_invoice(invoice_id)
            if not requests:
                return ServiceResult.error("No purchase requests found for invoice")

            # Create purchase invoice
            purchase_invoice = await self.uow.invoices.create({
                "type": "اضافه",
                "status": "draft",
                "employee_id": invoice.employee_id,
                "employee_name": invoice.employee_name,
                "machine_id": invoice.machine_id,
                "mechanism_id": invoice.mechanism_id,
                "comment": f"Converted from purchase request #{invoice_id}",
            })
            await self.uow.session.flush()

            total_amount = 0.0

            for item_data in items_data:
                item_id = item_data.get("item_id")
                quantity = item_data.get("quantity", 0)
                unit_price = item_data.get("unit_price", 0)
                location = item_data.get("location", "MAIN")
                supplier_id = item_data.get("supplier_id", 0)
                supplier_name = item_data.get("supplier_name")

                total_price = quantity * unit_price

                # Add to warehouse
                await self.uow.item_locations.add_quantity(item_id, location, quantity)

                # Create price record
                await self.uow.prices.create({
                    "invoice_id": purchase_invoice.id,
                    "item_id": item_id,
                    "location": location,
                    "supplier_id": supplier_id,
                    "quantity": quantity,
                    "unit_price": unit_price,
                })

                # Create invoice item
                await self.uow.invoice_items.create({
                    "invoice_id": purchase_invoice.id,
                    "item_id": item_id,
                    "quantity": quantity,
                    "location": location,
                    "unit_price": unit_price,
                    "total_price": total_price,
                    "supplier_id": supplier_id,
                    "supplier_name": supplier_name,
                })

                total_amount += total_price

            purchase_invoice.total_amount = total_amount
            purchase_invoice.residual = total_amount

            # Mark purchase requests as fulfilled
            for req in requests:
                req.status = "fulfilled"

            await self.uow.commit()

            complete_invoice = await self.uow.invoices.get_with_items(purchase_invoice.id)
            return ServiceResult.created(
                data={"invoice": complete_invoice},
                message="Purchase request converted to purchase",
            )

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error converting to purchase: {str(e)}", 500)

    async def get_request_summary(self) -> ServiceResult:
        """Get summary of purchase requests by status"""
        try:
            pending = await self.uow.purchase_requests.get_by_status("pending")
            confirmed = await self.uow.purchase_requests.get_by_status("confirmed")
            rejected = await self.uow.purchase_requests.get_by_status("rejected")
            fulfilled = await self.uow.purchase_requests.get_by_status("fulfilled")

            return ServiceResult.ok(
                data={
                    "pending_count": len(pending),
                    "confirmed_count": len(confirmed),
                    "rejected_count": len(rejected),
                    "fulfilled_count": len(fulfilled),
                    "pending_value": sum(pr.subtotal or 0 for pr in pending),
                    "confirmed_value": sum(pr.subtotal or 0 for pr in confirmed),
                }
            )

        except Exception as e:
            return ServiceResult.error(f"Error getting summary: {str(e)}", 500)
