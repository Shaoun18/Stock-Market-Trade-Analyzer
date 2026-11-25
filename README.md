# DSE Multi-Brokerage Portfolio & Profit-Loss Tracker (v5 – Local PostgreSQL)

## Requirements
- Node.js 18+
- PostgreSQL (running on localhost:5432)

## One-time setup
1. Create the database (pgAdmin or psql):
   ```sql
   CREATE DATABASE dse_tracker;
   ```
2. Open `server/index.js` and set your PostgreSQL password (`YOUR_POSTGRES_PASSWORD`).
   Tables (`users`, `workspaces`) are created automatically on first server start.
3. Install dependencies:
   ```bash
   npm install
   ```

## Run (two terminals)
```bash
npm run server   # Terminal 1 → http://localhost:5000  (PostgreSQL + PDF storage)
npm run dev      # Terminal 2 → Vite frontend
```

PDFs are saved on your PC in `storage/pdfs/<user_id>/`.

## Demo Login (browser-only, no database)
- **Email:** `tanvir@lankabangla.demo`
- **Password:** `password123`
