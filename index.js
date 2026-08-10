// index.js
// Ponto de entrada do bot.
//
// - Usa LocalAuth: a sessao fica salva em ./.wwebjs_auth, entao voce
//   escaneia o QR code UMA vez. Nos proximos "npm start" ele reconecta
//   sozinho, sem pedir QR de novo (a menos que voce desconecte manualmente
//   pelo celular ou fique offline por tempo demais).
// - Se cair de internet, o whatsapp-web.js tenta reconectar sozinho.
//   Para garantir "24h no ar de verdade", rode isso com PM2 (ver README.md)
//   em um servidor/VPS ligado o tempo todo - nao no seu PC pessoal.

require('dotenv').config();
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { getGroup, getUser, persist } = require('./db');
const { handleCommand } = require('./commands');

const PREFIX = process.env.PREFIX || ',';

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    // Em ambientes como Railway (Docker), o Chromium ja vem instalado pelo
    // sistema e apontado via PUPPETEER_EXECUTABLE_PATH (ver Dockerfile).
    // Localmente (seu PC / Codespaces), deixa undefined que o puppeteer
    // usa o Chromium que ele mesmo baixou na instalação.
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  },
});

client.on('qr', (qr) => {
  console.log('\n📱 Escaneie o QR code abaixo no WhatsApp (Aparelhos conectados > Conectar aparelho):\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('✅ Autenticado com sucesso. Sessão salva em ./.wwebjs_auth');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Falha na autenticação:', msg);
});

client.on('ready', () => {
  console.log('🐺 Bot Recrutamento online e pronto!');
});

client.on('disconnected', (reason) => {
  console.error('⚠️  Cliente desconectado:', reason, '- tentando reconectar...');
  // Pequeno delay e tenta reinicializar a sessao salva
  setTimeout(() => {
    client.initialize().catch((e) => console.error('Erro ao reinicializar:', e.message));
  }, 5000);
});

// Evita que erros nao tratados derrubem o processo inteiro (importante
// para manter o bot no ar 24h). Combine isso com PM2 (auto-restart) no README.
process.on('unhandledRejection', (err) => {
  console.error('⚠️  unhandledRejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️  uncaughtException:', err);
});

client.on('message', async (msg) => {
  try {
    const chat = await msg.getChat();
    if (!chat.isGroup) return; // bot criado para uso em grupo

    const groupId = chat.id._serialized;
    const contact = await msg.getContact();
    const senderId = contact.id._serialized;

    const group = getGroup(groupId);

    // Apaga automaticamente mensagens de quem esta mutado
    if (group.mutedUsers.includes(senderId)) {
      try { await msg.delete(true); } catch (_) {}
      return;
    }

    const body = (msg.body || '').trim();
    if (!body.startsWith(PREFIX)) return;

    const withoutPrefix = body.slice(PREFIX.length).trim();
    if (!withoutPrefix) return;

    const [rawCommand, ...args] = withoutPrefix.split(/\s+/);
    const command = rawCommand.toLowerCase();

    await handleCommand(client, msg, chat, contact, command, args, PREFIX);
  } catch (err) {
    console.error('Erro ao processar mensagem:', err);
  }
});

client.initialize();
