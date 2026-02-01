"""Notification background tasks"""

from datetime import datetime
from celery import shared_task


@shared_task
def send_low_stock_notification(item_id: int, item_name: str, current_qty: int, threshold: int):
    """Send notification for low stock items"""
    # In a real implementation, this would send email/SMS/push notification
    # For now, we'll just log it and return the notification data
    notification = {
        "type": "low_stock",
        "item_id": item_id,
        "item_name": item_name,
        "current_quantity": current_qty,
        "threshold": threshold,
        "message": f"Low stock alert: {item_name} has only {current_qty} units (threshold: {threshold})",
        "created_at": datetime.now().isoformat(),
        "severity": "warning" if current_qty > 0 else "critical",
    }

    # TODO: Implement actual notification sending
    # - Email via SMTP or SendGrid
    # - SMS via Twilio
    # - Push notification via Firebase

    return notification


@shared_task
def send_overdue_rental_notification(
    rental_id: int,
    item_name: str,
    customer_name: str,
    customer_phone: str | None,
    expected_date: str,
    days_overdue: int,
):
    """Send notification for overdue rental items"""
    notification = {
        "type": "overdue_rental",
        "rental_id": rental_id,
        "item_name": item_name,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "expected_return_date": expected_date,
        "days_overdue": days_overdue,
        "message": f"Overdue rental: {item_name} rented by {customer_name} is {days_overdue} days overdue",
        "created_at": datetime.now().isoformat(),
        "severity": "warning" if days_overdue < 7 else "critical",
    }

    # TODO: Implement actual notification sending

    return notification


@shared_task
def send_purchase_request_notification(
    request_id: int,
    item_name: str,
    quantity: int,
    requester: str,
    machine: str | None,
):
    """Send notification for new purchase request"""
    notification = {
        "type": "purchase_request",
        "request_id": request_id,
        "item_name": item_name,
        "quantity": quantity,
        "requester": requester,
        "machine": machine,
        "message": f"New purchase request: {quantity}x {item_name} requested by {requester}",
        "created_at": datetime.now().isoformat(),
        "severity": "info",
    }

    # TODO: Implement actual notification sending

    return notification


@shared_task
def send_invoice_status_notification(
    invoice_id: int,
    invoice_type: str,
    old_status: str,
    new_status: str,
    employee_name: str,
):
    """Send notification for invoice status change"""
    notification = {
        "type": "invoice_status",
        "invoice_id": invoice_id,
        "invoice_type": invoice_type,
        "old_status": old_status,
        "new_status": new_status,
        "employee_name": employee_name,
        "message": f"Invoice #{invoice_id} ({invoice_type}) changed from {old_status} to {new_status}",
        "created_at": datetime.now().isoformat(),
        "severity": "info",
    }

    # TODO: Implement actual notification sending

    return notification


@shared_task
def send_daily_summary_notification():
    """Send daily summary notification to managers"""
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork

        async def _generate_summary():
            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                # Get counts
                total_invoices = await uow.invoices.count()
                pending_requests = len(
                    await uow.purchase_requests.get_by_status("pending")
                )
                total_items = await uow.warehouse.count()

                # Get today's activity
                # This is simplified - in real implementation, filter by date

                return {
                    "type": "daily_summary",
                    "date": datetime.now().date().isoformat(),
                    "total_invoices": total_invoices,
                    "pending_purchase_requests": pending_requests,
                    "total_warehouse_items": total_items,
                    "message": f"Daily Summary: {total_invoices} invoices, {pending_requests} pending requests",
                    "created_at": datetime.now().isoformat(),
                }

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_generate_summary())
            return result
        finally:
            loop.close()

    except Exception as e:
        return {"error": str(e)}


@shared_task
def send_batch_notifications(notifications: list[dict]):
    """Send multiple notifications in batch"""
    results = []
    for notification in notifications:
        notification_type = notification.get("type")

        if notification_type == "low_stock":
            result = send_low_stock_notification.delay(
                notification["item_id"],
                notification["item_name"],
                notification["current_qty"],
                notification["threshold"],
            )
        elif notification_type == "overdue_rental":
            result = send_overdue_rental_notification.delay(
                notification["rental_id"],
                notification["item_name"],
                notification["customer_name"],
                notification.get("customer_phone"),
                notification["expected_date"],
                notification["days_overdue"],
            )
        else:
            result = None

        results.append({
            "type": notification_type,
            "task_id": result.id if result else None,
        })

    return {"sent": len(results), "results": results}
