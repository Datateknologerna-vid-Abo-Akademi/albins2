#!/bin/bash
set -euo pipefail

wait_for_db() {
  local retries=20
  local delay=3

  echo "Waiting for database connection..."
  until python - <<'PY'
import os
import django
from django.db import connections

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "albins2.settings")
django.setup()

connection = connections["default"]
cursor = connection.cursor()
cursor.close()
PY
  do
    retries=$((retries - 1))
    if [ "$retries" -le 0 ]; then
      echo "Database connection timed out."
      exit 1
    fi
    sleep "$delay"
  done
}

wait_for_db

python manage.py migrate --noinput

exec "$@"
