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
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DEMO_ACCOUNT, INITIAL_DEMO_TRADES } from './demoData';
import { parseAndValidateTradePdf } from './pdfParser';
import {
  auth,
  db,
  storage,
  isFirebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  ref,
  uploadBytes,
  getDownloadURL
} from './firebase';
import ShareDetailGraph from './ShareDetailGraph';

const STORAGE_USERS_KEY = 'dse_tracker_users_v6';
const STORAGE_SESSION_KEY = 'dse_tracker_active_session_v6';
const STORAGE_TRADES_PREFIX = 'dse_tracker_trades_v6_';
const STORAGE_PDF_MAP_PREFIX = 'dse_tracker_pdf_map_v6_';
const STORAGE_MKT_PREFIX = 'dse_tracker_mkt_v6_';
const STORAGE_STMT_PREFIX = 'dse_tracker_stmt_v6_';

const COMM_RATE = 0.004; // 40 paisa per 100 Tk (0.40%)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateSignInFields(email, password) {
  const errors = {};
  const trimmedEmail = (email || '').trim();
  if (!trimmedEmail) {
    errors.email = 'ইমেইল অ্যাড্রেস দেওয়া আবশ্যক।';
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'সঠিক ও বৈধ ইমেইল অ্যাড্রেস দিন (যেমন: name@domain.com)।';
  }

  if (!password) {
    errors.password = 'পাসওয়ার্ড দেওয়া আবশ্যক।';
  } else if (password.length < 8) {
    errors.password = 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের (8 characters) হতে হবে।';
  }
  return errors;
}

function validateSignUpFields({ name, clientCode, boId, email, password }) {
  const errors = {};
  const trimmedName = (name || '').trim();
  const trimmedCode = (clientCode || '').trim();
  const trimmedBo = (boId || '').trim();
  const trimmedEmail = (email || '').trim();

  if (!trimmedName || trimmedName.length < 2) {
    errors.name = 'বিনিয়োগকারীর পূর্ণ নাম লিখুন (কমপক্ষে ২ অক্ষর)।';
  } else if (!/^[A-Za-z\u0980-\u09FF.\s-]+$/.test(trimmedName)) {
    errors.name = 'নামে শুধুমাত্র অক্ষর, ডট (.) এবং স্পেস ব্যবহার করুন।';
  }

  if (!trimmedCode || trimmedCode.length < 2) {
    errors.clientCode = 'সঠিক Investor / Client Code দিন।';
  }

  if (!trimmedBo) {
    errors.boId = '১৬ ডিজিটের BO ID দেওয়া আবশ্যক।';
  } else if (!/^\d{16}$/.test(trimmedBo)) {
    errors.boId = `BO ID অবশ্যই ১৬ ডিজিটের হতে হবে (বর্তমানে ${trimmedBo.length} ডিজিট দেওয়া হয়েছে)।`;
  }

  if (!trimmedEmail) {
    errors.email = 'ইমেইল অ্যাড্রেস দেওয়া আবশ্যক।';
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'সঠিক ও আসল ইমেইল অ্যাড্রেস দিন (যেমন: investor@gmail.com)।';
  }

  if (!password) {
    errors.password = 'পাসওয়ার্ড দেওয়া আবশ্যক।';
  } else if (password.length < 8) {
    errors.password = `পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে (বর্তমানে ${password.length} অক্ষর)।`;
  }

  return errors;
}

