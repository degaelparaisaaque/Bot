// commands.js
// Roteador e implementacao de todos os comandos do bot.
// Recebe a mensagem ja separada em comando + argumentos e decide o que fazer.

const { MessageMedia } = require('whatsapp-web.js');
const { getGroup, getUser, persist } = require('./db');
const T = require('./templates');

const OWNER_NUMBER = process.env.OWNER_NUMBER || '';

const FISH_TABLE = [
  { name: 'peixe comum', emoji: '🐟', weight: 40, value: 10 },
  { name: 'peixe raro', emoji: '🐠', weight: 25, value: 30 },
  { name: 'lixo', emoji: '🗑️', weight: 15, value: 0 },
  { name: 'bota velha', emoji: '👢', weight: 10, value: 2 },
  { name: 'peixe lendário', emoji: '🦈', weight: 6, value: 100 },
  { name: 'tesouro', emoji: '💎', weight: 3, value: 250 },
  { name: 'item extremamente raro', emoji: '👑', weight: 1, value: 500 },
];

function weightedFish() {
  const total = FISH_TABLE.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FISH_TABLE) {
    if (r < f.weight) return f;
    r -= f.weight;
  }
  return FISH_TABLE[0];
}

function xpForLevel(level) { return level * 1000; }

function addXp(user, amount) {
  user.xp += amount;
  while (user.xp >= xpForLevel(user.level)) {
    user.xp -= xpForLevel(user.level);
    user.level += 1;
  }
}

function fmtName(contact) {
  return (contact.pushname || contact.number || 'membro').replace(/\s+/g, ' ').trim();
}

async function getMentionOrReply(msg, chat) {
  const mentions = await msg.getMentions();
  if (mentions.length > 0) return mentions[0];
  if (msg.hasQuotedMsg) {
    const quoted = await msg.getQuotedMessage();
    return await quoted.getContact();
  }
  return null;
}

function isOwner(senderId) {
  return OWNER_NUMBER && senderId === OWNER_NUMBER;
}

async function isSenderAdmin(chat, senderId) {
  if (!chat.isGroup) return false;
  const participant = chat.participants.find((p) => p.id._serialized === senderId);
  return !!(participant && (participant.isAdmin || participant.isSuperAdmin));
}

async function randomParticipant(chat, excludeId) {
  const participants = chat.participants.filter((p) => p.id._serialized !== excludeId);
  const pool = participants.length ? participants : chat.participants;
  const p = pool[Math.floor(Math.random() * pool.length)];
  return p.id._serialized;
}

async function nameFromId(client, id) {
  try {
    const contact = await client.getContactById(id);
    return contact.pushname || contact.number;
  } catch {
    return id.split('@')[0];
  }
}

async function reply(msg, text, mentions = []) {
  return msg.reply(text, undefined, { mentions });
}

