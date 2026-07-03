FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY apps/api/requirements.txt ./apps/api/requirements.txt
RUN python -m pip install --no-cache-dir -r apps/api/requirements.txt

COPY pyproject.toml README.md ./
COPY src ./src
RUN python -m pip install --no-cache-dir -e .

COPY apps/api/app ./apps/api/app

WORKDIR /app/apps/api

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
