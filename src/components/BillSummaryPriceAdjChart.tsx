import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  TrendingUp, 
  Coins, 
  BarChart3, 
  Layers, 
  Table as TableIcon, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  LineChart,
  BarChart, 
  AreaChart, 
  Bar, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { IpcItem, formatAccounting } from '../types';

interface BillSummaryPriceAdjChartProps {
  ipcTracker: IpcItem[];
  usdExchangeRate?: number;
}

export default function BillSummaryPriceAdjChart({ 
  ipcTracker = [], 
  usdExchangeRate = 57.50 
}: BillSummaryPriceAdjChartProps) {
  const [viewMode, setViewMode] = useState<'combined' | 'monthly' | 'cumulative' | 'percent_scurve'>('combined');
  const [unitMode, setUnitMode] = useState<'millions' | 'full'>('millions');
  const [showTable, setShowTable] = useState<boolean>(true);

  // Compute monthly and running cumulative data
  let runningCumGross = 0;
  let runningCumPriceAdj = 0;

  const chartData = ipcTracker.map((item, index) => {
    const periodName = item.period ? `${item.paymentNo} (${item.period})` : item.paymentNo;
    const gross = item.grossBillEtb || 0;
    const priceAdj = item.priceAdjustmentEtb || 0;

    runningCumGross += gross;
    runningCumPriceAdj += priceAdj;

    // Monthly and Cumulative Price Adjustment %
    const monthlyPriceAdjRatio = gross > 0 ? (priceAdj / gross) * 100 : 0;
    const cumPriceAdjRatio = runningCumGross > 0 ? (runningCumPriceAdj / runningCumGross) * 100 : 0;

    return {
      id: item.id || `ipc_${index}`,
      ipcNo: item.paymentNo,
      period: item.period || '',
      label: periodName,
      // Monthly values
      monthlyGross: gross,
      monthlyPriceAdj: priceAdj,
      monthlyGrossM: Number((gross / 1_000_000).toFixed(2)),
      monthlyPriceAdjM: Number((priceAdj / 1_000_000).toFixed(2)),
      monthlyPriceAdjRatio: Number(monthlyPriceAdjRatio.toFixed(2)),
      // Cumulative values
      cumGross: runningCumGross,
      cumPriceAdj: runningCumPriceAdj,
      cumGrossM: Number((runningCumGross / 1_000_000).toFixed(2)),
      cumPriceAdjM: Number((runningCumPriceAdj / 1_000_000).toFixed(2)),
      // Price adjustment percentage calculated by dividing cumulative price adjustment by cumulative bill summary
      cumPriceAdjRatio: Number(cumPriceAdjRatio.toFixed(2)),
      priceAdjRatio: Number(cumPriceAdjRatio.toFixed(2))
    };
  });

  const totalGross = runningCumGross;
  const totalPriceAdj = runningCumPriceAdj;
  // Overall price adjustment percentage dividing cumulative bill summary for cumulative price adjustment
  const overallPriceAdjRatio = totalGross > 0 ? (totalPriceAdj / totalGross) * 100 : 0;

  const formatValue = (val: number) => {
    if (unitMode === 'millions') {
      return `Br. ${(val / 1_000_000).toFixed(2)}M`;
    }
    return formatAccounting(val, 'Br.');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem = chartData.find(d => d.label === label || d.ipcNo === label);

    return (
      <div className="bg-slate-900/95 text-slate-100 p-3.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-2.5 max-w-xs font-sans">
        <div className="border-b border-slate-700/80 pb-1.5 flex justify-between items-center gap-2">
          <span className="font-bold text-white text-xs">{label}</span>
          {dataItem?.cumPriceAdjRatio !== undefined && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono border border-amber-500/30 font-semibold">
              Cum. PA: {Number(dataItem.cumPriceAdjRatio).toFixed(2)}%
            </span>
          )}
        </div>

        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">Monthly Disbursement</div>
          <div className="flex justify-between items-center text-sky-400">
            <span>Monthly Bill Summary:</span>
            <span className="font-bold">{formatValue(dataItem?.monthlyGross || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-amber-400">
            <span>Monthly Price Adj.:</span>
            <span className="font-bold">+{formatValue(dataItem?.monthlyPriceAdj || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[10px]">
            <span>Monthly PA Rate:</span>
            <span>{dataItem?.monthlyPriceAdjRatio?.toFixed(2)}%</span>
          </div>

          <div className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider pt-1 border-t border-slate-800">
            Cumulative To-Date Baseline
          </div>
          <div className="flex justify-between items-center text-indigo-300">
            <span>Cum. Bill Summary:</span>
            <span className="font-bold">{formatValue(dataItem?.cumGross || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-rose-400">
            <span>Cum. Price Adjustment:</span>
            <span className="font-bold">+{formatValue(dataItem?.cumPriceAdj || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-amber-300 font-sans font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 text-[10.5px]">
            <span>Cum. PA % (Cum PA ÷ Cum Bill):</span>
            <span className="font-mono">{dataItem?.cumPriceAdjRatio?.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4 font-sans text-xs">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Financial Disbursement Baselines & Price Adjustment S-Curve
              <span className="text-[9.5px] font-extrabold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-md">
                Cumulative Division Model
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tracking progressive bill summary outlays & cumulative price adjustment % escalation
            </p>
          </div>
        </div>

        {/* View Mode & Unit Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg flex items-center text-[10px] font-bold">
            <button
              onClick={() => setViewMode('combined')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'combined'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Combined Trend
            </button>
            <button
              onClick={() => setViewMode('percent_scurve')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'percent_scurve'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Price Adj. % S-Curve
            </button>
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'cumulative'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Cumulative Area
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Monthly IPC Bars
            </button>
          </div>

          {/* Unit Toggle (only relevant for monetary views) */}
          {viewMode !== 'percent_scurve' && (
            <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg flex items-center text-[10px] font-bold">
              <button
                onClick={() => setUnitMode('millions')}
                className={`px-2.5 py-1 rounded-md transition ${
                  unitMode === 'millions'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs font-extrabold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                M ETB
              </button>
              <button
                onClick={() => setUnitMode('full')}
                className={`px-2.5 py-1 rounded-md transition ${
                  unitMode === 'full'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs font-extrabold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Full ETB
              </button>
            </div>
          )}

          {/* Table Toggle Button */}
          <button
            onClick={() => setShowTable(!showTable)}
            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <TableIcon className="w-3.5 h-3.5 text-indigo-500" />
            {showTable ? 'Hide Schedule' : 'View Schedule Table'}
            {showTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
            Cum. Bill Summary
          </span>
          <span className="text-base font-extrabold font-mono text-indigo-900 dark:text-indigo-200 mt-0.5 block">
            {formatValue(totalGross)}
          </span>
          <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 mt-0.5 block">
            Cumulative work executed
          </span>
        </div>

        <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
            Cum. Price Adjustment
          </span>
          <span className="text-base font-extrabold font-mono text-rose-900 dark:text-rose-200 mt-0.5 block">
            +{formatValue(totalPriceAdj)}
          </span>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400 mt-0.5 block">
            Total escalation compensation
          </span>
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
            Cum. Price Adj. % S-Curve
          </span>
          <span className="text-base font-extrabold font-mono text-amber-900 dark:text-amber-200 mt-0.5 block">
            {overallPriceAdjRatio.toFixed(2)}%
          </span>
          <span className="text-[10px] text-amber-700/90 dark:text-amber-400 mt-0.5 block font-semibold">
            Cum. PA ÷ Cum. Bill Summary
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            IPC Statements Count
          </span>
          <span className="text-base font-extrabold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
            {ipcTracker.length} IPCs
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Financial reporting period
          </span>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-72 w-full pt-2 min-w-0">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center p-6 space-y-2">
            <Coins className="w-8 h-8 text-indigo-400 opacity-60" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No IPC Payment Certificate Records Available</p>
            <p className="text-[11px] text-slate-500 max-w-sm">Enter interim payment certificates (IPC) in the Financial/IPC tracker tab to display monthly & cumulative bill progress curves.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'combined' ? (
              <LineChart data={chartData} margin={{ top: 15, right: 25, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis dataKey="ipcNo" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 9 }} 
                  width={60}
                  unit={unitMode === 'millions' ? 'M' : ''}
                  domain={[0, 'auto']}
                  tickFormatter={(v) => unitMode === 'millions' ? `${Number(v).toFixed(0)}M` : (v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : Number(v).toLocaleString())}
                  label={{ value: unitMode === 'millions' ? 'Amount (M ETB)' : 'Amount (ETB)', angle: -90, position: 'insideLeft', style: { fontSize: '9px', fill: '#64748b', fontWeight: 600 } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '10px' }} />

                {/* 1. Cum. Bill Summary (Royal Indigo - Top Curve) */}
                <Line 
                  name="Cum. Bill Summary" 
                  type="monotone" 
                  dataKey={unitMode === 'millions' ? 'cumGrossM' : 'cumGross'} 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 5, fill: '#6366f1' }}
                />
                {/* 2. Cum. Price Adjustment (Vivid Rose Crimson) */}
                <Line 
                  name="Cum. Price Adjustment" 
                  type="monotone" 
                  dataKey={unitMode === 'millions' ? 'cumPriceAdjM' : 'cumPriceAdj'} 
                  stroke="#e11d48" 
                  strokeWidth={2.5} 
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 5, fill: '#e11d48' }}
                />

                {/* 3. Monthly Bill Summary (Sky Blue) */}
                <Line 
                  name="Monthly Bill Summary" 
                  type="monotone"
                  dataKey={unitMode === 'millions' ? 'monthlyGrossM' : 'monthlyGross'} 
                  stroke="#0284c7" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#0284c7' }}
                />
                {/* 4. Monthly Price Adjustment (Amber Orange) */}
                <Line 
                  name="Monthly Price Adj." 
                  type="monotone"
                  dataKey={unitMode === 'millions' ? 'monthlyPriceAdjM' : 'monthlyPriceAdj'} 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#f59e0b' }}
                />
              </LineChart>
            ) : viewMode === 'percent_scurve' ? (
              <ComposedChart data={chartData} margin={{ top: 15, right: 25, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis dataKey="ipcNo" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis 
                  stroke="#d97706" 
                  tick={{ fontSize: 9 }} 
                  width={55}
                  unit="%"
                  domain={[0, 'auto']}
                  label={{ value: 'Price Adjustment %', angle: -90, position: 'insideLeft', style: { fontSize: '9px', fill: '#d97706', fontWeight: 600 } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '10px' }} />
                <Bar 
                  name="Monthly PA % (Monthly PA ÷ Monthly Gross)" 
                  dataKey="monthlyPriceAdjRatio" 
                  fill="#fcd34d" 
                  opacity={0.65}
                  radius={[3, 3, 0, 0]} 
                />
                <Line 
                  name="Cum. Price Adjustment % S-Curve (Cum. PA ÷ Cum. Bill)" 
                  type="monotone" 
                  dataKey="cumPriceAdjRatio" 
                  stroke="#d97706" 
                  strokeWidth={3.5} 
                  dot={false}
                  activeDot={{ r: 6, fill: '#d97706' }}
                />
              </ComposedChart>
            ) : viewMode === 'monthly' ? (
              <BarChart data={chartData} margin={{ top: 15, right: 15, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis dataKey="ipcNo" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 9 }} 
                  width={55}
                  unit={unitMode === 'millions' ? 'M' : ''}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '10px' }} />
                <Bar 
                  name="Monthly Bill Summary" 
                  dataKey={unitMode === 'millions' ? 'monthlyGrossM' : 'monthlyGross'} 
                  fill="#0284c7" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  name="Monthly Price Adj." 
                  dataKey={unitMode === 'millions' ? 'monthlyPriceAdjM' : 'monthlyPriceAdj'} 
                  fill="#f59e0b" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 15, right: 15, left: 15, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCumGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCumPriceAdj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis dataKey="ipcNo" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 9 }} 
                  width={55}
                  unit={unitMode === 'millions' ? 'M' : ''}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '10px' }} />
                <Area 
                  name="Cum. Bill Summary" 
                  type="monotone" 
                  dataKey={unitMode === 'millions' ? 'cumGrossM' : 'cumGross'} 
                  stroke="#6366f1" 
                  fillOpacity={1} 
                  fill="url(#colorCumGross)" 
                  strokeWidth={3} 
                />
                <Area 
                  name="Cum. Price Adjustment" 
                  type="monotone" 
                  dataKey={unitMode === 'millions' ? 'cumPriceAdjM' : 'cumPriceAdj'} 
                  stroke="#e11d48" 
                  fillOpacity={1} 
                  fill="url(#colorCumPriceAdj)" 
                  strokeWidth={2.5} 
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Collapsible Data Breakdown Table */}
      {showTable && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
              Monthly & Cumulative Financial Statement Schedule
            </span>
            <span className="text-[10.5px] text-amber-700 dark:text-amber-400 font-mono font-semibold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/40">
              Cum. Price Adj. % = (Cum. Price Adj ÷ Cum. Bill Summary) × 100%
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/70">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700/80 uppercase text-[9.5px] tracking-wider">
                  <th className="py-2.5 px-3">IPC No. / Period</th>
                  <th className="py-2.5 px-3 text-right text-sky-700 dark:text-sky-400">Monthly Bill Summary</th>
                  <th className="py-2.5 px-3 text-right text-amber-700 dark:text-amber-400">Monthly Price Adj.</th>
                  <th className="py-2.5 px-3 text-center text-amber-700 dark:text-amber-400">Monthly PA %</th>
                  <th className="py-2.5 px-3 text-right font-extrabold text-indigo-900 dark:text-indigo-300">Cum. Bill Summary</th>
                  <th className="py-2.5 px-3 text-right font-extrabold text-rose-900 dark:text-rose-300">Cum. Price Adj.</th>
                  <th className="py-2.5 px-3 text-center font-extrabold text-amber-900 dark:text-amber-300 bg-amber-50/40 dark:bg-amber-950/30">
                    Cum. Price Adj. %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[10.5px]">
                {chartData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-sans font-bold text-slate-800 dark:text-slate-200">
                      {row.ipcNo} {row.period && <span className="text-slate-400 font-normal">({row.period})</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-sky-700 dark:text-sky-400">
                      {formatAccounting(row.monthlyGross, 'Br.')}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                      +{formatAccounting(row.monthlyPriceAdj, 'Br.')}
                    </td>
                    <td className="py-2 px-3 text-center font-sans text-slate-600 dark:text-slate-400">
                      <span className="text-[10px]">
                        {row.monthlyPriceAdjRatio.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/20 dark:bg-indigo-950/20">
                      {formatAccounting(row.cumGross, 'Br.')}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-rose-700 dark:text-rose-400 bg-rose-50/20 dark:bg-rose-950/20">
                      +{formatAccounting(row.cumPriceAdj, 'Br.')}
                    </td>
                    <td className="py-2 px-3 text-center font-sans font-extrabold bg-amber-50/40 dark:bg-amber-950/30">
                      <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 dark:border-amber-700/60">
                        {row.cumPriceAdjRatio.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="py-2.5 px-3 font-sans font-extrabold">Total To-Date</td>
                  <td className="py-2.5 px-3 text-right text-sky-700 dark:text-sky-400">{formatAccounting(totalGross, 'Br.')}</td>
                  <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">+{formatAccounting(totalPriceAdj, 'Br.')}</td>
                  <td className="py-2.5 px-3 text-center font-sans text-slate-600 dark:text-slate-400">
                    -
                  </td>
                  <td className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-300">{formatAccounting(totalGross, 'Br.')}</td>
                  <td className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-400">+{formatAccounting(totalPriceAdj, 'Br.')}</td>
                  <td className="py-2.5 px-3 text-center font-sans text-amber-800 dark:text-amber-200 font-extrabold bg-amber-100/60 dark:bg-amber-950/60">
                    {overallPriceAdjRatio.toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
