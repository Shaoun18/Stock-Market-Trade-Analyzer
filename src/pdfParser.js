import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const REQUIRED_TRADE_KEYWORDS = [
  'bo id',
  'client code',
  'investor code',
  'instrument',
  'trading code',
  'dse',
  'dhaka stock exchange',
  'cse',
  'chittagong stock exchange',
  'trade confirmation',
  'portfolio statement',
  'howla',
  'contract note',
  'brokerage',
  'securities',
  'salable',
  'buy',
  'sell'
];

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

function parseBrokerDate(text) {
  const mdy = text.match(/\b([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})\b/);
  if (mdy) {
    const mm = MONTHS[mdy[1].toLowerCase()];
    if (mm) return `${mdy[3]}-${mm}-${mdy[2].padStart(2, '0')}`;
  }

  const dmy = text.match(/\b(\d{1,2})-([A-Za-z]{3})-(\d{4})\b/);
  if (dmy) {
    const mm = MONTHS[dmy[2].toLowerCase()];
    if (mm) return `${dmy[3]}-${mm}-${dmy[1].padStart(2, '0')}`;
  }

  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  return new Date().toISOString().split('T')[0];
}

function parseNum(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/,/g, '')) || 0;
}

async function computeBufferHash(arrayBuffer) {
  if (window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `len-${arrayBuffer.byteLength}`;
}

export async function parseAndValidateTradePdf(file) {
  if (!file || file.type !== 'application/pdf') {
    throw new Error('শুধুমাত্র PDF ফাইল আপলোড করা যাবে।');
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileHash = await computeBufferHash(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    fullText += strings.join(' ') + '\n';
  }

  const normalizedText = fullText.toLowerCase();
  const matchedKeywords = REQUIRED_TRADE_KEYWORDS.filter((kw) =>
    normalizedText.includes(kw)
  );

  const hasMarketContext =
    matchedKeywords.includes('dse') ||
    matchedKeywords.includes('cse') ||
    matchedKeywords.includes('bo id') ||
    matchedKeywords.includes('client code') ||
    matchedKeywords.includes('trade confirmation') ||
    matchedKeywords.includes('portfolio statement') ||
    matchedKeywords.includes('brokerage');

  if (matchedKeywords.length < 3 || !hasMarketContext) {
    throw new Error(
      `Invalid PDF Rejected (${file.name})! এটি কোনো শেয়ার ট্রেডিং PDF নয়।`
    );
  }

  const cleanedText = fullText
    .replace(/\bDUTCHBANG\s+L\b/g, 'DUTCHBANGL')
    .replace(/\bSQURPHAR\s+MA\b/g, 'SQURPHARMA')
    .replace(/\bNAVANAPHA\s+R\b/g, 'NAVANAPHAR')
    .replace(/\bBDTHAIFOO\s+D\b/g, 'BDTHAIFOOD')
    .replace(/\s+/g, ' ');

  const isPortfolioStatement =
    normalizedText.includes('portfolio statement') ||
    normalizedText.includes('salable quantity');

  const clientMatch = cleanedText.match(/(?:Client Code|Investor Code)\s*:\s*([A-Z0-9]+)/i);
  const clientCode = clientMatch ? clientMatch[1] : 'UNKNOWN';

  if (isPortfolioStatement) {
    const asOnMatch = cleanedText.match(/Portfolio statement as on:\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i);
    const statementDate = asOnMatch ? parseBrokerDate(asOnMatch[1]) : parseBrokerDate(cleanedText);

    const depositMatch = cleanedText.match(/Total Deposit\s*:\s*([\d,]+\.\d{2})/i) ||
                         cleanedText.match(/Deposit\s*:\s*([\d,]+\.\d{2})/i);
    const totalDeposit = depositMatch ? parseNum(depositMatch[1]) : 0;

    const ledgerMatch = cleanedText.match(/Ledger Balance\/(?:Liabilities)\s*:\s*([\d,]+\.\d{2})/i);
    const ledgerBalance = ledgerMatch ? parseNum(ledgerMatch[1]) : 0;

    const holdings = [];
    const portfolioRowRegex = /\b([A-Z]{2,12})\*?\s+([ABZNG])\s+(\d+)\s+(\d+)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;
    let m;
    while ((m = portfolioRowRegex.exec(cleanedText)) !== null) {
      const symbol = m[1];
      if (['TOTAL', 'PAGE', 'RATIO', 'VALUE'].includes(symbol)) continue;
      holdings.push({
        instrument: symbol,
        group: m[2],
        qty: parseInt(m[3], 10),
        salableQty: parseInt(m[4], 10),
        avgCostWithComm: parseNum(m[5]),
        totalCostWithComm: parseNum(m[6]),
        marketPrice: parseNum(m[7]),
        marketValue: parseNum(m[8])
      });
    }

    const docFingerprint = `${fileHash}|PORTFOLIO|${clientCode}|${statementDate}|${holdings.length}`;

    return {
      docType: 'PORTFOLIO_STATEMENT',
      docFingerprint,
      fileHash,
      fileName: file.name,
      detectedDate: statementDate,
      clientCode,
      totalDeposit,
      ledgerBalance,
      holdings,
      trades: []
    };
  }

  const tradingDateMatch = cleanedText.match(/Trading Date\s*:\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4}|\d{4}-\d{2}-\d{2})/i);
  const tradeDate = tradingDateMatch ? parseBrokerDate(tradingDateMatch[1]) : parseBrokerDate(cleanedText);

  const openMatch = cleanedText.match(/Opening Balance\(Tk\.\)\s*:\s*([\d,]+\.\d{2})/i);
  const closeMatch = cleanedText.match(/Closing Balance\(Tk\.\)\s*:\s*([\d,]+\.\d{2})/i);
  const openingBalance = openMatch ? parseNum(openMatch[1]) : null;
  const closingBalance = closeMatch ? parseNum(closeMatch[1]) : null;

  const extractedTrades = [];
  const tradeRowRegex = /\b(?:Public|Spot|Block)\s+(BUY|SELL)\s+(?:DSE|CSE)\s+([ABZNG])\s+([A-Z]{2,12})\s+(\d+(?:,\d+)?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;

  let match;
  while ((match = tradeRowRegex.exec(cleanedText)) !== null) {
    const type = match[1];
    const group = match[2];
    const symbol = match[3];
    const qty = parseInt(match[4].replace(/,/g, ''), 10);
    const avgRate = parseNum(match[5]);
    const grossAmount = parseNum(match[6]);
    const commission = parseNum(match[7]);
    const netTotal = parseNum(match[9]);

    if (qty > 0 && avgRate > 0) {
      extractedTrades.push({
        id: `tr-${tradeDate}-${symbol}-${type}-${qty}-${avgRate}`,
        date: tradeDate,
        type,
        instrument: symbol,
        group,
        qty,
        buyPrice: type === 'BUY' ? avgRate : 0,
        sellPrice: type === 'SELL' ? avgRate : 0,
        grossAmount,
        commission,
        netTotal,
        sourcePdf: file.name
      });
    }
  }

  if (extractedTrades.length === 0) {
    throw new Error(
      `PDF (${file.name}) থেকে কোনো বৈধ BUY/SELL ট্রেড সারি পাওয়া যায়নি।`
    );
  }

  const tradeSig = extractedTrades.map((t) => `${t.instrument}:${t.type}:${t.qty}@${t.buyPrice || t.sellPrice}`).join(',');
  const docFingerprint = `${fileHash}|TRADE|${clientCode}|${tradeDate}|${tradeSig}`;

  return {
    docType: 'TRADE_CONFIRMATION',
    docFingerprint,
    fileHash,
    fileName: file.name,
    detectedDate: tradeDate,
    clientCode,
    openingBalance,
    closingBalance,
    trades: extractedTrades
  };
}
