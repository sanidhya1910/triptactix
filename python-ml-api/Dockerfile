# numpy 1.24.3 publishes no wheels for Python 3.12+, so this image is pinned to 3.11.
FROM python:3.11-slim

# Hugging Face Spaces runs containers as uid 1000.
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ml_model.load_model() resolves "models/" relative to the working directory,
# so the app must be copied into WORKDIR rather than an arbitrary path.
COPY --chown=user . /app

USER user

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