// ---------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------
async function handleCommand(client, msg, chat, contact, command, args, prefix) {
  const groupId = chat.id._serialized;
  const senderId = contact.id._serialized;
  const group = getGroup(groupId);
  const user = getUser(groupId, senderId);
  const senderAdmin = await isSenderAdmin(chat, senderId);
  const owner = isOwner(senderId);

  // ---- comandos que funcionam mesmo com o bot "desligado" ----
  if (command === 'bot' && args[0] === 'on') {
    if (!senderAdmin && !owner) return reply(msg, '❌ Só administradores podem religar o bot.');
    group.settings.botOn = true; persist();
    return reply(msg, '✅ Bot ligado.');
  }
  if (command === 'bot' && args[0] === 'off') {
    if (!senderAdmin && !owner) return reply(msg, '❌ Só administradores podem desligar o bot.');
    group.settings.botOn = false; persist();
    return reply(msg, '🔴 Bot desligado. Use ",bot on" para religar.');
  }
  if (!group.settings.botOn) return; // bot desligado nesse grupo: ignora o resto

  if (group.settings.onlyAdmin && !senderAdmin && !owner && command !== 'menu') {
    return; // modo somente-admin ativo
  }

  switch (command) {
    // ---------------- MENU ----------------
    case 'menu':
      return reply(msg, menuText());
    case 'menudono':
      if (!owner) return reply(msg, '❌ Comando exclusivo do dono do bot.');
      return reply(msg, ownerMenuText());

    // ---------------- ADMINISTRAÇÃO ----------------
    case 'ban': {
      if (!senderAdmin && !owner) return reply(msg, '❌ Só administradores podem usar esse comando.');
      const target = await getMentionOrReply(msg, chat);
      if (!target) return reply(msg, '❌ Marque a pessoa (ou responda a mensagem dela) para banir.');
      try {
        await chat.removeParticipants([target.id._serialized]);
        return reply(msg, `✅ @${target.id.user} foi removido(a) do grupo.`, [target]);
      } catch (e) {
        return reply(msg, '❌ Não consegui remover. Verifique se o bot é administrador do grupo.');
      }
    }
    case 'mute': {
      if (!senderAdmin && !owner) return reply(msg, '❌ Só administradores podem usar esse comando.');
      const target = await getMentionOrReply(msg, chat);
      if (!target) return reply(msg, '❌ Marque a pessoa para mutar.');
      const id = target.id._serialized;
      if (!group.mutedUsers.includes(id)) group.mutedUsers.push(id);
      persist();
      return reply(msg, `🔇 @${target.id.user} foi mutado(a). Mensagens dela serão apagadas.`, [target]);
    }
    case 'desmute': {
      if (!senderAdmin && !owner) return reply(msg, '❌ Só administradores podem usar esse comando.');
      const target = await getMentionOrReply(msg, chat);
      if (!target) return reply(msg, '❌ Marque a pessoa para desmutar.');
      group.mutedUsers = group.mutedUsers.filter((id) => id !== target.id._serialized);
      persist();
      return reply(msg, `🔊 @${target.id.user} foi desmutado(a).`, [target]);
    }
    case 'grupo': {
      if (!senderAdmin && !owner) return reply(msg, '❌ Só administradores podem usar esse comando.');
      if (args[0] === 'off') {
        await chat.setMessagesAdminsOnly(true);
        group.settings.groupOpen = false; persist();
        return reply(msg, '🔒 Grupo fechado para participantes.');
      }
      if (args[0] === 'on') {
        await chat.setMessagesAdminsOnly(false);
        group.settings.groupOpen = true; persist();
        return reply(msg, '🔓 Grupo reaberto para participantes.');
      }
      return reply(msg, 'Use ",grupo on" ou ",grupo off".');
    }
    case 'soadm': {
      if (!senderAdmin && !owner) return reply(msg, '❌ Só administradores podem usar esse comando.');
      group.settings.onlyAdmin = args[0] === 'on';
      persist();
      return reply(msg, group.settings.onlyAdmin ? '🛡️ Somente administradores podem usar comandos agora.' : '✅ Comandos liberados para todos.');
    }
    case 'd':
    case 'apaga': {
      if (!senderAdmin && !owner) return reply(msg, '❌ Só administradores podem apagar mensagens.');
      if (!msg.hasQuotedMsg) return reply(msg, '❌ Responda à mensagem que deseja apagar.');
      const quoted = await msg.getQuotedMessage();
      try {
        await quoted.delete(true);
        await msg.delete(true);
      } catch (e) {
        return reply(msg, '❌ Não consegui apagar (o bot precisa ser admin, e só apaga mensagens recentes).');
      }
      return;
    }
    case 's': {
      const target = msg.hasQuotedMsg ? await msg.getQuotedMessage() : msg;
      if (!target.hasMedia) return reply(msg, '❌ Marque/responda uma imagem, GIF ou vídeo para virar figurinha.');
      try {
        const media = await target.downloadMedia();
        await chat.sendMessage(media, { sendMediaAsSticker: true, stickerName: 'Bot Recrutamento', stickerAuthor: 'Carluz' });
      } catch (e) {
        return reply(msg, '❌ Não consegui gerar a figurinha a partir dessa mídia.');
      }
      return;
    }

    // ---------------- ECONOMIA ----------------
    case 'saldo':
      return reply(msg, `🪙 Você tem *${user.coins}* moedas.`);
    case 'aura':
      return reply(msg, `✨ Sua Aura atual: *${user.aura}*.`);
    case 'nivel':
      return reply(msg, `⭐ Nível *${user.level}* — XP: ${user.xp}/${xpForLevel(user.level)}`);
    case 'daily': {
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      if (now - user.lastDaily < DAY) {
        const restante = DAY - (now - user.lastDaily);
        const h = Math.ceil(restante / (60 * 60 * 1000));
        return reply(msg, `⏳ Você já pegou sua recompensa hoje. Tente novamente em ~${h}h.`);
      }
      const reward = 100 + Math.floor(Math.random() * 100);
      user.coins += reward;
      user.aura += 5;
      user.lastDaily = now;
      addXp(user, 50);
      persist();
      return reply(msg, `🎁 Recompensa diária: +${reward} 🪙 e +5 ✨ Aura!`);
    }
    case 'trabalhar': {
      const now = Date.now();
      const COOLDOWN = 60 * 60 * 1000; // 1h
      if (now - user.lastTrabalhar < COOLDOWN) {
        const restante = Math.ceil((COOLDOWN - (now - user.lastTrabalhar)) / 60000);
        return reply(msg, `⏳ Você está cansado. Tente trabalhar de novo em ~${restante} min.`);
      }
      const jobs = ['entregador de figurinha', 'catador de wifi', 'domador de grupo', 'vendedor de bom dia', 'freelancer de meme'];
      const job = T.pick(jobs);
      const reward = 30 + Math.floor(Math.random() * 70);
      user.coins += reward;
      user.lastTrabalhar = now;
      addXp(user, 15);
      persist();
      return reply(msg, `💼 Você trabalhou como *${job}* e ganhou *${reward}* 🪙!`);
    }
    case 'doar': {
      const target = await getMentionOrReply(msg, chat);
      const amount = parseInt(args.find((a) => /^\d+$/.test(a)), 10);
      if (!target || !amount || amount <= 0) return reply(msg, '❌ Use: ,doar @pessoa quantidade');
      if (user.coins < amount) return reply(msg, '❌ Você não tem moedas suficientes.');
      const targetUser = getUser(groupId, target.id._serialized);
      user.coins -= amount;
      targetUser.coins += amount;
      persist();
      return reply(msg, `✅ Você doou *${amount}* 🪙 para @${target.id.user}.`, [target]);
    }
    case 'ranking': {
      const entries = Object.entries(group.users)
        .sort((a, b) => b[1].coins - a[1].coins)
        .slice(0, 10);
      if (!entries.length) return reply(msg, 'Ainda não há dados suficientes para um ranking.');
      let text = '🏆 *RANKING DE MOEDAS*\n\n';
      for (let i = 0; i < entries.length; i++) {
        const name = await nameFromId(client, entries[i][0]);
        text += `${i + 1}. ${name} — ${entries[i][1].coins} 🪙 | Aura ${entries[i][1].aura} | Nv ${entries[i][1].level}\n`;
      }
      return reply(msg, text);
    }

    // ---------------- LOJA ----------------
    case 'loja':
      return reply(msg, lojaText());
    case 'comprar': {
      const itemName = args.join(' ').toLowerCase();
      const item = SHOP.find((i) => i.name.toLowerCase() === itemName);
      if (!item) return reply(msg, '❌ Item não encontrado. Use ",loja" para ver os itens disponíveis.');
      if (user.coins < item.price) return reply(msg, '❌ Moedas insuficientes.');
      user.coins -= item.price;
      user.inventory.push(item.name);
      persist();
      return reply(msg, `✅ Você comprou *${item.name}* por ${item.price} 🪙!`);
    }
    case 'inventario': {
      if (!user.inventory.length) return reply(msg, '🎒 Seu inventário está vazio.');
      return reply(msg, `🎒 *INVENTÁRIO*\n${user.inventory.map((i) => `• ${i}`).join('\n')}`);
    }

    // ---------------- PESCA ----------------
    case 'pescar': {
      const fish = weightedFish();
      user.fish[fish.name] = (user.fish[fish.name] || 0) + 1;
      addXp(user, 10);
      persist();
      return reply(msg, `🎣 Você pescou: ${fish.emoji} *${fish.name}*!`);
    }
    case 'peixes': {
      const entries = Object.entries(user.fish);
      if (!entries.length) return reply(msg, '🎣 Você ainda não pescou nada. Use ",pescar".');
      return reply(msg, `🎣 *SEUS PEIXES*\n${entries.map(([k, v]) => `• ${k}: ${v}`).join('\n')}`);
    }
    case 'vender': {
      if (args[0] !== 'peixe') return reply(msg, 'Use: ,vender peixe');
      const fishName = args.slice(1).join(' ').toLowerCase() || null;
      const owned = Object.keys(user.fish);
      if (!owned.length) return reply(msg, '❌ Você não tem peixes para vender.');
      const nameToSell = fishName && owned.includes(fishName) ? fishName : owned[0];
      const table = FISH_TABLE.find((f) => f.name === nameToSell);
      const value = table ? table.value : 5;
      user.fish[nameToSell] -= 1;
      if (user.fish[nameToSell] <= 0) delete user.fish[nameToSell];
      user.coins += value;
      persist();
      return reply(msg, `💰 Você vendeu *${nameToSell}* por ${value} 🪙.`);
    }

    // ---------------- APOSTAS ----------------
    case 'apostar': {
      const amount = parseInt(args[0], 10);
      if (!amount || amount <= 0) return reply(msg, 'Use: ,apostar quantidade');
      if (amount > user.coins) return reply(msg, '❌ Você não tem moedas suficientes.');
      if (amount > 5000) return reply(msg, '❌ Limite máximo de aposta: 5000 🪙.');
      const won = Math.random() < 0.48;
      if (won) {
        const prize = amount * 2;
        user.coins += amount; // ganha o dobro (aposta + premio)
        persist();
        return reply(msg, `🎰 *APOSTA*\n\nVocê apostou ${amount} 🪙\n🎲 Resultado: *GANHOU!*\n+${amount} 🪙`);
      } else {
        user.coins -= amount;
        persist();
        return reply(msg, `🎰 *APOSTA*\n\nVocê apostou ${amount} 🪙\n🎲 Resultado: *PERDEU!*\n-${amount} 🪙`);
      }
    }

    // ---------------- AVENTURA ----------------
    case 'aventura': {
      const reward = { coins: 20 + Math.floor(Math.random() * 80), aura: Math.floor(Math.random() * 10), xp: 20 + Math.floor(Math.random() * 30) };
      user.coins += reward.coins;
      user.aura += reward.aura;
      addXp(user, reward.xp);
      persist();
      return reply(msg, `🗺️ *AVENTURA*\n\nVocê encontrou uma porta misteriosa e decidiu abrir.\n\nResultado: +${reward.coins} 🪙, +${reward.aura} ✨, +${reward.xp} XP!`);
    }

    // ---------------- PERFIL ----------------
    case 'perfil': {
      const target = (await getMentionOrReply(msg, chat)) || contact;
      const u = getUser(groupId, target.id._serialized);
      const fishCount = Object.values(u.fish).reduce((a, b) => a + b, 0);
      const text = `🐺 *PERFIL DE ${fmtName(target)}*\n\n✨ Aura: ${u.aura}\n⭐ Nível: ${u.level}\n📈 XP: ${u.xp}/${xpForLevel(u.level)}\n🪙 Moedas: ${u.coins}\n🏆 Conquistas: ${u.achievements.length}\n🎮 Vitórias: ${u.wins}\n🎣 Peixes: ${fishCount}`;
      return reply(msg, text, [target]);
    }
    case 'conquistas': {
      if (!user.achievements.length) return reply(msg, '🏆 Você ainda não desbloqueou conquistas.');
      return reply(msg, `🏆 *CONQUISTAS*\n${user.achievements.map((a) => `• ${a}`).join('\n')}`);
    }

    // ---------------- LORE ----------------
    case 'lore': {
      const target = (await getMentionOrReply(msg, chat)) || contact;
      return reply(msg, T.lore(target.id.user), [target]);
    }

    // ---------------- TRIBUNAL ----------------
    case 'julgamento': {
      const target = (await getMentionOrReply(msg, chat)) || contact;
      return reply(msg, T.julgamento(target.id.user), [target]);
    }
    case 'tribunal': {
      const target = (await getMentionOrReply(msg, chat)) || contact;
      return reply(msg, T.tribunal(target.id.user), [target]);
    }
    case 'processo': {
      const target = (await getMentionOrReply(msg, chat)) || contact;
      return reply(msg, T.processo(target.id.user), [target]);
    }
    case 'crime':
      return reply(msg, T.single.crime());

    // ---------------- JOGO DA VELHA ----------------
    case 'velha': {
      const target = await getMentionOrReply(msg, chat);
      if (!target) return reply(msg, '❌ Marque a pessoa para desafiar: ,velha @pessoa');
      return reply(msg, `❌⭕ Partida de jogo da velha entre @${contact.id.user} e @${target.id.user} foi criada! (recurso de tabuleiro interativo pode ser expandido futuramente)`, [contact, target]);
    }

    // ---------------- JOGOS ON/OFF ----------------
    case 'jogos': {
      if (!senderAdmin && !owner) return reply(msg, '❌ Só administradores podem usar esse comando.');
      group.settings.gamesOn = args[0] === 'on';
      persist();
      return reply(msg, group.settings.gamesOn ? '🎮 Jogos ativados.' : '🔴 Jogos desativados.');
    }

    // ---------------- COMANDOS DE DONO ----------------
    case 'dar':
    case 'set': {
      if (!owner) return reply(msg, '❌ Comando exclusivo do dono do bot.');
      return handleOwnerGiveSet(msg, chat, command, args, groupId);
    }
    case 'reset': {
      if (!owner) return reply(msg, '❌ Comando exclusivo do dono do bot.');
      const target = await getMentionOrReply(msg, chat);
      if (!target) return reply(msg, '❌ Marque a pessoa para resetar.');
      group.users[target.id._serialized] = undefined;
      delete group.users[target.id._serialized];
      persist();
      return reply(msg, `✅ Dados de @${target.id.user} resetados.`, [target]);
    }
    case 'broadcast': {
      if (!owner) return reply(msg, '❌ Comando exclusivo do dono do bot.');
      const text = args.join(' ');
      if (!text) return reply(msg, 'Use: ,broadcast sua mensagem');
      return reply(msg, `📢 *AVISO*\n\n${text}`);
    }

    default:
      break;
  }

  // ---------------- COMANDOS "ALEATÓRIOS" (sorteiam membro(s)) ----------------
  if (group.settings.gamesOn) {
    if (T.single[command]) {
      const targetId = await randomParticipant(chat, senderId);
      const contactTarget = await client.getContactById(targetId);
      return reply(msg, T.single[command](contactTarget.id.user), [contactTarget]);
    }
    if (T.pair[command]) {
      const idA = await randomParticipant(chat, senderId);
      let idB = await randomParticipant(chat, senderId);
      if (idB === idA) idB = await randomParticipant(chat, idA);
      const [a, b] = await Promise.all([client.getContactById(idA), client.getContactById(idB)]);
      return reply(msg, T.pair[command](a.id.user, b.id.user), [a, b]);
    }
  }

  // comando desconhecido: nao responde nada (evita poluir o grupo)
}

