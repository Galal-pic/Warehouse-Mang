"""Report generation background tasks"""

from datetime import datetime, timedelta
from celery import shared_task


@shared_task(bind=True, max_retries=3)
def generate_daily_inventory_report(self):
    """Generate daily inventory report"""
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork

        async def _generate():
            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                # Get all warehouse items with locations
                items = await uow.warehouse.get_all_with_locations(skip=0, limit=10000)

                report_data = {
                    "generated_at": datetime.now().isoformat(),
                    "total_items": len(items),
                    "total_quantity": 0,
                    "total_value": 0.0,
                    "items": [],
                }

                for item in items:
                    locations = await uow.item_locations.get_by_item(item.id)
                    item_qty = sum(loc.quantity for loc in locations)

                    prices = await uow.prices.get_by_item(item.id)
                    item_value = sum(
                        p.quantity * p.unit_price for p in prices if p.quantity > 0
                    )

                    report_data["total_quantity"] += item_qty
                    report_data["total_value"] += item_value

                    report_data["items"].append({
                        "id": item.id,
                        "name": item.item_name,
                        "barcode": item.item_bar,
                        "total_quantity": item_qty,
                        "value": round(item_value, 2),
                        "locations": [
                            {"location": loc.location, "quantity": loc.quantity}
                            for loc in locations
                        ],
                    })

                report_data["total_value"] = round(report_data["total_value"], 2)
                return report_data

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_generate())
            return {"status": "success", "report": result}
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def generate_sales_report(self, start_date: str, end_date: str):
    """Generate sales report for a date range"""
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork

        async def _generate():
            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                start = datetime.fromisoformat(start_date)
                end = datetime.fromisoformat(end_date)

                # Get sales invoices in date range
                invoices = await uow.invoices.get_by_type_and_date_range(
                    "صرف", start, end
                )

                report_data = {
                    "generated_at": datetime.now().isoformat(),
                    "start_date": start_date,
                    "end_date": end_date,
                    "total_invoices": len(invoices),
                    "total_amount": 0.0,
                    "total_paid": 0.0,
                    "total_residual": 0.0,
                    "invoices": [],
                }

                for invoice in invoices:
                    report_data["total_amount"] += invoice.total_amount or 0
                    report_data["total_paid"] += invoice.paid or 0
                    report_data["total_residual"] += invoice.residual or 0

                    report_data["invoices"].append({
                        "id": invoice.id,
                        "date": invoice.created_at.isoformat() if invoice.created_at else None,
                        "client": invoice.client_name,
                        "amount": invoice.total_amount,
                        "paid": invoice.paid,
                        "residual": invoice.residual,
                        "status": invoice.status,
                    })

                report_data["total_amount"] = round(report_data["total_amount"], 2)
                report_data["total_paid"] = round(report_data["total_paid"], 2)
                report_data["total_residual"] = round(report_data["total_residual"], 2)

                return report_data

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_generate())
            return {"status": "success", "report": result}
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def generate_purchase_report(self, start_date: str, end_date: str):
    """Generate purchase report for a date range"""
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork

        async def _generate():
            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                start = datetime.fromisoformat(start_date)
                end = datetime.fromisoformat(end_date)

                # Get purchase invoices in date range
                invoices = await uow.invoices.get_by_type_and_date_range(
                    "اضافه", start, end
                )

                report_data = {
                    "generated_at": datetime.now().isoformat(),
                    "start_date": start_date,
                    "end_date": end_date,
                    "total_invoices": len(invoices),
                    "total_amount": 0.0,
                    "suppliers": {},
                    "invoices": [],
                }

                for invoice in invoices:
                    report_data["total_amount"] += invoice.total_amount or 0

                    # Get items and their suppliers
                    items = await uow.invoice_items.get_by_invoice(invoice.id)
                    for item in items:
                        if item.supplier_name:
                            if item.supplier_name not in report_data["suppliers"]:
                                report_data["suppliers"][item.supplier_name] = 0
                            report_data["suppliers"][item.supplier_name] += (
                                item.total_price or 0
                            )

                    report_data["invoices"].append({
                        "id": invoice.id,
                        "date": invoice.created_at.isoformat() if invoice.created_at else None,
                        "amount": invoice.total_amount,
                        "status": invoice.status,
                        "item_count": len(items),
                    })

                report_data["total_amount"] = round(report_data["total_amount"], 2)
                report_data["suppliers"] = {
                    k: round(v, 2) for k, v in report_data["suppliers"].items()
                }

                return report_data

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_generate())
            return {"status": "success", "report": result}
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def generate_fifo_report(self):
    """Generate FIFO inventory valuation report"""
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork

        async def _generate():
            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                items = await uow.warehouse.get_all_no_limit()

                report_data = {
                    "generated_at": datetime.now().isoformat(),
                    "total_items": len(items),
                    "total_value": 0.0,
                    "items": [],
                }

                for item in items:
                    locations = await uow.item_locations.get_by_item(item.id)

                    for loc in locations:
                        prices = await uow.prices.get_fifo_prices(item.id, loc.location)

                        if prices:
                            location_value = sum(
                                p.quantity * p.unit_price for p in prices
                            )
                            report_data["total_value"] += location_value

                            report_data["items"].append({
                                "item_id": item.id,
                                "item_name": item.item_name,
                                "location": loc.location,
                                "total_quantity": sum(p.quantity for p in prices),
                                "value": round(location_value, 2),
                                "price_layers": [
                                    {
                                        "invoice_id": p.invoice_id,
                                        "quantity": p.quantity,
                                        "unit_price": p.unit_price,
                                    }
                                    for p in prices
                                ],
                            })

                report_data["total_value"] = round(report_data["total_value"], 2)
                return report_data

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_generate())
            return {"status": "success", "report": result}
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=300)
