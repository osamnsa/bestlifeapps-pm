FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/staticfiles /app/media

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

# Local Docker Compose doesn't set PORT, so default to 8000 there. Render (and
# most PaaS platforms) inject their own PORT value and require the process to
# bind to it, hence the shell-form CMD below so $PORT gets expanded at
# container start rather than baked in at build time.
ENV PORT=8000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3
