#!/bin/sh
set -e

echo "Waiting for database at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
python - <<'PYEOF'
import os, socket, time
host = os.getenv("POSTGRES_HOST", "db")
port = int(os.getenv("POSTGRES_PORT", "5432"))
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
