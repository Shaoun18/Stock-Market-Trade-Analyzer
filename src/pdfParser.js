import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Strict keywords required to verify the document is an authentic DSE/CSE Brokerage Trade or Portfolio PDF
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

export async function parseAndValidateTradePdf(file) {
  if (!file || file.type !== 'application/pdf') {
    throw new Error('শুধুমাত্র PDF ফাইল আপলোড করা যাবে।');
  }

  const arrayBuffer = await file.arrayBuffer();
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

  // Count how many stock market / brokerage keywords appear in the PDF
  const matchedKeywords = REQUIRED_TRADE_KEYWORDS.filter((kw) =>
    normalizedText.includes(kw)
  );

  // Reject non-trading PDFs (e.g., books, novels, receipts, CVs, random documents)
  const hasMarketContext =
    matchedKeywords.includes('dse') ||
    matchedKeywords.includes('dhaka stock exchange') ||
    matchedKeywords.includes('cse') ||
    matchedKeywords.includes('bo id') ||
    matchedKeywords.includes('client code') ||
    matchedKeywords.includes('trade confirmation') ||
    matchedKeywords.includes('portfolio statement') ||
    matchedKeywords.includes('howla') ||
    matchedKeywords.includes('brokerage') ||
    matchedKeywords.includes('securities');

  if (matchedKeywords.length < 3 || !hasMarketContext) {
    throw new Error(
      'Invalid PDF Rejected! এটি কোনো শেয়ার ট্রেডিং (Trade Confirmation বা Portfolio Statement) PDF নয়। শুধুমাত্র ব্রোকারেজ হাউজের ট্রেডিং বা পোর্টফোলিও PDF আপলোড করুন।'
    );
  }

  // Extract date from text or fallback to today's date
  const dateMatch = fullText.match(/(\d{4}-\d{2}-\d{2})|(\d{2}[\/\-]\d{2}[\/\-]\d{4})|(\d{2}\s+[A-Za-z]{3}\s+\d{4})/);
  let tradeDate = new Date().toISOString().split('T')[0];
  if (dateMatch) {
    const rawDate = dateMatch[0];
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      tradeDate = parsed.toISOString().split('T')[0];
    }
  }

  // Extract trade rows dynamically
  const extractedTrades = [];
  const lines = fullText.split(/\n/);

  // Pattern matching typical DSE trade confirmation & portfolio rows
  const rowRegex = /\b([A-Z]{2,12})\b\s+([ABZNG])?\s*(BUY|SELL|B|S)?\s*(\d+(?:,\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)?/g;

  for (const line of lines) {
    let match;
    while ((match = rowRegex.exec(line)) !== null) {
      const symbol = match[1];
      const blacklist = ['DSE', 'CSE', 'BUY', 'SELL', 'TOTAL', 'DATE', 'TIME', 'CODE', 'PAGE', 'NET', 'TAX', 'VAT', 'LTD', 'LIMITED', 'STATEMENT', 'PORTFOLIO', 'TRADE', 'CLIENT', 'INVESTOR', 'BROKERAGE', 'SECURITIES', 'AMOUNT', 'PRICE', 'QTY', 'BALANCE'];
      if (blacklist.includes(symbol)) continue;

      const group = match[2] || 'A';
      const rawSide = match[3] || (normalizedText.includes('sell') && !normalizedText.includes('buy') ? 'SELL' : 'BUY');
      const type = rawSide === 'S' || rawSide === 'SELL' ? 'SELL' : 'BUY';
      const qty = parseInt(match[4].replace(/,/g, ''), 10);
      const price1 = parseFloat(match[5]);
      const price2 = match[6] ? parseFloat(match[6]) : price1;

      if (qty > 0 && price1 > 0 && price1 < 50000) {
        const totalVal = qty * price1;
        const commission = Number((totalVal * 0.004).toFixed(2));
        extractedTrades.push({
          id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: tradeDate,
          type,
          instrument: symbol,
          group,
          qty,
          buyPrice: type === 'BUY' ? price1 : price2,
          sellPrice: type === 'SELL' ? price1 : price2,
          commission,
          sourcePdf: file.name
        });
      }
    }
  }

  if (extractedTrades.length === 0) {
    throw new Error(
      'PDF টি ট্রেডিং ডকুমেন্ট হিসেবে শনাক্ত হলেও এর ভেতরে কোনো বৈধ শেয়ার বাই/সেল ডাটা পাওয়া যায়নি। সঠিক Trade Confirmation বা Portfolio PDF আপলোড করুন।'
    );
  }

  return {
    trades: extractedTrades,
    fileName: file.name,
    detectedDate: tradeDate
  };
}
