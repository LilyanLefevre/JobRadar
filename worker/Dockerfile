FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
CMD ["gunicorn", "-b", "0.0.0.0:5055", "--threads", "8", "--timeout", "300", "app:app"]
