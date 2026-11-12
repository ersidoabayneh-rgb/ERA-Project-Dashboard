import React, { useState, useMemo } from 'react';
import { 
  DollarSign, BarChart3, Sliders, ChevronDown, ChevronUp, 
  Copy, Check, Download, Layers, Sparkles, RefreshCw, Info,
  TrendingUp, Activity, ShieldCheck, Scale, Landmark, Eye, EyeOff
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  LineChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend 
} from 'recharts';
import { Project } from '../types';
import { parseMonthKey } from '../lib/monthlySync';

// ==========================================
// 1. Interactive Header Tooltip Component
// ==========================================
interface HeaderTooltipProps {
  title: string;
  tooltipTitle: string;
  formula?: string;
  explanation: string;
  methodologyNote?: string;
  align?: 'left' | 'center' | 'right';
}

const HeaderTooltip: React.FC<HeaderTooltipProps> = ({
  title,
  tooltipTitle,
  formula,
  explanation,
  methodologyNote,
  align = 'left'
}) => {
  return (
    <div className={`group relative inline-flex items-center gap-1 cursor-help select-none ${
      align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : 'justify-start'
    }`}>
      <span className="truncate">{title}</span>
      <Info className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors shrink-0" />
      
      {/* Tooltip Card */}
      <div className={`absolute bottom-full mb-2.5 hidden group-hover:block w-72 sm:w-80 p-3 bg-slate-900 dark:bg-slate-950 text-slate-100 text-left text-xs rounded-xl shadow-2xl border border-slate-700 dark:border-indigo-500/70 z-50 pointer-events-none backdrop-blur-md transition-all ${
        align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
      }`}>
        <div className="flex items-center gap-1.5 font-bold text-amber-300 text-2xs uppercase tracking-wider pb-1.5 border-b border-slate-800 dark:border-indigo-900/60">
          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
          <span>{tooltipTitle}</span>
        </div>
        {formula && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-slate-800 dark:bg-indigo-950/90 border border-slate-700 dark:border-indigo-700/60 font-mono text-emerald-400 dark:text-emerald-300 text-[11px] font-bold tracking-tight">
            {formula}
          </div>
        )}
        <p className="mt-1.5 text-[11px] text-slate-200 leading-relaxed font-normal">
          {explanation}
        </p>
        {methodologyNote && (
          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-indigo-300 leading-tight">
            <strong className="text-indigo-200">Methodology: </strong>
            {methodologyNote}
          </div>
        )}
        {/* Pointer Arrow */}
        <div className={`absolute top-full -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-950 ${
          align === 'right' ? 'right-4' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-4'
        }`} />
      </div>
    </div>
  );
};

// ==========================================
// 2. Custom Recharts Forecast Tooltip
// ==========================================
interface CustomForecastTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  chartUnit: 'millions' | 'full';
  formatBr: (v: number) => string;
}

