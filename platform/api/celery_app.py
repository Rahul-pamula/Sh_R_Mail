from __future__ import annotations

import os

from celery import Celery


REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Patch for Upstash/Managed Redis SSL requirements in Celery
if REDIS_URL.startswith("rediss://") and "ssl_cert_reqs" not in REDIS_URL:
    sep = "&" if "?" in REDIS_URL else "?"
    REDIS_URL += f"{sep}ssl_cert_reqs=none"

celery_app = Celery(
    "shrflow_templates",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    task_time_limit=15,
    task_soft_time_limit=10,
    task_default_queue="default",
    task_routes={
        "tasks.template_tasks.compile_template_html_task": {"queue": "template_compile"},
        "tasks.template_tasks.send_template_test_email_task": {"queue": "template_email"},
    },
)

celery_app.autodiscover_tasks(["tasks"])