async function handleOwnerGiveSet(msg, chat, command, args, groupId) {
  // ,dar moedas @pessoa 100  |  ,set aura @pessoa 500
  const field = args[0];
  const validFields = { moedas: 'coins', aura: 'aura', xp: 'xp', nivel: 'level' };
  if (!validFields[field]) return reply(msg, '❌ Use: moedas | aura | xp | nivel');
  const target = await getMentionOrReply(msg, chat);
  const amount = parseInt(args.find((a) => /^\d+$/.test(a)), 10);
  if (!target || Number.isNaN(amount)) return reply(msg, `❌ Use: ,${command} ${field} @pessoa quantidade`);
  const targetUser = getUser(groupId, target.id._serialized);
  const key = validFields[field];
  if (command === 'dar') targetUser[key] += amount;
  else targetUser[key] = amount;
  persist();
  return reply(msg, `✅ ${field} de @${target.id.user} ${command === 'dar' ? 'incrementado' : 'definido'} para ${targetUser[key]}.`, [target]);
}

const SHOP = [
  { name: 'boost de xp', price: 200 },
  { name: 'titulo lendario', price: 500 },
  { name: 'isca dourada', price: 150 },
  { name: 'amuleto da sorte', price: 300 },
];

function lojaText() {
  return `🏪 *LOJA DO GRUPO*\n\n${SHOP.map((i) => `• ${i.name} — ${i.price} 🪙`).join('\n')}\n\nUse ",comprar nome do item" para comprar.`;
}