const CustomForecastTooltip: React.FC<CustomForecastTooltipProps> = ({
  active,
  payload,
  label,
  formatBr
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 p-3 rounded-xl border border-slate-700 dark:border-indigo-500/60 shadow-2xl text-xs space-y-1.5 text-white backdrop-blur-md min-w-[250px]">
        <div className="flex items-center justify-between border-b border-slate-800 dark:border-indigo-900 pb-1.5">
          <span className="font-bold text-amber-300">{data.fullPeriod || label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 dark:bg-indigo-950 border border-slate-700 dark:border-indigo-700/60 text-indigo-300">
            Pn: {data.pnFactor.toFixed(4)}
          </span>
        </div>
        <div className="space-y-1 pt-1 font-mono text-[11px]">
          <div className="flex justify-between items-center text-slate-300">
            <span>Base Planned Work:</span>
            <span className="font-bold text-white">{formatBr(data.baseCost)}</span>
          </div>
          <div className="flex justify-between items-center text-rose-300">
            <span>PA Escalation Adder:</span>
            <span className="font-bold">+{formatBr(data.paAdder)}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-300 font-bold border-t border-slate-800 pt-1">
            <span>Escalated Outlay:</span>
            <span>{formatBr(data.escalatedCost)}</span>
          </div>
          <div className="flex justify-between items-center text-purple-300">
            <span>Cumulative Outlay:</span>
            <span>{formatBr(data.cumulativeEscalated)}</span>
          </div>
          <div className="flex justify-between items-center text-amber-300 text-[10px] pt-1 border-t border-slate-800">
            <span>June-July S-Curve Plan:</span>
            <span>+{data.fyPlanIncrement.toFixed(1)}% ({data.sharePct.toFixed(1)}% of rem.)</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ==========================================
// 3. Main Yearly Cost Forecast Section
// ==========================================
interface YearlyCostForecastSectionProps {
  project: Project;
  BAC: number;
  EV: number;
  formatBr: (v: number) => string;
}

export default function YearlyCostForecastSection({
  project,
  BAC,
  EV,
  formatBr
}: YearlyCostForecastSectionProps) {
  // 1. Empirical Price Adjustment derivation from Financial Data (ipcTracker)
  const ipcTracker = project.ipcTracker || [];
  const totalGross = ipcTracker.reduce((sum, item) => sum + (item.grossBillEtb || 0), 0);
  const totalPa = ipcTracker.reduce((sum, item) => sum + (item.priceAdjustmentEtb || 0), 0);
  const empiricalPn = totalGross > 0 ? 1.0 + (totalPa / totalGross) : 1.0655;

  // State hooks for sensitivity modeling, chart, and views
  const [basePaFactor, setBasePaFactor] = useState<number>(Number(empiricalPn.toFixed(4)));
  const [annualInflation, setAnnualInflation] = useState<number>(0.05); // 5% annual compounding escalation
  const [calendarView, setCalendarView] = useState<'EFY' | 'G.C.'>('EFY');
  const [scopeView, setScopeView] = useState<'future' | 'all'>('future');
  const [showDivisionBreakdown, setShowDivisionBreakdown] = useState<boolean>(false);
  const [showChart, setShowChart] = useState<boolean>(true);
  const [chartUnit, setChartUnit] = useState<'millions' | 'full'>('millions');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [copied, setCopied] = useState<boolean>(false);

  // 2. Division Work Quantities & Financial Data (project.series)
  const seriesList = project.series || [];
  const totalSeriesContract = seriesList.reduce((sum, s) => sum + (s.contractAmt || 0), 0) || BAC;
  const totalSeriesExec = seriesList.reduce((sum, s) => sum + (s.execAmt || 0), 0) || EV;
  const remainingBalance = Math.max(0, totalSeriesContract - totalSeriesExec);
  const executedPct = totalSeriesContract > 0 ? (totalSeriesExec / totalSeriesContract) * 100 : 0;
  const remainingPct = 100 - executedPct;

  // 3. June to July Monthly Cumulative Plan Extraction from project.monthly
  const monthlyList = project.monthly || [];
  const parsedMonthly = useMemo(() => {
    return monthlyList
      .map(m => {
        const p = parseMonthKey(m.month);
        const planVal = Number(m.revisedPlan ?? m.originalPlan ?? 0);
        const actualVal = m.actual !== undefined && m.actual !== null && m.actual !== '' ? Number(m.actual) : null;
        return {
          raw: m.month,
          parsed: p,
          plan: planVal,
          actual: actualVal
        };
      })
      .filter(item => item.parsed !== null)
      .sort((a, b) => {
        const aVal = a.parsed!.year * 12 + a.parsed!.monthIndex;
        const bVal = b.parsed!.year * 12 + b.parsed!.monthIndex;
        return aVal - bVal;
      });
  }, [monthlyList]);

  // Query cumulative plan at June or July of a given Gregorian year
  const getPlanAtJuneJuly = (targetYear: number) => {
    if (parsedMonthly.length === 0) {
      return { plan: 0, matched: 'N/A' };
    }
    const earliest = parsedMonthly[0];
    const latest = parsedMonthly[parsedMonthly.length - 1];

    if (targetYear < earliest.parsed!.year) {
      return { plan: 0, matched: `< ${earliest.parsed!.key}` };
    }
    if (targetYear > latest.parsed!.year) {
      return { plan: latest.plan, matched: `> ${latest.parsed!.key}` };
    }

    // Prefer July (monthIndex = 6) - Hamle start of EFY
    const jul = parsedMonthly.find(r => r.parsed!.year === targetYear && r.parsed!.monthIndex === 6);
    if (jul) return { plan: jul.plan, matched: jul.parsed!.key };

    // Next prefer June (monthIndex = 5) - Sene end of EFY
    const jun = parsedMonthly.find(r => r.parsed!.year === targetYear && r.parsed!.monthIndex === 5);
    if (jun) return { plan: jun.plan, matched: jun.parsed!.key };

    // Closest month on or before July
    const yearMatches = parsedMonthly.filter(r => r.parsed!.year === targetYear);
    if (yearMatches.length > 0) {
      const upToJul = yearMatches.filter(r => r.parsed!.monthIndex <= 6);
      if (upToJul.length > 0) {
        const best = upToJul[upToJul.length - 1];
        return { plan: best.plan, matched: best.parsed!.key };
      }
      return { plan: yearMatches[0].plan, matched: yearMatches[0].parsed!.key };
    }

    // Last recorded before targetYear
    const prior = parsedMonthly.filter(r => r.parsed!.year < targetYear);
    if (prior.length > 0) {
      const lastPrior = prior[prior.length - 1];
      return { plan: lastPrior.plan, matched: lastPrior.parsed!.key };
    }

    return { plan: 0, matched: 'N/A' };
  };

  // June-to-July plan velocity baseline (monthly % increment)
  const juneEntry = monthlyList.find(m => m.month && (m.month.toLowerCase().includes('jun') || m.month.includes('-06')));
  const julyEntry = monthlyList.find(m => m.month && (m.month.toLowerCase().includes('jul') || m.month.includes('-07')));
  const junePlan = Number(juneEntry?.originalPlan ?? juneEntry?.revisedPlan ?? 56.0);
  const julyPlan = Number(julyEntry?.originalPlan ?? julyEntry?.revisedPlan ?? 59.0);
  const juneJulIncrement = Math.max(0.1, julyPlan - junePlan); // Velocity % per month

  // Resolve timeline years
  const allYearsSet = new Set<string>();
  monthlyList.forEach(m => {
    if (m.month) {
      const match = m.month.match(/(20\d{2}|\d{2})$/);
      if (match) {
        let yr = match[1];
        if (yr.length === 2) yr = '20' + yr;
        allYearsSet.add(yr);
      }
    }
  });

  const currentYearNum = new Date().getFullYear(); // 2026
  const sortedAllYears = Array.from(allYearsSet).sort();
  let futureYears = Array.from(new Set(sortedAllYears.filter(yr => parseInt(yr, 10) >= currentYearNum)));
  if (futureYears.length === 0) {
    futureYears = [String(currentYearNum), String(currentYearNum + 1), String(currentYearNum + 2)];
  } else {
    let lastYr = parseInt(futureYears[futureYears.length - 1], 10);
    while (futureYears.length < 3) {
      lastYr += 1;
      futureYears.push(String(lastYr));
    }
  }

  // Calculate the June-to-July plan increment for each future fiscal year
  const futurePlansRaw = futureYears.map((yr) => {
    const yrNum = parseInt(yr, 10);
    const startRef = getPlanAtJuneJuly(yrNum);
    const endRef = getPlanAtJuneJuly(yrNum + 1);
    const inc = Math.max(0, endRef.plan - startRef.plan);
    return {
      year: yr,
      yrNum,
      startRef,
      endRef,
      planInc: inc
    };
  });

  // Calculate normalized work shares summing to 100% of remaining unexecuted balance
  const totalFuturePlanInc = futurePlansRaw.reduce((sum, item) => sum + item.planInc, 0);

  const futureWeights = futurePlansRaw.map((item, idx) => {
    if (totalFuturePlanInc > 0 && item.planInc > 0) {
      return (item.planInc / totalFuturePlanInc) * 100;
    }
    // Fallback: balanced distribution across remaining years
    if (futureYears.length === 1) return 100;
    if (futureYears.length === 2) return idx === 0 ? 58 : 42;
    if (futureYears.length === 3) return idx === 0 ? 45 : idx === 1 ? 35 : 20;
    return (100 / futureYears.length);
  });
  const sumWeights = futureWeights.reduce((a, b) => a + b, 0);
  const normalizedFutureWeights = futureWeights.map(w => (w / sumWeights) * 100);

  // Build future forecast projections
  let runningEscalated = 0;
  let balanceRemaining = remainingBalance;

  const futureProjections = futureYears.map((yr, idx) => {
    const yearNum = parseInt(yr, 10);
    const efyYear = yearNum - 7; // Ethiopian Fiscal Year (EFY = Gregorian Year - 7)
    const sharePct = normalizedFutureWeights[idx];
    const baseCost = remainingBalance * (sharePct / 100);
    const pnFactor = basePaFactor * Math.pow(1 + annualInflation, idx);
    const paAdder = baseCost * Math.max(0, pnFactor - 1.0);
    const escalatedCost = baseCost + paAdder;
    runningEscalated += escalatedCost;
    balanceRemaining = Math.max(0, balanceRemaining - baseCost);

    const planData = futurePlansRaw[idx];

    return {
      year: yr,
      efy: `EFY ${efyYear}`,
      periodLabel: `${yearNum}/${yearNum + 1} G.C.`,
      efyLabel: `EFY ${efyYear} (${yearNum - 7}/${yearNum - 6})`,
      isPast: false,
      isCurrent: idx === 0,
      isFinish: idx === futureYears.length - 1,
      sharePct,
      fyPlanIncrement: planData.planInc,
      startRefLabel: planData.startRef.matched,
      startPlanVal: planData.startRef.plan,
      endRefLabel: planData.endRef.matched,
      endPlanVal: planData.endRef.plan,
      baseCost,
      pnFactor,
      paAdder,
      escalatedCost,
      cumulativeEscalated: runningEscalated,
      balanceRemaining: idx === futureYears.length - 1 ? 0 : balanceRemaining
    };
  });

  // Optional past years calculation when Full Lifecycle scope is activated
  const pastYears = sortedAllYears.filter(yr => parseInt(yr, 10) < currentYearNum);
  const pastProjections = pastYears.map((yr, idx) => {
    const yearNum = parseInt(yr, 10);
    const efyYear = yearNum - 7;
    const pastPlanShare = (totalSeriesExec / (pastYears.length || 1));
    const startRef = getPlanAtJuneJuly(yearNum);
    const endRef = getPlanAtJuneJuly(yearNum + 1);
    const planInc = Math.max(0, endRef.plan - startRef.plan);

    return {
      year: yr,
      efy: `EFY ${efyYear}`,
      periodLabel: `${yearNum}/${yearNum + 1} G.C.`,
      efyLabel: `EFY ${efyYear} (${yearNum - 7}/${yearNum - 6})`,
      isPast: true,
      isCurrent: false,
      isFinish: false,
      sharePct: (pastPlanShare / totalSeriesContract) * 100,
      fyPlanIncrement: planInc,
      startRefLabel: startRef.matched,
      startPlanVal: startRef.plan,
      endRefLabel: endRef.matched,
      endPlanVal: endRef.plan,
      baseCost: pastPlanShare,
      pnFactor: 1.0,
      paAdder: 0,
      escalatedCost: pastPlanShare,
      cumulativeEscalated: pastPlanShare * (idx + 1),
      balanceRemaining: Math.max(0, totalSeriesContract - (pastPlanShare * (idx + 1)))
    };
  });

  const activeProjections = scopeView === 'all' ? [...pastProjections, ...futureProjections] : futureProjections;

  // Recharts Line Chart Dataset over remaining project years
  const chartData = futureProjections.map((p) => {
    return {
      periodLabel: calendarView === 'EFY' ? p.efy : `${p.year} G.C.`,
      fullPeriod: `${p.efy} (${p.year}/${parseInt(p.year, 10) + 1} G.C.)`,
      efyYearLabel: p.efy,
      baseCost: p.baseCost,
      baseCostM: p.baseCost / 1_000_000,
      paAdder: p.paAdder,
      paAdderM: p.paAdder / 1_000_000,
      escalatedCost: p.escalatedCost,
      escalatedCostM: p.escalatedCost / 1_000_000,
      cumulativeEscalated: p.cumulativeEscalated,
      cumulativeEscalatedM: p.cumulativeEscalated / 1_000_000,
      pnFactor: p.pnFactor,
      fyPlanIncrement: p.fyPlanIncrement,
      sharePct: p.sharePct
    };
  });

  // Summary aggregates
  const totalBaseForecast = futureProjections.reduce((sum, r) => sum + r.baseCost, 0);
  const totalFuturePaAdder = futureProjections.reduce((sum, r) => sum + r.paAdder, 0);
  const totalProjectedEscalated = futureProjections.reduce((sum, r) => sum + r.escalatedCost, 0);
  const totalLifetimePa = totalPa + totalFuturePaAdder;
  const ppaThresholdRatio = BAC > 0 ? (totalLifetimePa / BAC) * 100 : 0;
  const isPpaCompliant = ppaThresholdRatio <= 20.0;

  // Copy summary report to clipboard
  const handleCopySummary = () => {
    const summaryText = `=====================================================
YEARLY ESTIMATED COST FORECAST & PRICE ESCALATION AUDIT
Project: ${project.name} (ID: ${project.id || 'N/A'})
Evaluation Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
Contract Price (BAC): ${formatBr(BAC)}
Total Executed To-Date: ${formatBr(totalSeriesExec)} (${executedPct.toFixed(1)}%)
Remaining Unexecuted Balance: ${formatBr(remainingBalance)} (${remainingPct.toFixed(1)}%)
Base Pn Factor: ${basePaFactor.toFixed(4)} | Annual Inflation: ${(annualInflation * 100).toFixed(1)}% p.a.
Monthly Plan Velocity: ${juneJulIncrement.toFixed(2)}% / month (June to July Baseline)
-----------------------------------------------------
JUNE-TO-JULY FISCAL YEAR PLANS & COST PREDICTIONS:
${futureProjections.map(r => `• ${r.efy} [${r.year} G.C.] | June-Jul Plan: +${r.fyPlanIncrement.toFixed(1)}% | Rem. Share: ${r.sharePct.toFixed(1)}% | Base: ${formatBr(r.baseCost)} | Pn: ${r.pnFactor.toFixed(4)} | PA Adder: ${formatBr(r.paAdder)} | Escalated Outlay: ${formatBr(r.escalatedCost)} | Cumulative: ${formatBr(r.cumulativeEscalated)}`).join('\n')}
-----------------------------------------------------
TOTALS TO COMPLETION:
Total Base Work Value: ${formatBr(totalBaseForecast)}
Total Projected Price Adjustment: ${formatBr(totalFuturePaAdder)}
Total Escalated Cash Commitment: ${formatBr(totalProjectedEscalated)}
Total Lifetime PA (Historical + Projected): ${formatBr(totalLifetimePa)} (${ppaThresholdRatio.toFixed(2)}% of Contract Price)
PPA 20% Statutory Cap Status: ${isPpaCompliant ? 'COMPLIANT (Within 20%)' : 'EXCEEDS 20% STATUTORY THRESHOLD'}
=====================================================`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const csvRows: string[][] = [
      ['# ETHIOPIAN ROADS ADMINISTRATION - YEARLY ESTIMATED COST FORECAST & ESCALATION AUDIT'],
      ['Project Name', project.name],
      ['Project ID', project.id || 'N/A'],
      ['Contract Price (BAC)', formatBr(BAC)],
      ['Total Executed To Date', formatBr(totalSeriesExec)],
      ['Remaining Unexecuted Balance', formatBr(remainingBalance)],
      ['Base Escalation Factor (Pn)', basePaFactor.toFixed(4)],
      ['Annual Escalation Rate (% p.a.)', `${(annualInflation * 100).toFixed(2)}%`],
      ['Export Timestamp', new Date().toISOString()],
      [],
      [
        'Operating Fiscal Year (EFY)',
        'Gregorian Calendar Year',
        'Period Status',
        'June-to-July FY Plan (%)',
        'Remaining Work Share (%)',
        'Base Planned Work Value (ETB)',
        'Escalation Factor (Pn)',
        'Price Adjustment Adder (ETB)',
        'Escalated Estimated Annual Outlay (ETB)',
        'Cumulative Escalated Outlay (ETB)',
        'Remaining Balance Liability (ETB)'
      ]
    ];

    activeProjections.forEach(r => {
      csvRows.push([
        r.efy,
        r.year,
        r.isPast ? 'Historical Closed' : r.isCurrent ? 'Current Operating FY' : r.isFinish ? 'Completion & Handover' : 'Future Forecast FY',
        r.fyPlanIncrement.toFixed(2),
        r.sharePct.toFixed(2),
        r.baseCost.toFixed(2),
        r.pnFactor.toFixed(4),
        r.paAdder.toFixed(2),
        r.escalatedCost.toFixed(2),
        r.cumulativeEscalated.toFixed(2),
        r.balanceRemaining.toFixed(2)
      ]);
    });

    csvRows.push([]);
    csvRows.push([
      'TOTAL REMAINING COMMITMENT',
      '-',
      'Final Reconciliation',
      '-',
      '100.00%',
      totalBaseForecast.toFixed(2),
      (futureProjections.reduce((a, b) => a + b.pnFactor, 0) / futureProjections.length).toFixed(4),
      totalFuturePaAdder.toFixed(2),
      totalProjectedEscalated.toFixed(2),
      totalProjectedEscalated.toFixed(2),
      '0.00'
    ]);

    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Yearly_Cost_Forecast_${project.id || 'project'}_${calendarView}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl shadow-sm space-y-5 p-4 sm:p-6 text-slate-800 dark:text-slate-100">
      
      {/* Top Banner: Title & Primary Action Utilities */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 shadow-xs">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black uppercase text-slate-900 dark:text-white tracking-tight">
                Yearly Estimated Cost Forecast Table
              </h3>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                June-to-July Plan & Price Escalation
              </span>
            </div>
            <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-year fiscal expenditures driven by the monthly cumulative plan (June to July), compounding price escalation factors, and remaining unexecuted BOQ balance.
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            onClick={() => setShowChart(!showChart)}
            className={`px-3 py-1.5 rounded-xl font-bold text-2xs transition flex items-center gap-1.5 border shadow-xs cursor-pointer ${
              showChart 
                ? 'bg-indigo-600 text-white border-indigo-500' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
            }`}
            title="Toggle Visual Forecast Line Chart"
          >
            {showChart ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showChart ? 'Line Chart Active' : 'Show Line Chart'}</span>
          </button>

          <button
            onClick={() => setShowDivisionBreakdown(!showDivisionBreakdown)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold text-2xs transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 shadow-xs cursor-pointer"
            title="Toggle Division Work Quantities (Series 1000-11000) breakdown"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>BOQ Divisions</span>
            {showDivisionBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold text-2xs transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 shadow-xs cursor-pointer"
            title="Copy executive financial summary to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-2xs transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-indigo-500"
            title="Export complete Yearly Cost Forecast ledger as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Executive Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Remaining Unexecuted Balance */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-extrabold tracking-wide">Remaining Contract Balance</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white">
            {formatBr(remainingBalance)}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Unexecuted Share:</span>
              <strong className="text-amber-600 dark:text-amber-400 font-bold">{remainingPct.toFixed(1)}% of BOQ</strong>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, remainingPct))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Empirical Pn Escalation Index */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-extrabold tracking-wide">Empirical $P_n$ Index</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1.5">
            <span>{basePaFactor.toFixed(4)}</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 font-sans">
              ({((basePaFactor - 1.0) * 100).toFixed(1)}% inflation)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Derived from <strong className="text-slate-700 dark:text-slate-200">{ipcTracker.length} certified IPCs</strong> ({formatBr(totalPa)} PA / {formatBr(totalGross)} Gross).
          </div>
        </div>

        {/* Metric 3: Future Escalation Adder */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-extrabold tracking-wide">Projected Price Escalation</span>
            <Activity className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-rose-600 dark:text-rose-400">
            +{formatBr(totalFuturePaAdder)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Estimated escalation adder above base rates at <strong className="text-slate-700 dark:text-slate-200 font-mono">{(annualInflation * 100).toFixed(1)}% p.a.</strong>
          </div>
        </div>

        {/* Metric 4: Total Escalated Outlay */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-black tracking-wide">Total Escalated Commitment</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-indigo-700 dark:text-indigo-300">
            {formatBr(totalProjectedEscalated)}
          </div>
          <div className="text-[10px] text-indigo-600/80 dark:text-indigo-300/80 leading-tight flex items-center justify-between">
            <span>Target Finish:</span>
            <strong className="font-mono text-indigo-900 dark:text-white font-bold">
              {calendarView === 'EFY' ? futureProjections[futureProjections.length - 1]?.efy : `${futureProjections[futureProjections.length - 1]?.year} G.C.`}
            </strong>
          </div>
        </div>
      </div>

      {/* Visual Line Chart for Multi-Year Forecast (Recharts) */}
      {showChart && (
        <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
                  Yearly Estimated Cost Forecast Trajectory
                  <span className="text-[9px] font-mono font-normal px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                    Recharts Multi-Year Model
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Visual breakdown of Base Planned Work Value, Price Escalation Adder, and Total Escalated Outlays across remaining fiscal years.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Unit Toggle */}
              <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                <button
                  onClick={() => setChartUnit('millions')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer ${
                    chartUnit === 'millions' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Millions (M ETB)
                </button>
                <button
                  onClick={() => setChartUnit('full')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer ${
                    chartUnit === 'full' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Full (ETB)
                </button>
              </div>
              
              {/* Chart Style Toggle */}
              <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer ${
                    chartType === 'line' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Multi-Line
                </button>
                <button
                  onClick={() => setChartType('area')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer ${
                    chartType === 'area' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Stacked Area
                </button>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis 
                    dataKey="periodLabel" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#64748b', fontSize: 11 }} 
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#94a3b8" 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(val) => chartUnit === 'millions' ? `${val.toFixed(1)}M` : `${(val / 1e6).toFixed(0)}M`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#a855f7" 
                    tick={{ fill: '#a855f7', fontSize: 10 }}
                    tickFormatter={(val) => chartUnit === 'millions' ? `${val.toFixed(1)}M` : `${(val / 1e6).toFixed(0)}M`}
                  />
                  <RechartsTooltip content={<CustomForecastTooltip chartUnit={chartUnit} formatBr={formatBr} />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey={chartUnit === 'millions' ? 'baseCostM' : 'baseCost'} 
                    name="Base Planned Work Value" 
                    stroke="#6366f1" 
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey={chartUnit === 'millions' ? 'paAdderM' : 'paAdder'} 
                    name="Price Escalation Adder" 
                    stroke="#f43f5e" 
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#f43f5e', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey={chartUnit === 'millions' ? 'escalatedCostM' : 'escalatedCost'} 
                    name="Escalated Estimated Outlay" 
                    stroke="#10b981" 
                    strokeWidth={3.5}
                    dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey={chartUnit === 'millions' ? 'cumulativeEscalatedM' : 'cumulativeEscalated'} 
                    name="Cumulative Outlay (Right Axis)" 
                    stroke="#a855f7" 
                    strokeWidth={2}
                    strokeDasharray="2 2"
                    dot={{ r: 3, fill: '#a855f7' }}
                  />
                </LineChart>
              ) : (
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis 
                    dataKey="periodLabel" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#64748b', fontSize: 11 }} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(val) => chartUnit === 'millions' ? `${val.toFixed(1)}M` : `${(val / 1e6).toFixed(0)}M`}
                  />
                  <RechartsTooltip content={<CustomForecastTooltip chartUnit={chartUnit} formatBr={formatBr} />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area 
                    type="monotone" 
                    dataKey={chartUnit === 'millions' ? 'baseCostM' : 'baseCost'} 
                    name="Base Planned Work Value" 
                    fill="#6366f1" 
                    stroke="#4f46e5"
                    fillOpacity={0.3}
                    stackId="1"
                  />
                  <Area 
                    type="monotone" 
                    dataKey={chartUnit === 'millions' ? 'paAdderM' : 'paAdder'} 
                    name="Price Escalation Adder" 
                    fill="#f43f5e" 
                    stroke="#e11d48"
                    fillOpacity={0.3}
                    stackId="1"
                  />
                  <Line 
                    type="monotone" 
                    dataKey={chartUnit === 'millions' ? 'escalatedCostM' : 'escalatedCost'} 
                    name="Total Escalated Outlay" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981' }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Expandable BOQ Division Work Quantities Breakdown Panel */}
      {showDivisionBreakdown && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wide">
                Division Work Quantities & Financial Status (Series 1000 - 11000)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Unexecuted BOQ balance feeding into multi-year forecast: <strong className="text-amber-600 dark:text-amber-400">{formatBr(remainingBalance)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60">
            <table className="w-full text-xs text-left bg-white dark:bg-slate-800">
              <thead className="bg-slate-100/70 dark:bg-slate-850 text-[10px] uppercase font-mono font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5">Series Code</th>
                  <th className="p-2.5">Division Work Description</th>
                  <th className="p-2.5 text-right">Contract Amount (ETB)</th>
                  <th className="p-2.5 text-right">Executed To Date (ETB)</th>
                  <th className="p-2.5 text-center">Progress (%)</th>
                  <th className="p-2.5 text-right">Remaining Unexecuted (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200">
                {seriesList.map((s, sIdx) => {
                  const rem = Math.max(0, (s.contractAmt || 0) - (s.execAmt || 0));
                  const prog = s.progress || (s.contractAmt > 0 ? (s.execAmt / s.contractAmt) * 100 : 0);
                  const isFullyDone = prog >= 99.9;

                  return (
                    <tr key={`series-breakdown-${s.code || 'series'}-${sIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                      <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.code}</td>
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-white">{s.desc}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-300">{formatBr(s.contractAmt)}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{formatBr(s.execAmt)}</td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          isFullyDone 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' 
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                        }`}>
                          {prog.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatBr(rem)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-850 font-bold text-xs border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                <tr>
                  <td className="p-2.5 uppercase" colSpan={2}>Total BOQ Division Quantities</td>
                  <td className="p-2.5 text-right font-mono">{formatBr(totalSeriesContract)}</td>
                  <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatBr(totalSeriesExec)}</td>
                  <td className="p-2.5 text-center font-mono text-indigo-600 dark:text-indigo-400">{executedPct.toFixed(1)}%</td>
                  <td className="p-2.5 text-right font-mono text-amber-600 dark:text-amber-400 font-black">{formatBr(remainingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Scenario Simulation & Filter Controls Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wide">
              Interactive Sensitivity & Scenario Parameters
            </span>
          </div>

          {/* Scenario Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mr-1">Presets:</span>
            <button
              onClick={() => {
                setBasePaFactor(Number(empiricalPn.toFixed(4)));
                setAnnualInflation(0.05);
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
            >
              Empirical (5.0%)
            </button>
            <button
              onClick={() => setAnnualInflation(0.03)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              Low (3.0%)
            </button>
            <button
              onClick={() => setAnnualInflation(0.08)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
            >
              High (8.0%)
            </button>
            <button
              onClick={() => setAnnualInflation(0.12)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
            >
              Stress (12.0%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
          {/* Parameter 1: Base Pn Factor */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-bold block">Base Factor ($P_n$)</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Current certified baseline</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1.0"
                max="1.5"
                step="0.005"
                value={basePaFactor}
                onChange={(e) => setBasePaFactor(Math.max(1.0, parseFloat(e.target.value) || 1.0))}
                className="w-16 bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 text-center font-mono font-bold text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-indigo-600 outline-none"
              />
              <button
                onClick={() => setBasePaFactor(Number(empiricalPn.toFixed(4)))}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition"
                title="Reset to empirical factor from IPC tracker"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Parameter 2: Annual Compounding Inflation */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-bold block">Annual Inflation Rate</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Compounding escalation p.a.</span>
            </div>
            <input
              type="number"
              min="0"
              max="0.25"
              step="0.005"
              value={annualInflation}
              onChange={(e) => setAnnualInflation(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-18 bg-slate-50 dark:bg-slate-900 text-amber-600 dark:text-amber-400 text-center font-mono font-bold text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-indigo-600 outline-none"
            />
          </div>

          {/* Parameter 3: Scope View Horizon (Future Only vs Full Lifecycle) */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-bold block">Forecast Horizon</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Scope period display</span>
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setScopeView('future')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  scopeView === 'future' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Future Only
              </button>
              <button
                onClick={() => setScopeView('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  scopeView === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Full Lifecycle
              </button>
            </div>
          </div>

          {/* Parameter 4: Calendar System Toggle (EFY vs G.C.) */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-bold block">Calendar System</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Reporting year format</span>
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setCalendarView('EFY')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  calendarView === 'EFY' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                EFY
              </button>
              <button
                onClick={() => setCalendarView('G.C.')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  calendarView === 'G.C.' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                G.C.
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Single Comprehensive Year-by-Year Table with Interactive Header Tooltips */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-900/80 text-[10px] uppercase font-mono font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {/* Header 1: Operating Period */}
              <th className="p-3">
                <HeaderTooltip 
                  title={`Operating Period (${calendarView === 'EFY' ? 'EFY' : 'G.C.'})`}
                  tooltipTitle="Ethiopian Fiscal Year Period"
                  formula="EFY = Gregorian Year - 7"
                  explanation="Ethiopian Fiscal Year spans Hamle 1 to Sene 30 (July 8 to July 7 G.C.). All project work plans and expenditure targets follow the annual June-to-July cycle."
                  methodologyNote="Corresponds to ERA contract administration and audited fiscal year periods."
                  align="left"
                />
              </th>

              {/* Header 2: Status / Lifecycle */}
              <th className="p-3 text-center">
                <HeaderTooltip 
                  title="Status / Stage"
                  tooltipTitle="Contract Lifecycle Phase"
                  explanation="Classifies each fiscal year into Historical Closed Actuals, Current Active Operating Year, or Future Forecast Years until Taking-Over."
                  align="center"
                />
              </th>

              {/* Header 3: June-to-July Plan & Share */}
              <th className="p-3 text-center">
                <HeaderTooltip 
                  title="June-to-July FY Plan & Share (%)"
                  tooltipTitle="Monthly Cumulative Plan (June to July)"
                  formula="ΔPlan = Plan(End FY) - Plan(Start FY)"
                  explanation="Physical work increment taken directly from the Monthly Cumulative S-Curve plan from June/July of start year to June/July of end year, normalized against remaining unexecuted balance."
                  methodologyNote="Directly extracts revisedPlan / originalPlan from the Monthly Cumulative Page."
                  align="center"
                />
              </th>

              {/* Header 4: Base Planned Work Value */}
              <th className="p-3 text-right">
                <HeaderTooltip 
                  title="Base Work Value (ETB)"
                  tooltipTitle="Base Contract Valuation"
                  formula="Base Value = Remaining Balance × Work Share %"
                  explanation="Unescalated contract value of planned works, calculated directly from the remaining unexecuted balance of the Division Work Quantities (Series 1000-11000)."
                  align="right"
                />
              </th>

              {/* Header 5: Escalation Factor Pn */}
              <th className="p-3 text-center">
                <HeaderTooltip 
                  title="Escalation Factor (Pn)"
                  tooltipTitle="FIDIC Sub-Clause 13.8 Price Adjustment"
                  formula="Pn = P0 × (1 + r)^t"
                  explanation="Compounded price escalation multiplier based on FIDIC Sub-Clause 13.8. The baseline P0 is derived empirically from certified IPCs (1.0 + Total PA / Total Gross), compounded annually at inflation rate r."
                  methodologyNote="Accounts for cost indices in fuel, cement, bitumen, steel, and labor."
                  align="center"
                />
              </th>

              {/* Header 6: Price Escalation Adder */}
              <th className="p-3 text-right">
                <HeaderTooltip 
                  title="PA Adder (ETB)"
                  tooltipTitle="Price Adjustment Escalation Adder"
                  formula="PA Adder = Base Value × max(0, Pn - 1.0)"
                  explanation="The monetary escalation adder above base contract rates resulting from market inflation, representing the employer's contractual obligation under FIDIC 13.8."
                  align="right"
                />
              </th>

              {/* Header 7: Escalated Estimated Outlay */}
              <th className="p-3 text-right">
                <HeaderTooltip 
                  title="Escalated Outlay (ETB)"
                  tooltipTitle="Total Escalated Annual Outflow"
                  formula="Escalated Outlay = Base Value + PA Adder = Base Value × Pn"
                  explanation="Total estimated fiscal year cash commitment required for work certified, combining base measured work and price adjustment."
                  align="right"
                />
              </th>

              {/* Header 8: Cumulative Outlay */}
              <th className="p-3 text-right">
                <HeaderTooltip 
                  title="Cumulative Outlay (ETB)"
                  tooltipTitle="Progressive Cash Commitment"
                  formula="Cumulative Outlay(t) = Σ Escalated Outlay(1..t)"
                  explanation="Running progressive sum of annual escalated cash commitments from the current operating fiscal year through project finish."
                  align="right"
                />
              </th>

              {/* Header 9: Remaining Balance */}
              <th className="p-3 text-right">
                <HeaderTooltip 
                  title="Remaining Balance (ETB)"
                  tooltipTitle="Unexecuted Contract Liability"
                  formula="Balance(t) = Balance(t-1) - Base Value(t)"
                  explanation="Tapering unexecuted contract liability amortizing systematically down to Br. 0.00 upon project handover."
                  align="right"
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200">
            {activeProjections.map((row, rIdx) => {
              const isPast = row.isPast;
              const isCurrent = row.isCurrent;
              const isFinish = row.isFinish;

              // Visual conditional styling
              const rowClass = isPast 
                ? 'bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-l-4 border-slate-400' 
                : isCurrent 
                ? 'bg-amber-50/80 dark:bg-amber-950/25 border-l-4 border-amber-500 font-bold text-slate-900 dark:text-slate-100' 
                : isFinish
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-l-4 border-emerald-500 font-semibold text-slate-900 dark:text-slate-100'
                : 'hover:bg-slate-50/80 dark:hover:bg-slate-750/50 border-l-4 border-indigo-400 transition text-slate-800 dark:text-slate-200';

              return (
                <tr key={`fiscal-pred-${row.isPast ? 'past' : 'fut'}-${row.year}-${rIdx}`} className={rowClass}>
                  {/* 1. Operating Period */}
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isPast 
                          ? 'bg-slate-400' 
                          : isCurrent 
                          ? 'bg-amber-500 animate-pulse' 
                          : isFinish 
                          ? 'bg-emerald-500' 
                          : 'bg-indigo-500'
                      }`} />
                      <div>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white">
                          {calendarView === 'EFY' ? row.efy : `${row.year} G.C.`}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-normal">
                          {calendarView === 'EFY' ? row.periodLabel : row.efy}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 2. Status / Lifecycle Stage */}
                  <td className="p-3 text-center">
                    {isPast ? (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Historical Actual
                      </span>
                    ) : isCurrent ? (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold flex items-center justify-center gap-1 mx-auto w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        Current Operating FY
                      </span>
                    ) : isFinish ? (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold">
                        Handover / Taking-Over
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Future Forecast
                      </span>
                    )}
                  </td>

                  {/* 3. June-to-July FY Plan & Remaining Work Share */}
                  <td className="p-3 text-center font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-amber-700 dark:text-amber-400 font-bold text-xs">
                          {row.sharePct.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-700/50" title={`June-to-July Cumulative Plan increment: ${row.startRefLabel} (${row.startPlanVal.toFixed(1)}%) -> ${row.endRefLabel} (${row.endPlanVal.toFixed(1)}%)`}>
                          +{row.fyPlanIncrement.toFixed(1)}% Plan
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans">
                        {row.startRefLabel} ({row.startPlanVal.toFixed(0)}%) &rarr; {row.endRefLabel} ({row.endPlanVal.toFixed(0)}%)
                      </span>
                      <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-1 mx-auto overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isCurrent ? 'bg-amber-500' : isFinish ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, row.sharePct))}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 4. Base Planned Work Value */}
                  <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300 font-medium">
                    {formatBr(row.baseCost)}
                  </td>

                  {/* 5. Escalation Factor (Pn) */}
                  <td className="p-3 text-center font-mono font-bold">
                    <span className="text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-750 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                      {row.pnFactor.toFixed(4)}
                    </span>
                  </td>

                  {/* 6. Price Escalation Adder */}
                  <td className="p-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                    +{formatBr(row.paAdder)}
                  </td>

                  {/* 7. Escalated Estimated Outlay */}
                  <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                    {formatBr(row.escalatedCost)}
                  </td>

                  {/* 8. Cumulative Escalated Outlay */}
                  <td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {formatBr(row.cumulativeEscalated)}
                  </td>

                  {/* 9. Remaining Balance Liability */}
                  <td className="p-3 text-right font-mono font-semibold text-slate-500 dark:text-slate-400">
                    {formatBr(row.balanceRemaining)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Summary Footer */}
          <tfoot className="bg-slate-100 dark:bg-slate-850 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
            <tr>
              <td className="p-3 uppercase" colSpan={2}>
                Total Forecast to Project Completion
              </td>
              <td className="p-3 text-center font-mono text-amber-700 dark:text-amber-400">100.0%</td>
              <td className="p-3 text-right font-mono text-slate-800 dark:text-slate-200">{formatBr(totalBaseForecast)}</td>
              <td className="p-3 text-center font-mono text-indigo-700 dark:text-indigo-300">
                Avg {(futureProjections.reduce((a, b) => a + b.pnFactor, 0) / futureProjections.length).toFixed(4)}
              </td>
              <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">+{formatBr(totalFuturePaAdder)}</td>
              <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">{formatBr(totalProjectedEscalated)}</td>
              <td className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400 text-sm">{formatBr(totalProjectedEscalated)}</td>
              <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">Br. 0.00</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Statutory Compliance & FIDIC Sub-Clause 13.8 Audit Governance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Methodological Guidance */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>FIDIC Sub-Clause 13.8 & Monthly S-Curve Methodology:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            Each fiscal year plan is tied directly to the Monthly Cumulative S-Curve plan from June to July (&Delta;Plan = Plan_end - Plan_start), allocating the remaining BOQ balance ({formatBr(remainingBalance)}). Compounding price escalation follows Pn = P0 &times; (1 + r)^t, where P0 = {basePaFactor.toFixed(4)} is empirical historical inflation from certified IPCs and r = {(annualInflation * 100).toFixed(1)}% p.a.
          </p>
        </div>

        {/* Statutory PPA 20% Variance Guardrail */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
          <div className="font-bold flex items-center justify-between text-slate-900 dark:text-white">
            <div className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Ethiopian PPA 20% Statutory Cap Check:</span>
            </div>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
              isPpaCompliant 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' 
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
            }`}>
              {isPpaCompliant ? 'Compliant' : 'Warning'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            Total lifetime Price Adjustment (Certified to-date {formatBr(totalPa)} + Projected future {formatBr(totalFuturePaAdder)}) equals <strong className="text-slate-900 dark:text-white font-mono">{formatBr(totalLifetimePa)}</strong>, representing <strong className={isPpaCompliant ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>{ppaThresholdRatio.toFixed(2)}%</strong> of Accepted Contract Amount ({formatBr(BAC)}).
          </p>
        </div>
      </div>
    </div>
  );
}
