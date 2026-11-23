export const DEMO_ACCOUNT = {
  uid: 'demo-tanvir-l84419',
  name: 'Tanvir Ahmed Chowdhury',
  clientCode: 'L84419',
  boId: '1201820045918231',
  brokerage: 'LankaBangla Securities Ltd.',
  email: 'tanvir@lankabangla.demo',
  password: 'password123',
  depositAmount: 150000,
};

export const INITIAL_DEMO_TRADES = [
  {
    id: 'tr-101',
    date: '2026-11-14',
    type: 'BUY',
    instrument: 'BRACBANK',
    group: 'A',
    qty: 50,
    buyPrice: 66.10,
    sellPrice: 66.50,
    commission: 13.22,
    sourcePdf: 'LankaBangla_Trade_2026-11-14.pdf'
  },
  {
    id: 'tr-102',
    date: '2026-11-14',
    type: 'BUY',
    instrument: 'CITYBANK',
    group: 'A',
    qty: 100,
    buyPrice: 28.90,
    sellPrice: 29.40,
    commission: 11.56,
    sourcePdf: 'LankaBangla_Trade_2026-11-14.pdf'
  },
  {
    id: 'tr-103',
    date: '2026-11-14',
    type: 'BUY',
    instrument: 'SHARPIND',
    group: 'Z',
    qty: 40,
    buyPrice: 12.50,
    sellPrice: 13.10,
    commission: 2.00,
    sourcePdf: 'LankaBangla_Trade_2026-11-14.pdf'
  },
  {
    id: 'tr-104',
    date: '2026-11-17',
    type: 'BUY',
    instrument: 'BSRMSTEEL',
    group: 'A',
    qty: 30,
    buyPrice: 95.20,
    sellPrice: 96.80,
    commission: 11.42,
    sourcePdf: 'LankaBangla_Trade_2026-11-17.pdf'
  },
  {
    id: 'tr-105',
    date: '2026-11-21',
    type: 'SELL',
    instrument: 'SHARPIND',
    group: 'Z',
    qty: 40,
    buyPrice: 12.50,
    sellPrice: 13.10,
    commission: 2.10,
    sourcePdf: 'LankaBangla_Trade_2026-11-21.pdf'
  },
  {
    id: 'tr-106',
    date: '2026-11-21',
    type: 'BUY',
    instrument: 'BSC',
    group: 'A',
    qty: 25,
    buyPrice: 116.80,
    sellPrice: 118.20,
    commission: 11.68,
    sourcePdf: 'LankaBangla_Trade_2026-11-21.pdf'
  }
];
