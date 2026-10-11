FROM python:3.12-slim
# Node + CLI claude: l'évaluation appelle `claude -p` (auth par CLAUDE_CODE_OAUTH_TOKEN).
RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm && rm -rf /var/lib/apt/lists/* \
 && npm install -g @anthropic-ai/claude-code
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV DATA_DIR=/data
CMD ["gunicorn", "-b", "0.0.0.0:5055", "--threads", "8", "--timeout", "300", "app:app"]
