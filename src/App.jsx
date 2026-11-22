import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder, FolderOpen, Upload, Search, Calendar, TrendingUp, TrendingDown,
  User, LogOut, Plus, Trash2, Building2, Cloud, CloudOff, X, LineChart,
  CheckCircle2, AlertCircle, Smartphone, Monitor, FileText, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { db, isFirebaseConfigured } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Sanitized Demo Data ONLY (No personal user data included)
const DEMO_USERS = [
  {
    id: 'demo_user_1',
    name: 'Tanvir Hasan (Demo)',
    investorCode: 'LB4092',
    boId: '1201950045128830',
    brokerage: 'LankaBangla Securities Ltd.',
    records: {
      '2026-11-22': {
        date: '2026-11-22',
        deposit: 15000.00,
        availableBalance: 2450.50,
        marginable: [
          {
            company: 'GP', gr: 'A', totalQty: 20, salableQty: 20,
            buyPrice: 318.50, sellPrice: 326.00, totalCost: 6370.00, marketValue: 6520.00,
            pe: 12.4, history: [314.0, 316.2, 318.5, 321.0, 324.5, 326.0]
          },
          {
            company: 'BATBC', gr: 'A', totalQty: 10, salableQty: 10,
            buyPrice: 392.00, sellPrice: 385.50, totalCost: 3920.00, marketValue: 3855.00,
            pe: 14.1, history: [396.0, 394.5, 392.0, 390.0, 387.2, 385.5]
          },
          {
            company: 'RENATA', gr: 'A', totalQty: 3, salableQty: 3,
            buyPrice: 710.00, sellPrice: 724.00, totalCost: 2130.00, marketValue: 2172.00,
            pe: 18.2, history: [702.0, 705.5, 710.0, 715.0, 719.5, 724.0]
          }
        ],
        nonMarginable: [
          {
            company: 'ROBI', gr: 'A', totalQty: 50, salableQty: 50,
            buyPrice: 26.40, sellPrice: 27.80, totalCost: 1320.00, marketValue: 1390.00,
            pe: 21.5, history: [25.8, 26.0, 26.4, 26.9, 27.3, 27.8]
          },
          {
            company: 'OLYMPIC', gr: 'A', totalQty: 8, salableQty: 8,
            buyPrice: 158.00, sellPrice: 154.20, totalCost: 1264.00, marketValue: 1233.60,
            pe: 15.8, history: [160.0, 159.2, 158.0, 156.5, 155.0, 154.2]
          }
        ],
        trades: [
          { type: 'BUY', company: 'GP', gr: 'A', qty: 20, buyPrice: 318.50, sellPrice: 326.00, comm: 25.48 },
          { type: 'SELL', company: 'ROBI', gr: 'A', qty: 25, buyPrice: 26.40, sellPrice: 27.80, comm: 2.78 }
        ],
        sectors: [
          { sector: 'TELECOMMUNICATION', amount: 7690.00, pct: 51.25 },
          { sector: 'FOOD & ALLIED', amount: 5184.00, pct: 34.55 },
          { sector: 'PHARMACEUTICALS', amount: 2130.00, pct: 14.20 }
        ],
        news: [
          { company: 'GP', date: '22-Nov-2026', text: 'Board declared interim cash dividend for shareholders.' },
          { company: 'ROBI', date: '21-Nov-2026', text: 'Q3 revenue grew by 8.4% YoY according to DSE filing.' }
        ]
      }
    }
  },
  {
    id: 'demo_user_2',
    name: 'Nusrat Jahan (Demo)',
    investorCode: 'EBL8814',
    boId: '1203120088941205',
    brokerage: 'EBL Securities Ltd.',
    records: {
      '2026-11-22': {
        date: '2026-11-22',
        deposit: 25000.00,
        availableBalance: 4120.00,
        marginable: [
          {
            company: 'MARICO', gr: 'A', totalQty: 5, salableQty: 5,
            buyPrice: 2380.00, sellPrice: 2425.00, totalCost: 11900.00, marketValue: 12125.00,
            pe: 16.9, history: [2350, 2365, 2380, 2395, 2410, 2425]
          },
          {
            company: 'EBL', gr: 'A', totalQty: 150, salableQty: 150,
            buyPrice: 27.50, sellPrice: 26.90, totalCost: 4125.00, marketValue: 4035.00,
            pe: 6.2, history: [28.1, 27.8, 27.5, 27.3, 27.1, 26.9]
          }
        ],
        nonMarginable: [
          {
            company: 'WALTONHIL', gr: 'A', totalQty: 6, salableQty: 6,
            buyPrice: 640.00, sellPrice: 658.00, totalCost: 3840.00, marketValue: 3948.00,
            pe: 19.4, history: [630, 634, 640, 646, 652, 658]
          }
        ],
        trades: [
          { type: 'BUY', company: 'MARICO', gr: 'A', qty: 5, buyPrice: 2380.00, sellPrice: 2425.00, comm: 47.60 }
        ],
        sectors: [
          { sector: 'PHARMACEUTICALS & CHEMICALS', amount: 11900.00, pct: 59.90 },
          { sector: 'BANK', amount: 4125.00, pct: 20.77 },
          { sector: 'ENGINEERING', amount: 3840.00, pct: 19.33 }
        ],
        news: [
          { company: 'WALTONHIL', date: '22-Nov-2026', text: 'Export expansion update published on DSE portal.' }
        ]
      }
    }
  }
];

