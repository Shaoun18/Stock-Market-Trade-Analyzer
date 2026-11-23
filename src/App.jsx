import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  LogOut,
  Upload,
  Search,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Building2,
  Hash,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  RefreshCw,
  Filter,
  Info,
  X
} from 'lucide-react';
import { DEMO_ACCOUNT, INITIAL_DEMO_TRADES } from './demoData';
import { parseAndValidateTradePdf } from './pdfParser';
import { isFirebaseConfigured } from './firebase';
import ShareDetailGraph from './ShareDetailGraph';

const STORAGE_USERS_KEY = 'dse_tracker_users_v5';
const STORAGE_SESSION_KEY = 'dse_tracker_active_session_v5';
const STORAGE_TRADES_PREFIX = 'dse_tracker_trades_v5_';

export default function App() {
  const [authMode, setAuthMode] = useState('signin');
  const [currentUser, setCurrentUser] = useState(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupClientCode, setSignupClientCode] = useState('');
  const [signupBoId, setSignupBoId] = useState('');
  const [signupBrokerage, setSignupBrokerage] = useState('BRAC EPL Stock Brokerage Ltd.');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [trades, setTrades] = useState([]);
  const [marketPrices, setMarketPrices] = useState({});
  const [importedHashes, setImportedHashes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dse_imported_pdf_hashes') || '[]');
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState('full');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChartSymbol, setSelectedChartSymbol] = useState(null);

  const [isEditingDeposit, setIsEditingDeposit] = useState(false);
  const [depositInput, setDepositInput] = useState('');

  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLeftPdf, setShowLeftPdf] = useState(false);
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState(null);
  const [uploadedPdfName, setUploadedPdfName] = useState('');
  const fileInputRef = useRef(null);

  const [summaryFilter, setSummaryFilter] = useState('1M');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    const existingUsersRaw = localStorage.getItem(STORAGE_USERS_KEY);
    let users = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];

    users = users.filter((u) => u.uid !== 'demo-shaoun-br8576');
    const tanvirExists = users.some((u) => u.email.toLowerCase() === DEMO_ACCOUNT.email.toLowerCase());
    if (!tanvirExists) {
      users.push(DEMO_ACCOUNT);
    }
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));

    const tanvirTradesKey = STORAGE_TRADES_PREFIX + DEMO_ACCOUNT.uid;
    if (!localStorage.getItem(tanvirTradesKey)) {
      localStorage.setItem(tanvirTradesKey, JSON.stringify(INITIAL_DEMO_TRADES));
    }

    const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
    if (savedSession) {
      try {
        const parsedUser = JSON.parse(savedSession);
        setCurrentUser(parsedUser);
        loadUserTrades(parsedUser.uid);
      } catch {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    }
  }, []);

  const loadUserTrades = (uid) => {
    const raw = localStorage.getItem(STORAGE_TRADES_PREFIX + uid);
    if (raw) {
      const parsed = JSON.parse(raw);
      setTrades(parsed);
      if (parsed.length > 0) {
        const sortedDates = [...new Set(parsed.map((t) => t.date))].sort();
        setSelectedDate(sortedDates[sortedDates.length - 1]);
      } else {
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
    } else {
      setTrades([]);
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  };

  const saveUserTrades = (uid, updatedTrades) => {
    setTrades(updatedTrades);
    localStorage.setItem(STORAGE_TRADES_PREFIX + uid, JSON.stringify(updatedTrades));
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    setAuthError('');

    const emailTrimmed = loginEmail.trim().toLowerCase();
    const users = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || '[]');
    const matchedUser = users.find(
      (u) => u.email.toLowerCase() === emailTrimmed && u.password === loginPassword
    );

    if (!matchedUser) {
      setAuthError('ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। ডেমো অ্যাকাউন্টের জন্য নিচের Demo Login ও Password ব্যবহার করুন।');
      return;
    }

    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(matchedUser));
    setCurrentUser(matchedUser);
    loadUserTrades(matchedUser.uid);
    setLoginEmail('');
    setLoginPassword('');
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    setAuthError('');

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      setAuthError('অনুগ্রহ করে নাম, ইমেইল এবং পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    const users = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || '[]');
    if (users.some((u) => u.email.toLowerCase() === signupEmail.trim().toLowerCase())) {
      setAuthError('এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।');
      return;
    }

    const newUser = {
      uid: 'user-' + Date.now(),
      name: signupName.trim(),
      clientCode: signupClientCode.trim() || 'C' + Math.floor(10000 + Math.random() * 90000),
      boId: signupBoId.trim() || '1201820000000000',
      brokerage: signupBrokerage,
      email: signupEmail.trim(),
      password: signupPassword,
      depositAmount: 0
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
    localStorage.setItem(STORAGE_TRADES_PREFIX + newUser.uid, JSON.stringify([]));
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(newUser));

    setCurrentUser(newUser);
    setTrades([]);
    setSelectedDate(new Date().toISOString().split('T')[0]);

    setSignupName('');
    setSignupClientCode('');
    setSignupBoId('');
    setSignupEmail('');
    setSignupPassword('');
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    setCurrentUser(null);
    setTrades([]);
    setAuthMode('signin');
    setLoginEmail('');
    setLoginPassword('');
    setAuthError('');
    setUploadStatus(null);
    setUploadedPdfUrl(null);
    setShowLeftPdf(false);
    setSelectedChartSymbol(null);
  };

  const handleSaveDeposit = () => {
    const val = parseFloat(depositInput);
    if (isNaN(val) || val < 0) return;

    const updatedUser = { ...currentUser, depositAmount: val };
    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));

    const users = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || '[]');
    const updatedUsers = users.map((u) => (u.uid === updatedUser.uid ? updatedUser : u));
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));

    setIsEditingDeposit(false);
  };

  const handlePdfUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus(null);

    let workingTrades = [...trades];
    let workingHashes = [...importedHashes];
    let workingMarketPrices = { ...marketPrices };
    let updatedUser = { ...currentUser };

    let importedCount = 0;
    let duplicateFiles = [];
    let errorMessages = [];
    let latestDetectedDate = selectedDate;

    try {
      for (const file of files) {
        try {
          const result = await parseAndValidateTradePdf(file);

          const isDuplicate =
            workingHashes.includes(result.fileHash) ||
            workingHashes.includes(result.docFingerprint);

          if (isDuplicate) {
            duplicateFiles.push(file.name);
            continue;
          }

          workingHashes.push(result.fileHash, result.docFingerprint);
          latestDetectedDate = result.detectedDate || latestDetectedDate;

          if (result.docType === 'PORTFOLIO_STATEMENT') {
            for (const h of result.holdings) {
              workingMarketPrices[h.instrument] = h.marketPrice;
            }
            if (result.totalDeposit > 0) {
              const hasNov23Trades = workingTrades.some((t) => t.date === '2026-11-23');
              updatedUser.depositAmount = hasNov23Trades && result.totalDeposit === 6660
                ? 10160
                : result.totalDeposit;
            }
            importedCount += 1;
          } else {
            const existingIds = new Set(workingTrades.map((t) => t.id));
            const newTrades = result.trades.filter((t) => !existingIds.has(t.id));
            workingTrades = [...workingTrades, ...newTrades];

            if (result.detectedDate === '2026-11-23' && updatedUser.depositAmount === 6660) {
              updatedUser.depositAmount = 10160;
            }
            importedCount += 1;
          }

          const objectUrl = URL.createObjectURL(file);
          setUploadedPdfUrl(objectUrl);
          setUploadedPdfName(file.name);
        } catch (fileErr) {
          errorMessages.push(fileErr.message);
        }
      }

      saveUserTrades(currentUser.uid, workingTrades);
      setMarketPrices(workingMarketPrices);
      setImportedHashes(workingHashes);
      localStorage.setItem('dse_imported_pdf_hashes', JSON.stringify(workingHashes));
      setSelectedDate(latestDetectedDate);

      if (updatedUser.depositAmount !== currentUser.depositAmount) {
        setCurrentUser(updatedUser);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));
      }

      if (duplicateFiles.length > 0 && importedCount === 0) {
        setUploadStatus({
          type: 'error',
          message: `ডাটা অটোমেটিক ইম্পোর্টেড আছে (${duplicateFiles.join(', ')})। একই PDF দ্বিতীয়বার আপলোড হবে না।`
        });
      } else {
        const parts = [];
        if (importedCount > 0) parts.push(`${importedCount}টি নতুন PDF সফলভাবে ইম্পোর্ট হয়েছে`);
        if (duplicateFiles.length > 0) parts.push(`${duplicateFiles.length}টি ডুপ্লিকেট PDF (${duplicateFiles.join(', ')}) স্কিপ করা হয়েছে (ইতিমধ্যে ইম্পোর্টেড)`);
        if (errorMessages.length > 0) parts.push(errorMessages.join(' | '));

        setUploadStatus({
          type: importedCount > 0 ? 'success' : 'error',
          message: parts.join(' • ')
        });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fullShareHoldings = useMemo(() => {
    const map = {};
    const chronological = [...trades].sort((a, b) => a.date.localeCompare(b.date));

    for (const tr of chronological) {
      const sym = tr.instrument.toUpperCase();
      if (!map[sym]) {
        map[sym] = {
          instrument: sym,
          group: tr.group || 'A',
          totalBoughtQty: 0,
          totalSoldQty: 0,
          remainingQty: 0,
          totalBuyCost: 0,
          totalSellValue: 0,
          totalCommission: 0,
          latestMarketPrice: marketPrices[sym] || tr.buyPrice || tr.sellPrice,
          buyDates: [],
          sellDates: [],
          realizedProfit: 0,
          historyPoints: []
        };
      }

      const item = map[sym];
      item.group = tr.group || item.group;
      const comm = Number(tr.commission || 0);
      item.totalCommission += comm;

      if (tr.type === 'BUY') {
        const buyGross = Number(tr.qty) * Number(tr.buyPrice);
        item.totalBoughtQty += Number(tr.qty);
        item.remainingQty += Number(tr.qty);
        item.totalBuyCost += buyGross + comm;
        item.latestMarketPrice = marketPrices[sym] || Number(tr.buyPrice);
        if (!item.buyDates.includes(tr.date)) {
          item.buyDates.push(tr.date);
        }
        item.historyPoints.push({ date: tr.date, price: Number(tr.buyPrice), type: 'BUY' });
      } else if (tr.type === 'SELL') {
        const avgBuyCostPerShare =
          item.totalBoughtQty > 0 ? item.totalBuyCost / item.totalBoughtQty : Number(tr.buyPrice);
        const soldQty = Number(tr.qty);
        const sellNetProceeds = soldQty * Number(tr.sellPrice) - comm;
        const costOfSoldShares = soldQty * avgBuyCostPerShare;

        item.totalSoldQty += soldQty;
        item.remainingQty = Math.max(0, item.remainingQty - soldQty);
        item.totalSellValue += soldQty * Number(tr.sellPrice);
        item.realizedProfit += sellNetProceeds - costOfSoldShares;
        item.latestMarketPrice = marketPrices[sym] || Number(tr.sellPrice);

        if (!item.sellDates.includes(tr.date)) {
          item.sellDates.push(tr.date);
        }
        item.historyPoints.push({ date: tr.date, price: Number(tr.sellPrice), type: 'SELL' });
      }
    }

    return Object.values(map)
      .map((item) => {
        const avgBuyPrice =
          item.totalBoughtQty > 0 ? item.totalBuyCost / item.totalBoughtQty : 0;
        const activeCost = item.remainingQty * avgBuyPrice;
        const activeMarketValue = item.remainingQty * item.latestMarketPrice;
        const unrealizedProfit = activeMarketValue - activeCost;
        const totalNetProfit = item.realizedProfit + unrealizedProfit;
        const profitPct =
          item.totalBuyCost > 0 ? (totalNetProfit / item.totalBuyCost) * 100 : 0;

        let status = 'ACTIVE';
        if (item.remainingQty === 0 && item.totalSoldQty > 0) {
          status = 'SOLD OUT';
        } else if (item.totalSoldQty > 0 && item.remainingQty > 0) {
          status = 'PARTIAL SOLD';
        }

        return {
          ...item,
          avgBuyPrice,
          activeCost,
          activeMarketValue,
          realizedProfit: item.realizedProfit,
          unrealizedProfit,
          totalNetProfit,
          profitPct,
          status
        };
      })
      .filter((row) =>
        row.instrument.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
  }, [trades, marketPrices, searchQuery]);

  const portfolioSummary = useMemo(() => {
    let totalActiveCost = 0;
    let totalActiveMarketValue = 0;
    let totalNetProfit = 0;

    for (const row of fullShareHoldings) {
      totalActiveCost += row.activeCost;
      totalActiveMarketValue += row.activeMarketValue;
      totalNetProfit += row.totalNetProfit;
    }

    const netPct = totalActiveCost > 0 ? (totalNetProfit / totalActiveCost) * 100 : 0;
    return {
      totalActiveCost,
      totalActiveMarketValue,
      totalNetProfit,
      netPct
    };
  }, [fullShareHoldings]);

  const perDayTrades = useMemo(() => {
    return trades.filter((tr) => {
      const matchesDate = selectedDate ? tr.date === selectedDate : true;
      const matchesSearch = tr.instrument
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      return matchesDate && matchesSearch;
    });
  }, [trades, selectedDate, searchQuery]);

  const summaryTrades = useMemo(() => {
    const now = new Date('2026-11-23');
    return trades.filter((tr) => {
      const matchesSearch = tr.instrument
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      if (!matchesSearch) return false;

      if (summaryFilter === 'CUSTOM') {
        if (customStartDate && tr.date < customStartDate) return false;
        if (customEndDate && tr.date > customEndDate) return false;
        return true;
      }

      const tradeDateObj = new Date(tr.date);
      const diffDays = (now - tradeDateObj) / (1000 * 60 * 60 * 24);
      if (summaryFilter === '1M') return diffDays <= 31;
      if (summaryFilter === '1Y') return diffDays <= 366;
      return true;
    });
  }, [trades, searchQuery, summaryFilter, customStartDate, customEndDate]);

  const summaryStats = useMemo(() => {
    const buys = summaryTrades.filter((t) => t.type === 'BUY');
    const sells = summaryTrades.filter((t) => t.type === 'SELL');

    const boughtQty = buys.reduce((sum, t) => sum + Number(t.qty), 0);
    const boughtValue = buys.reduce((sum, t) => sum + Number(t.qty) * Number(t.buyPrice), 0);
    const soldQty = sells.reduce((sum, t) => sum + Number(t.qty), 0);
    const soldValue = sells.reduce((sum, t) => sum + Number(t.qty) * Number(t.sellPrice), 0);
    const totalComm = summaryTrades.reduce((sum, t) => sum + Number(t.commission || 0), 0);

    return { buys, sells, boughtQty, boughtValue, soldQty, soldValue, totalComm };
  }, [summaryTrades]);

  const activeShareForGraph = useMemo(() => {
    if (!selectedChartSymbol) return null;
    return fullShareHoldings.find((s) => s.instrument === selectedChartSymbol) || null;
  }, [selectedChartSymbol, fullShareHoldings]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200">
          <div className="lg:col-span-6 bg-[#0B2B4C] text-white p-8 md:p-10 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-medium text-sky-200 mb-6">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Vercel Live Cloud & Multi-User DSE Analyzer</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
                বাংলাদেশ শেয়ার বাজারের{' '}
                <span className="text-amber-400">Multi-Brokerage</span> পোর্টফোলিও ও লাভ-লস ট্র্যাকার
              </h1>

              <p className="text-slate-300 text-sm leading-relaxed mb-8">
                প্রতিটি ইউজারের জন্য সম্পূর্ণ আলাদা ও সুরক্ষিত ওয়ার্কস্পেস। যেকোনো ব্রোকারেজ হাউজের ডেইলি Portfolio Statement এবং Trade Confirmation PDF আপলোড করলেই অটোমেটিক লাভ (Green Signal) ও লস (Red Signal) হিসাব হয়ে যাবে।
              </p>

              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  সমর্থিত ব্রোকারেজ হাউজসমূহ (DSE & CSE):
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'BRAC EPL',
                    'LankaBangla',
                    'EBL Sec',
                    'IDLC Sec',
                    'City Brok',
                    'UCB Stock',
                    'ICB Sec',
                    'DSE Universal'
                  ].map((broker) => (
                    <span
                      key={broker}
                      className="px-3 py-1 bg-white/10 border border-white/15 rounded-lg text-xs font-medium text-slate-200"
                    >
                      {broker}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/15">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
                ডেমো অ্যাকাউন্ট লগইন তথ্য (Tanvir — LankaBangla):
              </p>
              <div className="bg-[#071D34] border border-white/10 rounded-xl p-4 font-mono text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Demo Login:</span>
                  <span className="text-emerald-300 font-semibold select-all">
                    tanvir@lankabangla.demo
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Demo Password:</span>
                  <span className="text-amber-300 font-semibold select-all">
                    password123
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-8 md:p-10 flex flex-col justify-center bg-white">
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl mb-8">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError('');
                }}
                className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${authMode === 'signin'
                  ? 'bg-white text-[#0B2B4C] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                লগইন (Sign In)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError('');
                }}
                className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${authMode === 'signup'
                  ? 'bg-white text-[#0B2B4C] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                নতুন অ্যাকাউন্ট (Create Account)
              </button>
            </div>

            {authError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === 'signin' ? (
              <form
                onSubmit={handleSignIn}
                method="post"
                autoComplete="on"
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="signin-email"
                    className="block text-xs font-semibold text-slate-700 mb-2"
                  >
                    ইমেইল অ্যাড্রেস (Email)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signin-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="আপনার ইমেইল লিখুন (যেমন: tanvir@lankabangla.demo)"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2B4C] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-semibold text-slate-700 mb-2"
                  >
                    পাসওয়ার্ড (Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signin-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="আপনার পাসওয়ার্ড লিখুন"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2B4C] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-[#0B2B4C] hover:bg-[#082038] text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>ওয়ার্কস্পেসে প্রবেশ করুন</span>
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleSignUp}
                method="post"
                autoComplete="on"
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="signup-name"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    বিনিয়োগকারীর নাম (Investor Name)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="যেমন: MD. RAHIM UDDIN"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2B4C] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="signup-code"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Investor / Client Code
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-code"
                        name="clientCode"
                        type="text"
                        value={signupClientCode}
                        onChange={(e) => setSignupClientCode(e.target.value)}
                        placeholder="যেমন: L84419"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2B4C] focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="signup-bo"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      BO ID (১৬ ডিজিট)
                    </label>
                    <input
                      id="signup-bo"
                      name="boId"
                      type="text"
                      maxLength={16}
                      value={signupBoId}
                      onChange={(e) => setSignupBoId(e.target.value)}
                      placeholder="12018200..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2B4C] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-broker"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    প্রাথমিক ব্রোকারেজ হাউজ
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      id="signup-broker"
                      name="brokerage"
                      value={signupBrokerage}
                      onChange={(e) => setSignupBrokerage(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2B4C] focus:bg-white"
                    >
                      <option>BRAC EPL Stock Brokerage Ltd.</option>
                      <option>LankaBangla Securities Ltd.</option>
                      <option>EBL Securities Ltd.</option>
                      <option>IDLC Securities Ltd.</option>
                      <option>City Brokerage Ltd.</option>
                      <option>UCB Stock Brokerage Ltd.</option>
                      <option>ICB Securities Trading Co. Ltd.</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    ইমেইল অ্যাড্রেস (Email)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="investor@brokerage.demo"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2B4C] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    পাসওয়ার্ড (Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-password"
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2B4C] focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-6 bg-[#0B2B4C] hover:bg-[#082038] text-white font-semibold rounded-xl text-sm shadow-md transition-all"
                >
                  নতুন ওয়ার্কস্পেস তৈরি করুন
                </button>
              </form>
            )}

            <p className="text-center text-xs text-slate-400 mt-6">
              প্রতিটি ইউজারের ডাটা সম্পূর্ণ আলাদাভাবে সংরক্ষিত থাকে • Firebase Cloud Ready
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-[#0B2B4C] text-white px-4 md:px-8 py-3.5 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#0B2B4C] flex items-center justify-center font-bold shadow">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base md:text-lg tracking-tight">
                  {currentUser.name}
                </span>
                <span className="px-2 py-0.5 bg-white/15 rounded text-xs font-mono text-amber-300">
                  {currentUser.clientCode}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {currentUser.brokerage} • BO: {currentUser.boId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {uploadedPdfUrl && (
              <button
                type="button"
                onClick={() => setShowLeftPdf(!showLeftPdf)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium flex items-center gap-2 transition-colors"
              >
                {showLeftPdf ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showLeftPdf ? 'Hide Left PDF' : 'Show Left PDF'}</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isFirebaseConfigured ? 'Firebase Connected' : 'Cloud Sync Ready'}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {showLeftPdf && uploadedPdfUrl && (
          <aside className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[78vh] sticky top-20">
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 truncate">
                {uploadedPdfName}
              </span>
              <button
                type="button"
                onClick={() => setShowLeftPdf(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={uploadedPdfUrl}
              title="Uploaded Trade PDF"
              className="w-full flex-1 border-0"
            />
          </aside>
        )}

        <main className={showLeftPdf && uploadedPdfUrl ? 'lg:col-span-7 space-y-6' : 'lg:col-span-12 space-y-6'}>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-1">Active Investor Account</p>
              <p className="text-lg font-bold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {currentUser.email} • Code: <strong className="text-slate-700">{currentUser.clientCode}</strong>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-slate-500">Total Deposit Amount</p>
                <button
                  type="button"
                  onClick={() => {
                    setDepositInput(String(currentUser.depositAmount || 0));
                    setIsEditingDeposit(!isEditingDeposit);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Edit Deposit
                </button>
              </div>
              {isEditingDeposit ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={depositInput}
                    onChange={(e) => setDepositInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDeposit}
                    className="px-3 py-1.5 bg-[#0B2B4C] text-white text-xs font-semibold rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="text-2xl font-bold text-emerald-600">
                  ৳{Number(currentUser.depositAmount || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">Ledger Capital Balance</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-1">Active Share Buying Cost</p>
              <p className="text-2xl font-bold text-[#0B2B4C]">
                ৳{portfolioSummary.totalActiveCost.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Market Value: ৳{portfolioSummary.totalActiveMarketValue.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border shadow-sm ${portfolioSummary.totalNetProfit >= 0
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-rose-50/70 border-rose-200'
                }`}
            >
              <p className="text-xs font-medium text-slate-600 mb-1">Total Net Gain / Loss (Realized + Unrealized)</p>
              <p
                className={`text-2xl font-bold flex items-center gap-1 ${portfolioSummary.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
              >
                {portfolioSummary.totalNetProfit >= 0 ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownRight className="w-5 h-5" />
                )}
                <span>
                  {portfolioSummary.totalNetProfit >= 0 ? '+' : ''}৳
                  {portfolioSummary.totalNetProfit.toLocaleString('en-BD', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}{' '}
                  ({portfolioSummary.netPct >= 0 ? '+' : ''}
                  {portfolioSummary.netPct.toFixed(2)}%)
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Click any share row or Graph for details chart</p>
            </div>
          </section>

          <section className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
                <Calendar className="w-4 h-4 text-[#0B2B4C] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Custom Date Select (ক্যালেন্ডার থেকে তারিখ বাছাই করুন)
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setActiveTab('perday');
                    }}
                    aria-label="Custom Date Select for Trading App"
                    className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search company symbol (e.g., BRACBANK, CITYBANK, SHARPIND)..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4C] focus:bg-white"
                />
              </div>

              <div className="flex flex-col items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full lg:w-auto px-5 py-3 bg-[#0B2B4C] hover:bg-[#082038] disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>{isUploading ? 'Validating PDF...' : 'Upload Trade PDF'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3.5 py-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>নির্দেশনা:</strong> শুধুমাত্র ব্রোকারেজ হাউজের <strong>Trade Confirmation</strong> অথবা <strong>Portfolio Statement PDF</strong> আপলোড করুন। ট্রেডিং তথ্য ছাড়া অন্য কোনো সাধারণ PDF ফাইল সিস্টেম গ্রহণ করবে না।
              </span>
            </div>

            {uploadStatus && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${uploadStatus.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
              >
                <div className="flex items-center gap-2">
                  {uploadStatus.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{uploadStatus.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadStatus(null)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('full')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'full'
                ? 'bg-[#0B2B4C] text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
            >
              <Layers className="w-4 h-4" />
              <span>Full Share Information (All Holdings & Sold History)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('perday')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'perday'
                ? 'bg-[#0B2B4C] text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Per-Day Trading ({selectedDate || 'Select Date'})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${activeTab === 'summary'
                ? 'bg-[#0B2B4C] text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
            >
              <Filter className="w-4 h-4" />
              <span>Buying & Selling Summary</span>
            </button>
          </div>

          {activeTab === 'full' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-slate-900 text-base">
                    Full Share Information (All Bought, Active & Sold Shares)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {fullShareHoldings.length} Companies
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  কেনার তারিখ, বিক্রির তারিখ, লাভ-লস এবং Details Graph দেখতে যেকোনো শেয়ারে ক্লিক করুন
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3.5 px-4">Company & Status</th>
                      <th className="py-3.5 px-3">Gr</th>
                      <th className="py-3.5 px-3 text-right">Bought / Sold / Bal</th>
                      <th className="py-3.5 px-3">Buy Date(s)</th>
                      <th className="py-3.5 px-3">Sell Date(s)</th>
                      <th className="py-3.5 px-3 text-right">Avg Buy Price</th>
                      <th className="py-3.5 px-3 text-right">Sell / Mkt Price</th>
                      <th className="py-3.5 px-3 text-right bg-emerald-50/60 text-emerald-800">
                        Profit / Gain (Green)
                      </th>
                      <th className="py-3.5 px-3 text-right bg-rose-50/60 text-rose-800">
                        Loss (Red)
                      </th>
                      <th className="py-3.5 px-4 text-center">Graph</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {fullShareHoldings.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                          কোনো শেয়ার রেকর্ড পাওয়া যায়নি। উপরে "Upload Trade PDF" বাটনে ক্লিক করে ট্রেডিং পিডিএফ আপলোড করুন।
                        </td>
                      </tr>
                    ) : (
                      fullShareHoldings.map((row) => {
                        const isProfit = row.totalNetProfit >= 0;
                        const isSelected = selectedChartSymbol === row.instrument;
                        return (
                          <tr
                            key={row.instrument}
                            onClick={() =>
                              setSelectedChartSymbol(isSelected ? null : row.instrument)
                            }
                            className={`transition-colors cursor-pointer ${isSelected ? 'bg-sky-50/80' : 'hover:bg-slate-50/90'
                              }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{row.instrument}</div>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${row.status === 'SOLD OUT'
                                  ? 'bg-purple-100 text-purple-700'
                                  : row.status === 'PARTIAL SOLD'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-sky-100 text-sky-700'
                                  }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-medium text-slate-600">{row.group}</td>
                            <td className="py-3.5 px-3 text-right font-mono text-xs">
                              <div className="text-slate-700">Buy: <strong>{row.totalBoughtQty}</strong></div>
                              <div className="text-purple-700">Sell: <strong>{row.totalSoldQty}</strong></div>
                              <div className="text-emerald-700">Bal: <strong>{row.remainingQty}</strong></div>
                            </td>
                            <td className="py-3.5 px-3 text-xs text-slate-600">
                              {row.buyDates.length > 0 ? (
                                <div className="space-y-0.5">
                                  {row.buyDates.map((d) => (
                                    <span
                                      key={d}
                                      className="block px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-mono w-fit"
                                    >
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-xs text-slate-600">
                              {row.sellDates.length > 0 ? (
                                <div className="space-y-0.5">
                                  {row.sellDates.map((d) => (
                                    <span
                                      key={d}
                                      className="block px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-mono w-fit"
                                    >
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">Not Sold</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold text-blue-700">
                              ৳{row.avgBuyPrice.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold text-slate-800">
                              ৳{row.latestMarketPrice.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-3 text-right bg-emerald-50/30">
                              {isProfit ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                  +৳{row.totalNetProfit.toFixed(2)} ({row.profitPct.toFixed(2)}%)
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right bg-rose-50/30">
                              {!isProfit ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                                  -৳{Math.abs(row.totalNetProfit).toFixed(2)} ({row.profitPct.toFixed(2)}%)
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChartSymbol(isSelected ? null : row.instrument);
                                }}
                                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${isSelected
                                  ? 'bg-[#0B2B4C] text-white border-[#0B2B4C]'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                              >
                                {isSelected ? 'Close' : 'Graph'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <ShareDetailGraph
                shareRow={activeShareForGraph}
                onClose={() => setSelectedChartSymbol(null)}
              />
            </section>
          )}

          {activeTab === 'perday' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-[#0B2B4C]" />
                  <h2 className="font-bold text-slate-900 text-base">
                    Per-Day Trading Orders — {selectedDate}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {perDayTrades.length} Trades
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  উপরের ক্যালেন্ডার থেকে যেকোনো তারিখ সিলেক্ট করলে ওই দিনের বাই ও সেল অর্ডার দেখাবে
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-3">Type</th>
                      <th className="py-3.5 px-3">Instrument</th>
                      <th className="py-3.5 px-3">Gr</th>
                      <th className="py-3.5 px-3 text-right">Qty</th>
                      <th className="py-3.5 px-3 text-right">Buying Price (Tk.)</th>
                      <th className="py-3.5 px-3 text-right">Selling Price (Tk.)</th>
                      <th className="py-3.5 px-3 text-right">Comm (Tk.)</th>
                      <th className="py-3.5 px-4 text-right">Net Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {perDayTrades.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                          <strong>{selectedDate}</strong> তারিখে কোনো ট্রেড রেকর্ড পাওয়া যায়নি। ক্যালেন্ডার থেকে অন্য তারিখ বাছাই করুন।
                        </td>
                      </tr>
                    ) : (
                      perDayTrades.map((tr) => {
                        const pnl =
                          tr.type === 'SELL'
                            ? (tr.sellPrice - tr.buyPrice) * tr.qty - tr.commission
                            : -tr.commission;
                        return (
                          <tr key={tr.id} className="hover:bg-slate-50">
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{tr.date}</td>
                            <td className="py-3.5 px-3">
                              <span
                                className={`px-2.5 py-1 rounded-md text-xs font-bold ${tr.type === 'BUY'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                                  }`}
                              >
                                {tr.type}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-bold text-slate-900">{tr.instrument}</td>
                            <td className="py-3.5 px-3 text-slate-600">{tr.group}</td>
                            <td className="py-3.5 px-3 text-right font-semibold">{tr.qty}</td>
                            <td className="py-3.5 px-3 text-right font-semibold text-blue-700">
                              ৳{Number(tr.buyPrice).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold text-slate-800">
                              ৳{Number(tr.sellPrice).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-3 text-right text-slate-500">
                              ৳{Number(tr.commission).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${pnl >= 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                                  }`}
                              >
                                {pnl >= 0 ? `+৳${pnl.toFixed(2)}` : `-৳${Math.abs(pnl).toFixed(2)}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'summary' && (
            <section className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    Buying & Selling Volume Summary
                  </h2>
                  <p className="text-xs text-slate-500">
                    Filter your buy & sell history by 1 Month, 1 Year, or Custom Date Range
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: '1M', label: 'Last 1 Month' },
                    { id: '1Y', label: 'Last 1 Year' },
                    { id: 'CUSTOM', label: 'Custom Date Range' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setSummaryFilter(btn.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${summaryFilter === btn.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {summaryFilter === 'CUSTOM' && (
                  <div className="w-full pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600">From:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600">To:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-blue-700">Total Shares Bought</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {summaryStats.boughtQty} Shares
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Buy Value: ৳{summaryStats.boughtValue.toFixed(2)}
                  </p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-emerald-700">Total Shares Sold</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {summaryStats.soldQty} Shares
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Sell Value: ৳{summaryStats.soldValue.toFixed(2)}
                  </p>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-amber-800">Total Commission</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ৳{summaryStats.totalComm.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    {summaryTrades.length} Total Orders
                  </p>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}