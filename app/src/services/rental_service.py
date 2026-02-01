"""Rental service - handles rental/booking operations"""

from datetime import datetime

from src.services.base import BaseService, ServiceResult
from src.repositories import UnitOfWork


class RentalService(BaseService):
    """Service for rental/booking operations"""

    async def update_rental_status(
        self,
        item_id: int,
        status: str,
        customer_name: str | None = None,
        customer_phone: str | None = None,
        customer_id_number: str | None = None,
        given_date: datetime | None = None,
        expected_return_date: datetime | None = None,
        actual_return_date: datetime | None = None,
    ) -> ServiceResult:
        """Update rental item status"""
        try:
            # Find the rented item
            items = await self.uow.rented_items.get_all_with_items(skip=0, limit=10000)
            target_item = None
            for item in items:
                if item.item_id == item_id:
                    target_item = item
                    break

            if not target_item:
                return ServiceResult.not_found("Rented item not found")

            # Build update data
            update_data = {"status": status}
            if customer_name:
                update_data["customer_name"] = customer_name
            if customer_phone:
                update_data["customer_phone"] = customer_phone
            if customer_id_number:
                update_data["customer_id_number"] = customer_id_number
            if given_date:
                update_data["given_date"] = given_date
            if expected_return_date:
                update_data["expected_return_date"] = expected_return_date
            if actual_return_date:
                update_data["actual_return_date"] = actual_return_date

            await self.uow.rented_items.update(target_item, update_data)
            await self.uow.commit()

            return ServiceResult.ok(data={"item": target_item.to_dict()})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error updating rental status: {str(e)}", 500)

    async def borrow_to_main(
        self,
        item_id: int,
        quantity: int,
    ) -> ServiceResult:
        """Borrow items from rental warehouse to main warehouse"""
        try:
            # Check rental warehouse availability
            rental_loc = await self.uow.rental_locations.get_by_item_and_location(item_id)
            if not rental_loc:
                return ServiceResult.not_found("Item not found in rental warehouse")

            if rental_loc.available_quantity < quantity:
                return ServiceResult.error(
                    f"Insufficient quantity in rental warehouse. "
                    f"Available: {rental_loc.available_quantity}, Requested: {quantity}"
                )

            # Update rental warehouse
            rental_loc.available_quantity -= quantity
            rental_loc.reserved_quantity += quantity

            # Add to main warehouse (default location)
            await self.uow.item_locations.add_quantity(item_id, "MAIN", quantity)

            await self.uow.commit()

            return ServiceResult.ok(
                data={
                    "item_id": item_id,
                    "quantity": quantity,
                },
                message=f"Borrowed {quantity} items to main warehouse",
            )

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error borrowing to main: {str(e)}", 500)

    async def return_items(
        self,
        item_id: int,
        quantity: int,
    ) -> ServiceResult:
        """Return items to rental warehouse"""
        try:
            # Update rental warehouse
            rental_loc = await self.uow.rental_locations.get_by_item_and_location(item_id)
            if rental_loc:
                rental_loc.quantity += quantity
                rental_loc.available_quantity += quantity
            else:
                await self.uow.rental_locations.add_quantity(item_id, quantity)

            await self.uow.commit()

            return ServiceResult.ok(
                data={
                    "item_id": item_id,
                    "quantity": quantity,
                },
                message=f"Returned {quantity} items",
            )

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error returning items: {str(e)}", 500)

    async def get_missing_quantity(self, invoice_id: int) -> ServiceResult:
        """Get booking deduction details for an invoice"""
        try:
            deductions = await self.uow.booking_deductions.get_by_booking_invoice(invoice_id)

            results = []
            for deduction in deductions:
                item = await self.uow.warehouse.get(deduction.item_id)
                results.append({
                    "booking_invoice_id": deduction.booking_invoice_id,
                    "item_id": deduction.item_id,
                    "item_name": item.item_name if item else None,
                    "original_quantity": deduction.quantity_deducted,
                    "borrowed_quantity": deduction.quantity_deducted,
                    "remaining_quantity": 0,
                })

            return ServiceResult.ok(data={"deductions": results})

        except Exception as e:
            return ServiceResult.error(f"Error getting missing quantity: {str(e)}", 500)

    async def give_rental_to_customer(
        self,
        rental_item_id: int,
        customer_name: str,
        customer_phone: str | None = None,
        customer_id_number: str | None = None,
        expected_return_date: datetime | None = None,
    ) -> ServiceResult:
        """Mark rental item as given to customer"""
        try:
            rented_item = await self.uow.rented_items.get(rental_item_id)
            if not rented_item:
                return ServiceResult.not_found("Rented item not found")

            if rented_item.status != "reserved":
                return ServiceResult.error(
                    f"Can only give reserved items. Current status: {rented_item.status}"
                )

            # Update status
            update_data = {
                "status": "given",
                "given_date": datetime.now(),
                "customer_name": customer_name,
            }

            if customer_phone:
                update_data["customer_phone"] = customer_phone
            if customer_id_number:
                update_data["customer_id_number"] = customer_id_number
            if expected_return_date:
                update_data["expected_return_date"] = expected_return_date

            await self.uow.rented_items.update(rented_item, update_data)

            # Deduct from main warehouse
            item_location = await self.uow.item_locations.get_by_item_and_location(
                rented_item.item_id, "MAIN"
            )
            if item_location and item_location.quantity >= rented_item.quantity:
                item_location.quantity -= rented_item.quantity

            await self.uow.commit()

            return ServiceResult.ok(
                data={"item": rented_item.to_dict()},
                message="Item given to customer",
            )

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error giving rental: {str(e)}", 500)

    async def receive_rental_return(
        self,
        rental_item_id: int,
        quantity_returned: int,
        notes: str | None = None,
    ) -> ServiceResult:
        """Process rental item return from customer"""
        try:
            rented_item = await self.uow.rented_items.get(rental_item_id)
            if not rented_item:
                return ServiceResult.not_found("Rented item not found")

            if rented_item.status != "given":
                return ServiceResult.error(
                    f"Can only return given items. Current status: {rented_item.status}"
                )

            if quantity_returned > rented_item.quantity:
                return ServiceResult.error(
                    f"Cannot return more than rented. "
                    f"Rented: {rented_item.quantity}, Returning: {quantity_returned}"
                )

            # Add back to main warehouse
            await self.uow.item_locations.add_quantity(
                rented_item.item_id, "MAIN", quantity_returned
            )

            # Update rental status
            if quantity_returned == rented_item.quantity:
                rented_item.status = "returned"
            else:
                rented_item.quantity -= quantity_returned

            rented_item.actual_return_date = datetime.now()
            if notes:
                rented_item.notes = notes

            await self.uow.commit()

            return ServiceResult.ok(
                data={"item": rented_item.to_dict()},
                message=f"Returned {quantity_returned} items",
            )

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error receiving return: {str(e)}", 500)

    async def get_overdue_rentals(self) -> ServiceResult:
        """Get all overdue rental items"""
        try:
            all_items = await self.uow.rented_items.get_all_with_items(skip=0, limit=10000)
            now = datetime.now()

            overdue = []
            for item in all_items:
                if (
                    item.status == "given"
                    and item.expected_return_date
                    and item.expected_return_date < now
                ):
                    days_overdue = (now - item.expected_return_date).days
                    overdue.append({
                        **item.to_dict(),
                        "days_overdue": days_overdue,
                    })

            return ServiceResult.ok(data={"overdue_items": overdue})

        except Exception as e:
            return ServiceResult.error(f"Error getting overdue rentals: {str(e)}", 500)
