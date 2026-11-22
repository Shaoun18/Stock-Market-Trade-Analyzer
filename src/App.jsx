import React, { useState, useEffect, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  Upload,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  Building2,
  Cloud,
  CloudOff,
  X,
  LineChart,
  CheckCircle2,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Layers,
  Repeat,
  Filter,
  ExternalLink,
  LogOut,
  Lock,
  Mail,
  UserCheck,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { db, storage, isFirebaseConfigured } from "./firebase";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const BROKERAGES = [
  "BRAC EPL Stock Brokerage Ltd.",
  "LankaBangla Securities Ltd.",
  "EBL Securities Ltd.",
  "IDLC Securities Ltd.",
  "City Brokerage Ltd.",
  "UCB Stock Brokerage Ltd.",
  "ICB Securities Trading Co. Ltd.",
  "Universal DSE / CSE Broker",
];

const INITIAL_ACCOUNTS = [
  {
    id: "acc_tanvir_lb",
    name: "Tanvir Hasan",
    email: "tanvir@lankabangla.demo",
    password: "password123",
    investorCode: "LB4092",
    boId: "1201950045128830",
    brokerage: "LankaBangla Securities Ltd.",
    records: {
      "2026-11-22": {
        date: "2026-11-22",
        deposit: 25000.0,
        availableBalance: 3420.5,
        portfolioPdfName: "Portfolio_Statement_22_Nov_2026.pdf",
        portfolioPdfUrl: "",
        tradePdfName: "Trade_Confirmation_22_Nov_2026.pdf",
        tradePdfUrl: "",
        marginable: [
          {
            company: "GP",
            gr: "A",
            totalQty: 25,
            salableQty: 25,
            buyPrice: 318.5,
            sellPrice: 326.0,
            pe: 12.4,
            history: [314.0, 316.2, 318.5, 321.0, 324.5, 326.0],
          },
          {
            company: "BATBC",
            gr: "A",
            totalQty: 10,
            salableQty: 10,
            buyPrice: 392.0,
            sellPrice: 385.5,
            pe: 14.1,
            history: [396.0, 394.5, 392.0, 390.0, 387.2, 385.5],
          },
          {
            company: "RENATA",
            gr: "A",
            totalQty: 4,
            salableQty: 4,
            buyPrice: 710.0,
            sellPrice: 724.0,
            pe: 18.2,
            history: [702.0, 705.5, 710.0, 715.0, 719.5, 724.0],
          },
        ],
        nonMarginable: [
          {
            company: "ROBI",
            gr: "A",
            totalQty: 60,
            salableQty: 60,
            buyPrice: 26.4,
            sellPrice: 27.8,
            pe: 21.5,
            history: [25.8, 26.0, 26.4, 26.9, 27.3, 27.8],
          },
          {
            company: "OLYMPIC",
            gr: "A",
            totalQty: 8,
            salableQty: 8,
            buyPrice: 158.0,
            sellPrice: 154.2,
            pe: 15.8,
            history: [160.0, 159.2, 158.0, 156.5, 155.0, 154.2],
          },
        ],
        trades: [
          {
            date: "2026-11-22",
            type: "BUY",
            company: "GP",
            gr: "A",
            qty: 25,
            buyPrice: 318.5,
            sellPrice: 326.0,
            comm: 31.85,
          },
          {
            date: "2026-11-22",
            type: "SELL",
            company: "ROBI",
            gr: "A",
            qty: 30,
            buyPrice: 26.4,
            sellPrice: 27.8,
            comm: 3.34,
          },
        ],
        sectors: [
          { sector: "TELECOMMUNICATION", amount: 9546.5, pct: 49.4 },
          { sector: "FOOD & ALLIED", amount: 5184.0, pct: 26.82 },
          { sector: "PHARMACEUTICALS", amount: 4594.0, pct: 23.78 },
        ],
        news: [
          {
            company: "GP",
            date: "22-Nov-2026",
            text: "Board declared interim cash dividend for shareholders.",
          },
          {
            company: "ROBI",
            date: "21-Nov-2026",
            text: "Q3 revenue grew by 8.4% YoY according to DSE filing.",
          },
        ],
      },
      "2026-10-15": {
        date: "2026-10-15",
        deposit: 20000.0,
        availableBalance: 1850.0,
        portfolioPdfName: "Portfolio_Statement_15_Oct_2026.pdf",
        portfolioPdfUrl: "",
        tradePdfName: "Trade_Confirmation_15_Oct_2026.pdf",
        tradePdfUrl: "",
        marginable: [
          {
            company: "GP",
            gr: "A",
            totalQty: 15,
            salableQty: 15,
            buyPrice: 315.0,
            sellPrice: 319.5,
            pe: 12.2,
            history: [312.0, 313.5, 315.0, 317.0, 319.5],
          },
        ],
        nonMarginable: [
          {
            company: "ROBI",
            gr: "A",
            totalQty: 90,
            salableQty: 90,
            buyPrice: 26.4,
            sellPrice: 26.9,
            pe: 21.0,
            history: [26.0, 26.2, 26.4, 26.7, 26.9],
          },
        ],
        trades: [
          {
            date: "2026-10-15",
            type: "BUY",
            company: "ROBI",
            gr: "A",
            qty: 90,
            buyPrice: 26.4,
            sellPrice: 26.9,
            comm: 9.5,
          },
          {
            date: "2026-10-15",
            type: "SELL",
            company: "BATBC",
            gr: "A",
            qty: 5,
            buyPrice: 392.0,
            sellPrice: 398.0,
            comm: 7.96,
          },
        ],
        sectors: [{ sector: "TELECOMMUNICATION", amount: 7101.0, pct: 100.0 }],
        news: [],
      },
    },
  },
  {
    id: "acc_nusrat_ebl",
    name: "Nusrat Jahan",
    email: "nusrat@eblsec.demo",
    password: "password123",
    investorCode: "EBL8814",
    boId: "1203120088941205",
    brokerage: "EBL Securities Ltd.",
    records: {
      "2026-11-22": {
        date: "2026-11-22",
        deposit: 40000.0,
        availableBalance: 6250.0,
        portfolioPdfName: "",
        portfolioPdfUrl: "",
        tradePdfName: "",
        tradePdfUrl: "",
        marginable: [
          {
            company: "MARICO",
            gr: "A",
            totalQty: 5,
            salableQty: 5,
            buyPrice: 2380.0,
            sellPrice: 2425.0,
            pe: 16.9,
            history: [2350, 2365, 2380, 2395, 2410, 2425],
          },
        ],
        nonMarginable: [
          {
            company: "WALTONHIL",
            gr: "A",
            totalQty: 6,
            salableQty: 6,
            buyPrice: 640.0,
            sellPrice: 658.0,
            pe: 19.4,
            history: [630, 634, 640, 646, 652, 658],
          },
        ],
        trades: [
          {
            date: "2026-11-22",
            type: "BUY",
            company: "MARICO",
            gr: "A",
            qty: 5,
            buyPrice: 2380.0,
            sellPrice: 2425.0,
            comm: 47.6,
          },
        ],
        sectors: [
          { sector: "PHARMACEUTICALS & CHEMICALS", amount: 11900.0, pct: 75.6 },
          { sector: "ENGINEERING", amount: 3840.0, pct: 24.4 },
        ],
        news: [],
      },
    },
  },
];

function ShareTrendModal({ share, onClose }) {
  if (!share) return null;
  const buy = Number(share.buyPrice || 0);
  const sell = Number(share.sellPrice || 0);
  const qty = Number(share.totalQty || share.qty || 1);
  const diffPerShare = sell - buy;
  const totalPL = diffPerShare * qty;
  const pct = buy > 0 ? (diffPerShare / buy) * 100 : 0;
  const isGain = diffPerShare >= 0;

  const points =
    share.history && share.history.length >= 2
      ? share.history
      : [
        +(buy * 0.985).toFixed(2),
        +(buy * 0.995).toFixed(2),
        +buy.toFixed(2),
        +((buy + sell) / 2).toFixed(2),
        +sell.toFixed(2),
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

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${coords[0].x},${height - pad} ${polylinePoints} ${coords[coords.length - 1].x},${height - pad}`;
  const strokeColor = isGain ? "#10b981" : "#ef4444";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${isGain ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
            >
              {isGain ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                {share.company}
                <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                  Group {share.gr || "A"}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Share Price Trend & Gain/Loss Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">
                Buying Price
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                ৳{buy.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">
                Selling / Mkt Price
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                ৳{sell.toFixed(2)}
              </div>
            </div>
            <div
              className={`p-3 rounded-xl border ${isGain ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"}`}
            >
              <div className="text-[11px] text-slate-600 font-medium">
                Direction
              </div>
              <div
                className={`text-sm font-bold mt-0.5 ${isGain ? "text-emerald-700" : "text-rose-700"}`}
              >
                {isGain ? "▲ INCREASING" : "▼ DECREASING"}
              </div>
            </div>
            <div
              className={`p-3 rounded-xl border ${isGain ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"}`}
            >
              <div className="text-[11px] text-slate-600 font-medium">
                Net Gain / Loss
              </div>
              <div
                className={`text-sm font-bold mt-0.5 ${isGain ? "text-emerald-700" : "text-rose-700"}`}
              >
                {isGain ? "+" : ""}৳{totalPL.toFixed(2)} ({isGain ? "+" : ""}
                {pct.toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Price Trajectory</span>
              <span
                className={
                  isGain
                    ? "text-emerald-400 font-semibold"
                    : "text-rose-400 font-semibold"
                }
              >
                {isGain
                  ? `+৳${diffPerShare.toFixed(2)} / share`
                  : `-৳${Math.abs(diffPerShare).toFixed(2)} / share`}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-44 overflow-visible"
            >
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
              <line
                x1={pad}
                y1={pad}
                x2={width - pad}
                y2={pad}
                stroke="#334155"
                strokeDasharray="4 4"
              />
              <line
                x1={pad}
                y1={height / 2}
                x2={width - pad}
                y2={height / 2}
                stroke="#334155"
                strokeDasharray="4 4"
              />
              <line
                x1={pad}
                y1={height - pad}
                x2={width - pad}
                y2={height - pad}
                stroke="#334155"
                strokeDasharray="4 4"
              />
              <polygon
                points={areaPoints}
                fill={`url(#${isGain ? "gainGrad" : "lossGrad"})`}
              />
              <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
              {coords.map((c, i) => (
                <g key={i}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="5"
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                  />
                  <text
                    x={c.x}
                    y={c.y - 10}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="10"
                    fontWeight="600"
                  >
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

function FolderSection({ title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/90 hover:bg-slate-100/80 transition-colors border-b border-slate-200 text-left"
      >
        <div className="flex items-center gap-2.5">
          {open ? (
            <FolderOpen className="w-5 h-5 text-amber-500 shrink-0" />
          ) : (
            <Folder className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <span className="font-bold text-slate-800 text-sm sm:text-base">
            {title}
          </span>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
              {badge}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-slate-500">
          {open ? "Hide ▲" : "Open ▼"}
        </span>
      </button>
      {open && <div className="overflow-x-auto">{children}</div>}
    </div>
  );
}

export default function App() {
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem("dse_accounts_v4");
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [loggedInUserId, setLoggedInUserId] = useState(() => {
    return localStorage.getItem("dse_logged_in_user_v4") || null;
  });

  const [authMode, setAuthMode] = useState("login");
  const [loginEmail, setLoginEmail] = useState("tanvir@lankabangla.demo");
  const [loginPassword, setLoginPassword] = useState("password123");
  const [authError, setAuthError] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regBoId, setRegBoId] = useState("");
  const [regBroker, setRegBroker] = useState(BROKERAGES[0]);
  const [regDeposit, setRegDeposit] = useState("0");

  const currentUser = useMemo(
    () => accounts.find((u) => u.id === loggedInUserId) || null,
    [accounts, loggedInUserId],
  );

  useEffect(() => {
    localStorage.setItem("dse_accounts_v4", JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (loggedInUserId) {
      localStorage.setItem("dse_logged_in_user_v4", loggedInUserId);
    } else {
      localStorage.removeItem("dse_logged_in_user_v4");
    }
  }, [loggedInUserId]);

  const [syncStatus, setSyncStatus] = useState(
    isFirebaseConfigured ? "Firebase Connected" : "Local Storage Mode",
  );
  const [uploadNotice, setUploadNotice] = useState("");

  useEffect(() => {
    async function loadAccountsFromFirebase() {
      if (!isFirebaseConfigured || !db) return;
      try {
        setSyncStatus("Loading Firebase Profiles...");
        const snap = await getDocs(collection(db, "dse_users"));
        if (!snap.empty) {
          const cloudUsers = [];
          snap.forEach((d) => cloudUsers.push(d.data()));
          setAccounts((prev) => {
            const merged = [...prev];
            for (const cu of cloudUsers) {
              const idx = merged.findIndex(
                (m) => m.id === cu.id || m.email === cu.email,
              );
              if (idx >= 0) merged[idx] = cu;
              else merged.push(cu);
            }
            return merged;
          });
        }
        setSyncStatus("Synced with Firebase");
      } catch (err) {
        console.warn("Firestore load note:", err);
        setSyncStatus("Firebase Ready");
      }
    }
    loadAccountsFromFirebase();
  }, []);

  const saveAccountToFirebase = async (accObj) => {
    if (!isFirebaseConfigured || !db) return;
    try {
      setSyncStatus("Saving to Firebase...");
      await setDoc(doc(db, "dse_users", accObj.id), accObj);
      setSyncStatus("Synced with Firebase");
    } catch (err) {
      console.error("Firestore save error:", err);
      setSyncStatus("Firebase Sync Error");
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setAuthError("");
    const found = accounts.find(
      (u) =>
        u.email.toLowerCase() === loginEmail.trim().toLowerCase() &&
        u.password === loginPassword,
    );
    if (!found) {
      setAuthError("Invalid email or password.");
      return;
    }
    setLoggedInUserId(found.id);
    saveAccountToFirebase(found);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (
      !regName.trim() ||
      !regEmail.trim() ||
      !regPassword.trim() ||
      !regCode.trim()
    ) {
      setAuthError("Please fill in Name, Email, Password, and Investor Code.");
      return;
    }
    const exists = accounts.some(
      (u) => u.email.toLowerCase() === regEmail.trim().toLowerCase(),
    );
    if (exists) {
      setAuthError(
        "An account with this email already exists. Please sign in.",
      );
      return;
    }

    const newId = "acc_" + Date.now();
    const today = new Date().toISOString().split("T")[0];
    const initialDeposit = parseFloat(regDeposit) || 0;

    const newAcc = {
      id: newId,
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      investorCode: regCode.trim().toUpperCase(),
      boId: regBoId.trim() || "1200000000000000",
      brokerage: regBroker,
      records: {
        [today]: {
          date: today,
          deposit: initialDeposit,
          availableBalance: initialDeposit,
          portfolioPdfName: "",
          portfolioPdfUrl: "",
          tradePdfName: "",
          tradePdfUrl: "",
          marginable: [],
          nonMarginable: [],
          trades: [],
          sectors: [],
          news: [],
        },
      },
    };

    setAccounts((prev) => [...prev, newAcc]);
    await saveAccountToFirebase(newAcc);
    setLoggedInUserId(newId);
    setRegName("");
    setRegEmail("");
    setRegPassword("");
    setRegCode("");
    setRegBoId("");
    setRegDeposit("0");
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 border border-slate-200">
          <div className="md:col-span-5 bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {isFirebaseConfigured
                    ? "Firebase Cloud Secured"
                    : "Multi-User Workspace"}
                </span>
              </div>
              <h1 className="text-2xl font-black leading-snug">
                DSE Portfolio & Trade Analyzer
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Sign in or register your personal investor account to manage
                your deposits, full share holdings, daily trades, and PDF
                statements securely.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between">
                <span>Demo Login:</span>
                <span className="text-slate-200 font-mono">
                  tanvir@lankabangla.demo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Demo Password:</span>
                <span className="text-slate-200 font-mono">password123</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 p-6 sm:p-8 space-y-5">
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={`py-2 rounded-lg text-xs sm:text-sm font-bold transition ${authMode === "login"
                    ? "bg-slate-900 text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Login (Sign In)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
                className={`py-2 rounded-lg text-xs sm:text-sm font-bold transition ${authMode === "register"
                    ? "bg-slate-900 text-white shadow"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Register New Account
              </button>
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                {authError}
              </div>
            )}

            {authMode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2.5 focus-within:border-blue-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="investor@example.com"
                      className="w-full text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2.5 focus-within:border-blue-600">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-md"
                >
                  Enter My Profile
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Investor Name"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Investor Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={regCode}
                      onChange={(e) => setRegCode(e.target.value)}
                      placeholder="e.g. BR8576"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Deposit (Tk.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={regDeposit}
                      onChange={(e) => setRegDeposit(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      BO ID
                    </label>
                    <input
                      type="text"
                      value={regBoId}
                      onChange={(e) => setRegBoId(e.target.value)}
                      placeholder="16-digit BO ID"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Brokerage House
                    </label>
                    <select
                      value={regBroker}
                      onChange={(e) => setRegBroker(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                    >
                      {BROKERAGES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-md mt-2"
                >
                  Create Account & Save to Firebase
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedWorkspace
      currentUser={currentUser}
      setAccounts={setAccounts}
      saveAccountToFirebase={saveAccountToFirebase}
      onLogout={() => setLoggedInUserId(null)}
      syncStatus={syncStatus}
      setSyncStatus={setSyncStatus}
      uploadNotice={uploadNotice}
      setUploadNotice={setUploadNotice}
    />
  );
}

function AuthenticatedWorkspace({
  currentUser,
  setAccounts,
  saveAccountToFirebase,
  onLogout,
  syncStatus,
  setSyncStatus,
  uploadNotice,
  setUploadNotice,
}) {
  const availableDates = useMemo(
    () =>
      Object.keys(currentUser?.records || {})
        .sort()
        .reverse(),
    [currentUser],
  );

  const [selectedDate, setSelectedDate] = useState(
    () => availableDates[0] || new Date().toISOString().split("T")[0],
  );
  const [activeTab, setActiveTab] = useState("full_share");
  const [analyticsPeriod, setAnalyticsPeriod] = useState("1M");
  const [customStartDate, setCustomStartDate] = useState("2026-01-01");
  const [customEndDate, setCustomEndDate] = useState("2026-12-31");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShare, setSelectedShare] = useState(null);

  // Left-side PDF drawer starts CLOSED by default
  const [showPdfDrawer, setShowPdfDrawer] = useState(false);
  const [activePdfType, setActivePdfType] = useState("portfolio");

  const [depositInput, setDepositInput] = useState("");
  const [showDepositEditor, setShowDepositEditor] = useState(false);
  const [showAllDatabaseShares, setShowAllDatabaseShares] = useState(true);

  useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [currentUser.id, availableDates, selectedDate]);

  const currentRecord = currentUser?.records?.[selectedDate] || {
    date: selectedDate,
    deposit: 0,
    availableBalance: 0,
    portfolioPdfName: "",
    portfolioPdfUrl: "",
    tradePdfName: "",
    tradePdfUrl: "",
    marginable: [],
    nonMarginable: [],
    trades: [],
    sectors: [],
    news: [],
  };

  const allDatabaseHoldings = useMemo(() => {
    const recs = Object.values(currentUser?.records || {});
    const sourceRecs = showAllDatabaseShares ? recs : [currentRecord];

    const mapByCompany = new Map();
    for (const rec of sourceRecs) {
      const combined = [
        ...(rec.marginable || []),
        ...(rec.nonMarginable || []),
      ];
      for (const item of combined) {
        const key = item.company;
        const qty = Number(item.totalQty || 0);
        const buy = Number(item.buyPrice || 0);
        const sell = Number(item.sellPrice || 0);
        if (!mapByCompany.has(key)) {
          mapByCompany.set(key, {
            ...item,
            totalQty: qty,
            salableQty: Number(item.salableQty ?? qty),
            buyPrice: buy,
            sellPrice: sell,
            _costSum: buy * qty,
          });
        } else if (showAllDatabaseShares) {
          const existing = mapByCompany.get(key);
          const newQty = existing.totalQty + qty;
          const newCostSum = existing._costSum + buy * qty;
          mapByCompany.set(key, {
            ...existing,
            totalQty: newQty,
            salableQty: existing.salableQty + Number(item.salableQty ?? qty),
            buyPrice: newQty > 0 ? +(newCostSum / newQty).toFixed(2) : buy,
            sellPrice: sell || existing.sellPrice,
            _costSum: newCostSum,
            history: [
              ...(existing.history || []),
              ...(item.history || [sell]),
            ].slice(-8),
          });
        }
      }
    }
    return Array.from(mapByCompany.values());
  }, [currentUser, currentRecord, showAllDatabaseShares]);

  const handleUpdateDeposit = (e) => {
    e.preventDefault();
    const val = parseFloat(depositInput);
    if (isNaN(val) || val < 0) return;

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== currentUser.id) return acc;
        const existingRec = acc.records[selectedDate] || {
          date: selectedDate,
          deposit: 0,
          availableBalance: 0,
          portfolioPdfName: "",
          portfolioPdfUrl: "",
          tradePdfName: "",
          tradePdfUrl: "",
          marginable: [],
          nonMarginable: [],
          trades: [],
          sectors: [],
          news: [],
        };
        const updatedAcc = {
          ...acc,
          records: {
            ...acc.records,
            [selectedDate]: {
              ...existingRec,
              deposit: val,
              availableBalance: val,
            },
          },
        };
        saveAccountToFirebase(updatedAcc);
        return updatedAcc;
      }),
    );
    setShowDepositEditor(false);
    setDepositInput("");
  };

  const handlePdfUpload = async (e, uploadCategory = "auto") => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const localBlobUrl = URL.createObjectURL(
          new Blob([arrayBuffer], { type: "application/pdf" }),
        );

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item) => item.str).join(" ") + "\n";
        }

        const isTradeNote =
          uploadCategory === "trade" ||
          /Trade Confirmation Note/i.test(fullText) ||
          /Transaction Type/i.test(fullText);

        const dateMatch = fullText.match(
          /(\d{1,2}[-/][A-Za-z]{3}[-/]\d{4})|([A-Za-z]{3}\s+\d{1,2},\s*\d{4})/,
        );
        let targetDate = selectedDate;
        if (dateMatch) {
          const parsed = new Date(dateMatch[0]);
          if (!isNaN(parsed.getTime())) {
            targetDate = parsed.toISOString().split("T")[0];
          }
        }

        let finalPdfUrl = localBlobUrl;
        if (isFirebaseConfigured && storage) {
          try {
            setSyncStatus("Uploading PDF to Firebase Storage...");
            const storageRef = ref(
              storage,
              `pdfs/${currentUser.id}/${targetDate}/${file.name}`,
            );
            await uploadBytes(storageRef, file);
            finalPdfUrl = await getDownloadURL(storageRef);
            setSyncStatus("PDF Saved to Firebase Storage");
          } catch (storageErr) {
            console.warn("Storage upload fallback:", storageErr);
          }
        }

        const rowRegex =
          /([A-Z]{2,12}\*?)\s+([ABZNG])\s+(\d+)\s+(\d+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;
        const extractedShares = [];
        let match;
        while ((match = rowRegex.exec(fullText)) !== null) {
          const company = match[1].replace("*", "");
          const gr = match[2];
          const totalQty = parseInt(match[3], 10);
          const salableQty = parseInt(match[4], 10);
          const buyPrice = parseFloat(match[5].replace(/,/g, ""));
          const sellPrice = parseFloat(match[7].replace(/,/g, ""));
          extractedShares.push({
            company,
            gr,
            totalQty,
            salableQty,
            buyPrice,
            sellPrice,
            pe: 0,
            history: [
              +(buyPrice * 0.99).toFixed(2),
              buyPrice,
              +((buyPrice + sellPrice) / 2).toFixed(2),
              sellPrice,
            ],
          });
        }

        const tradeRegex =
          /Public\s+(BUY|SELL)\s+(?:DSE|CSE)\s+([ABZNG])\s+([A-Z]{2,12})\s+(\d+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;
        const extractedTrades = [];
        let tMatch;
        while ((tMatch = tradeRegex.exec(fullText)) !== null) {
          const type = tMatch[1];
          const gr = tMatch[2];
          const company = tMatch[3];
          const qty = parseInt(tMatch[4], 10);
          const rate = parseFloat(tMatch[5].replace(/,/g, ""));
          const comm = parseFloat(tMatch[7].replace(/,/g, ""));
          extractedTrades.push({
            date: targetDate,
            type,
            company,
            gr,
            qty,
            buyPrice: type === "BUY" ? rate : +(rate * 0.97).toFixed(2),
            sellPrice: rate,
            comm,
          });
        }

        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id !== currentUser.id) return acc;
            const existingRec = acc.records[targetDate] || {
              date: targetDate,
              deposit: currentRecord.deposit || 0,
              availableBalance: currentRecord.availableBalance || 0,
              portfolioPdfName: "",
              portfolioPdfUrl: "",
              tradePdfName: "",
              tradePdfUrl: "",
              marginable: [],
              nonMarginable: [],
              trades: [],
              sectors: [],
              news: [],
            };

            const updatedRec = {
              ...existingRec,
              portfolioPdfName: !isTradeNote
                ? file.name
                : existingRec.portfolioPdfName,
              portfolioPdfUrl: !isTradeNote
                ? finalPdfUrl
                : existingRec.portfolioPdfUrl,
              tradePdfName: isTradeNote ? file.name : existingRec.tradePdfName,
              tradePdfUrl: isTradeNote ? finalPdfUrl : existingRec.tradePdfUrl,
              marginable:
                extractedShares.length > 0
                  ? extractedShares
                  : existingRec.marginable,
              trades:
                extractedTrades.length > 0
                  ? [...existingRec.trades, ...extractedTrades]
                  : existingRec.trades,
            };

            const updatedAcc = {
              ...acc,
              records: {
                ...acc.records,
                [targetDate]: updatedRec,
              },
            };
            saveAccountToFirebase(updatedAcc);
            return updatedAcc;
          }),
        );

        setSelectedDate(targetDate);
        setActivePdfType(isTradeNote ? "trade" : "portfolio");
        setActiveTab(isTradeNote ? "daily_trading" : "full_share");
        setUploadNotice(
          `Uploaded "${file.name}" for ${targetDate} & synced to database.`,
        );
        setTimeout(() => setUploadNotice(""), 4000);
      } catch (err) {
        console.error(err);
        setUploadNotice(`Processed "${file.name}"`);
      }
    }
    e.target.value = "";
  };

  const periodAnalytics = useMemo(() => {
    const allRecs = Object.values(currentUser?.records || {});
    const refDate = new Date(selectedDate || "2026-11-22");

    const filteredRecs = allRecs.filter((rec) => {
      const d = new Date(rec.date);
      if (isNaN(d.getTime())) return false;
      if (analyticsPeriod === "1M") {
        const oneMonthAgo = new Date(refDate);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return d >= oneMonthAgo && d <= refDate;
      }
      if (analyticsPeriod === "1Y") {
        const oneYearAgo = new Date(refDate);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return d >= oneYearAgo && d <= refDate;
      }
      if (analyticsPeriod === "CUSTOM") {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        return d >= start && d <= end;
      }
      return true;
    });

    const allTrades = filteredRecs.flatMap((r) =>
      (r.trades || []).map((t) => ({ ...t, date: t.date || r.date })),
    );
    const buyTrades = allTrades.filter((t) => t.type === "BUY");
    const sellTrades = allTrades.filter((t) => t.type === "SELL");

    const totalBoughtQty = buyTrades.reduce(
      (s, t) => s + Number(t.qty || 0),
      0,
    );
    const totalBoughtAmount = buyTrades.reduce(
      (s, t) => s + Number(t.qty || 0) * Number(t.buyPrice || 0),
      0,
    );
    const totalSoldQty = sellTrades.reduce((s, t) => s + Number(t.qty || 0), 0);
    const totalSoldAmount = sellTrades.reduce(
      (s, t) => s + Number(t.qty || 0) * Number(t.sellPrice || 0),
      0,
    );
    const totalComm = allTrades.reduce((s, t) => s + Number(t.comm || 0), 0);

    return {
      allTrades,
      buyTrades,
      sellTrades,
      totalBoughtQty,
      totalBoughtAmount,
      totalSoldQty,
      totalSoldAmount,
      totalComm,
    };
  }, [
    currentUser,
    selectedDate,
    analyticsPeriod,
    customStartDate,
    customEndDate,
  ]);

  const filterList = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((item) => item.company.toLowerCase().includes(q));
  };

  const filteredHoldings = filterList(allDatabaseHoldings);
  const tradeRows = filterList(currentRecord.trades || []);

  const totalBuyCost = allDatabaseHoldings.reduce(
    (acc, s) => acc + s.buyPrice * s.totalQty,
    0,
  );
  const totalSellVal = allDatabaseHoldings.reduce(
    (acc, s) => acc + s.sellPrice * s.totalQty,
    0,
  );
  const netPL = totalSellVal - totalBuyCost;
  const netPLPct = totalBuyCost > 0 ? (netPL / totalBuyCost) * 100 : 0;

  const totalDeposit = useMemo(() => {
    const recs = Object.values(currentUser?.records || {});
    const sum = recs.reduce((s, r) => s + Number(r.deposit || 0), 0);
    return sum > 0 ? sum : Number(currentRecord.deposit || 0);
  }, [currentUser, currentRecord]);

  const activePdfUrl =
    activePdfType === "portfolio"
      ? currentRecord.portfolioPdfUrl
      : currentRecord.tradePdfUrl;
  const activePdfName =
    activePdfType === "portfolio"
      ? currentRecord.portfolioPdfName
      : currentRecord.tradePdfName;

  const renderHoldingsTable = (rows) => (
    <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[880px]">
      <thead>
        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
          <th className="py-2.5 px-3">Company Name</th>
          <th className="py-2.5 px-2 text-center">Gr</th>
          <th className="py-2.5 px-2 text-right">Total Qty</th>
          <th className="py-2.5 px-2 text-right">Salable</th>
          <th className="py-2.5 px-3 text-right bg-blue-50/70 text-blue-900">
            Buying Price (Tk.)
          </th>
          <th className="py-2.5 px-3 text-right bg-indigo-50/70 text-indigo-900">
            Selling / Mkt Price (Tk.)
          </th>
          <th className="py-2.5 px-3 text-right">Total Cost</th>
          <th className="py-2.5 px-3 text-right">Market Value</th>
          <th className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-800">
            Profit / Gain (Green)
          </th>
          <th className="py-2.5 px-3 text-center bg-rose-50/70 text-rose-800">
            Loss (Red)
          </th>
          <th className="py-2.5 px-2 text-center">Graph</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={11} className="py-6 text-center text-slate-400">
              No share records found in database yet. Upload your Full Share PDF
              above.
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const diff = (row.sellPrice - row.buyPrice) * row.totalQty;
            const pct =
              row.buyPrice > 0
                ? ((row.sellPrice - row.buyPrice) / row.buyPrice) * 100
                : 0;
            const isGain = diff >= 0;

            return (
              <tr
                key={idx}
                onClick={() => setSelectedShare(row)}
                className="hover:bg-amber-50/60 cursor-pointer transition-colors group"
                title="Click to inspect price increase/decrease graph"
              >
                <td className="py-2.5 px-3 font-bold text-slate-900 group-hover:text-blue-700 flex items-center gap-1.5">
                  <span>{row.company}</span>
                  <LineChart className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                </td>
                <td className="py-2.5 px-2 text-center font-medium text-slate-600">
                  {row.gr}
                </td>
                <td className="py-2.5 px-2 text-right font-medium">
                  {row.totalQty}
                </td>
                <td className="py-2.5 px-2 text-right text-slate-600">
                  {row.salableQty}
                </td>
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
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border ${isGain
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                  >
                    {isGain ? "▲ Graph" : "▼ Graph"}
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  const renderTradesTable = (rows) => (
    <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[780px]">
      <thead>
        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
          <th className="py-2.5 px-3">Date</th>
          <th className="py-2.5 px-3">Type</th>
          <th className="py-2.5 px-3">Instrument</th>
          <th className="py-2.5 px-2 text-center">Gr</th>
          <th className="py-2.5 px-2 text-right">Qty</th>
          <th className="py-2.5 px-3 text-right bg-blue-50/70 text-blue-900">
            Buying Price (Tk.)
          </th>
          <th className="py-2.5 px-3 text-right bg-indigo-50/70 text-indigo-900">
            Selling Price (Tk.)
          </th>
          <th className="py-2.5 px-3 text-right">Comm (Tk.)</th>
          <th className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-800">
            Profit / Gain (Green)
          </th>
          <th className="py-2.5 px-3 text-center bg-rose-50/70 text-rose-800">
            Loss (Red)
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={10} className="py-6 text-center text-slate-400">
              No trading orders recorded for this date.
            </td>
          </tr>
        ) : (
          rows.map((t, idx) => {
            const netDiff = (t.sellPrice - t.buyPrice) * t.qty - (t.comm || 0);
            const pct =
              t.buyPrice > 0
                ? ((t.sellPrice - t.buyPrice) / t.buyPrice) * 100
                : 0;
            const isGain = netDiff >= 0;
            return (
              <tr
                key={idx}
                onClick={() => setSelectedShare({ ...t, totalQty: t.qty })}
                className="hover:bg-amber-50/60 cursor-pointer"
              >
                <td className="py-2.5 px-3 text-slate-500 text-xs">
                  {t.date || selectedDate}
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${t.type === "BUY" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                  >
                    {t.type}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-bold text-slate-900">
                  {t.company}
                </td>
                <td className="py-2.5 px-2 text-center">{t.gr}</td>
                <td className="py-2.5 px-2 text-right font-medium">{t.qty}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-blue-900">
                  ৳{Number(t.buyPrice).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-indigo-900">
                  ৳{Number(t.sellPrice).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-600">
                  ৳{Number(t.comm || 0).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {isGain ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      +৳{netDiff.toFixed(2)} (+{pct.toFixed(2)}%)
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {!isGain ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                      -৳{Math.abs(netDiff).toFixed(2)} ({pct.toFixed(2)}%)
                    </span>
                  ) : (
                    "—"
                  )}
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
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight">
                {currentUser.name}{" "}
                <span className="text-emerald-400 text-xs font-semibold">
                  ({currentUser.investorCode})
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> {currentUser.brokerage} • BO:{" "}
                {currentUser.boId}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPdfDrawer(!showPdfDrawer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${showPdfDrawer
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPdfDrawer ? "Close Left PDF" : "Open Left PDF"}</span>
            </button>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isFirebaseConfigured
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
                  : "bg-slate-800 text-amber-300 border-slate-700"
                }`}
            >
              {isFirebaseConfigured ? (
                <Cloud className="w-3.5 h-3.5" />
              ) : (
                <CloudOff className="w-3.5 h-3.5" />
              )}
              <span>{syncStatus}</span>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 sm:px-6 pt-5 space-y-4">
        {uploadNotice && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between shadow">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {uploadNotice}
            </span>
            <button onClick={() => setUploadNotice("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Active
              Investor Account
            </div>
            <div className="font-bold text-slate-900 text-base mt-1">
              {currentUser.name}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {currentUser.email} • Code: <b>{currentUser.investorCode}</b>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Total
                Deposit Amount
              </span>
              <button
                onClick={() => {
                  setDepositInput(String(totalDeposit));
                  setShowDepositEditor(!showDepositEditor);
                }}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                Edit Deposit
              </button>
            </div>
            <div className="font-bold text-emerald-700 text-xl mt-1">
              ৳
              {totalDeposit.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            {showDepositEditor && (
              <form
                onSubmit={handleUpdateDeposit}
                className="mt-2 flex items-center gap-1.5"
              >
                <input
                  type="number"
                  step="0.01"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs w-28 font-semibold"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 text-white text-xs px-2.5 py-1 rounded font-bold"
                >
                  Save
                </button>
              </form>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">
              Total Share Buying Cost
            </div>
            <div className="font-bold text-blue-900 text-xl mt-1">
              ৳
              {totalBuyCost.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Market Value: ৳
              {totalSellVal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border shadow-sm ${netPL >= 0 ? "bg-emerald-50/80 border-emerald-200" : "bg-rose-50/80 border-rose-200"}`}
          >
            <div className="text-xs text-slate-600 font-medium">
              Net Gain / Loss
            </div>
            <div
              className={`font-bold text-xl mt-1 flex items-center gap-1.5 ${netPL >= 0 ? "text-emerald-700" : "text-rose-700"}`}
            >
              {netPL >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span>
                {netPL >= 0 ? "+" : ""}৳{netPL.toFixed(2)} (
                {netPL >= 0 ? "+" : ""}
                {netPLPct.toFixed(2)}%)
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Click any share row for trend graph
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
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
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    Date: {d}
                  </option>
                ))}
              </select>
            )}

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

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-lg cursor-pointer transition shadow-sm">
              <Upload className="w-4 h-4" />
              <span>1. Upload Full Share PDF</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handlePdfUpload(e, "portfolio")}
                className="hidden"
              />
            </label>

            <label className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-lg cursor-pointer transition shadow-sm">
              <Upload className="w-4 h-4" />
              <span>2. Upload Daily Trading PDF</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handlePdfUpload(e, "trade")}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => {
              setActiveTab("full_share");
              setActivePdfType("portfolio");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${activeTab === "full_share"
                ? "bg-slate-900 text-white shadow"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Full Share Information (All Database Shares)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("daily_trading");
              setActivePdfType("trade");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${activeTab === "daily_trading"
                ? "bg-slate-900 text-white shadow"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
          >
            <Repeat className="w-4 h-4 text-blue-400" />
            <span>Per-Day Trading (Trade Confirmation)</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${activeTab === "analytics"
                ? "bg-slate-900 text-white shadow"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
          >
            <Filter className="w-4 h-4 text-amber-400" />
            <span>Buying & Selling Summary (1M / 1Y / Custom)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {showPdfDrawer && (
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold truncate">
                    {activePdfName || "PDF Document Preview"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setActivePdfType("portfolio")}
                    className={`px-2 py-1 rounded text-[11px] font-semibold ${activePdfType === "portfolio" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}
                  >
                    Portfolio
                  </button>
                  <button
                    onClick={() => setActivePdfType("trade")}
                    className={`px-2 py-1 rounded text-[11px] font-semibold ${activePdfType === "trade" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}
                  >
                    Trade
                  </button>
                  <button
                    onClick={() => setShowPdfDrawer(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {activePdfUrl ? (
                <div className="h-[560px] w-full bg-slate-100 flex flex-col">
                  <iframe
                    src={activePdfUrl}
                    title="Brokerage PDF"
                    className="w-full h-full border-0"
                  />
                  <div className="p-2 bg-slate-50 border-t flex justify-between items-center text-xs">
                    <span className="text-slate-500">Date: {selectedDate}</span>
                    <a
                      href={activePdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                    >
                      Fullscreen <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-2 bg-slate-50/70">
                  <FileText className="w-8 h-8 text-blue-500 mx-auto" />
                  <p className="text-xs text-slate-600 font-semibold">
                    {activePdfName
                      ? `Document: ${activePdfName}`
                      : `No PDF attached for ${selectedDate}`}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Upload a PDF above to preview it here anytime.
                  </p>
                </div>
              )}
            </div>
          )}

          <div
            className={`${showPdfDrawer ? "lg:col-span-8" : "lg:col-span-12"} space-y-5`}
          >
            {activeTab === "full_share" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">
                    Data Scope: Showing{" "}
                    {showAllDatabaseShares
                      ? "ALL shares stored in your database across all uploaded PDFs"
                      : `shares for ${selectedDate}`}
                  </span>
                  <button
                    onClick={() =>
                      setShowAllDatabaseShares(!showAllDatabaseShares)
                    }
                    className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                  >
                    {showAllDatabaseShares
                      ? "Switch to Selected Date Only"
                      : "Show Full Database Shares"}
                  </button>
                </div>

                <FolderSection
                  title="Full Share Information (All Database Holdings)"
                  badge={`${filteredHoldings.length} Companies`}
                  defaultOpen={true}
                >
                  {renderHoldingsTable(filteredHoldings)}
                </FolderSection>
              </>
            )}

            {activeTab === "daily_trading" && (
              <FolderSection
                title={`Per-Day Trading Orders (${selectedDate})`}
                badge={`${tradeRows.length} Trades`}
                defaultOpen={true}
              >
                {renderTradesTable(tradeRows)}
              </FolderSection>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Buying & Selling Volume Filter
                      </h3>
                      <p className="text-xs text-slate-500">
                        View total shares bought & sold in 1 Month, 1 Year, or
                        Custom Range
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setAnalyticsPeriod("1M")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border ${analyticsPeriod === "1M"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                      >
                        Last 1 Month
                      </button>
                      <button
                        onClick={() => setAnalyticsPeriod("1Y")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border ${analyticsPeriod === "1Y"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                      >
                        Last 1 Year
                      </button>
                      <button
                        onClick={() => setAnalyticsPeriod("CUSTOM")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border ${analyticsPeriod === "CUSTOM"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                      >
                        Custom Date Range
                      </button>
                    </div>
                  </div>

                  {analyticsPeriod === "CUSTOM" && (
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-600">
                          From:
                        </span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-600">
                          To:
                        </span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div className="text-xs font-semibold text-blue-800">
                      Total Shares Bought ({analyticsPeriod})
                    </div>
                    <div className="text-xl font-bold text-blue-950 mt-1">
                      {periodAnalytics.totalBoughtQty} Shares
                    </div>
                    <div className="text-xs text-blue-700 mt-0.5">
                      Buy Value: ৳{periodAnalytics.totalBoughtAmount.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <div className="text-xs font-semibold text-emerald-800">
                      Total Shares Sold ({analyticsPeriod})
                    </div>
                    <div className="text-xl font-bold text-emerald-950 mt-1">
                      {periodAnalytics.totalSoldQty} Shares
                    </div>
                    <div className="text-xs text-emerald-700 mt-0.5">
                      Sell Value: ৳{periodAnalytics.totalSoldAmount.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <div className="text-xs font-semibold text-amber-800">
                      Total Commission
                    </div>
                    <div className="text-xl font-bold text-amber-950 mt-1">
                      ৳{periodAnalytics.totalComm.toFixed(2)}
                    </div>
                    <div className="text-xs text-amber-700 mt-0.5">
                      {periodAnalytics.allTrades.length} Orders
                    </div>
                  </div>
                </div>

                <FolderSection
                  title={`Buying History (${periodAnalytics.buyTrades.length} Orders)`}
                  badge={`${periodAnalytics.totalBoughtQty} Shares`}
                  defaultOpen={true}
                >
                  {renderTradesTable(periodAnalytics.buyTrades)}
                </FolderSection>

                <FolderSection
                  title={`Selling History (${periodAnalytics.sellTrades.length} Orders)`}
                  badge={`${periodAnalytics.totalSoldQty} Shares`}
                  defaultOpen={true}
                >
                  {renderTradesTable(periodAnalytics.sellTrades)}
                </FolderSection>
              </div>
            )}
          </div>
        </div>
      </main>

      <ShareTrendModal
        share={selectedShare}
        onClose={() => setSelectedShare(null)}
      />
    </div>
  );
}
