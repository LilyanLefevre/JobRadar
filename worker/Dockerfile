FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py providers.json .
RUN useradd --system --uid 10001 --no-create-home app
USER 10001
CMD ["gunicorn", "-b", "0.0.0.0:5055", "--threads", "8", "--timeout", "300", "--worker-tmp-dir", "/dev/shm", "app:app"]
