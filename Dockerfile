# Dockerfile - usado pelo Railway (e qualquer host com suporte a Docker)
# para rodar o bot com o Chromium necessario ao whatsapp-web.js.

FROM node:18-slim

# Instala o Chromium do sistema + dependencias que ele precisa para rodar
# "headless" (sem interface grafica) dentro do container.
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Diz pro puppeteer usar o Chromium do sistema em vez de baixar o dele
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Pasta onde a sessao (QR) e o database.json ficam salvos.
# No Railway, monte um Volume apontando pra /app/.wwebjs_auth e /app/data
# para esses dados sobreviverem a reinicios/deploys (ver README.md).
RUN mkdir -p /app/.wwebjs_auth /app/data

CMD ["node", "index.js"]
