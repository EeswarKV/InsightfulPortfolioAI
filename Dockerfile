FROM python:3.12-slim-bookworm

# libstdc++6 is required by numpy/pandas C extensions at runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/api/ ./apps/api/

RUN cd apps/api \
    && pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -e .

CMD bash -c "cd apps/api && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
