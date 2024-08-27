celery -A tasks worker --concurrency=4 --loglevel=INFO -n worker1@%h -Q slow,celery &
celery -A tasks worker --concurrency=2 --loglevel=INFO -n worker2@%h
