// web.js
// Servidor HTTP simples so pra mostrar o QR code (e o status de conexao)
// numa pagina web, em vez de ASCII feio nos logs. O Railway expoe esse
// servidor num link publico (ver README.md, secao Railway > Networking).

const express = require('express');
const QRCode = require('qrcode');

const app = express();

let latestQr = null;      // string do QR code mais recente (ou null)
let status = 'Iniciando...'; // texto de status exibido na pagina

function setQr(qr) {
  latestQr = qr;
  status = 'Aguardando leitura do QR code...';
}

function setStatus(text, clearQr = false) {
  status = text;
  if (clearQr) latestQr = null;
}

app.get('/', async (req, res) => {
  let qrImageHtml = '';
  if (latestQr) {
    try {
      const dataUrl = await QRCode.toDataURL(latestQr, { width: 320, margin: 2 });
      qrImageHtml = `<img src="${dataUrl}" alt="QR code" style="width:320px;height:320px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.15)" />`;
    } catch (e) {
      qrImageHtml = `<p>Erro ao gerar imagem do QR: ${e.message}</p>`;
    }
  }

  res.send(`<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="10" />
  <title>Bot Recrutamento - QR Code</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#0f0f10; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px; text-align:center; }
    h1 { font-size: 1.4rem; margin-bottom: 4px; }
    p.status { color:#aaa; margin-top: 16px; }
    .box { background:#1a1a1c; padding:32px; border-radius:16px; }
  </style>
</head>
<body>
  <div class="box">
    <h1>🐺 Bot Recrutamento</h1>
    ${qrImageHtml || '<p style="color:#9f9;font-size:1.2rem">✅ Conectado! Nenhum QR pendente.</p>'}
    <p class="status">${status}</p>
    <p class="status" style="font-size:0.8rem">Esta página atualiza sozinha a cada 10s.</p>
  </div>
</body>
</html>`);
});

function startWebServer() {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🌐 Servidor web do QR code rodando na porta ${port}`);
  });
}

module.exports = { startWebServer, setQr, setStatus };
