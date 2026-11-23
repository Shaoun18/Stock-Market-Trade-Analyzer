import React from 'react';
import {
    TrendingUp,
    TrendingDown,
    X,
    Calendar,
    DollarSign,
    BarChart3
} from 'lucide-react';

export default function ShareDetailGraph({ shareRow, onClose }) {
    if (!shareRow) return null;

    const isProfit = shareRow.totalNetProfit >= 0;
    const strokeColor = isProfit ? '#059669' : '#e11d48';
    const fillId = `areaGrad-${shareRow.instrument}`;

    const rawPoints = [...(shareRow.historyPoints || [])];
    if (shareRow.remainingQty > 0) {
        const lastPt = rawPoints[rawPoints.length - 1];
        const latestDate = lastPt ? lastPt.date : 'Latest';
        rawPoints.push({
            date: `${latestDate} (Mkt)`,
            price: Number(shareRow.latestMarketPrice),
            type: isProfit ? 'PROFIT' : 'LOSS'
        });
    }

    const points =
        rawPoints.length >= 2
            ? rawPoints
            : [
                {
                    date: shareRow.buyDates?.[0] || 'Buy',
                    price: Number(shareRow.avgBuyPrice) || 10,
                    type: 'BUY'
                },
                {
                    date: 'Current Mkt',
                    price: Number(shareRow.latestMarketPrice) || Number(shareRow.avgBuyPrice) || 12,
                    type: isProfit ? 'PROFIT' : 'LOSS'
                }
            ];

    const prices = points.map((p) => Number(p.price));
    const minPrice = Math.min(...prices, Number(shareRow.avgBuyPrice || prices[0])) * 0.96;
    const maxPrice = Math.max(...prices, Number(shareRow.avgBuyPrice || prices[0])) * 1.04;
    const priceRange = maxPrice - minPrice || 1;

    const svgWidth = 680;
    const svgHeight = 230;
    const padLeft = 56;
    const padRight = 28;
    const padTop = 24;
    const padBottom = 38;
    const plotW = svgWidth - padLeft - padRight;
    const plotH = svgHeight - padTop - padBottom;

    const coords = points.map((pt, idx) => {
        const x =
            points.length === 1
                ? padLeft + plotW / 2
                : padLeft + (idx / (points.length - 1)) * plotW;
        const y =
            padTop + plotH - ((Number(pt.price) - minPrice) / priceRange) * plotH;
        return { ...pt, x, y };
    });

    const linePath = coords
        .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
        .join(' ');

    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(
        padTop + plotH
    ).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;

    const avgBuyY =
        padTop +
        plotH -
        ((Number(shareRow.avgBuyPrice) - minPrice) / priceRange) * plotH;

    const gridTicks = [0, 0.33, 0.66, 1].map((ratio) => {
        const val = minPrice + ratio * priceRange;
        const y = padTop + plotH - ratio * plotH;
        return { val, y };
    });

    return (
        <div className="p-6 bg-slate-50/90 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${isProfit
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                            }`}
                    >
                        {isProfit ? (
                            <TrendingUp className="w-5 h-5" />
                        ) : (
                            <TrendingDown className="w-5 h-5" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                                {shareRow.instrument} — Price & Profit/Loss Details Graph
                            </h3>
                            <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isProfit
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                    }`}
                            >
                                {isProfit ? 'PROFIT (লাভ)' : 'LOSS (লস)'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            Group {shareRow.group} • Status: {shareRow.status} • Avg Buy: ৳
                            {shareRow.avgBuyPrice.toFixed(2)} vs Current/Sell: ৳
                            {shareRow.latestMarketPrice.toFixed(2)}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-sm"
                >
                    <X className="w-3.5 h-3.5" />
                    <span>Close Graph</span>
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
                <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-[#0B2B4C]" />
                            Share Price Movement (৳)
                        </span>
                        <div className="flex items-center gap-4">
                            <span className="inline-flex items-center gap-1.5">
                                <span
                                    className="w-3 h-0.5 inline-block"
                                    style={{ backgroundColor: strokeColor }}
                                />
                                <span>Price Trend</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block" />
                                <span>Avg Buy (৳{shareRow.avgBuyPrice.toFixed(2)})</span>
                            </span>
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <svg
                            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                            className="w-full h-auto min-w-[460px]"
                            role="img"
                            aria-label={`${shareRow.instrument} price trend graph`}
                        >
                            <defs>
                                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.24" />
                                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.01" />
                                </linearGradient>
                            </defs>

                            {gridTicks.map((tick, i) => (
                                <g key={i}>
                                    <line
                                        x1={padLeft}
                                        y1={tick.y}
                                        x2={svgWidth - padRight}
                                        y2={tick.y}
                                        stroke="#e2e8f0"
                                        strokeDasharray="3 3"
                                    />
                                    <text
                                        x={padLeft - 8}
                                        y={tick.y + 4}
                                        textAnchor="end"
                                        className="fill-slate-400 text-[10px] font-mono"
                                    >
                                        ৳{tick.val.toFixed(0)}
                                    </text>
                                </g>
                            ))}

                            {avgBuyY >= padTop && avgBuyY <= padTop + plotH && (
                                <g>
                                    <line
                                        x1={padLeft}
                                        y1={avgBuyY}
                                        x2={svgWidth - padRight}
                                        y2={avgBuyY}
                                        stroke="#f59e0b"
                                        strokeWidth="1.5"
                                        strokeDasharray="5 4"
                                    />
                                    <text
                                        x={svgWidth - padRight}
                                        y={avgBuyY - 5}
                                        textAnchor="end"
                                        className="fill-amber-600 text-[10px] font-semibold"
                                    >
                                        Avg Buy ৳{shareRow.avgBuyPrice.toFixed(2)}
                                    </text>
                                </g>
                            )}

                            <path d={areaPath} fill={`url(#${fillId})`} />
                            <path
                                d={linePath}
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth="2.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {coords.map((pt, idx) => {
                                const dotColor =
                                    pt.type === 'BUY'
                                        ? '#2563eb'
                                        : pt.type === 'SELL'
                                            ? '#9333ea'
                                            : strokeColor;
                                return (
                                    <g key={idx}>
                                        <circle
                                            cx={pt.x}
                                            cy={pt.y}
                                            r="5"
                                            fill="#ffffff"
                                            stroke={dotColor}
                                            strokeWidth="2.5"
                                        />
                                        <text
                                            x={pt.x}
                                            y={pt.y - 10}
                                            textAnchor="middle"
                                            className="fill-slate-800 text-[10px] font-bold"
                                        >
                                            ৳{Number(pt.price).toFixed(2)}
                                        </text>
                                        <text
                                            x={pt.x}
                                            y={svgHeight - 10}
                                            textAnchor="middle"
                                            className="fill-slate-500 text-[10px] font-mono"
                                        >
                                            {pt.date}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                </div>

                <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between space-y-3">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                            Profit / Loss & Trade Breakdown
                        </h4>

                        <div className="space-y-2.5 text-xs">
                            <div
                                className={`p-3 rounded-xl border flex items-center justify-between ${isProfit
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : 'bg-rose-50 border-rose-200 text-rose-900'
                                    }`}
                            >
                                <span className="font-semibold">Total Net Gain / Loss</span>
                                <span className="font-bold text-sm">
                                    {isProfit ? '+' : '-'}৳{Math.abs(shareRow.totalNetProfit).toFixed(2)} (
                                    {shareRow.profitPct.toFixed(2)}%)
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                <span className="text-slate-500">Realized Profit (Sold Shares)</span>
                                <span className="font-semibold text-slate-800">
                                    ৳{Number(shareRow.realizedProfit || 0).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                <span className="text-slate-500">Unrealized Gain/Loss (Balance)</span>
                                <span className="font-semibold text-slate-800">
                                    ৳{Number(shareRow.unrealizedProfit || 0).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                <span className="text-slate-500">Bought / Sold / Balance Qty</span>
                                <span className="font-mono font-semibold text-slate-800">
                                    {shareRow.totalBoughtQty} / {shareRow.totalSoldQty} / {shareRow.remainingQty}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1.5">
                                <span className="text-slate-500 flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                                    Total Commission
                                </span>
                                <span className="font-semibold text-slate-700">
                                    ৳{Number(shareRow.totalCommission || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>
                            Buy Dates: <strong>{shareRow.buyDates?.join(', ') || '—'}</strong>
                            {shareRow.sellDates?.length > 0 && (
                                <>
                                    {' '}• Sell Dates: <strong>{shareRow.sellDates.join(', ')}</strong>
                                </>
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}