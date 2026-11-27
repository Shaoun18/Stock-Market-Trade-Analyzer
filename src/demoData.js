// ---------------------------------------------------------------
// Demo account — সব সংখ্যা নিচের ট্রেড লিস্ট থেকে প্রোগ্রাম দিয়ে হিসাব করা হয়,
// তাই Holdings, Market Value, Profit/Loss, Cash Balance সবকিছু একে অপরের সাথে মিলবে।
// কমিশন: প্রতিটি Buy ও Sell-এ 0.40%
// ---------------------------------------------------------------

// ডেমো ডাটা বদলালে এই ভার্সন বাড়ান — তাহলে পুরনো ডেমো ডাটা নিজে থেকে নতুন ডাটায় আপডেট হবে
export const DEMO_DATA_VERSION = 'demo-v3';

export const DEMO_ACCOUNT = {
  uid: 'demo-tanvir-l84419',
  name: 'Tanvir Ahmed Chowdhury',
  clientCode: 'L84419',
  boId: '1201820045918231',
  brokerage: 'LankaBangla Securities Ltd.',
  email: 'tanvir@lankabangla.demo',
  password: 'password123',
  depositAmount: 150000
};

const COMM = 0.004;
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const STATEMENT_DATE = '2026-11-26';
const DEMO_DEPOSIT = 150000;

// [date, type, symbol, group, qty, price]
const RAW_TRADES = [
  ['2026-11-10', 'BUY', 'BRACBANK', 'A', 100, 64.5],
  ['2026-11-10', 'BUY', 'CITYBANK', 'A', 200, 28.4],
  ['2026-11-10', 'BUY', 'SQURPHARMA', 'A', 50, 212.3],
  ['2026-11-12', 'BUY', 'GP', 'A', 20, 301.0],
  ['2026-11-12', 'BUY', 'ROBI', 'A', 100, 29.8],
  ['2026-11-13', 'BUY', 'SHARPIND', 'Z', 500, 12.1],
  ['2026-11-13', 'BUY', 'BDTHAIFOOD', 'B', 300, 18.9],
  ['2026-11-17', 'BUY', 'BSRMSTEEL', 'A', 60, 94.2],
  ['2026-11-17', 'BUY', 'DUTCHBANGL', 'A', 150, 47.6],
  ['2026-11-18', 'SELL', 'SHARPIND', 'Z', 500, 13.6], // সম্পূর্ণ বিক্রি — লাভ
  ['2026-11-19', 'BUY', 'BRACBANK', 'A', 50, 66.2],
  ['2026-11-19', 'SELL', 'ROBI', 'A', 40, 30.9], // আংশিক বিক্রি
  ['2026-11-20', 'BUY', 'BSC', 'A', 40, 114.5],
  ['2026-11-21', 'SELL', 'BDTHAIFOOD', 'B', 300, 18.1], // সম্পূর্ণ বিক্রি — লস
  ['2026-11-24', 'BUY', 'LHB', 'A', 120, 56.8],
  ['2026-11-24', 'SELL', 'CITYBANK', 'A', 100, 30.2], // আংশিক বিক্রি
  ['2026-11-25', 'BUY', 'NAVANAPHAR', 'B', 80, 44.3],
  ['2026-11-26', 'BUY', 'TITASGAS', 'A', 100, 24.2]
];

// সর্বশেষ বাজারদর (বিক্রি হয়ে যাওয়া শেয়ারের দাম = শেষ বিক্রির দাম)
const LATEST_PRICES = {
  BRACBANK: 67.4,
  CITYBANK: 29.6,
  SQURPHARMA: 208.5,
  GP: 296.4,
  ROBI: 29.1,
  BSRMSTEEL: 96.8,
  DUTCHBANGL: 49.3,
  BSC: 112.9,
  LHB: 58.4,
  NAVANAPHAR: 43.1,
  TITASGAS: 24.0
};

export const INITIAL_DEMO_TRADES = RAW_TRADES.map(([date, type, instrument, group, qty, price], i) => {
  const gross = r2(qty * price);
  const commission = r2(gross * COMM);
  return {
    id: `demo-${date}-${instrument}-${type}-${qty}-${i}`,
    date,
    type,
    instrument,
    group,
    qty,
    buyPrice: type === 'BUY' ? price : 0,
    sellPrice: type === 'SELL' ? price : 0,
    grossAmount: gross,
    commission,
    netTotal: type === 'BUY' ? r2(gross + commission) : r2(gross - commission),
    sourcePdf: `Demo_Trade_Confirmation_${date}.pdf`
  };
});

function buildDemoPortfolio() {
  const bySymbol = {};
  let cash = DEMO_DEPOSIT;
  let totalRealized = 0;

  for (const tr of INITIAL_DEMO_TRADES) {
    const s = (bySymbol[tr.instrument] ||= {
      group: tr.group,
      boughtQty: 0,
      buyCostWithComm: 0,
      remaining: 0,
      realized: 0
    });
    if (tr.type === 'BUY') {
      const cost = tr.grossAmount + tr.commission;
      s.boughtQty += tr.qty;
      s.buyCostWithComm += cost;
      s.remaining += tr.qty;
      cash -= cost;
    } else {
      const avg = s.buyCostWithComm / s.boughtQty;
      const net = tr.grossAmount - tr.commission;
      s.realized += net - tr.qty * avg;
      s.remaining -= tr.qty;
      cash += net;
    }
  }

  const holdings = [];
  const marketPrices = {};
  let totalCost = 0;
  let totalMv = 0;

  for (const [symbol, s] of Object.entries(bySymbol)) {
    totalRealized += s.realized;
    if (s.remaining <= 0) continue;
    const avg = s.buyCostWithComm / s.boughtQty;
    const cost = s.remaining * avg;
    const price = LATEST_PRICES[symbol];
    const mv = r2(s.remaining * price);
    marketPrices[symbol] = price;
    totalCost += cost;
    totalMv += mv;
    holdings.push({
      instrument: symbol,
      group: s.group,
      qty: s.remaining,
      salableQty: s.remaining,
      avgCostWithComm: r2(avg),
      totalCostWithComm: r2(cost),
      marketPrice: price,
      marketValue: mv,
      unrealizedGainLoss: r2(mv - cost)
    });
  }

  const unrealized = r2(totalMv - totalCost);
  const realized = r2(totalRealized);

  const snapshot = {
    date: STATEMENT_DATE,
    holdings,
    totalDeposit: DEMO_DEPOSIT,
    ledgerBalance: r2(cash),
    availableBalance: r2(cash),
    purchasePower: r2(cash),
    statementRealized: realized,
    statementUnrealized: unrealized,
    statementNetGain: r2(realized + unrealized),
    statementTotalCost: r2(totalCost),
    statementTotalMarketValue: r2(totalMv)
  };

  return { snapshot, marketPrices };
}

const demoPortfolio = buildDemoPortfolio();

export const DEMO_MARKET_PRICES = demoPortfolio.marketPrices;
export const DEMO_STATEMENT_SNAPSHOTS = { [STATEMENT_DATE]: demoPortfolio.snapshot };
