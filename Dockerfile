# Multi-stage Dockerfile for EventFlow AI (FastAPI + React)
# Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Python Backend & Production Server
FROM python:3.10-slim AS runner
WORKDIR /app

# Install system dependencies for Pillow and PDF rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmupdf-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/
COPY skills/ ./skills/
COPY sample_data/ ./sample_data/

# Copy built frontend assets to backend static
COPY --from=frontend-builder /app/frontend/dist ./backend/static/dist

ENV PORT=8000
EXPOSE 8000

CMD ["python", "backend/run.py"]
