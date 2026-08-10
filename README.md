# 🐺 Bot Recrutamento — By: Carluz

Bot de WhatsApp para grupos: administração, economia (moedas/aura/XP/nível),
jogos aleatórios, pesca, aventura, apostas, loja, perfil, lore e tribunal.

Conecta na sua conta via **QR code**, como o WhatsApp Web normal. Não é a API
oficial da Meta (essa exige aprovação de negócio + número dedicado). Usa a
biblioteca não-oficial `whatsapp-web.js`, que automatiza o WhatsApp Web de
verdade — por isso funciona escaneando o QR com um número comum, mas existe
risco (baixo, porém real) de bloqueio se o número for usado de forma muito
agressiva/robótica fora do escopo de um grupo normal.

---

## ⚠️ Vercel vs Railway — leia isto primeiro

**Vercel NÃO serve para este bot.** Vercel roda "funções serverless": o
código só existe por alguns segundos, a cada requisição, e depois morre. Este
bot precisa ficar **um processo ligado o tempo inteiro**, com um navegador
Chromium aberto em segundo plano mantendo a sessão do WhatsApp conectada. Se
você botar isso na Vercel, ele conecta, funciona por poucos segundos e cai —
não vai manter conexão.

**Railway é o caminho certo.** Ele roda um container ligado 24h (processo
contínuo), exatamente o que esse tipo de bot precisa. Por isso o projeto já
vem com um `Dockerfile` pronto pro Railway.

---

## Passo a passo completo

### Parte 1 — Testar localmente ou no GitHub Codespaces (antes de colocar em produção)

**Opção A: no seu PC**