export default function App() {
  const [authMode, setAuthMode] = useState('signin');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginTouched, setLoginTouched] = useState({});
  const [authError, setAuthError] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupClientCode, setSignupClientCode] = useState('');
  const [signupBoId, setSignupBoId] = useState('');
  const [signupBrokerage, setSignupBrokerage] = useState('BRAC EPL Stock Brokerage Ltd.');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupTouched, setSignupTouched] = useState({});

  const [trades, setTrades] = useState([]);
  const [marketPrices, setMarketPrices] = useState({});
  const [statementSnapshots, setStatementSnapshots] = useState({});
  const [importedHashes, setImportedHashes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dse_imported_pdf_hashes_v6') || '[]');
    } catch {
      return [];
    }
  });

  const [pdfsByDate, setPdfsByDate] = useState({});
  const [selectedPdfId, setSelectedPdfId] = useState('');

  const [activeTab, setActiveTab] = useState('full');
  const [selectedDate, setSelectedDate] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date('2026-11-01'));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChartSymbol, setSelectedChartSymbol] = useState(null);

  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLeftPdf, setShowLeftPdf] = useState(false);
  const fileInputRef = useRef(null);
  const calendarPopoverRef = useRef(null);

  const [summaryFilter, setSummaryFilter] = useState('1M');
  const [summaryTradeTypeFilter, setSummaryTradeTypeFilter] = useState('ALL'); // 'ALL' | 'BUY' | 'SOLD'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const loginValidationErrors = useMemo(
    () => validateSignInFields(loginEmail, loginPassword),
    [loginEmail, loginPassword]
  );

  const signupValidationErrors = useMemo(
    () =>
      validateSignUpFields({
        name: signupName,
        clientCode: signupClientCode,
        boId: signupBoId,
        email: signupEmail,
        password: signupPassword
      }),
    [signupName, signupClientCode, signupBoId, signupEmail, signupPassword]
  );

  useEffect(() => {
    if (!uploadStatus) return;
    const timer = setTimeout(() => {
      setUploadStatus(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [uploadStatus]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m] = selectedDate.split('-').map(Number);
      setCalendarMonth(new Date(y, m - 1, 1));
    }
  }, [selectedDate]);

  const normalizePdfMap = (rawMap) => {
    const out = {};
    if (!rawMap || typeof rawMap !== 'object') return out;
    for (const [dt, val] of Object.entries(rawMap)) {
      if (dt === '__latest__') continue;
      if (Array.isArray(val)) {
        out[dt] = val;
      } else if (val && typeof val === 'object' && val.url) {
        out[dt] = [{ id: val.id || `${dt}-${val.name}`, ...val }];
      }
    }
    return out;
  };

  const syncWorkspaceToCloud = async (
    uid,
    userProfile,
    nextTrades,
    nextMarketPrices,
    nextHashes,
    nextPdfMeta,
    nextSnapshots
  ) => {
    localStorage.setItem(STORAGE_TRADES_PREFIX + uid, JSON.stringify(nextTrades));
    localStorage.setItem(STORAGE_MKT_PREFIX + uid, JSON.stringify(nextMarketPrices));
    localStorage.setItem(STORAGE_STMT_PREFIX + uid, JSON.stringify(nextSnapshots || {}));
    localStorage.setItem('dse_imported_pdf_hashes_v6', JSON.stringify(nextHashes));

    const serializablePdfMeta = {};
    for (const [dt, list] of Object.entries(nextPdfMeta || {})) {
      if (Array.isArray(list)) {
        const persistent = list.filter((entry) => entry && entry.url && !entry.url.startsWith('blob:'));
        if (persistent.length > 0) {
          serializablePdfMeta[dt] = persistent;
        }
      }
    }
    if (Object.keys(serializablePdfMeta).length > 0) {
      localStorage.setItem(STORAGE_PDF_MAP_PREFIX + uid, JSON.stringify(serializablePdfMeta));
    }

    if (isFirebaseConfigured && db && uid && !uid.startsWith('demo-')) {
      try {
        await setDoc(
          doc(db, 'users', uid),
          {
            profile: userProfile,
            trades: nextTrades,
            marketPrices: nextMarketPrices,
            statementSnapshots: nextSnapshots || {},
            importedHashes: nextHashes,
            pdfsByDate: serializablePdfMeta,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Firestore sync error:', err);
      }
    }
  };

  const loadWorkspaceData = async (userObj) => {
    const uid = userObj.uid;
    let loadedTrades = [];
    let loadedMkt = {};
    let loadedPdfs = {};
    let loadedSnapshots = {};

    try {
      loadedTrades = JSON.parse(localStorage.getItem(STORAGE_TRADES_PREFIX + uid) || '[]');
      loadedMkt = JSON.parse(localStorage.getItem(STORAGE_MKT_PREFIX + uid) || '{}');
      loadedPdfs = normalizePdfMap(JSON.parse(localStorage.getItem(STORAGE_PDF_MAP_PREFIX + uid) || '{}'));
      loadedSnapshots = JSON.parse(localStorage.getItem(STORAGE_STMT_PREFIX + uid) || '{}');
    } catch {
      loadedTrades = [];
    }

    if (isFirebaseConfigured && db && !uid.startsWith('demo-')) {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const cloudData = snap.data();
          if (cloudData.profile) {
            userObj = { ...userObj, ...cloudData.profile };
            setCurrentUser(userObj);
            localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userObj));
          }
          if (Array.isArray(cloudData.trades)) {
            loadedTrades = cloudData.trades;
            localStorage.setItem(STORAGE_TRADES_PREFIX + uid, JSON.stringify(loadedTrades));
          }
          if (cloudData.marketPrices) {
            loadedMkt = cloudData.marketPrices;
            localStorage.setItem(STORAGE_MKT_PREFIX + uid, JSON.stringify(loadedMkt));
          }
          if (cloudData.statementSnapshots) {
            loadedSnapshots = cloudData.statementSnapshots;
            localStorage.setItem(STORAGE_STMT_PREFIX + uid, JSON.stringify(loadedSnapshots));
          }
          if (Array.isArray(cloudData.importedHashes)) {
            setImportedHashes(cloudData.importedHashes);
            localStorage.setItem('dse_imported_pdf_hashes_v6', JSON.stringify(cloudData.importedHashes));
          }
          if (cloudData.pdfsByDate) {
            const normalizedCloud = normalizePdfMap(cloudData.pdfsByDate);
            loadedPdfs = { ...loadedPdfs, ...normalizedCloud };
            localStorage.setItem(STORAGE_PDF_MAP_PREFIX + uid, JSON.stringify(loadedPdfs));
          }
        } else {
          await syncWorkspaceToCloud(uid, userObj, loadedTrades, loadedMkt, importedHashes, loadedPdfs, loadedSnapshots);
        }
      } catch (err) {
        console.error('Firestore load error:', err);
      }
    }

    setTrades(loadedTrades);
    setMarketPrices(loadedMkt);
    setPdfsByDate(loadedPdfs);
    setStatementSnapshots(loadedSnapshots);

    // Always default to the latest chronological date across all stored data
    const allDates = [
      ...new Set([...loadedTrades.map((t) => t.date), ...Object.keys(loadedPdfs), ...Object.keys(loadedSnapshots)])
    ].sort();
    if (allDates.length > 0) {
      const latestDt = allDates[allDates.length - 1];
      setSelectedDate(latestDt);
      if (loadedPdfs[latestDt]?.length > 0) {
        setSelectedPdfId(loadedPdfs[latestDt][loadedPdfs[latestDt].length - 1].id);
      }
    } else {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  };

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
        loadWorkspaceData(parsedUser);
      } catch {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    }

    if (isFirebaseConfigured && auth) {
      const unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const sessionRaw = localStorage.getItem(STORAGE_SESSION_KEY);
          const existing = sessionRaw ? JSON.parse(sessionRaw) : null;
          if (!existing || existing.uid !== fbUser.uid) {
            const userObj = {
              uid: fbUser.uid,
              name: fbUser.displayName || fbUser.email.split('@')[0],
              clientCode: 'BR8576',
              boId: '1201820078119171',
              brokerage: 'BRAC EPL Stock Brokerage Ltd.',
              email: fbUser.email,
              depositAmount: 0
            };
            localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userObj));
            setCurrentUser(userObj);
            await loadWorkspaceData(userObj);
          }
        }
      });
      return () => unsub();
    }
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoginTouched({ email: true, password: true });

    const errs = validateSignInFields(loginEmail, loginPassword);
    if (Object.keys(errs).length > 0) {
      setAuthError(Object.values(errs)[0]);
      return;
    }

    setIsAuthLoading(true);
    const emailTrimmed = loginEmail.trim().toLowerCase();

    try {
      if (emailTrimmed === DEMO_ACCOUNT.email.toLowerCase() && loginPassword === DEMO_ACCOUNT.password) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(DEMO_ACCOUNT));
        setCurrentUser(DEMO_ACCOUNT);
        await loadWorkspaceData(DEMO_ACCOUNT);
        setLoginEmail('');
        setLoginPassword('');
        setLoginTouched({});
        return;
      }

      if (isFirebaseConfigured && auth) {
        const cred = await signInWithEmailAndPassword(auth, emailTrimmed, loginPassword);
        const fbUser = cred.user;
        const userObj = {
          uid: fbUser.uid,
          name: fbUser.displayName || emailTrimmed.split('@')[0],
          clientCode: 'BR8576',
          boId: '1201820078119171',
          brokerage: 'BRAC EPL Stock Brokerage Ltd.',
          email: fbUser.email,
          depositAmount: 0
        };
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userObj));
        setCurrentUser(userObj);
        await loadWorkspaceData(userObj);
        setLoginEmail('');
        setLoginPassword('');
        setLoginTouched({});
        return;
      }

      const users = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || '[]');
      const matchedUser = users.find(
        (u) => u.email.toLowerCase() === emailTrimmed && u.password === loginPassword
      );

      if (!matchedUser) {
        setAuthError('ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।');
        return;
      }

      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(matchedUser));
      setCurrentUser(matchedUser);
      await loadWorkspaceData(matchedUser);
      setLoginEmail('');
      setLoginPassword('');
      setLoginTouched({});
    } catch (err) {
      setAuthError(err.message || 'লগইন ব্যর্থ হয়েছে। ইমেইল ও পাসওয়ার্ড যাচাই করুন।');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSignupTouched({
      name: true,
      clientCode: true,
      boId: true,
      email: true,
      password: true
    });

    const errs = validateSignUpFields({
      name: signupName,
      clientCode: signupClientCode,
      boId: signupBoId,
      email: signupEmail,
      password: signupPassword
    });

    if (Object.keys(errs).length > 0) {
      setAuthError(Object.values(errs)[0]);
      return;
    }

    setIsAuthLoading(true);

    try {
      let newUser;

      if (isFirebaseConfigured && auth) {
        const cred = await createUserWithEmailAndPassword(auth, signupEmail.trim(), signupPassword);
        newUser = {
          uid: cred.user.uid,
          name: signupName.trim(),
          clientCode: signupClientCode.trim().toUpperCase(),
          boId: signupBoId.trim(),
          brokerage: signupBrokerage,
          email: signupEmail.trim().toLowerCase(),
          depositAmount: 0
        };
      } else {
        const users = JSON.parse(localStorage.getItem(STORAGE_USERS_KEY) || '[]');
        if (users.some((u) => u.email.toLowerCase() === signupEmail.trim().toLowerCase())) {
          setAuthError('এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।');
          setIsAuthLoading(false);
          return;
        }
        newUser = {
          uid: 'user-' + Date.now(),
          name: signupName.trim(),
          clientCode: signupClientCode.trim().toUpperCase(),
          boId: signupBoId.trim(),
          brokerage: signupBrokerage,
          email: signupEmail.trim().toLowerCase(),
          password: signupPassword,
          depositAmount: 0
        };
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([...users, newUser]));
      }

      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(newUser));
      setCurrentUser(newUser);
      setTrades([]);
      setMarketPrices({});
      setPdfsByDate({});
      setStatementSnapshots({});
      setSelectedDate(new Date().toISOString().split('T')[0]);

      await syncWorkspaceToCloud(newUser.uid, newUser, [], {}, importedHashes, {}, {});

      setSignupName('');
      setSignupClientCode('');
      setSignupBoId('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupTouched({});
    } catch (err) {
      setAuthError(err.message || 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch { }
    }
    localStorage.removeItem(STORAGE_SESSION_KEY);
    setCurrentUser(null);
    setTrades([]);
    setPdfsByDate({});
    setStatementSnapshots({});
    setAuthMode('signin');
    setLoginEmail('');
    setLoginPassword('');
    setLoginTouched({});
    setSignupTouched({});
    setAuthError('');
    setUploadStatus(null);
    setShowLeftPdf(false);
    setSelectedChartSymbol(null);
  };

  const handlePdfUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus(null);

    let workingTrades = [...trades];
    let workingHashes = [...importedHashes];
    let workingMarketPrices = { ...marketPrices };
    let workingSnapshots = { ...statementSnapshots };
    let workingPdfMap = { ...pdfsByDate };
    let updatedUser = { ...currentUser };

    let importedCount = 0;
    let duplicateFiles = [];
    let errorMessages = [];

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

          if (result.docType === 'PORTFOLIO_STATEMENT') {
            workingSnapshots[result.detectedDate] = {
              date: result.detectedDate,
              holdings: result.holdings,
              totalDeposit: result.totalDeposit,
              ledgerBalance: result.ledgerBalance,
              statementRealized: result.statementRealized,
              statementUnrealized: result.statementUnrealized,
              statementNetGain: result.statementNetGain
            };
            importedCount += 1;
          } else {
            const existingIds = new Set(workingTrades.map((t) => t.id));
            const newTrades = result.trades.filter((t) => !existingIds.has(t.id));
            workingTrades = [...workingTrades, ...newTrades];
            importedCount += 1;
          }

          let pdfViewUrl = URL.createObjectURL(file);
          if (isFirebaseConfigured && storage && currentUser?.uid && !currentUser.uid.startsWith('demo-')) {
            try {
              const uniqueKey = `${Date.now()}_${file.name}`;
              const storageRef = ref(storage, `users/${currentUser.uid}/pdfs/${result.detectedDate}_${uniqueKey}`);
              await uploadBytes(storageRef, file);
              pdfViewUrl = await getDownloadURL(storageRef);
            } catch (storageErr) {
              console.warn('Firebase Storage upload fallback to local blob:', storageErr);
            }
          }

          const pdfId = `${result.detectedDate}-${result.docType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const pdfRecord = {
            id: pdfId,
            url: pdfViewUrl,
            name: file.name,
            date: result.detectedDate,
            docType: result.docType
          };

          const existingList = Array.isArray(workingPdfMap[result.detectedDate])
            ? workingPdfMap[result.detectedDate]
            : [];
          workingPdfMap[result.detectedDate] = [...existingList, pdfRecord];
        } catch (fileErr) {
          errorMessages.push(fileErr.message);
        }
      }

      // Recompute market prices strictly in chronological order so the LATEST PDF date always wins
      const sortedSnapshotDates = Object.keys(workingSnapshots).sort();
      for (const snapDate of sortedSnapshotDates) {
        const snap = workingSnapshots[snapDate];
        if (snap && Array.isArray(snap.holdings)) {
          for (const h of snap.holdings) {
            workingMarketPrices[h.instrument] = h.marketPrice;
          }
        }
      }

      // Always pick the latest Portfolio Statement date for Total Deposit Amount (never overwrite with older PDF)
      const latestSnapshotDate =
        sortedSnapshotDates.length > 0
          ? sortedSnapshotDates[sortedSnapshotDates.length - 1]
          : null;
      if (latestSnapshotDate && workingSnapshots[latestSnapshotDate]?.totalDeposit > 0) {
        updatedUser.depositAmount = workingSnapshots[latestSnapshotDate].totalDeposit;
      }

      // Always lock active date to the latest chronological date across all PDFs & trades
      const allSortedDates = [
        ...new Set([
          ...workingTrades.map((t) => t.date),
          ...Object.keys(workingPdfMap),
          ...sortedSnapshotDates
        ])
      ].sort();
      const newestOverallDate =
        allSortedDates.length > 0
          ? allSortedDates[allSortedDates.length - 1]
          : selectedDate;

      setTrades(workingTrades);
      setMarketPrices(workingMarketPrices);
      setStatementSnapshots(workingSnapshots);
      setImportedHashes(workingHashes);
      setPdfsByDate(workingPdfMap);

      if (newestOverallDate) {
        setSelectedDate(newestOverallDate);
        const newestPdfs = workingPdfMap[newestOverallDate];
        if (Array.isArray(newestPdfs) && newestPdfs.length > 0) {
          setSelectedPdfId(newestPdfs[newestPdfs.length - 1].id);
        }
      }

      if (updatedUser.depositAmount !== currentUser.depositAmount) {
        setCurrentUser(updatedUser);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));
      }

      await syncWorkspaceToCloud(
        currentUser.uid,
        updatedUser,
        workingTrades,
        workingMarketPrices,
        workingHashes,
        workingPdfMap,
        workingSnapshots
      );

      if (duplicateFiles.length > 0 && importedCount === 0) {
        setUploadStatus({
          type: 'error',
          message: `ডাটা অটোমেটিক ইম্পোর্টেড আছে (${duplicateFiles.join(', ')})। একই PDF দ্বিতীয়বার আপলোড হবে না।`
        });
      } else {
        const parts = [];
        if (importedCount > 0) {
          parts.push(
            `${importedCount}টি নতুন PDF সফলভাবে স্টোর হয়েছে (সর্বশেষ তারিখ: ${newestOverallDate})`
          );
        }
        if (duplicateFiles.length > 0) {
          parts.push(`${duplicateFiles.length}টি ডুপ্লিকেট PDF স্কিপ করা হয়েছে`);
        }
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

  const markedTradeDates = useMemo(() => {
    const set = new Set();
    trades.forEach((t) => {
      if (t.date) set.add(t.date);
    });
    Object.keys(pdfsByDate).forEach((k) => {
      if (Array.isArray(pdfsByDate[k]) && pdfsByDate[k].length > 0) set.add(k);
    });
    Object.keys(statementSnapshots).forEach((k) => {
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [trades, pdfsByDate, statementSnapshots]);

  const pdfsForSelectedDate = useMemo(() => {
    if (selectedDate && Array.isArray(pdfsByDate[selectedDate]) && pdfsByDate[selectedDate].length > 0) {
      return pdfsByDate[selectedDate];
    }
    return [];
  }, [selectedDate, pdfsByDate]);

  const allUploadedPdfs = useMemo(() => {
    return Object.entries(pdfsByDate)
      .sort(([dA], [dB]) => dB.localeCompare(dA))
      .flatMap(([, list]) => (Array.isArray(list) ? list : []));
  }, [pdfsByDate]);

  // Strictly bind the PDF viewer to the currently selected date.
  const activePdfToDisplay = useMemo(() => {
    if (pdfsForSelectedDate.length === 0) return null;
    const matched = pdfsForSelectedDate.find((p) => p.id === selectedPdfId);
    return matched || pdfsForSelectedDate[pdfsForSelectedDate.length - 1];
  }, [pdfsForSelectedDate, selectedPdfId]);

  const hasAnyUploadedPdf = allUploadedPdfs.length > 0;

  // ALWAYS use the latest chronological Portfolio Statement snapshot so older PDFs never override latest KPIs
  const latestStatementSnapshot = useMemo(() => {
    const dates = Object.keys(statementSnapshots).sort();
    if (dates.length === 0) return null;
    return statementSnapshots[dates[dates.length - 1]];
  }, [statementSnapshots]);

  const effectiveDepositAmount = useMemo(() => {
    if (latestStatementSnapshot && latestStatementSnapshot.totalDeposit > 0) {
      return latestStatementSnapshot.totalDeposit;
    }
    return Number(currentUser?.depositAmount || 0);
  }, [latestStatementSnapshot, currentUser]);

  // Exact per-share calculation including BOTH Buying Commission (0.40%) and Selling Commission (0.40%)
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
          totalBuyGross: 0,
          totalBuyCost: 0,
          totalSellGross: 0,
          totalSellNetProceeds: 0,
          buyCommission: 0,
          sellCommission: 0,
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
      const qty = Number(tr.qty);

      if (tr.type === 'BUY') {
        const buyRate = Number(tr.buyPrice);
        const gross = qty * buyRate;
        const comm =
          Number(tr.commission) > 0
            ? Number(tr.commission)
            : Number((gross * COMM_RATE).toFixed(2));
        item.buyCommission += comm;
        item.totalCommission += comm;
        item.totalBoughtQty += qty;
        item.remainingQty += qty;
        item.totalBuyGross += gross;
        item.totalBuyCost += gross + comm;
        item.latestMarketPrice = marketPrices[sym] || buyRate;
        if (!item.buyDates.includes(tr.date)) {
          item.buyDates.push(tr.date);
        }
        item.historyPoints.push({ date: tr.date, price: buyRate, type: 'BUY' });
      } else if (tr.type === 'SELL') {
        const sellRate = Number(tr.sellPrice);
        const gross = qty * sellRate;
        const comm =
          Number(tr.commission) > 0
            ? Number(tr.commission)
            : Number((gross * COMM_RATE).toFixed(2));
        item.sellCommission += comm;
        item.totalCommission += comm;

        const avgBuyCostPerShareWithComm =
          item.totalBoughtQty > 0
            ? item.totalBuyCost / item.totalBoughtQty
            : Number(tr.buyPrice || sellRate) * (1 + COMM_RATE);
        const sellNetProceeds = gross - comm;
        const costOfSoldSharesWithComm = qty * avgBuyCostPerShareWithComm;

        item.totalSoldQty += qty;
        item.remainingQty = Math.max(0, item.remainingQty - qty);
        item.totalSellGross += gross;
        item.totalSellNetProceeds += sellNetProceeds;
        item.realizedProfit += sellNetProceeds - costOfSoldSharesWithComm;
        item.latestMarketPrice =
          item.remainingQty === 0 ? sellRate : marketPrices[sym] || sellRate;

        if (!item.sellDates.includes(tr.date)) {
          item.sellDates.push(tr.date);
        }
        item.historyPoints.push({ date: tr.date, price: sellRate, type: 'SELL' });
      }
    }

    // Reconcile with the LATEST Portfolio Statement snapshot
    if (latestStatementSnapshot && Array.isArray(latestStatementSnapshot.holdings)) {
      const snapshotSymbols = new Set(
        latestStatementSnapshot.holdings.map((h) => h.instrument.toUpperCase())
      );

      for (const h of latestStatementSnapshot.holdings) {
        const sym = h.instrument.toUpperCase();
        if (!map[sym]) {
          const inferredBuyComm = Number(
            ((h.totalCostWithComm / (1 + COMM_RATE)) * COMM_RATE).toFixed(2)
          );
          map[sym] = {
            instrument: sym,
            group: h.group || 'A',
            totalBoughtQty: h.qty,
            totalSoldQty: 0,
            remainingQty: h.qty,
            totalBuyGross: Number((h.totalCostWithComm - inferredBuyComm).toFixed(2)),
            totalBuyCost: h.totalCostWithComm,
            totalSellGross: 0,
            totalSellNetProceeds: 0,
            buyCommission: inferredBuyComm,
            sellCommission: 0,
            totalCommission: inferredBuyComm,
            latestMarketPrice: h.marketPrice,
            buyDates: [latestStatementSnapshot.date],
            sellDates: [],
            realizedProfit: 0,
            historyPoints: [
              { date: latestStatementSnapshot.date, price: h.avgCostWithComm, type: 'BUY' }
            ]
          };
        } else {
          map[sym].group = h.group || map[sym].group;
          map[sym].remainingQty = h.qty;
          map[sym].latestMarketPrice = h.marketPrice;
          map[sym].statementAvgCost = h.avgCostWithComm;
          map[sym].statementActiveCost = h.totalCostWithComm;
          map[sym].statementMarketValue = h.marketValue;
          map[sym].statementUnrealized = h.unrealizedGainLoss;
        }
      }

      // If a share was completely sold out before the latest portfolio statement, ensure remainingQty = 0
      for (const [sym, item] of Object.entries(map)) {
        if (!snapshotSymbols.has(sym) && item.totalSoldQty > 0 && item.totalSoldQty >= item.totalBoughtQty) {
          item.remainingQty = 0;
        }
      }
    }

    return Object.values(map)
      .map((item) => {
        const avgBuyPrice =
          item.statementAvgCost !== undefined
            ? item.statementAvgCost
            : item.totalBoughtQty > 0
              ? item.totalBuyCost / item.totalBoughtQty
              : 0;

        const avgSellPrice =
          item.totalSoldQty > 0 ? item.totalSellGross / item.totalSoldQty : 0;

        const activeCost =
          item.statementActiveCost !== undefined
            ? item.statementActiveCost
            : item.remainingQty * avgBuyPrice;

        const activeMarketValue =
          item.statementMarketValue !== undefined
            ? item.statementMarketValue
            : item.remainingQty * item.latestMarketPrice;

        const unrealizedProfit =
          item.statementUnrealized !== undefined
            ? item.statementUnrealized
            : item.remainingQty > 0
              ? activeMarketValue - activeCost
              : 0;

        const totalNetProfit = Number((item.realizedProfit + unrealizedProfit).toFixed(2));
        const costDenominator = activeCost > 0 ? activeCost : item.totalBuyCost;
        const profitPct =
          costDenominator > 0 ? (totalNetProfit / costDenominator) * 100 : 0;

        let status = 'ACTIVE';
        if (item.remainingQty === 0 && item.totalSoldQty > 0) {
          status = 'SOLD OUT';
        } else if (item.totalSoldQty > 0 && item.remainingQty > 0) {
          status = 'PARTIAL SOLD';
        }

        return {
          ...item,
          avgBuyPrice,
          avgSellPrice,
          activeCost,
          activeMarketValue,
          buyCommission: Number(item.buyCommission.toFixed(2)),
          sellCommission: Number(item.sellCommission.toFixed(2)),
          totalCommission: Number(item.totalCommission.toFixed(2)),
          realizedProfit: Number(item.realizedProfit.toFixed(2)),
          unrealizedProfit: Number(unrealizedProfit.toFixed(2)),
          totalNetProfit,
          profitPct,
          status
        };
      })
      .filter((row) =>
        row.instrument.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
  }, [trades, marketPrices, latestStatementSnapshot, searchQuery]);

  // Top KPI cards strictly bound to the latest PDF statement & chronological trades
  const portfolioSummary = useMemo(() => {
    let totalActiveCost = 0;
    let totalActiveMarketValue = 0;
    let computedRealized = 0;
    let computedUnrealized = 0;

    for (const row of fullShareHoldings) {
      totalActiveCost += row.activeCost;
      totalActiveMarketValue += row.activeMarketValue;
      computedRealized += row.realizedProfit;
      computedUnrealized += row.unrealizedProfit;
    }

    const totalNetProfit =
      latestStatementSnapshot &&
        latestStatementSnapshot.statementNetGain !== null &&
        !searchQuery.trim()
        ? latestStatementSnapshot.statementNetGain
        : Number((computedRealized + computedUnrealized).toFixed(2));

    const netPct = totalActiveCost > 0 ? (totalNetProfit / totalActiveCost) * 100 : 0;
    return {
      totalActiveCost: Number(totalActiveCost.toFixed(2)),
      totalActiveMarketValue: Number(totalActiveMarketValue.toFixed(2)),
      totalNetProfit,
      netPct
    };
  }, [fullShareHoldings, latestStatementSnapshot, searchQuery]);

  const perDayTrades = useMemo(() => {
    return trades.filter((tr) => {
      const matchesDate = selectedDate ? tr.date === selectedDate : true;
      const matchesSearch = tr.instrument
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      return matchesDate && matchesSearch;
    });
  }, [trades, selectedDate, searchQuery]);

  // Anchor reference date to the latest trade/statement date (or today) so 1M / 1Y filters accurately match uploaded PDFs
  const summaryAnchorDate = useMemo(() => {
    if (markedTradeDates.length > 0) {
      return new Date(markedTradeDates[markedTradeDates.length - 1]);
    }
    return new Date();
  }, [markedTradeDates]);

  const summaryTrades = useMemo(() => {
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
      const diffDays = (summaryAnchorDate - tradeDateObj) / (1000 * 60 * 60 * 24);
      if (summaryFilter === '1M') return diffDays >= 0 && diffDays <= 31;
      if (summaryFilter === '1Y') return diffDays >= 0 && diffDays <= 366;
      return true;
    });
  }, [trades, searchQuery, summaryFilter, customStartDate, customEndDate, summaryAnchorDate]);

  // Share-wise summary inside the selected range (1M, 1Y, or Custom) + Sold Share button filter
  const summaryShareBreakdown = useMemo(() => {
    const holdingLookup = {};
    for (const h of fullShareHoldings) {
      holdingLookup[h.instrument] = h;
    }

    const map = {};
    const sortedRangeTrades = [...summaryTrades].sort((a, b) => a.date.localeCompare(b.date));

    for (const tr of sortedRangeTrades) {
      const sym = tr.instrument.toUpperCase();
      if (!map[sym]) {
        const master = holdingLookup[sym];
        map[sym] = {
          instrument: sym,
          group: tr.group || master?.group || 'A',
          boughtQty: 0,
          boughtGross: 0,
          buyComm: 0,
          soldQty: 0,
          soldGross: 0,
          sellComm: 0,
          buyDates: [],
          sellDates: [],
          overallAvgBuyPrice: master ? master.avgBuyPrice : 0,
          latestMarketPrice: master ? master.latestMarketPrice : tr.sellPrice || tr.buyPrice
        };
      }

      const entry = map[sym];
      const qty = Number(tr.qty);

      if (tr.type === 'BUY') {
        const rate = Number(tr.buyPrice);
        const gross = qty * rate;
        const comm = Number(tr.commission) > 0 ? Number(tr.commission) : gross * COMM_RATE;
        entry.boughtQty += qty;
        entry.boughtGross += gross;
        entry.buyComm += comm;
        if (!entry.buyDates.includes(tr.date)) entry.buyDates.push(tr.date);
      } else if (tr.type === 'SELL') {
        const rate = Number(tr.sellPrice);
        const gross = qty * rate;
        const comm = Number(tr.commission) > 0 ? Number(tr.commission) : gross * COMM_RATE;
        entry.soldQty += qty;
        entry.soldGross += gross;
        entry.sellComm += comm;
        if (!entry.sellDates.includes(tr.date)) entry.sellDates.push(tr.date);
      }
    }

    return Object.values(map)
      .map((item) => {
        const rangeAvgBuyPrice =
          item.boughtQty > 0
            ? (item.boughtGross + item.buyComm) / item.boughtQty
            : item.overallAvgBuyPrice;

        const avgSellPrice =
          item.soldQty > 0 ? item.soldGross / item.soldQty : 0;

        // Exact realized profit on shares sold during this selected range (after both buy & sell 0.40% commissions)
        const soldNetProceeds = item.soldGross - item.sellComm;
        const soldCostBasis = item.soldQty * rangeAvgBuyPrice;
        const realizedNetProfit =
          item.soldQty > 0 ? Number((soldNetProceeds - soldCostBasis).toFixed(2)) : 0;

        return {
          ...item,
          rangeAvgBuyPrice: Number(rangeAvgBuyPrice.toFixed(2)),
          avgSellPrice: Number(avgSellPrice.toFixed(2)),
          buyComm: Number(item.buyComm.toFixed(2)),
          sellComm: Number(item.sellComm.toFixed(2)),
          totalComm: Number((item.buyComm + item.sellComm).toFixed(2)),
          realizedNetProfit
        };
      })
      .filter((item) => {
        if (summaryTradeTypeFilter === 'SOLD') return item.soldQty > 0;
        if (summaryTradeTypeFilter === 'BUY') return item.boughtQty > 0;
        return true;
      });
  }, [summaryTrades, fullShareHoldings, summaryTradeTypeFilter]);

  const summaryStats = useMemo(() => {
    const buys = summaryTrades.filter((t) => t.type === 'BUY');
    const sells = summaryTrades.filter((t) => t.type === 'SELL');

    const boughtQty = buys.reduce((sum, t) => sum + Number(t.qty), 0);
    const boughtValue = buys.reduce((sum, t) => sum + Number(t.qty) * Number(t.buyPrice), 0);
    const soldQty = sells.reduce((sum, t) => sum + Number(t.qty), 0);
    const soldValue = sells.reduce((sum, t) => sum + Number(t.qty) * Number(t.sellPrice), 0);
    const totalComm = summaryTrades.reduce((sum, t) => {
      const gross = Number(t.qty) * Number(t.type === 'BUY' ? t.buyPrice : t.sellPrice);
      const c = Number(t.commission) > 0 ? Number(t.commission) : gross * COMM_RATE;
      return sum + c;
    }, 0);

    return { buys, sells, boughtQty, boughtValue, soldQty, soldValue, totalComm };
  }, [summaryTrades]);

  const activeShareForGraph = useMemo(() => {
    if (!selectedChartSymbol) return null;
    return fullShareHoldings.find((s) => s.instrument === selectedChartSymbol) || null;
  }, [selectedChartSymbol, fullShareHoldings]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIdx = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayIdx; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [calendarMonth]);

  const handleSelectTradeDate = (dateStr) => {
    setSelectedDate(dateStr);
    setActiveTab('perday');
    setIsCalendarOpen(false);
    const datePdfs = pdfsByDate[dateStr];
    if (Array.isArray(datePdfs) && datePdfs.length > 0) {
      setSelectedPdfId(datePdfs[datePdfs.length - 1].id);
    } else {
      setSelectedPdfId('');
    }
  };

  if (!currentUser) {
    const showLoginEmailErr = loginTouched.email && loginValidationErrors.email;
    const showLoginPassErr = loginTouched.password && loginValidationErrors.password;

    const showSignupNameErr = signupTouched.name && signupValidationErrors.name;
    const showSignupCodeErr = signupTouched.clientCode && signupValidationErrors.clientCode;
    const showSignupBoErr =
      (signupTouched.boId || signupBoId.length > 0) && signupValidationErrors.boId;
    const showSignupEmailErr = signupTouched.email && signupValidationErrors.email;
    const showSignupPassErr =
      (signupTouched.password || signupPassword.length > 0) && signupValidationErrors.password;

    return (
      <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200">
          <div className="lg:col-span-6 bg-[#0B2B4C] text-white p-8 md:p-10 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-medium text-sky-200 mb-6">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Multi-User DSE Analyzer</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
                বাংলাদেশ শেয়ার বাজারের{' '}
                <span className="text-amber-400">Multi-Brokerage</span> পোর্টফোলিও ও লাভ-লস ট্র্যাকার
              </h1>

              <p className="text-slate-300 text-sm leading-relaxed mb-8">
                প্রতিটি ইউজারের জন্য সম্পূর্ণ আলাদা ও সুরক্ষিত ওয়ার্কস্পেস। যেকোনো ব্রোকারেজ হাউজের ডেইলি Portfolio Statement এবং Trade Confirmation PDF আপলোড করলেই কমিশনসহ অটোমেটিক লাভ (Green Signal) ও লস (Red Signal) হিসাব হয়ে যাবে।
              </p>

              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  সমর্থিত ব্রোকারেজ হাউজসমূহ (DSE &amp; CSE):
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Demo Login:</span>
                  <span className="text-emerald-300 font-semibold select-all truncate">
                    tanvir@lankabangla.demo
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Demo Password:</span>
                  <span className="text-amber-300 font-semibold select-all">
                    password123
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-8 md:p-10 flex flex-col justify-center bg-white">
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl mb-6">
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
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === 'signin' ? (
              <form
                onSubmit={handleSignIn}
                noValidate
                method="post"
                autoComplete="on"
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="signin-email"
                    className="block text-xs font-semibold text-slate-700 mb-2"
                  >
                    ইমেইল অ্যাড্রেস (Email) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${showLoginEmailErr ? 'text-red-500' : 'text-slate-400'
                        }`}
                    />
                    <input
                      id="signin-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      value={loginEmail}
                      onBlur={() => setLoginTouched((p) => ({ ...p, email: true }))}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="আপনার ইমেইল লিখুন (যেমন: tanvir@lankabangla.demo)"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all ${showLoginEmailErr
                        ? 'bg-red-50/60 border-2 border-red-500 focus:ring-red-500'
                        : 'bg-slate-50 border border-slate-200 focus:ring-[#0B2B4C] focus:bg-white'
                        }`}
                    />
                  </div>
                  {showLoginEmailErr && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{showLoginEmailErr}</span>
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="signin-password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      পাসওয়ার্ড (Password — কমপক্ষে ৮ অক্ষর) <span className="text-red-500">*</span>
                    </label>
                    {loginPassword.length > 0 && (
                      <span
                        className={`text-[11px] font-bold ${loginPassword.length < 8 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                      >
                        {loginPassword.length}/8 chars
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${showLoginPassErr ? 'text-red-500' : 'text-slate-400'
                        }`}
                    />
                    <input
                      id="signin-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onBlur={() => setLoginTouched((p) => ({ ...p, password: true }))}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড লিখুন"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all ${showLoginPassErr
                        ? 'bg-red-50/60 border-2 border-red-500 focus:ring-red-500'
                        : 'bg-slate-50 border border-slate-200 focus:ring-[#0B2B4C] focus:bg-white'
                        }`}
                    />
                  </div>
                  {showLoginPassErr && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{showLoginPassErr}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3.5 px-6 bg-[#0B2B4C] hover:bg-[#082038] disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>{isAuthLoading ? 'যাচাই করা হচ্ছে...' : 'ওয়ার্কস্পেসে প্রবেশ করুন'}</span>
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleSignUp}
                noValidate
                method="post"
                autoComplete="on"
                className="space-y-3.5"
              >
                <div>
                  <label
                    htmlFor="signup-name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    বিনিয়োগকারীর নাম (Investor Name) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${showSignupNameErr ? 'text-red-500' : 'text-slate-400'
                        }`}
                    />
                    <input
                      id="signup-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={signupName}
                      onBlur={() => setSignupTouched((p) => ({ ...p, name: true }))}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="যেমন: MD. RAHIM UDDIN"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 ${showSignupNameErr
                        ? 'bg-red-50/60 border-2 border-red-500 focus:ring-red-500'
                        : 'bg-slate-50 border border-slate-200 focus:ring-[#0B2B4C] focus:bg-white'
                        }`}
                    />
                  </div>
                  {showSignupNameErr && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                      {showSignupNameErr}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="signup-code"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Investor / Client Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash
                        className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${showSignupCodeErr ? 'text-red-500' : 'text-slate-400'
                          }`}
                      />
                      <input
                        id="signup-code"
                        name="clientCode"
                        type="text"
                        value={signupClientCode}
                        onBlur={() => setSignupTouched((p) => ({ ...p, clientCode: true }))}
                        onChange={(e) => setSignupClientCode(e.target.value)}
                        placeholder="যেমন: L84419"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 ${showSignupCodeErr
                          ? 'bg-red-50/60 border-2 border-red-500 focus:ring-red-500'
                          : 'bg-slate-50 border border-slate-200 focus:ring-[#0B2B4C] focus:bg-white'
                          }`}
                      />
                    </div>
                    {showSignupCodeErr && (
                      <p className="mt-1 text-[11px] font-semibold text-red-600">
                        {showSignupCodeErr}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="signup-bo"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        BO ID (১৬ ডিজিট) <span className="text-red-500">*</span>
                      </label>
                      {signupBoId.length > 0 && (
                        <span
                          className={`text-[11px] font-bold ${signupBoId.length !== 16 ? 'text-red-600' : 'text-emerald-600'
                            }`}
                        >
                          {signupBoId.length}/16
                        </span>
                      )}
                    </div>
                    <input
                      id="signup-bo"
                      name="boId"
                      type="text"
                      inputMode="numeric"
                      maxLength={16}
                      value={signupBoId}
                      onBlur={() => setSignupTouched((p) => ({ ...p, boId: true }))}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 16);
                        setSignupBoId(digitsOnly);
                      }}
                      placeholder="12018200..."
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 ${showSignupBoErr
                        ? 'bg-red-50/60 border-2 border-red-500 text-red-700 focus:ring-red-500'
                        : 'bg-slate-50 border border-slate-200 focus:ring-[#0B2B4C] focus:bg-white'
                        }`}
                    />
                    {showSignupBoErr && (
                      <p className="mt-1 text-[11px] font-semibold text-red-600">
                        {showSignupBoErr}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-broker"
                    className="block text-xs font-semibold text-slate-700 mb-1"
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
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    ইমেইল অ্যাড্রেস (Email) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${showSignupEmailErr ? 'text-red-500' : 'text-slate-400'
                        }`}
                    />
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      value={signupEmail}
                      onBlur={() => setSignupTouched((p) => ({ ...p, email: true }))}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="investor@gmail.com"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 ${showSignupEmailErr
                        ? 'bg-red-50/60 border-2 border-red-500 focus:ring-red-500'
                        : 'bg-slate-50 border border-slate-200 focus:ring-[#0B2B4C] focus:bg-white'
                        }`}
                    />
                  </div>
                  {showSignupEmailErr && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                      {showSignupEmailErr}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="signup-password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      পাসওয়ার্ড (Password) <span className="text-red-500">*</span>
                    </label>
                    {signupPassword.length > 0 && (
                      <span
                        className={`text-[11px] font-bold ${signupPassword.length < 8 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                      >
                        {signupPassword.length}/8 অক্ষর
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${showSignupPassErr ? 'text-red-500' : 'text-slate-400'
                        }`}
                    />
                    <input
                      id="signup-password"
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={signupPassword}
                      onBlur={() => setSignupTouched((p) => ({ ...p, password: true }))}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 ${showSignupPassErr
                        ? 'bg-red-50/60 border-2 border-red-500 text-red-700 focus:ring-red-500'
                        : 'bg-slate-50 border border-slate-200 focus:ring-[#0B2B4C] focus:bg-white'
                        }`}
                    />
                  </div>
                  {showSignupPassErr && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                      {showSignupPassErr}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3 px-6 bg-[#0B2B4C] hover:bg-[#082038] disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-md transition-all"
                >
                  {isAuthLoading ? 'তৈরি হচ্ছে...' : 'নতুন ওয়ার্কস্পেস তৈরি করুন'}
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

  const isMarketGain = portfolioSummary.totalActiveMarketValue >= portfolioSummary.totalActiveCost;

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col overflow-x-clip">
      <header className="w-full bg-[#0B2B4C] text-white px-3 sm:px-6 lg:px-10 py-2.5 lg:py-3.5 shadow-md sticky top-0 z-30">
        <div className="w-full flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-400 text-[#0B2B4C] flex items-center justify-center font-bold shadow shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base md:text-lg tracking-tight truncate">
                  {currentUser.name}
                </span>
                <span className="px-2 py-0.5 bg-white/15 rounded text-[11px] sm:text-xs font-mono text-amber-300 shrink-0">
                  {currentUser.clientCode}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                {currentUser.brokerage} • BO: {currentUser.boId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {hasAnyUploadedPdf && (
              <button
                type="button"
                onClick={() => setShowLeftPdf((prev) => !prev)}
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${showLeftPdf
                  ? 'bg-amber-400 text-[#0B2B4C]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
              >
                {showLeftPdf ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showLeftPdf ? 'Hide PDF' : 'Show PDF'}</span>
                {pdfsForSelectedDate.length > 1 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-bold">
                    {pdfsForSelectedDate.length}
                  </span>
                )}
              </button>
            )}

            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isFirebaseConfigured ? 'Firebase Connected' : 'Local Cloud Mode'}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full px-3 sm:px-6 lg:px-10 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {showLeftPdf && (
          <aside className="w-full lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[50vh] sm:h-[60vh] lg:h-[calc(100vh-5.5rem)] lg:sticky lg:top-[4.75rem] z-20">
            {activePdfToDisplay ? (
              <>
                <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-100 border-b border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {activePdfToDisplay.name}
                      </span>
                      <span className="text-[11px] text-blue-700 font-mono">
                        Date: {activePdfToDisplay.date} •{' '}
                        {activePdfToDisplay.docType === 'PORTFOLIO_STATEMENT'
                          ? 'Portfolio Statement'
                          : 'Trade Confirmation'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLeftPdf(false)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 shrink-0"
                      title="Close PDF Viewer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {pdfsForSelectedDate.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {pdfsForSelectedDate.map((pdfItem, idx) => {
                        const isCurrent = activePdfToDisplay.id === pdfItem.id;
                        return (
                          <button
                            key={pdfItem.id}
                            type="button"
                            onClick={() => setSelectedPdfId(pdfItem.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${isCurrent
                              ? 'bg-[#0B2B4C] text-white shadow-sm'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                            <FileText className="w-3 h-3 shrink-0" />
                            <span>
                              PDF #{idx + 1}:{' '}
                              {pdfItem.docType === 'PORTFOLIO_STATEMENT'
                                ? 'Portfolio'
                                : 'Trade Conf.'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <iframe
                  key={`${selectedDate}-${activePdfToDisplay.id}`}
                  src={activePdfToDisplay.url}
                  title={`Trade PDF - ${activePdfToDisplay.name}`}
                  className="w-full flex-1 border-0 min-h-0"
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <FileText className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-700">
                  No PDF Uploaded for {selectedDate}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  এই তারিখের জন্য কোনো PDF আপলোড করা নেই। ক্যালেন্ডার থেকে সবুজ চিহ্নিত তারিখ বাছাই করুন অথবা নতুন PDF আপলোড করুন।
                </p>
              </div>
            )}
          </aside>
        )}

        <main
          className={
            showLeftPdf
              ? 'w-full lg:col-span-7 space-y-4 sm:space-y-6 min-w-0'
              : 'w-full lg:col-span-12 space-y-4 sm:space-y-6 min-w-0'
          }
        >
          {/* Sticky Top Section on Desktop: KPI Cards + Date/Search/Upload Controls + Tabs */}
          <div className="lg:sticky lg:top-[4.25rem] z-20 bg-slate-50/95 backdrop-blur-sm pb-2 space-y-3 sm:space-y-4">
            {/* Top 4 KPI Cards — Always synced to the LATEST PDF date */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm min-w-0">
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Active Investor Account</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 truncate">{currentUser.name}</p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                  {currentUser.email} • Code:{' '}
                  <strong className="text-slate-700">{currentUser.clientCode}</strong>
                </p>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="text-[11px] font-medium text-slate-500">Total Deposit Amount</p>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-[10px] font-semibold text-emerald-700 truncate">
                    {latestStatementSnapshot ? `Latest: ${latestStatementSnapshot.date}` : 'PDF Verified'}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                  ৳
                  {effectiveDepositAmount.toLocaleString('en-BD', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">Auto-synced from latest Portfolio PDF</p>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm min-w-0">
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">Active Share Buying Cost</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                  ৳
                  {portfolioSummary.totalActiveCost.toLocaleString('en-BD', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <p className="text-[11px] sm:text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500">Market Value:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md ${isMarketGain
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                      }`}
                  >
                    ৳
                    {portfolioSummary.totalActiveMarketValue.toLocaleString('en-BD', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </p>
              </div>

              <div
                className={`p-3.5 sm:p-4 rounded-2xl border shadow-sm min-w-0 ${portfolioSummary.totalNetProfit >= 0
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-rose-50/70 border-rose-200'
                  }`}
              >
                <p className="text-[11px] font-medium text-slate-600 mb-0.5 truncate">
                  Total Net Gain / Loss (Realized + Unrealized)
                </p>
                <p
                  className={`text-lg sm:text-xl font-bold flex items-center gap-1 flex-wrap ${portfolioSummary.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                >
                  {portfolioSummary.totalNetProfit >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
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
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Includes 0.40% Buy &amp; Sell commission • Click share for chart
                </p>
              </div>
            </section>

            {/* Controls: Marked Calendar Picker + Search + Multi-PDF Upload */}
            <section className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 sm:space-y-3">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 sm:gap-3">
                <div className="relative w-full lg:w-auto" ref={calendarPopoverRef}>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen((prev) => !prev)}
                    className="w-full lg:w-auto flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-left transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-[#0B2B4C] shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                        Custom Date Select (Marked Trade Dates)
                      </span>
                      <span className="text-sm font-semibold text-slate-900 font-mono truncate">
                        {selectedDate || 'Select Trade Date'}
                      </span>
                    </div>
                  </button>

                  {isCalendarOpen && (
                    <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-40">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarMonth(
                              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                            )
                          }
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-800">
                          {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarMonth(
                              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                            )
                          }
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                          <div key={d}>{d}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {calendarDays.map((cell, idx) => {
                          if (!cell) return <div key={`empty-${idx}`} />;
                          const isMarked = markedTradeDates.includes(cell.dateStr);
                          const pdfCount = Array.isArray(pdfsByDate[cell.dateStr])
                            ? pdfsByDate[cell.dateStr].length
                            : 0;
                          const isSelected = selectedDate === cell.dateStr;

                          return (
                            <button
                              key={cell.dateStr}
                              type="button"
                              onClick={() => handleSelectTradeDate(cell.dateStr)}
                              title={
                                isMarked
                                  ? `Trade Date: ${cell.dateStr}${pdfCount > 0 ? ` (${pdfCount} PDF Stored)` : ''}`
                                  : cell.dateStr
                              }
                              className={`relative h-9 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all ${isSelected
                                ? 'bg-[#0B2B4C] text-white shadow-sm'
                                : isMarked
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                                  : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                              <span>{cell.day}</span>
                              {isMarked && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-amber-400' : 'bg-emerald-600'
                                    }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                          <span>Marked = Trade / PDF Date</span>
                        </span>
                        <span>{markedTradeDates.length} Days</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search company symbol (e.g., BRACBANK, CITYBANK, SHARPIND)..."
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2B4C] focus:bg-white"
                  />
                </div>

                <div className="flex flex-col items-stretch lg:items-end shrink-0">
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
                    className="w-full lg:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-[#0B2B4C] hover:bg-[#082038] disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{isUploading ? 'Validating PDF...' : 'Upload Trade PDF'}</span>
                  </button>
                </div>
              </div>

              {pdfsForSelectedDate.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Stored PDFs ({selectedDate}):
                  </span>
                  {pdfsForSelectedDate.map((pdfItem, idx) => (
                    <button
                      key={pdfItem.id}
                      type="button"
                      onClick={() => {
                        setSelectedPdfId(pdfItem.id);
                        setShowLeftPdf(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${activePdfToDisplay?.id === pdfItem.id && showLeftPdf
                        ? 'bg-[#0B2B4C] text-white border-[#0B2B4C]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span className="truncate max-w-[180px] sm:max-w-none">
                        #{idx + 1} {pdfItem.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-start sm:items-center gap-2 text-[11px] sm:text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <strong>নির্দেশনা:</strong> শুধুমাত্র ব্রোকারেজ হাউজের{' '}
                  <strong>Trade Confirmation</strong> অথবা <strong>Portfolio Statement PDF</strong>{' '}
                  আপলোড করুন। একাধিক PDF আপলোড করলে সব ডাটা সংরক্ষিত থাকবে এবং ড্যাশবোর্ডে সর্বশেষ তারিখের PDF ডাটা অটোমেটিক দেখাবে।
                </span>
              </div>

              {uploadStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 transition-opacity duration-300 ${uploadStatus.type === 'error'
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

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('full')}
                className={`w-full sm:w-auto px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all ${activeTab === 'full'
                  ? 'bg-[#0B2B4C] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Full Share Information (All Holdings &amp; Sold History)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('perday')}
                className={`w-full sm:w-auto px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all ${activeTab === 'perday'
                  ? 'bg-[#0B2B4C] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>Per-Day Trading ({selectedDate || 'Select Date'})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`w-full sm:w-auto px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all ${activeTab === 'summary'
                  ? 'bg-[#0B2B4C] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
              >
                <Filter className="w-4 h-4 shrink-0" />
                <span>Buying &amp; Selling Summary</span>
              </button>
            </div>
          </div>

          {activeTab === 'full' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                    Full Share Information (All Bought, Active &amp; Sold Shares)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {fullShareHoldings.length} Companies
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Buy + Sell ০.৪০% কমিশন সমন্বয়কৃত লাভ-লস এবং Details Graph দেখতে শেয়ারে ক্লিক করুন
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[780px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3.5 px-4">Company &amp; Status</th>
                      <th className="py-3.5 px-3">Gr</th>
                      <th className="py-3.5 px-3 text-right">Bought / Sold / Bal</th>
                      <th className="py-3.5 px-3">Buy Date(s)</th>
                      <th className="py-3.5 px-3">Sell Date(s)</th>
                      <th className="py-3.5 px-3 text-right">Avg Buy (+0.4%)</th>
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
                              <div className="text-slate-700">
                                Buy: <strong>{row.totalBoughtQty}</strong>
                              </div>
                              <div className="text-purple-700">
                                Sell: <strong>{row.totalSoldQty}</strong>
                              </div>
                              <div className="text-emerald-700">
                                Bal: <strong>{row.remainingQty}</strong>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-xs text-slate-600">
                              {row.buyDates.length > 0 ? (
                                <div className="space-y-0.5">
                                  {row.buyDates.map((d) => (
                                    <button
                                      key={d}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectTradeDate(d);
                                      }}
                                      className="block px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-mono w-fit"
                                    >
                                      {d}
                                    </button>
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
                                    <button
                                      key={d}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectTradeDate(d);
                                      }}
                                      className="block px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded font-mono w-fit"
                                    >
                                      {d}
                                    </button>
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
                                  -৳{Math.abs(row.totalNetProfit).toFixed(2)} (
                                  {row.profitPct.toFixed(2)}%)
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
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Calendar className="w-5 h-5 text-[#0B2B4C] shrink-0" />
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                    Per-Day Trading Orders — {selectedDate}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {perDayTrades.length} Trades
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  ক্যালেন্ডারে তারিখ সিলেক্ট করলে ওই দিনের বাই-সেল অর্ডার দেখা যাবে (PDF দেখতে উপরের Show PDF বাটনে ক্লিক করুন)
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-3">Type</th>
                      <th className="py-3.5 px-3">Instrument</th>
                      <th className="py-3.5 px-3">Gr</th>
                      <th className="py-3.5 px-3 text-right">Qty</th>
                      <th className="py-3.5 px-3 text-right">Buying Price (Tk.)</th>
                      <th className="py-3.5 px-3 text-right">Selling Price (Tk.)</th>
                      <th className="py-3.5 px-3 text-right">Comm (0.40%)</th>
                      <th className="py-3.5 px-4 text-right">Net Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {perDayTrades.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                          <strong>{selectedDate}</strong> তারিখে কোনো ডেইলি বাই/সেল অর্ডার রেকর্ড নেই। ক্যালেন্ডার থেকে সবুজ চিহ্নিত তারিখ বাছাই করুন।
                        </td>
                      </tr>
                    ) : (
                      perDayTrades.map((tr) => {
                        const gross =
                          Number(tr.qty) *
                          Number(tr.type === 'BUY' ? tr.buyPrice : tr.sellPrice);
                        const comm =
                          Number(tr.commission) > 0
                            ? Number(tr.commission)
                            : Number((gross * COMM_RATE).toFixed(2));
                        const matchedHolding = fullShareHoldings.find(
                          (h) => h.instrument === tr.instrument.toUpperCase()
                        );
                        const effectiveBuyPriceWithComm =
                          Number(tr.buyPrice) > 0
                            ? Number(tr.buyPrice) * (1 + COMM_RATE)
                            : matchedHolding?.avgBuyPrice || Number(tr.sellPrice) * (1 + COMM_RATE);
                        const pnl =
                          tr.type === 'SELL'
                            ? Number(
                              (
                                gross -
                                comm -
                                effectiveBuyPriceWithComm * Number(tr.qty)
                              ).toFixed(2)
                            )
                            : -comm;
                        return (
                          <tr key={tr.id} className="hover:bg-slate-50">
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                              {tr.date}
                            </td>
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
                            <td className="py-3.5 px-3 font-bold text-slate-900">
                              {tr.instrument}
                            </td>
                            <td className="py-3.5 px-3 text-slate-600">{tr.group}</td>
                            <td className="py-3.5 px-3 text-right font-semibold">{tr.qty}</td>
                            <td className="py-3.5 px-3 text-right font-semibold text-blue-700">
                              ৳{Number(tr.buyPrice).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold text-slate-800">
                              ৳{Number(tr.sellPrice).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-3 text-right text-slate-500">
                              ৳{comm.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${pnl >= 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                                  }`}
                              >
                                {pnl >= 0
                                  ? `+৳${pnl.toFixed(2)}`
                                  : `-৳${Math.abs(pnl).toFixed(2)}`}
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
                    Buying &amp; Selling Volume Summary
                  </h2>
                  <p className="text-xs text-slate-500">
                    Filter your buy &amp; sell history by Last 1 Month, Last 1 Year, Custom Date Range, or Sold Shares
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
                  <p className="text-xs font-semibold text-amber-800">
                    Total Commission (0.40%)
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ৳{summaryStats.totalComm.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    {summaryTrades.length} Total Orders
                  </p>
                </div>
              </div>

              {/* Detailed Share-by-Share Breakdown for Selected Time Range + Sold Share Filter Button */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Share-Wise Buying &amp; Selling Breakdown (
                      {summaryFilter === '1M'
                        ? 'Last 1 Month'
                        : summaryFilter === '1Y'
                          ? 'Last 1 Year'
                          : 'Custom Range'}
                      )
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {summaryShareBreakdown.length} Shares
                    </span>
                  </div>

                  {/* Filter Buttons: All Shares | Bought Shares | Sold Shares */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSummaryTradeTypeFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${summaryTradeTypeFilter === 'ALL'
                        ? 'bg-[#0B2B4C] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      All Shares
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryTradeTypeFilter('BUY')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${summaryTradeTypeFilter === 'BUY'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                      Bought Shares
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryTradeTypeFilter('SOLD')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${summaryTradeTypeFilter === 'SOLD'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                    >
                      Sold Shares
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        <th className="py-3.5 px-4">Share Name</th>
                        <th className="py-3.5 px-3">Gr</th>
                        <th className="py-3.5 px-3 text-right">Bought Qty</th>
                        <th className="py-3.5 px-3 text-right">Avg Buy (+0.4%)</th>
                        <th className="py-3.5 px-3">Buy Date(s)</th>
                        <th className="py-3.5 px-3 text-right">Sold Qty</th>
                        <th className="py-3.5 px-3 text-right">Sell Price</th>
                        <th className="py-3.5 px-3">Sold Date(s)</th>
                        <th className="py-3.5 px-3 text-right">Total Comm</th>
                        <th className="py-3.5 px-4 text-right">Sold Net Profit / Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {summaryShareBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                            নির্বাচিত সময়সীমায় কোনো {summaryTradeTypeFilter === 'SOLD' ? 'বিক্রিত (Sold)' : ''} শেয়ার পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        summaryShareBreakdown.map((item) => (
                          <tr key={item.instrument} className="hover:bg-slate-50">
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {item.instrument}
                            </td>
                            <td className="py-3.5 px-3 text-slate-600">{item.group}</td>
                            <td className="py-3.5 px-3 text-right font-mono font-semibold text-blue-700">
                              {item.boughtQty > 0 ? item.boughtQty : '—'}
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold text-blue-700">
                              {item.rangeAvgBuyPrice > 0
                                ? `৳${item.rangeAvgBuyPrice.toFixed(2)}`
                                : '—'}
                            </td>
                            <td className="py-3.5 px-3 text-xs font-mono text-slate-600">
                              {item.buyDates.length > 0 ? item.buyDates.join(', ') : '—'}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-semibold text-purple-700">
                              {item.soldQty > 0 ? item.soldQty : '—'}
                            </td>
                            <td className="py-3.5 px-3 text-right font-semibold text-slate-800">
                              {item.soldQty > 0 ? `৳${item.avgSellPrice.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-3.5 px-3 text-xs font-mono text-purple-700">
                              {item.sellDates.length > 0 ? item.sellDates.join(', ') : 'Not Sold'}
                            </td>
                            <td className="py-3.5 px-3 text-right text-slate-600">
                              ৳{item.totalComm.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {item.soldQty > 0 ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${item.realizedNetProfit >= 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                    }`}
                                >
                                  {item.realizedNetProfit >= 0
                                    ? `+৳${item.realizedNetProfit.toFixed(2)}`
                                    : `-৳${Math.abs(item.realizedNetProfit).toFixed(2)}`}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Holding</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}