const BROKERAGES = [
  'BRAC EPL Stock Brokerage Ltd.',
  'LankaBangla Securities Ltd.',
  'EBL Securities Ltd.',
  'IDLC Securities Ltd.',
  'City Brokerage Ltd.',
  'UCB Stock Brokerage Ltd.',
  'ICB Securities Trading Co. Ltd.',
  'Universal DSE / CSE Broker'
];

// Interactive SVG Sparkline / Trend Graph Modal Component
function ShareTrendModal({ share, onClose }) {
  if (!share) return null;
  const buy = Number(share.buyPrice || 0);
  const sell = Number(share.sellPrice || 0);
  const qty = Number(share.totalQty || share.qty || 1);
  const diffPerShare = sell - buy;
  const totalPL = diffPerShare * qty;
  const pct = buy > 0 ? ((diffPerShare / buy) * 100) : 0;
  const isGain = diffPerShare >= 0;

  const points = share.history && share.history.length >= 2
    ? share.history
    : [
        +(buy * 0.985).toFixed(2),
        +(buy * 0.995).toFixed(2),
        +buy.toFixed(2),
        +((buy + sell) / 2).toFixed(2),
        +sell.toFixed(2)
      ];

  const minVal = Math.min(...points) * 0.995;
  const maxVal = Math.max(...points) * 1.005;
  const range = maxVal - minVal || 1;
  const width = 460;
  const height = 180;
  const pad = 24;

  const coords = points.map((val, idx) => {
    const x = pad + (idx / (points.length - 1)) * (width - pad * 2);
    const y = height - pad - ((val - minVal) / range) * (height - pad * 2);
    return { x, y, val };
  });

  const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ');
  const areaPoints = `${coords[0].x},${height - pad} ${polylinePoints} ${coords[coords.length - 1].x},${height - pad}`;
  const strokeColor = isGain ? '#10b981' : '#ef4444';
  const fillGradientId = isGain ? 'gainGrad' : 'lossGrad';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isGain ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {isGain ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                {share.company}
                <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">Group {share.gr || 'A'}</span>
              </h3>
              <p className="text-xs text-slate-500">Price Movement & Profit/Loss Trajectory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Buying Price</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">৳{buy.toFixed(2)}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Selling / Mkt Price</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">৳{sell.toFixed(2)}</div>
            </div>
            <div className={`p-3 rounded-xl border ${isGain ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className="text-[11px] text-slate-600 font-medium">Status Signal</div>
              <div className={`text-sm font-bold mt-0.5 flex items-center gap-1 ${isGain ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isGain ? '▲ INCREASING' : '▼ DECREASING'}
              </div>
            </div>
            <div className={`p-3 rounded-xl border ${isGain ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className="text-[11px] text-slate-600 font-medium">Net Gain / Loss</div>
              <div className={`text-sm font-bold mt-0.5 ${isGain ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isGain ? '+' : ''}৳{totalPL.toFixed(2)} ({isGain ? '+' : ''}{pct.toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Trend Chart ({points.length} Checkpoints)</span>
              <span className={isGain ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {isGain ? `+৳${diffPerShare.toFixed(2)} / share` : `-৳${Math.abs(diffPerShare).toFixed(2)} / share`}
              </span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id="gainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1={pad} y1={pad} x2={width - pad} y2={pad} stroke="#334155" strokeDasharray="4 4" />
              <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke="#334155" strokeDasharray="4 4" />
              <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#334155" strokeDasharray="4 4" />

              <polygon points={areaPoints} fill={`url(#${fillGradientId})`} />
              <polyline fill="none" stroke={strokeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" points={polylinePoints} />

              {coords.map((c, i) => (
                <g key={i}>
                  <circle cx={c.x} cy={c.y} r="5" fill="#0f172a" stroke={strokeColor} strokeWidth="2.5" />
                  <text x={c.x} y={c.y - 10} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="600">
                    {c.val.toFixed(1)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// Collapsible Folder Section Component
function FolderSection({ title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/90 hover:bg-slate-100/80 transition-colors border-b border-slate-200 text-left"
      >
        <div className="flex items-center gap-2.5">
          {open ? <FolderOpen className="w-5 h-5 text-amber-500 shrink-0" /> : <Folder className="w-5 h-5 text-amber-500 shrink-0" />}
          <span className="font-bold text-slate-800 text-sm sm:text-base">{title}</span>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
              {badge}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-slate-500">{open ? 'Hide ▲' : 'Open ▼'}</span>
      </button>
      {open && <div className="overflow-x-auto">{children}</div>}
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('dse_multi_users_v2');
    return saved ? JSON.parse(saved) : DEMO_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState(() => {
    return localStorage.getItem('dse_active_user_id_v2') || DEMO_USERS[0].id;
  });

  const currentUser = useMemo(
    () => users.find(u => u.id === currentUserId) || users[0],
    [users, currentUserId]
  );

  const availableDates = useMemo(
    () => Object.keys(currentUser?.records || {}).sort().reverse(),
    [currentUser]
  );

  const [selectedDate, setSelectedDate] = useState(() => availableDates[0] || '2026-11-22');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShare, setSelectedShare] = useState(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState(isFirebaseConfigured ? 'Firebase Ready' : 'Local Storage Mode');
  const [uploadNotice, setUploadNotice] = useState('');

  // New user form state
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newBoId, setNewBoId] = useState('');
  const [newBroker, setNewBroker] = useState(BROKERAGES[0]);

  useEffect(() => {
    if (!availableDates.includes(selectedDate) && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [currentUserId, availableDates, selectedDate]);

  useEffect(() => {
    localStorage.setItem('dse_multi_users_v2', JSON.stringify(users));
    localStorage.setItem('dse_active_user_id_v2', currentUserId);
  }, [users, currentUserId]);

  // Sync user workspace to Firebase Firestore if configured
  const syncToFirebase = async (updatedUser) => {
    if (!isFirebaseConfigured || !db) return;
    try {
      setSyncStatus('Syncing to Firebase...');
      await setDoc(doc(db, 'portfolios', updatedUser.id), updatedUser);
      setSyncStatus('Synced with Firebase');
    } catch (err) {
      console.error('Firebase sync error:', err);
      setSyncStatus('Firebase Sync Error');
    }
  };

  // Load from Firebase if available on user switch
  useEffect(() => {
    async function loadFromCloud() {
      if (!isFirebaseConfigured || !db || !currentUserId) return;
      try {
        const snap = await getDoc(doc(db, 'portfolios', currentUserId));
        if (snap.exists()) {
          const cloudData = snap.data();
          setUsers(prev => prev.map(u => (u.id === currentUserId ? cloudData : u)));
          setSyncStatus('Synced with Firebase');
        }
      } catch (e) {
        console.warn('Cloud fetch skipped:', e);
      }
    }
    loadFromCloud();
  }, [currentUserId]);

  const currentRecord = currentUser?.records?.[selectedDate] || {
    date: selectedDate,
    deposit: 0,
    availableBalance: 0,
    marginable: [],
    nonMarginable: [],
    trades: [],
    sectors: [],
    news: []
  };

  // Parse uploaded PDF (Portfolio Statement or Trade Confirmation)
  const handlePdfUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(' ') + '
';
        }

        const dateMatch = fullText.match(/(\d{1,2}[-/][A-Za-z]{3}[-/]\d{4})|([A-Za-z]{3}\s+\d{1,2},\s*\d{4})/);
        let targetDate = selectedDate;
        if (dateMatch) {
          const parsed = new Date(dateMatch[0]);
          if (!isNaN(parsed.getTime())) {
            targetDate = parsed.toISOString().split('T')[0];
          }
        }

        // Extract stock rows dynamically (Company, Group, Qty, Salable, BuyPrice, TotalCost, SellPrice, MarketVal)
        const rowRegex = /([A-Z]{2,12}\*?)\s+([ABZNG])\s+(\d+)\s+(\d+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;
        const extractedShares = [];
        let match;
        while ((match = rowRegex.exec(fullText)) !== null) {
          const company = match[1].replace('*', '');
          const gr = match[2];
          const totalQty = parseInt(match[3], 10);
          const salableQty = parseInt(match[4], 10);
          const buyPrice = parseFloat(match[5].replace(/,/g, ''));
          const totalCost = parseFloat(match[6].replace(/,/g, ''));
          const sellPrice = parseFloat(match[7].replace(/,/g, ''));
          const marketValue = parseFloat(match[8].replace(/,/g, ''));

          extractedShares.push({
            company,
            gr,
            totalQty,
            salableQty,
            buyPrice,
            sellPrice,
            totalCost,
            marketValue,
            pe: 0,
            history: [+(buyPrice * 0.99).toFixed(2), buyPrice, +((buyPrice + sellPrice) / 2).toFixed(2), sellPrice]
          });
        }

        // Extract Trade Confirmation rows (BUY/SELL)
        const tradeRegex = /Public\s+(BUY|SELL)\s+(?:DSE|CSE)\s+([ABZNG])\s+([A-Z]{2,12})\s+(\d+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;
        const extractedTrades = [];
        let tMatch;
        while ((tMatch = tradeRegex.exec(fullText)) !== null) {
          const type = tMatch[1];
          const gr = tMatch[2];
          const company = tMatch[3];
          const qty = parseInt(tMatch[4], 10);
          const rate = parseFloat(tMatch[5].replace(/,/g, ''));
          const comm = parseFloat(tMatch[7].replace(/,/g, ''));
          extractedTrades.push({
            type,
            company,
            gr,
            qty,
            buyPrice: type === 'BUY' ? rate : +(rate * 0.97).toFixed(2),
            sellPrice: rate,
            comm
          });
        }

        setUsers(prev =>
          prev.map(user => {
            if (user.id !== currentUserId) return user;
            const existingRec = user.records[targetDate] || {
              date: targetDate,
              deposit: 0,
              availableBalance: 0,
              marginable: [],
              nonMarginable: [],
              trades: [],
              sectors: [],
              news: []
            };

            const updatedRec = {
              ...existingRec,
              marginable: extractedShares.length > 0 ? extractedShares : existingRec.marginable,
              trades: extractedTrades.length > 0 ? [...existingRec.trades, ...extractedTrades] : existingRec.trades
            };

            const updatedUser = {
              ...user,
              records: {
                ...user.records,
                [targetDate]: updatedRec
              }
            };
            syncToFirebase(updatedUser);
            return updatedUser;
          })
        );

        setSelectedDate(targetDate);
        setUploadNotice(`Uploaded "${file.name}" for ${targetDate}`);
        setTimeout(() => setUploadNotice(''), 4000);
      } catch (err) {
        console.error(err);
        setUploadNotice(`Parsed file "${file.name}" (check format if fields are empty).`);
      }
    }
    e.target.value = '';
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;
    const id = 'user_' + Date.now();
    const created = {
      id,
      name: newName.trim(),
      investorCode: newCode.trim().toUpperCase(),
      boId: newBoId.trim() || '1200000000000000',
      brokerage: newBroker,
      records: {
        [new Date().toISOString().split('T')[0]]: {
          date: new Date().toISOString().split('T')[0],
          deposit: 0,
          availableBalance: 0,
          marginable: [],
          nonMarginable: [],
          trades: [],
          sectors: [],
          news: []
        }
      }
    };
    setUsers(prev => [...prev, created]);
    setCurrentUserId(id);
    syncToFirebase(created);
    setNewName('');
    setNewCode('');
    setNewBoId('');
    setShowNewUserModal(false);
  };

  const filterList = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(item => item.company.toLowerCase().includes(q));
  };

  const marginableRows = filterList(currentRecord.marginable || []);
  const nonMarginableRows = filterList(currentRecord.nonMarginable || []);
  const tradeRows = filterList(currentRecord.trades || []);

  const allHoldings = [...(currentRecord.marginable || []), ...(currentRecord.nonMarginable || [])];
  const totalBuyCost = allHoldings.reduce((acc, s) => acc + s.buyPrice * s.totalQty, 0);
  const totalSellVal = allHoldings.reduce((acc, s) => acc + s.sellPrice * s.totalQty, 0);
  const netPL = totalSellVal - totalBuyCost;
  const netPLPct = totalBuyCost > 0 ? (netPL / totalBuyCost) * 100 : 0;

  // Render Holding Table with Explicit Buying Price, Selling Price, Profit/Gain (Green) & Loss (Red) Columns
  const renderHoldingsTable = (rows) => (
    <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[920px]">
      <thead>
        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
          <th className="py-2.5 px-3">Company Name</th>
          <th className="py-2.5 px-2 text-center">Gr</th>
          <th className="py-2.5 px-2 text-right">Total Qty</th>
          <th className="py-2.5 px-2 text-right">Salable</th>
          <th className="py-2.5 px-3 text-right bg-blue-50/60 text-blue-900">Buying Price (Tk.)</th>
          <th className="py-2.5 px-3 text-right bg-indigo-50/60 text-indigo-900">Selling / Mkt Price (Tk.)</th>
          <th className="py-2.5 px-3 text-right">Total Cost</th>
          <th className="py-2.5 px-3 text-right">Market Value</th>
          <th className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-800">Profit / Gain (Green)</th>
          <th className="py-2.5 px-3 text-center bg-rose-50/70 text-rose-800">Loss (Red)</th>
          <th className="py-2.5 px-2 text-center">Trend Graph</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={11} className="py-6 text-center text-slate-400">
              No shares recorded for this date. Upload your daily PDF statement above.
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const diff = (row.sellPrice - row.buyPrice) * row.totalQty;
            const pct = row.buyPrice > 0 ? ((row.sellPrice - row.buyPrice) / row.buyPrice) * 100 : 0;
            const isGain = diff >= 0;

            return (
              <tr
                key={idx}
                onClick={() => setSelectedShare(row)}
                className="hover:bg-amber-50/50 cursor-pointer transition-colors group"
                title="Click to inspect price trend graph"
              >
                <td className="py-2.5 px-3 font-bold text-slate-900 group-hover:text-blue-700 flex items-center gap-1.5">
                  <span>{row.company}</span>
                  <LineChart className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                </td>
                <td className="py-2.5 px-2 text-center font-medium text-slate-600">{row.gr}</td>
                <td className="py-2.5 px-2 text-right font-medium">{row.totalQty}</td>
                <td className="py-2.5 px-2 text-right text-slate-600">{row.salableQty}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-blue-900 bg-blue-50/20">
                  ৳{Number(row.buyPrice).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-indigo-900 bg-indigo-50/20">
                  ৳{Number(row.sellPrice).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-700">
                  ৳{(row.buyPrice * row.totalQty).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                  ৳{(row.sellPrice * row.totalQty).toFixed(2)}
                </td>
                {/* Separate Profit/Gain Column (Green Signal) */}
                <td className="py-2.5 px-3 text-center">
                  {isGain ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      +৳{diff.toFixed(2)} (+{pct.toFixed(2)}%)
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                {/* Separate Loss Column (Red Signal) */}
                <td className="py-2.5 px-3 text-center">
                  {!isGain ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                      -৳{Math.abs(diff).toFixed(2)} ({pct.toFixed(2)}%)
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShare(row);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                      isGain
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {isGain ? '▲ Graph' : '▼ Graph'}
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Navigation Bar (Responsive Web & Mobile) */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight">DSE Smart Portfolio Tracker</h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> {currentUser?.brokerage} • Web & Mobile Responsive
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Firebase / Storage Indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isFirebaseConfigured
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : 'bg-slate-800 text-amber-300 border-slate-700'
            }`}>
              {isFirebaseConfigured ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
              <span>{syncStatus}</span>
            </div>

            {/* Multi-User Switcher */}
            <select
              value={currentUserId}
              onChange={(e) => setCurrentUserId(e.target.value)}
              className="bg-slate-800 text-white text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-400"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.investorCode})
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowNewUserModal(true)}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Account</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 space-y-5">
        {uploadNotice && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between shadow">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {uploadNotice}</span>
            <button onClick={() => setUploadNotice('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Investor Info & KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Investor Profile</div>
            <div className="font-bold text-slate-900 text-base mt-1">{currentUser?.name}</div>
            <div className="text-xs text-slate-600 mt-0.5">Code: <b>{currentUser?.investorCode}</b> | BO: {currentUser?.boId}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Total Buying Cost</div>
            <div className="font-bold text-blue-900 text-xl mt-1">৳{totalBuyCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-slate-500 mt-0.5">Available Cash: ৳{Number(currentRecord.availableBalance || 0).toFixed(2)}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Current Selling / Market Value</div>
            <div className="font-bold text-indigo-900 text-xl mt-1">৳{totalSellVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-slate-500 mt-0.5">Active Instruments: {allHoldings.length}</div>
          </div>

          <div className={`p-4 rounded-xl border shadow-sm ${netPL >= 0 ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/80 border-rose-200'}`}>
            <div className="text-xs text-slate-600 font-medium">Net Unrealized Gain / Loss</div>
            <div className={`font-bold text-xl mt-1 flex items-center gap-1.5 ${netPL >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {netPL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span>{netPL >= 0 ? '+' : ''}৳{netPL.toFixed(2)} ({netPL >= 0 ? '+' : ''}{netPLPct.toFixed(2)}%)</span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">Click any share row for trend graph</div>
          </div>
        </div>

        {/* Action Bar: Date Filter, Company Search & PDF Upload */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            {/* Date Picker & Saved Dates */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none w-full"
              />
            </div>

            {availableDates.length > 0 && (
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700"
              >
                {availableDates.map(d => (
                  <option key={d} value={d}>Saved Date: {d}</option>
                ))}
              </select>
            )}

            {/* Search Company */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search company (e.g., GP, ROBI, BATBC)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm w-full focus:outline-none"
              />
            </div>
          </div>

          {/* Upload Daily Broker PDF */}
          <label className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg cursor-pointer transition shadow-sm shrink-0">
            <Upload className="w-4 h-4" />
            <span>Upload Daily PDF</span>
            <input type="file" accept="application/pdf" multiple onChange={handlePdfUpload} className="hidden" />
          </label>
        </div>

        {/* Folder 1: Marginable Securities */}
        <FolderSection title="Marginable Securities" badge={`${marginableRows.length} Shares`} defaultOpen={true}>
          {renderHoldingsTable(marginableRows)}
        </FolderSection>

        {/* Folder 2: Non-Marginable Securities */}
        <FolderSection title="Non-Marginable Securities" badge={`${nonMarginableRows.length} Shares`} defaultOpen={true}>
          {renderHoldingsTable(nonMarginableRows)}
        </FolderSection>

        {/* Folder 3: Trade Confirmation Note (Daily Buy & Sell) */}
        <FolderSection title="Trade Confirmation Note (Buy & Sell)" badge={`${tradeRows.length} Orders`} defaultOpen={true}>
          <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Instrument</th>
                <th className="py-2.5 px-2 text-center">Gr</th>
                <th className="py-2.5 px-2 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Buying Price (Tk.)</th>
                <th className="py-2.5 px-3 text-right">Selling Price (Tk.)</th>
                <th className="py-2.5 px-3 text-right">Comm (Tk.)</th>
                <th className="py-2.5 px-3 text-center">Profit / Gain (Green)</th>
                <th className="py-2.5 px-3 text-center">Loss (Red)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tradeRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-5 text-center text-slate-400">No trade orders recorded on {selectedDate}.</td>
                </tr>
              ) : (
                tradeRows.map((t, idx) => {
                  const netDiff = (t.sellPrice - t.buyPrice) * t.qty - (t.comm || 0);
                  const pct = t.buyPrice > 0 ? ((t.sellPrice - t.buyPrice) / t.buyPrice) * 100 : 0;
                  const isGain = netDiff >= 0;
                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedShare({ ...t, totalQty: t.qty })}
                      className="hover:bg-amber-50/50 cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.type === 'BUY' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{t.company}</td>
                      <td className="py-2.5 px-2 text-center">{t.gr}</td>
                      <td className="py-2.5 px-2 text-right font-medium">{t.qty}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-900">৳{Number(t.buyPrice).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-indigo-900">৳{Number(t.sellPrice).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">৳{Number(t.comm || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center">
                        {isGain ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            +৳{netDiff.toFixed(2)} (+{pct.toFixed(2)}%)
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {!isGain ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            -৳{Math.abs(netDiff).toFixed(2)} ({pct.toFixed(2)}%)
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </FolderSection>

        {/* Folder 4: Sector Wise Investment */}
        <FolderSection title="Sector Wise Investment" badge={`${(currentRecord.sectors || []).length} Sectors`} defaultOpen={false}>
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-4">Sector Name</th>
                <th className="py-2.5 px-4 text-right">Investment Amount (Tk.)</th>
                <th className="py-2.5 px-4 text-right">Allocation (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(currentRecord.sectors || []).map((sec, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{sec.sector}</td>
                  <td className="py-2.5 px-4 text-right">৳{Number(sec.amount).toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-blue-700">{Number(sec.pct).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </FolderSection>

        {/* Folder 5: DSE Market News */}
        <FolderSection title="DSE News & Corporate Announcements" badge={`${(currentRecord.news || []).length} Updates`} defaultOpen={false}>
          <div className="divide-y divide-slate-100">
            {(currentRecord.news || []).map((n, i) => (
              <div key={i} className="p-3.5 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-blue-800 text-xs sm:text-sm mr-2">[{n.company}]</span>
                  <span className="text-xs sm:text-sm text-slate-700">{n.text}</span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{n.date}</span>
              </div>
            ))}
          </div>
        </FolderSection>
      </main>

      {/* Share Price Increase/Decrease Graph Modal */}
      <ShareTrendModal share={selectedShare} onClose={() => setSelectedShare(null)} />

      {/* Add New Multi-User Account Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Create Investor Account</h3>
              <button onClick={() => setShowNewUserModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Investor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Client / Investor Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR8576"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">BO ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="16-digit BO ID"
                    value={newBoId}
                    onChange={e => setNewBoId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brokerage House</label>
                <select
                  value={newBroker}
                  onChange={e => setNewBroker(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  {BROKERAGES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewUserModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                  Create & Open Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
