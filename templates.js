// templates.js
// Bancos de frases usados pelos comandos "aleatorios" do menu (67, aura,
// azar, ship, lore, tribunal, etc). Cada comando sorteia 1+ pessoas do
// grupo e escolhe uma frase de uma dessas listas. Sinta-se livre para
// adicionar mais frases em cada array - quanto mais frases, menos repetitivo.

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const single = {
  '67': (n) => `📊 *67* de @${n}: ${Math.floor(Math.random() * 101)}% de Aura hoje.`,
  aura: (n) => `✨ A Aura de @${n} hoje está em *${Math.floor(Math.random() * 101)}%*.`,
  azar: (n) => `💀 O membro mais azarado agora é... @${n}. Sinto muito.`,
  sortudo: (n) => `🍀 O membro mais sortudo do momento é @${n}!`,
  npc: (n) => `🎮 @${n} foi transformado em NPC do grupo. Só repete a mesma frase agora.`,
  lendario: (n) => `🐺 @${n} alcançou status *LENDÁRIO* no grupo.`,
  fracasso: (n) => `🗑️ O fracasso oficial do dia é @${n}.`,
  sus: (n) => `🔍 @${n} está agindo muito suspeito hoje... 👀`,
  caos: (n) => `🌀 @${n} tem ${Math.floor(Math.random() * 101)}% de potencial de causar caos.`,
  profeta: (n) => pick([
    `🔮 @${n}, o futuro reserva grandes memes para você.`,
    `🔮 @${n} vai receber uma mensagem inesperada ainda hoje.`,
    `🔮 @${n} está prestes a tomar uma decisão que vai virar história no grupo.`,
  ]),
  animal: (n) => `🐾 @${n} hoje é oficialmente um(a) ${pick(['capivara', 'ornitorrinco', 'preguiça', 'gato de rua', 'pombo', 'lhama', 'texugo'])}.`,
  objeto: (n) => `📦 Se @${n} fosse um objeto, seria: ${pick(['um controle remoto sem pilha', 'uma meia furada', 'um carregador que não carrega', 'uma cadeira de plástico de festa', 'um fusível queimado'])}.`,
  profissao: (n) => `💼 A profissão ideal de @${n} é: ${pick(['catador de estrelas cadentes', 'domador de pombo', 'engenheiro de meme', 'vendedor de sombra', 'consultor de caos'])}.`,
  superpoder: (n) => `🦸 @${n} tem o superpoder de: ${pick(['ficar sem sinal na hora errada', 'sempre ficar com o assento do meio', 'nunca achar o controle', 'prever quando o wifi vai cair'])}.`,
  vilao: (n) => `🦹 O vilão do dia é @${n}.`,
  heroi: (n) => `🦸 O herói do dia é @${n}!`,
  boss: (n) => `👑 O chefão do grupo hoje é @${n}.`,
  fofoca: (n) => `🗣️ Nível de fofoca de @${n}: ${Math.floor(Math.random() * 101)}%.`,
  dramatico: (n) => `🎭 Nível de drama de @${n}: ${Math.floor(Math.random() * 101)}%.`,
  preguica: (n) => `😴 Nível de preguiça de @${n}: ${Math.floor(Math.random() * 101)}%.`,
  cancelado: (n) => pick([
    `🚫 @${n} foi cancelado(a) por respirar muito alto no áudio.`,
    `🚫 @${n} foi cancelado(a) por visualizar e não responder.`,
    `🚫 @${n} foi cancelado(a) por mandar bom dia em grupo errado.`,
  ]),
  crime: () => pick([
    '🚔 Acusado(a) de roubar o último pão de queijo.',
    '🚔 Acusado(a) de dar "vish" e sumir.',
    '🚔 Acusado(a) de mandar áudio de 8 minutos sem avisar.',
  ]),
  misterio: (n) => `❓ Ninguém sabe explicar por que @${n} entrou no grupo às 3h da manhã só pra sair 2 minutos depois.`,
};

const pair = {
  ship: (a, b) => `❤️ *SHIP DO DIA*\n@${a} + @${b} = ${Math.floor(Math.random() * 101)}% de compatibilidade!`,
  casal: (a, b) => `💑 O casal do grupo é: @${a} e @${b}!`,
  divorcio: (a, b) => `💔 @${a} e @${b} se divorciaram por ${pick(['diferenças irreconciliáveis sobre figurinha', 'brigar por causa de vídeo de gato', 'um dos dois deixar no visto'])}.`,
  crush: (a, b) => `😳 @${a} está de crush secreto em @${b}... será?`,
  ciumes: (a, b) => `😒 @${a} ficou com ciúmes de @${b} no grupo.`,
  date: (a, b) => `🍽️ @${a} e @${b} foram sorteados para um encontro imaginário hoje à noite.`,
  termino: (a, b) => `💔 @${a} e @${b} terminaram porque ${pick(['um dos dois mandou áudio ao invés de texto', 'discordaram sobre qual pizza é melhor', 'um viu stories e não respondeu'])}.`,
};

const lore = (n) => {
  const origens = [
    'após uma discussão entre uma capivara e um micro-ondas',
    'no exato momento em que um pombo pousou numa antena de wifi',
    'durante um apagão que durou exatamente 7 minutos',
    'quando alguém disse "vish" pela primeira vez na história',
  ];
  const missoes = [
    'sobreviver ao grupo',
    'nunca mais dar "visto" sem responder',
    'encontrar o fim do grupo do WhatsApp',
    'provar que não foi ele(a) quem saiu do grupo sem querer',
  ];
  return `📖 *LORE DE @${n}*\n\n${cap(n)} nasceu ${pick(origens)}.\n\nDesde então, ${lower(n)} procura respostas.\n\nSua missão atual: ${pick(missoes)}.`;
};

function cap(n) { return n.charAt(0).toUpperCase() + n.slice(1); }
function lower(n) { return n; }

const julgamento = (n) => `⚖️ *JULGAMENTO DE @${n}*\n\nAcusação: ${pick([
  'ficar online e não responder',
  'usar figurinha de "bom dia" toda manhã',
  'sumir do grupo por 3 dias e voltar mandando meme',
])}\n\nVeredito: ${pick(['CULPADO 🔨', 'INOCENTE ✅', 'CULPADO, mas perdoado 😇'])}`;

const tribunal = (n) => `⚖️ *TRIBUNAL DO GRUPO*\n\nRéu: @${n}\nPromotor: o grupo inteiro\nDefensor: ninguém apareceu\n\nSentença: ${pick(['pagar 50 moedas de fiança', 'virar NPC por 1 dia', 'ser absolvido por falta de provas'])}`;

const processo = (n) => `📜 *PROCESSO Nº${Math.floor(Math.random() * 9000 + 1000)}*\n\nParte acusada: @${n}\nMotivo: ${pick(['spam de figurinha', 'sumiço repentino do grupo', 'áudio de 10 minutos não solicitado'])}\nStatus: em julgamento pelo tribunal do bot.`;

module.exports = { pick, single, pair, lore, julgamento, tribunal, processo };
