# ── SevaSetu App Backend — Clean Deployment ──
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy necessary source folders
COPY app ./app
COPY bot ./bot
COPY whatsapp ./whatsapp
COPY credentials ./credentials

# Uploads dir for static file serving
RUN mkdir -p /app/uploads

# Cloud Run listens on 8080
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