1. Instale o [Node.js 18+](https://nodejs.org)
2. Descompacte o ZIP, abra o terminal na pasta e rode:
   ```bash
   npm install
   cp .env.example .env
   ```
3. Abra o `.env` e coloque seu número (o que vai virar dono do bot):
   ```
   OWNER_NUMBER=5511912345678@c.us
   ```
   (código do país + DDD + número, sem `+`/espaços, com `@c.us` no final)
4. Rode:
   ```bash
   npm start
   ```
5. Vai aparecer um QR code no terminal. No celular:
   **WhatsApp → ⋮ → Aparelhos conectados → Conectar um aparelho** → escaneie.
6. Pronto, o bot já responde no grupo. A sessão fica salva em
   `.wwebjs_auth/` — não precisa escanear de novo depois.

**Opção B: GitHub Codespaces** (bom pra testar sem instalar nada no PC,
mas **não serve pra rodar 24h** — Codespaces hiberna quando você não está
usando)

1. Crie um repositório novo no GitHub e suba os arquivos deste ZIP nele
   (veja "Parte 2" abaixo, passos 1–3).
2. No repositório, clique no botão verde **"Code" → aba "Codespaces" →
   "Create codespace on main"**.
3. Espere o ambiente abrir (ele já vem com Node instalado, e o
   `.devcontainer` incluso instala o Chromium e roda `npm install`
   automaticamente).
4. No terminal do Codespace:
   ```bash
   cp -n .env.example .env   # se ainda não tiver sido criado
   ```
   Edite o `.env` (clique no arquivo no explorador) e coloque seu
   `OWNER_NUMBER`.
5. Rode:
   ```bash
   npm start
   ```
6. O QR code aparece no terminal do Codespaces — escaneie normalmente.
7. Use para testar. Quando fechar o Codespace, o bot para (é só ambiente de
   desenvolvimento). Para produção 24h, vá pra Parte 2/3.

---

### Parte 2 — Colocar no GitHub

1. Crie uma conta no [github.com](https://github.com) se ainda não tiver.
2. Clique em **"New repository"**, dê um nome (ex: `bot-recrutamento`),
   marque como **Privado** (recomendado, já que o código vai ter dados
   sensíveis de sessão se você não for cuidadoso) e crie.
3. No seu PC, dentro da pasta descompactada do bot:
   ```bash
   git init
   git add .
   git commit -m "Bot inicial"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/bot-recrutamento.git
   git push -u origin main
   ```
   *(o `.gitignore` já está configurado pra não subir `node_modules`,
   `.env`, a sessão do WhatsApp e o `database.json` — isso é importante:
   nunca suba sua sessão/QR pro GitHub público)*

---

### Parte 3 — Deploy 24h no Railway

1. Crie uma conta em [railway.app](https://railway.app) (dá pra entrar
   direto com GitHub).
2. Clique em **"New Project" → "Deploy from GitHub repo"** e selecione o
   repositório que você acabou de subir.
3. O Railway vai detectar o `Dockerfile` sozinho e começar a buildar a
   imagem (com o Chromium já incluso). Isso pode levar alguns minutos na
   primeira vez.
4. Vá em **"Variables"** (aba do projeto) e adicione:
   ```
   OWNER_NUMBER=5511912345678@c.us
   PREFIX=,
   ```
5. **Muito importante — adicionar um Volume**, para a sessão do WhatsApp e o
   banco de dados (moedas, aura, XP etc.) sobreviverem a reinícios/deploys:
   - Na aba **"Settings"** do serviço, procure **"Volumes"** → **"New
     Volume"**.
   - Monte em `/app/.wwebjs_auth` (crie um volume) e outro em `/app/data`.
   - Sem isso, toda vez que o Railway reiniciar o container você perde a
     sessão (precisa escanear QR de novo) e o progresso do grupo.
6. Depois do deploy, vá na aba **"Deployments" → clique no deployment ativo
   → "View Logs"**. O QR code vai aparecer ali em texto (ASCII) — dá pra ler
   digitalmente, mas fica pequeno nos logs do Railway.
   - **Dica**: se ficar difícil de escanear direto do log, rode o bot
     localmente primeiro (Parte 1) só para gerar a sessão, e depois faça
     upload manual da pasta `.wwebjs_auth/` pro volume do Railway via
     `railway run` / `railway shell` (CLI do Railway) — assim você escaneia
     confortavelmente no seu PC e sobe a sessão já pronta.
7. Depois de conectado, o bot fica rodando 24h no Railway automaticamente,
   reiniciando sozinho se cair.

**Custo**: Railway tem um plano gratuito limitado (algumas horas/mês) e
depois cobra por uso (geralmente poucos dólares/mês para um bot desse porte
rodando o tempo todo). Vale conferir os preços atuais no próprio site deles.

---

## Alternativa: VPS + PM2 (mais controle, mesmo custo ou menor)

Se preferir não depender do Railway, qualquer VPS (Oracle Cloud Free Tier,
Hetzner, Contabo, DigitalOcean) com Node 18 funciona:

```bash
git clone https://github.com/SEU-USUARIO/bot-recrutamento.git
cd bot-recrutamento
npm install
cp .env.example .env    # edite com seu OWNER_NUMBER
npm install -g pm2
pm2 start index.js --name bot-recrutamento
pm2 save
pm2 startup              # siga as instruções que aparecerem
```

O QR aparece direto no terminal SSH. `pm2 logs bot-recrutamento` pra
acompanhar depois.

---

## Onde tudo fica salvo (progresso nunca se perde)

Tudo (moedas, aura, XP, nível, peixes, inventário, configs do grupo, lista de
mutados) é salvo automaticamente em `data/database.json`, reescrito a cada
alteração. **Faça backup periódico desse arquivo** (ou do Volume do Railway),
já que se o ambiente for apagado, ele some junto.

### Quer trocar por Firebase?

Dá pra trocar só o `db.js` (funções `load()`/`saveDb()`) para ler/escrever no
Firestore com `firebase-admin`, sem mexer no resto do bot. Se quiser essa
versão, me diga se você já tem um projeto Firebase criado.

---

## Comandos implementados

Rode `,menu` no grupo para ver a lista completa. Resumo:

- **Admin**: `,ban`, `,mute`, `,desmute`, `,grupo on/off`, `,bot on/off`,
  `,soadm on/off`, `,d` / `,apaga`, `,s` (figurinha)
- **Economia**: `,saldo`, `,aura`, `,nivel`, `,daily`, `,trabalhar`, `,doar`,
  `,ranking`
- **Loja**: `,loja`, `,comprar`, `,inventario`
- **Pesca**: `,pescar`, `,peixes`, `,vender peixe`
- **Aventura**: `,aventura`
- **Apostas**: `,apostar quantidade`
- **Perfil**: `,perfil`, `,conquistas`
- **Lore/Tribunal**: `,lore`, `,julgamento`, `,tribunal`, `,processo`,
  `,crime`, `,cancelado`
- **Ships**: `,ship`, `,casal`, `,divorcio`, `,crush`, `,ciumes`, `,date`,
  `,termino`
- **Aleatórios**: `,67`, `,aura`, `,azar`, `,sortudo`, `,npc`, `,lendario`,
  `,fracasso`, `,sus`, `,caos`, `,misterio`, `,profeta`, `,animal`,
  `,objeto`, `,profissao`, `,superpoder`, `,vilao`, `,heroi`, `,boss`,
  `,fofoca`, `,dramatico`, `,preguica`
- **Dono** (`OWNER_NUMBER` no `.env`): `,dar moedas/aura/xp/nivel @pessoa
  quantidade`, `,set moedas/aura/xp/nivel @pessoa quantidade`, `,reset
  @pessoa`, `,broadcast mensagem`

### Não implementado ainda (fácil de expandir)

- Tabuleiro real de jogo da velha (`,velha` hoje só anuncia a partida)
- Conquistas desbloqueadas automaticamente por marcos

---

## Estrutura do projeto

```
whatsapp-bot/
├── .devcontainer/devcontainer.json  # config do GitHub Codespaces
├── Dockerfile                       # config do Railway (Chromium incluso)
├── index.js         # conexão com WhatsApp + roteamento de mensagens
├── commands.js       # implementação de todos os comandos
├── templates.js       # frases dos comandos aleatórios (67, ship, lore...)
├── db.js               # persistência em data/database.json
├── data/                 # onde tudo fica salvo (criado automaticamente)
├── .env.example           # copie para .env e preencha
└── package.json
```
