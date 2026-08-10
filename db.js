// db.js
// Camada de persistencia simples baseada em arquivo JSON.
// Tudo fica salvo em disco (data/database.json) e e regravado apos
// qualquer alteracao, entao nada se perde se o processo cair/reiniciar.
//
// Se um dia quiser trocar por Firebase (Firestore), so precisa reescrever
// as funcoes load()/save() para ler/escrever no Firestore em vez do arquivo -
// o resto do bot (commands/*) usa apenas getGroup/saveDb e nao muda.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'database.json');

function ensureFile() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ groups: {} }, null, 2));
  }
}

let cache = null;
let saveQueued = false;

function load() {
  if (cache) return cache;
  ensureFile();
  try {
    cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (err) {
    console.error('[DB] Erro ao ler database.json, recriando arquivo:', err.message);
    cache = { groups: {} };
  }
  if (!cache.groups) cache.groups = {};
  return cache;
}

// Grava em disco de forma "debounced" (agrupa varias alteracoes seguidas
// em uma unica escrita, evitando martelar o disco a cada comando).
function saveDb() {
  if (saveQueued) return;
  saveQueued = true;
  setTimeout(() => {
    saveQueued = false;
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
    } catch (err) {
      console.error('[DB] Erro ao salvar database.json:', err.message);
    }
  }, 300);
}

function defaultGroup() {
  return {
    settings: {
      botOn: true,
      gamesOn: true,
      onlyAdmin: false,
      groupOpen: true,
    },
    mutedUsers: [],
    users: {},
  };
}

function defaultUser() {
  return {
    coins: 100,
    aura: 0,
    xp: 0,
    level: 1,
    fish: {},          // { "peixe comum": 3, ... }
    inventory: [],
    achievements: [],
    wins: 0,
    lastDaily: 0,
    lastTrabalhar: 0,
  };
}

function getGroup(groupId) {
  const db = load();
  if (!db.groups[groupId]) {
    db.groups[groupId] = defaultGroup();
    saveDb();
  }
  return db.groups[groupId];
}

function getUser(groupId, userId) {
  const group = getGroup(groupId);
  if (!group.users[userId]) {
    group.users[userId] = defaultUser();
    saveDb();
  }
  return group.users[userId];
}

function persist() {
  saveDb();
}

module.exports = { getGroup, getUser, persist };
