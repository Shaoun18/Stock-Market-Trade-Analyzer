// ---------------------------------------------------------------
// Storage adapter — একই কোডবেজ, দুই ধরনের স্টোরেজ:
//   PC     (npm run dev / npm run server) → PostgreSQL + পিসির storage/pdfs ফোল্ডার
//   Mobile (npm run build:mobile)         → ফোনের ব্রাউজার ডাটাবেস (IndexedDB), কোনো সার্ভার/পিসি লাগে না
// মোড ঠিক হয় VITE_APP_MODE দিয়ে (.env.mobile ফাইলে mobile সেট করা আছে)।
// ---------------------------------------------------------------

export const APP_MODE = import.meta.env.VITE_APP_MODE === 'mobile' ? 'mobile' : 'pc';
const API_BASE = 'http://localhost:5000/api';

/* ======================= PC MODE (PostgreSQL) ======================= */

const pcStorage = {
  async signIn(email, password) {
    const res = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।');
    return data;
  },

  async signUp(payload) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে।');
    return data;
  },

  async loadWorkspace(uid) {
    const res = await fetch(`${API_BASE}/workspace/${uid}`);
    return res.json();
  },

  async saveWorkspace(uid, body) {
    await fetch(`${API_BASE}/workspace/${uid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async savePdf(uid, file) {
    const formData = new FormData();
    formData.append('pdf', file);
    const res = await fetch(`${API_BASE}/upload-pdf/${uid}`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'PDF upload failed');
    return { url: data.url };
  },
};

/* ====================== MOBILE MODE (IndexedDB) ===================== */

const DB_NAME = 'dse_tracker_mobile';
const DB_VERSION = 1;
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('users')) {
        const users = db.createObjectStore('users', { keyPath: 'uid' });
        users.createIndex('email', 'email', { unique: true });
      }
      if (!db.objectStoreNames.contains('workspaces')) {
        db.createObjectStore('workspaces', { keyPath: 'uid' });
      }
      if (!db.objectStoreNames.contains('pdfs')) {
        db.createObjectStore('pdfs', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idb(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function hashPassword(password, salt) {
  const text = `${salt}:${password}`;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return text; // very old browsers only
}

function publicUser(u) {
  return {
    uid: u.uid,
    name: u.name,
    clientCode: u.clientCode,
    boId: u.boId,
    brokerage: u.brokerage,
    email: u.email,
    depositAmount: Number(u.depositAmount || 0),
  };
}

const mobileStorage = {
  async signUp({ name, clientCode, boId, brokerage, email, password }) {
    const emailLower = email.trim().toLowerCase();
    const existing = await idb('users', 'readonly', (s) => s.index('email').get(emailLower));
    if (existing) throw new Error('এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে।');

    const uid = 'user-' + Date.now();
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const user = {
      uid,
      name,
      clientCode: clientCode.toUpperCase(),
      boId,
      brokerage,
      email: emailLower,
      salt,
      passwordHash: await hashPassword(password, salt),
      depositAmount: 0,
    };
    await idb('users', 'readwrite', (s) => s.add(user));
    await idb('workspaces', 'readwrite', (s) =>
      s.put({ uid, trades: [], marketPrices: {}, statementSnapshots: {}, importedHashes: [], pdfsByDate: {} })
    );
    return publicUser(user);
  },

  async signIn(email, password) {
    const user = await idb('users', 'readonly', (s) => s.index('email').get(email.trim().toLowerCase()));
    if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
      throw new Error('ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।');
    }
    return publicUser(user);
  },

  async loadWorkspace(uid) {
    const ws = await idb('workspaces', 'readonly', (s) => s.get(uid));
    if (!ws) {
      return { trades: [], marketPrices: {}, statementSnapshots: {}, importedHashes: [], pdfsByDate: {} };
    }
    // সেভ করা PDF ফাইল (Blob) থেকে নতুন ভিউ-লিংক বানানো
    const pdfsByDate = {};
    for (const [dt, list] of Object.entries(ws.pdfsByDate || {})) {
      if (!Array.isArray(list)) continue;
      const resolved = [];
      for (const entry of list) {
        if (!entry?.storageKey) continue;
        const rec = await idb('pdfs', 'readonly', (s) => s.get(entry.storageKey));
        if (rec?.blob) resolved.push({ ...entry, url: URL.createObjectURL(rec.blob) });
      }
      if (resolved.length > 0) pdfsByDate[dt] = resolved;
    }
    return { ...ws, pdfsByDate };
  },

  async saveWorkspace(uid, body) {
    const { profile, trades, marketPrices, statementSnapshots, importedHashes, pdfsByDate } = body;

    if (profile && typeof profile.depositAmount === 'number') {
      const user = await idb('users', 'readonly', (s) => s.get(uid));
      if (user) {
        user.depositAmount = profile.depositAmount;
        await idb('users', 'readwrite', (s) => s.put(user));
      }
    }

    // blob: লিংক সেভ হয় না — শুধু storageKey রাখা হয়
    const cleanPdfs = {};
    for (const [dt, list] of Object.entries(pdfsByDate || {})) {
      const kept = (list || []).filter((e) => e?.storageKey).map(({ url, ...rest }) => rest);
      if (kept.length > 0) cleanPdfs[dt] = kept;
    }

    await idb('workspaces', 'readwrite', (s) =>
      s.put({
        uid,
        trades: trades || [],
        marketPrices: marketPrices || {},
        statementSnapshots: statementSnapshots || {},
        importedHashes: importedHashes || [],
        pdfsByDate: cleanPdfs,
        updatedAt: Date.now(),
      })
    );
  },

  async savePdf(uid, file) {
    const storageKey = `${uid}/${Date.now()}_${file.name}`;
    await idb('pdfs', 'readwrite', (s) => s.put({ key: storageKey, name: file.name, blob: file }));
    return { url: URL.createObjectURL(file), storageKey };
  },
};

/* ============================== Export ============================== */

const impl = APP_MODE === 'mobile' ? mobileStorage : pcStorage;

export const signIn = impl.signIn;
export const signUp = impl.signUp;
export const loadWorkspace = impl.loadWorkspace;
export const saveWorkspace = impl.saveWorkspace;
export const savePdf = impl.savePdf;

// ব্রাউজার যেন স্টোরেজ ডাটা নিজে থেকে মুছে না ফেলে — সেজন্য "persistent" অনুরোধ
export async function requestPersistentStorage() {
  try {
    if (APP_MODE === 'mobile' && navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}
