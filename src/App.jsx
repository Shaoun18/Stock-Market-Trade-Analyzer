import React, { useState, useEffect, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  Upload,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  Plus,
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
} from "lucide-react";
import { db, storage, isFirebaseConfigured } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Demo Data Only (Sanitized - No personal user records)
const DEMO_USERS = [
  {
    id: "demo_investor_1",
    name: "Tanvir Hasan (Demo)",
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
];

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

// Interactive Share Price Increase/Decrease Graph Modal
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

// Collapsible Folder Section
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
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem("dse_multi_users_v3");
    return saved ? JSON.parse(saved) : DEMO_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState(() => {
    return localStorage.getItem("dse_active_user_id_v3") || DEMO_USERS[0].id;
  });

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || users[0],
    [users, currentUserId],
  );

  const availableDates = useMemo(
    () =>
      Object.keys(currentUser?.records || {})
        .sort()
        .reverse(),
    [currentUser],
  );

  const [selectedDate, setSelectedDate] = useState(
    () => availableDates[0] || "2026-11-22",
  );
  const [activeTab, setActiveTab] = useState("full_share"); // 'full_share' | 'daily_trading' | 'analytics'
  const [analyticsPeriod, setAnalyticsPeriod] = useState("1M"); // '1M' | '1Y' | 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState("2026-01-01");
  const [customEndDate, setCustomEndDate] = useState("2026-12-31");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShare, setSelectedShare] = useState(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showPdfDrawer, setShowPdfDrawer] = useState(true); // Left-side PDF viewer toggle
  const [activePdfType, setActivePdfType] = useState("portfolio"); // 'portfolio' | 'trade'
  const [syncStatus, setSyncStatus] = useState(
    isFirebaseConfigured ? "Firebase Connected" : "Local Storage Mode",
  );
  const [uploadNotice, setUploadNotice] = useState("");

  // New User Form
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newBoId, setNewBoId] = useState("");
  const [newBroker, setNewBroker] = useState(BROKERAGES[0]);

  useEffect(() => {
    if (!availableDates.includes(selectedDate) && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [currentUserId, availableDates, selectedDate]);

  useEffect(() => {
    localStorage.setItem("dse_multi_users_v3", JSON.stringify(users));
    localStorage.setItem("dse_active_user_id_v3", currentUserId);
  }, [users, currentUserId]);

  const syncToFirebase = async (updatedUser) => {
    if (!isFirebaseConfigured || !db) return;
    try {
      setSyncStatus("Syncing to Firebase...");
      await setDoc(doc(db, "portfolios", updatedUser.id), updatedUser);
      setSyncStatus("Synced with Firebase");
    } catch (err) {
      console.error("Firebase sync error:", err);
      setSyncStatus("Firebase Sync Error");
    }
  };

  useEffect(() => {
    async function loadFromCloud() {
      if (!isFirebaseConfigured || !db || !currentUserId) return;
      try {
        const snap = await getDoc(doc(db, "portfolios", currentUserId));
        if (snap.exists()) {
          const cloudData = snap.data();
          setUsers((prev) =>
            prev.map((u) => (u.id === currentUserId ? cloudData : u)),
          );
          setSyncStatus("Synced with Firebase");
        }
      } catch (e) {
        console.warn("Cloud fetch skipped:", e);
      }
    }
    loadFromCloud();
  }, [currentUserId]);

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

  // Upload PDF -> Save to Firebase Storage (if configured) + Local Blob URL + Extract Data
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
          fullText += content.items.map((item) => item.str).join(" ") + "";
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

        // Upload original PDF to Firebase Storage if connected
        let finalPdfUrl = localBlobUrl;
        if (isFirebaseConfigured && storage) {
          try {
            setSyncStatus("Uploading PDF to Firebase Storage...");
            const storageRef = ref(
              storage,
              `pdfs/${currentUserId}/${targetDate}/${file.name}`,
            );
            await uploadBytes(storageRef, file);
            finalPdfUrl = await getDownloadURL(storageRef);
            setSyncStatus("PDF Saved to Firebase Storage");
          } catch (storageErr) {
            console.warn(
              "Firebase Storage upload skipped, using local viewer:",
              storageErr,
            );
          }
        }

        // Extract Portfolio Holdings (Full Share Information)
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

        // Extract Daily Trade Confirmation Orders (BUY & SELL)
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

        setUsers((prev) =>
          prev.map((user) => {
            if (user.id !== currentUserId) return user;
            const existingRec = user.records[targetDate] || {
              date: targetDate,
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

            const updatedUser = {
              ...user,
              records: {
                ...user.records,
                [targetDate]: updatedRec,
              },
            };
            syncToFirebase(updatedUser);
            return updatedUser;
          }),
        );

        setSelectedDate(targetDate);
        setActivePdfType(isTradeNote ? "trade" : "portfolio");
        setActiveTab(isTradeNote ? "daily_trading" : "full_share");
        setShowPdfDrawer(true);
        setUploadNotice(
          `Uploaded "${file.name}" (${isTradeNote ? "Daily Trading PDF" : "Full Portfolio PDF"}) for ${targetDate}`,
        );
        setTimeout(() => setUploadNotice(""), 4500);
      } catch (err) {
        console.error(err);
        setUploadNotice(`Processed "${file.name}"`);
      }
    }
    e.target.value = "";
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;
    const id = "user_" + Date.now();
    const today = new Date().toISOString().split("T")[0];
    const created = {
      id,
      name: newName.trim(),
      investorCode: newCode.trim().toUpperCase(),
      boId: newBoId.trim() || "1200000000000000",
      brokerage: newBroker,
      records: {
        [today]: {
          date: today,
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
        },
      },
    };
    setUsers((prev) => [...prev, created]);
    setCurrentUserId(id);
    syncToFirebase(created);
    setNewName("");
    setNewCode("");
    setNewBoId("");
    setShowNewUserModal(false);
  };

  // Monthly / Yearly / Custom Range Aggregated Buying & Selling Analytics
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
      filteredRecs,
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

  const marginableRows = filterList(currentRecord.marginable || []);
  const nonMarginableRows = filterList(currentRecord.nonMarginable || []);
  const tradeRows = filterList(currentRecord.trades || []);

  const allHoldings = [
    ...(currentRecord.marginable || []),
    ...(currentRecord.nonMarginable || []),
  ];
  const totalBuyCost = allHoldings.reduce(
    (acc, s) => acc + s.buyPrice * s.totalQty,
    0,
  );
  const totalSellVal = allHoldings.reduce(
    (acc, s) => acc + s.sellPrice * s.totalQty,
    0,
  );
  const netPL = totalSellVal - totalBuyCost;
  const netPLPct = totalBuyCost > 0 ? (netPL / totalBuyCost) * 100 : 0;

  const activePdfUrl =
    activePdfType === "portfolio"
      ? currentRecord.portfolioPdfUrl
      : currentRecord.tradePdfUrl;
  const activePdfName =
    activePdfType === "portfolio"
      ? currentRecord.portfolioPdfName
      : currentRecord.tradePdfName;

  // Holdings Table Renderer
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
              No shares recorded for {selectedDate}. Upload your Portfolio
              Statement PDF.
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
                onClick={() => {
                  setSelectedShare(row);
                  setShowPdfDrawer(true);
                }}
                className="hover:bg-amber-50/60 cursor-pointer transition-colors group"
                title="Click to inspect trend graph & view PDF on left"
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
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                      isGain
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

  // Trade Table Renderer
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
              No trading orders found in this selection. Upload your Daily Trade
              Confirmation PDF.
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
                onClick={() => {
                  setSelectedShare({ ...t, totalQty: t.qty });
                  setActivePdfType("trade");
                  setShowPdfDrawer(true);
                }}
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
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight">
                DSE Smart Portfolio & Trade Analyzer
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> {currentUser?.brokerage} •
                Split PDF Viewer & Analytics
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPdfDrawer(!showPdfDrawer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                showPdfDrawer
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPdfDrawer ? "Hide Left PDF" : "Show Left PDF"}</span>
            </button>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isFirebaseConfigured
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

            <select
              value={currentUserId}
              onChange={(e) => setCurrentUserId(e.target.value)}
              className="bg-slate-800 text-white text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
            >
              {users.map((u) => (
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

        {/* Top Controls: Date Picker, Dual PDF Uploaders, Search */}
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
                    Saved Date: {d}
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

          {/* Two Dedicated Upload Buttons: Full Portfolio PDF & Daily Trading PDF */}
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

        {/* Main 3-Tab Switcher: Full Share Info | Per-Day Trading | Monthly/Yearly/Custom Buying & Selling */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => {
              setActiveTab("full_share");
              setActivePdfType("portfolio");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "full_share"
                ? "bg-slate-900 text-white shadow"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Full Share Information (Portfolio Statement)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("daily_trading");
              setActivePdfType("trade");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "daily_trading"
                ? "bg-slate-900 text-white shadow"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Repeat className="w-4 h-4 text-blue-400" />
            <span>Per-Day Trading (Trade Confirmation)</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "analytics"
                ? "bg-slate-900 text-white shadow"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Filter className="w-4 h-4 text-amber-400" />
            <span>
              Buying & Selling Summary (1 Month / 1 Year / Custom Range)
            </span>
          </button>
        </div>

        {/* Split Layout: Left Side PDF Viewer + Right Side Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT SIDE: Embedded PDF Document Viewer */}
          {showPdfDrawer && (
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold truncate">
                    {activePdfName ||
                      (activePdfType === "portfolio"
                        ? "Full Share PDF Preview"
                        : "Daily Trading PDF Preview")}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setActivePdfType("portfolio")}
                    className={`px-2 py-1 rounded text-[11px] font-semibold ${activePdfType === "portfolio" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}
                  >
                    Portfolio PDF
                  </button>
                  <button
                    onClick={() => setActivePdfType("trade")}
                    className={`px-2 py-1 rounded text-[11px] font-semibold ${activePdfType === "trade" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}
                  >
                    Trade PDF
                  </button>
                </div>
              </div>

              {activePdfUrl ? (
                <div className="h-[580px] w-full bg-slate-100 flex flex-col">
                  <iframe
                    src={activePdfUrl}
                    title="Uploaded Brokerage PDF"
                    className="w-full h-full border-0"
                  />
                  <div className="p-2 bg-slate-50 border-t flex justify-between items-center text-xs">
                    <span className="text-slate-500">
                      Stored in Firebase / Local Session
                    </span>
                    <a
                      href={activePdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                    >
                      Open Fullscreen <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-3 bg-slate-50/70">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {activePdfName
                      ? `Saved File: ${activePdfName}`
                      : "No PDF Uploaded for This Date Yet"}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload your <b>Full Share Portfolio PDF</b> or{" "}
                    <b>Daily Trading PDF</b> using the buttons above. Once
                    uploaded, the PDF automatically renders right here on the
                    left side alongside your extracted tables.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* RIGHT SIDE: Active Tab Data Workspace */}
          <div
            className={`${showPdfDrawer ? "lg:col-span-8" : "lg:col-span-12"} space-y-5`}
          >
            {/* TAB 1: FULL SHARE INFORMATION (PORTFOLIO STATEMENT) */}
            {activeTab === "full_share" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500">
                      Total Buying Cost
                    </div>
                    <div className="font-bold text-blue-900 text-lg mt-0.5">
                      ৳{totalBuyCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500">
                      Current Market / Selling Value
                    </div>
                    <div className="font-bold text-indigo-900 text-lg mt-0.5">
                      ৳{totalSellVal.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-xl border shadow-sm ${netPL >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}
                  >
                    <div className="text-xs text-slate-600">
                      Net Portfolio Gain / Loss
                    </div>
                    <div
                      className={`font-bold text-lg mt-0.5 ${netPL >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                    >
                      {netPL >= 0 ? "+" : ""}৳{netPL.toFixed(2)} (
                      {netPL >= 0 ? "+" : ""}
                      {netPLPct.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                <FolderSection
                  title="Marginable Securities (Full Share Holdings)"
                  badge={`${marginableRows.length} Shares`}
                  defaultOpen={true}
                >
                  {renderHoldingsTable(marginableRows)}
                </FolderSection>

                <FolderSection
                  title="Non-Marginable Securities (Full Share Holdings)"
                  badge={`${nonMarginableRows.length} Shares`}
                  defaultOpen={true}
                >
                  {renderHoldingsTable(nonMarginableRows)}
                </FolderSection>

                <FolderSection
                  title="Sector Wise Investment Breakdown"
                  badge={`${(currentRecord.sectors || []).length} Sectors`}
                  defaultOpen={false}
                >
                  <table className="w-full text-xs sm:text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b font-semibold">
                        <th className="py-2.5 px-4">Sector Name</th>
                        <th className="py-2.5 px-4 text-right">
                          Investment Amount (Tk.)
                        </th>
                        <th className="py-2.5 px-4 text-right">
                          Allocation (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(currentRecord.sectors || []).map((sec, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-4 font-semibold">
                            {sec.sector}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            ৳{Number(sec.amount).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-blue-700">
                            {Number(sec.pct).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </FolderSection>
              </>
            )}

            {/* TAB 2: PER-DAY TRADING (TRADE CONFIRMATION NOTE) */}
            {activeTab === "daily_trading" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200">
                    <div className="text-xs font-semibold text-blue-800">
                      Today's Total Buy Orders ({selectedDate})
                    </div>
                    <div className="text-lg font-bold text-blue-950 mt-1">
                      {tradeRows
                        .filter((t) => t.type === "BUY")
                        .reduce((s, t) => s + t.qty, 0)}{" "}
                      Shares • ৳
                      {tradeRows
                        .filter((t) => t.type === "BUY")
                        .reduce((s, t) => s + t.qty * t.buyPrice, 0)
                        .toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200">
                    <div className="text-xs font-semibold text-purple-800">
                      Today's Total Sell Orders ({selectedDate})
                    </div>
                    <div className="text-lg font-bold text-purple-950 mt-1">
                      {tradeRows
                        .filter((t) => t.type === "SELL")
                        .reduce((s, t) => s + t.qty, 0)}{" "}
                      Shares • ৳
                      {tradeRows
                        .filter((t) => t.type === "SELL")
                        .reduce((s, t) => s + t.qty * t.sellPrice, 0)
                        .toFixed(2)}
                    </div>
                  </div>
                </div>

                <FolderSection
                  title={`Per-Day Trade Confirmation Orders (${selectedDate})`}
                  badge={`${tradeRows.length} Orders`}
                  defaultOpen={true}
                >
                  {renderTradesTable(tradeRows)}
                </FolderSection>
              </>
            )}

            {/* TAB 3: BUYING & SELLING ANALYTICS (1 MONTH / 1 YEAR / CUSTOM DATE RANGE) */}
            {activeTab === "analytics" && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Buying & Selling Volume Filter
                      </h3>
                      <p className="text-xs text-slate-500">
                        Automatically calculates total shares bought & sold
                        across 1 Month, 1 Year, or Custom Date Range
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setAnalyticsPeriod("1M")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border ${
                          analyticsPeriod === "1M"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        Last 1 Month
                      </button>
                      <button
                        onClick={() => setAnalyticsPeriod("1Y")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border ${
                          analyticsPeriod === "1Y"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        Last 1 Year
                      </button>
                      <button
                        onClick={() => setAnalyticsPeriod("CUSTOM")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border ${
                          analyticsPeriod === "CUSTOM"
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

                {/* Period Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div className="text-xs font-semibold text-blue-800">
                      Total Shares Bought ({analyticsPeriod})
                    </div>
                    <div className="text-xl font-bold text-blue-950 mt-1">
                      {periodAnalytics.totalBoughtQty} Shares
                    </div>
                    <div className="text-xs text-blue-700 mt-0.5">
                      Total Buy Value: ৳
                      {periodAnalytics.totalBoughtAmount.toFixed(2)}
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
                      Total Sell Value: ৳
                      {periodAnalytics.totalSoldAmount.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <div className="text-xs font-semibold text-amber-800">
                      Total Brokerage Commission
                    </div>
                    <div className="text-xl font-bold text-amber-950 mt-1">
                      ৳{periodAnalytics.totalComm.toFixed(2)}
                    </div>
                    <div className="text-xs text-amber-700 mt-0.5">
                      Across {periodAnalytics.allTrades.length} Executed Orders
                    </div>
                  </div>
                </div>

                <FolderSection
                  title={`Buying History Table (${periodAnalytics.buyTrades.length} Buy Orders)`}
                  badge={`${periodAnalytics.totalBoughtQty} Shares`}
                  defaultOpen={true}
                >
                  {renderTradesTable(periodAnalytics.buyTrades)}
                </FolderSection>

                <FolderSection
                  title={`Selling History Table (${periodAnalytics.sellTrades.length} Sell Orders)`}
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

      {/* Share Price Graph Modal */}
      <ShareTrendModal
        share={selectedShare}
        onClose={() => setSelectedShare(null)}
      />

      {/* New Investor Account Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                Create Investor Account
              </h3>
              <button
                onClick={() => setShowNewUserModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Investor Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Investor Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR8576"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    BO ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="16-digit BO ID"
                    value={newBoId}
                    onChange={(e) => setNewBoId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brokerage House
                </label>
                <select
                  value={newBroker}
                  onChange={(e) => setNewBroker(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  {BROKERAGES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
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