function menuText() {
  return `🐺 *BOT RECRUTAMENTO — By: Carluz* 🐺

Digite ",menu" a qualquer momento para ver esta lista.

🛠️ *ADMIN*: ban, mute, desmute, grupo on/off, bot on/off, soadm on/off, d/apaga, s

💰 *ECONOMIA*: saldo, aura, nivel, daily, trabalhar, doar, ranking

🏪 *LOJA*: loja, comprar, inventario

🎣 *PESCA*: pescar, peixes, vender peixe

🗺️ *AVENTURA*: aventura

🎰 *APOSTAS*: apostar

👤 *PERFIL*: perfil, conquistas

📖 *LORE*: lore @pessoa

⚖️ *TRIBUNAL*: julgamento, tribunal, processo, crime, cancelado

❤️ *SHIPS*: ship, casal, divorcio, crush, ciumes, date, termino

🎲 *ALEATÓRIOS*: 67, aura, azar, sortudo, npc, lendario, fracasso, sus, caos, misterio, profeta, animal, objeto, profissao, superpoder, vilao, heroi, boss, fofoca, dramatico, preguica

"Entre por sua conta e risco. O bot já está observando. 🐺"`;
}

function ownerMenuText() {
  return `👑 *MENU DO DONO*

,dar moedas @pessoa quantidade
,dar aura @pessoa quantidade
,dar xp @pessoa quantidade
,dar nivel @pessoa quantidade
,set moedas/aura/xp/nivel @pessoa quantidade
,reset @pessoa
,broadcast mensagem`;
}

module.exports = { handleCommand };
