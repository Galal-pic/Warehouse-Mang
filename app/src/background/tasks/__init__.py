# Background tasks

from src.background.tasks.cache_tasks import (
    clear_expired_cache,
    clear_cache_pattern,
    warm_cache,
    invalidate_entity_cache,
)
from src.background.tasks.report_tasks import (
    generate_daily_inventory_report,
    generate_sales_report,
    generate_purchase_report,
    generate_fifo_report,
)
from src.background.tasks.notification_tasks import (
    send_low_stock_notification,
    send_overdue_rental_notification,
    send_purchase_request_notification,
    send_invoice_status_notification,
    send_daily_summary_notification,
    send_batch_notifications,
)
from src.background.tasks.inventory_tasks import (
    check_low_stock_levels,
    check_overdue_rentals,
    recalculate_inventory_values,
    sync_location_quantities,
    cleanup_zero_quantity_prices,
)

__all__ = [
    # Cache tasks
    "clear_expired_cache",
    "clear_cache_pattern",
    "warm_cache",
    "invalidate_entity_cache",
    # Report tasks
    "generate_daily_inventory_report",
    "generate_sales_report",
    "generate_purchase_report",
    "generate_fifo_report",
    # Notification tasks
    "send_low_stock_notification",
    "send_overdue_rental_notification",
    "send_purchase_request_notification",
    "send_invoice_status_notification",
    "send_daily_summary_notification",
    "send_batch_notifications",
    # Inventory tasks
    "check_low_stock_levels",
    "check_overdue_rentals",
    "recalculate_inventory_values",
    "sync_location_quantities",
    "cleanup_zero_quantity_prices",
]
