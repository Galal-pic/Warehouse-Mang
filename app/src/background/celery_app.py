"""Celery application configuration"""

from celery import Celery
from celery.schedules import crontab

from src.config import settings


def create_celery_app() -> Celery:
    """Create and configure Celery application"""
    celery_app = Celery(
        "warehouse_tasks",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND,
        include=[
            "src.background.tasks.cache_tasks",
            "src.background.tasks.report_tasks",
            "src.background.tasks.notification_tasks",
            "src.background.tasks.inventory_tasks",
        ],
    )

    # Celery configuration
    celery_app.conf.update(
        # Task settings
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,

        # Task execution settings
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        task_time_limit=300,  # 5 minutes max per task
        task_soft_time_limit=240,  # Soft limit at 4 minutes

        # Worker settings
        worker_prefetch_multiplier=1,
        worker_concurrency=4,

        # Result backend settings
        result_expires=3600,  # Results expire after 1 hour

        # Retry settings
        task_default_retry_delay=60,  # 1 minute
        task_max_retries=3,

        # Beat scheduler for periodic tasks
        beat_schedule={
            # Clear expired cache every hour
            "clear-expired-cache": {
                "task": "src.background.tasks.cache_tasks.clear_expired_cache",
                "schedule": crontab(minute=0),  # Every hour at minute 0
            },
            # Generate daily inventory report at midnight
            "daily-inventory-report": {
                "task": "src.background.tasks.report_tasks.generate_daily_inventory_report",
                "schedule": crontab(hour=0, minute=0),  # Midnight
            },
            # Check for low stock items every 4 hours
            "check-low-stock": {
                "task": "src.background.tasks.inventory_tasks.check_low_stock_levels",
                "schedule": crontab(hour="*/4", minute=0),  # Every 4 hours
            },
            # Check for overdue rentals every morning
            "check-overdue-rentals": {
                "task": "src.background.tasks.inventory_tasks.check_overdue_rentals",
                "schedule": crontab(hour=8, minute=0),  # 8 AM daily
            },
        },
    )

    return celery_app


# Create the Celery app instance
celery = create_celery_app()
