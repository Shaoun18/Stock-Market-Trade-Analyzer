# DSE Multi-Brokerage Portfolio & Profit-Loss Tracker (v5.2 – PC + Mobile)

একই কোডবেজ, দুই ভার্সন:

| ভার্সন | ডাটা কোথায় থাকে | সার্ভার/পিসি লাগে? |
|---|---|---|
| **PC** | PostgreSQL + `storage/pdfs/<user_id>/` | হ্যাঁ (লোকাল সার্ভার) |
| **Mobile (PWA)** | ফোনের ব্রাউজার ডাটাবেস (IndexedDB) | না — ইন্টারনেট ছাড়াও চলে |

মোড ঠিক হয় `VITE_APP_MODE` দিয়ে (`.env.mobile` ফাইলে `mobile` সেট করা আছে)। কোড: `src/storage.js`।

---

## ১) PC ভার্সন
Requirements: Node.js 18+, PostgreSQL (localhost:5432)

1. `CREATE DATABASE dse_tracker;`
2. `server/index.js`-এ PostgreSQL পাসওয়ার্ড বসান (টেবিল নিজে তৈরি হবে)
3. `npm install`
4. দুই টার্মিনালে:
   ```bash
   npm run server   # http://localhost:5000
   npm run dev      # Vite frontend
   ```

## ২) Mobile ভার্সন (ফ্রি, পিসি ছাড়া)
**Option A — GitHub Pages (সবচেয়ে সহজ, সম্পূর্ণ ফ্রি)**
1. প্রজেক্ট GitHub-এ push করুন (branch: `main`)
2. Repo → Settings → Pages → **Source: GitHub Actions**
3. `.github/workflows/deploy-mobile.yml` নিজে বিল্ড ও ডিপ্লয় করবে
4. ফোনের Chrome-এ লিংক খুলুন → মেনু → **Add to Home screen / Install app**
   (iPhone: Safari → Share → **Add to Home Screen**)

**Option B — নিজে বিল্ড:** `npm run build:mobile` → `dist-mobile/` ফোল্ডারটি যেকোনো ফ্রি স্ট্যাটিক হোস্টে (Netlify, Cloudflare Pages ইত্যাদি) দিন।

**পিসিতে মোবাইল ভার্সন টেস্ট:** `npm run dev:mobile`

### মোবাইল ভার্সনের নিয়ম
- সব ডাটা ও PDF শুধু **ওই ফোনের ওই ব্রাউজারেই** থাকে। অন্য ফোন/পিসির সাথে সিঙ্ক হয় না।
- ব্রাউজারের "Clear site data / Clear storage" করলে বা অ্যাপ আনইনস্টল করলে **ডাটা মুছে যাবে**।
- প্রথমবার অনলাইনে খুলতে হবে; তারপর অফলাইনেও চলবে।
- PDF আপলোড করা হলে ফোনের ডাটাবেসে কপি হয়ে থাকে।

## Demo Login (ব্রাউজার-ওনলি)
- **Email:** `tanvir@lankabangla.demo`
- **Password:** `password123`

## v5.2 — কী কী নতুন
- Full Share table-এ নতুন কলাম: **Buy Cost (Qty × Avg Buy)**, **Market Value (Qty × Mkt Price)**, **Commission (Paid)** + নিচে **TOTAL** সারি
- নতুন কার্ড: **Account Balance (Cash)** — Portfolio Statement-এর Ledger Balance (+ Statement-এর পরের ট্রেডের হিসাব)
- **Current Shares / Sold Out** ফিল্টার ও শেয়ারের নামের তালিকা
- PDF-এর সাথে ০.০১ টাকার মিসম্যাচ ঠিক: Statement-এর নিজস্ব Total ব্যবহার হয়
- Statement-এর **পরের** Buy/Sell ট্রেড আর হারায় না (Statement + নতুন ট্রেড মিলিয়ে হিসাব)
- নতুন ইউজারে আগের ইউজারের "imported PDF" হ্যাশ আর জমা থাকে না
- Demo account-এর সব সংখ্যা এখন ১৮টি ট্রেড থেকে প্রোগ্রাম দিয়ে হিসাব করা (Holdings, Cash, Profit/Loss সব মিলে যায়)
