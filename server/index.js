import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const PDF_STORAGE_DIR = path.join(ROOT_DIR, 'storage', 'pdfs');

// Create a folder for storing PDFs on the PC if it does not exist
fs.mkdirSync(PDF_STORAGE_DIR, { recursive: true });

const { Pool } = pg;
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dse_tracker',
  password: 'YOUR_POSTGRES_PASSWORD', // <-- Use PostgreSQL database password
  port: 5432,
});

// Create tables if they don't exist
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_code TEXT,
      bo_id TEXT,
      brokerage TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      deposit_amount NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspaces (
      uid TEXT PRIMARY KEY,
      trades JSONB DEFAULT '[]'::jsonb,
      market_prices JSONB DEFAULT '{}'::jsonb,
      statement_snapshots JSONB DEFAULT '{}'::jsonb,
      imported_hashes JSONB DEFAULT '[]'::jsonb,
      pdfs_by_date JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Route to directly open PDFs from the PC folder
app.use('/local-pdfs', express.static(PDF_STORAGE_DIR));

// Multer to save PDFs to the PC disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uid = String(req.params.uid || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    const userDir = path.join(PDF_STORAGE_DIR, uid);
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});
const upload = multer({ storage });

// Signup API
app.post('/api/auth/signup', async (req, res) => {
  const { name, clientCode, boId, brokerage, email, password } = req.body;
  try {
    const existing = await pool.query('SELECT uid FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে।' });
    }
    const uid = 'user-' + Date.now();
    await pool.query(
      `INSERT INTO users (uid, name, client_code, bo_id, brokerage, email, password, deposit_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
      [uid, name, clientCode.toUpperCase(), boId, brokerage, email.toLowerCase(), password]
    );
    await pool.query('INSERT INTO workspaces (uid) VALUES ($1)', [uid]);

    res.json({
      uid,
      name,
      clientCode: clientCode.toUpperCase(),
      boId,
      brokerage,
      email: email.toLowerCase(),
      depositAmount: 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login API
app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND password = $2',
      [email, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।' });
    }
    const u = result.rows[0];
    res.json({
      uid: u.uid,
      name: u.name,
      clientCode: u.client_code,
      boId: u.bo_id,
      brokerage: u.brokerage,
      email: u.email,
      depositAmount: Number(u.deposit_amount || 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load user data and PDF list from the database API
app.get('/api/workspace/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const ws = await pool.query('SELECT * FROM workspaces WHERE uid = $1', [uid]);
    if (ws.rows.length === 0) {
      return res.json({ trades: [], marketPrices: {}, statementSnapshots: {}, importedHashes: [], pdfsByDate: {} });
    }
    const row = ws.rows[0];
    res.json({
      trades: row.trades || [],
      marketPrices: row.market_prices || {},
      statementSnapshots: row.statement_snapshots || {},
      importedHashes: row.imported_hashes || [],
      pdfsByDate: row.pdfs_by_date || {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload PDF to the PC disk API
app.post('/api/upload-pdf/:uid', upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
  const uid = String(req.params.uid).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileUrl = `http://localhost:5000/local-pdfs/${uid}/${req.file.filename}`;
  res.json({ url: fileUrl, savedPath: req.file.path });
});

// Save user data to the database API
app.post('/api/workspace/:uid', async (req, res) => {
  const { uid } = req.params;
  const { profile, trades, marketPrices, statementSnapshots, importedHashes, pdfsByDate } = req.body;
  try {
    if (profile && typeof profile.depositAmount === 'number') {
      await pool.query('UPDATE users SET deposit_amount = $1 WHERE uid = $2', [profile.depositAmount, uid]);
    }
    await pool.query(
      `INSERT INTO workspaces (uid, trades, market_prices, statement_snapshots, imported_hashes, pdfs_by_date, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, NOW())
       ON CONFLICT (uid) DO UPDATE SET
         trades = EXCLUDED.trades,
         market_prices = EXCLUDED.market_prices,
         statement_snapshots = EXCLUDED.statement_snapshots,
         imported_hashes = EXCLUDED.imported_hashes,
         pdfs_by_date = EXCLUDED.pdfs_by_date,
         updated_at = NOW()`,
      [
        uid,
        JSON.stringify(trades || []),
        JSON.stringify(marketPrices || {}),
        JSON.stringify(statementSnapshots || {}),
        JSON.stringify(importedHashes || []),
        JSON.stringify(pdfsByDate || {}),
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDb()
  .then(() => {
    app.listen(5000, () => {
      console.log('✅ Local PostgreSQL & PDF Storage Server running at http://localhost:5000');
      console.log('📁 PDFs will be saved in:', PDF_STORAGE_DIR);
    });
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection failed. Check database "dse_tracker" and password in server/index.js');
    console.error(err.message);
    process.exit(1);
  });
