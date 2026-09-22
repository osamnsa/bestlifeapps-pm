#!/bin/sh
set -e

python - <<'PYEOF'
import os, socket, time
from urllib.parse import urlparse

database_url = os.getenv("DATABASE_URL")
if database_url:
    # Render (and most managed-Postgres platforms) provide one connection
    # string. Their databases are typically already reachable by the time the
    # web service boots, so we still probe briefly but don't require it.
    parsed = urlparse(database_url)
    host, port = parsed.hostname, parsed.port or 5432
else:
    host = os.getenv("POSTGRES_HOST", "db")
    port = int(os.getenv("POSTGRES_PORT", "5432"))

print(f"Waiting for database at {host}:{port}...")
for _ in range(60):
    try:
        socket.create_connection((host, port), timeout=2).close()
        print("Database is available.")
        break
    except OSError:
        print("Database not ready yet, retrying...")
        time.sleep(1)
else:
    raise SystemExit("Database never became available.")
PYEOF

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${SEED_DEMO_DATA:-true}" = "true" ]; then
  python manage.py seed_demo || true
fi

if [ -n "${SARAH_OS_PASSWORD:-}" ]; then
  python manage.py create_sarah_os --password "${SARAH_OS_PASSWORD}" || true
fi

exec "$@"
