import React, { useState, useMemo, useEffect } from 'react';
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
import { parseMonthKey, isProjectActiveLifecycle } from '../lib/monthlySync';
import { parseLocalDate } from '../lib/dateUtils';

// ==========================================
// 1. EFY & Financial PA Derivation Helpers
// ==========================================

/**
 * Ethiopian Fiscal Year (EFY) N spans July (monthIndex 6) of (N + 7)
 * through June (monthIndex 5) of (N + 8).
 */
function getEfyFromGregorian(gregYear: number, monthIndex: number): number {
  return monthIndex >= 6 ? gregYear - 7 : gregYear - 8;
}

function getEfyStartGregYear(efyYear: number): number {
  return efyYear + 7; // July of (efyYear + 7)
}

function getEfyEndGregYear(efyYear: number): number {
  return efyYear + 8; // June of (efyYear + 8)
}

function getCurrentEfy(project: Project): number {
  const now = new Date();
  const liveEfy = getEfyFromGregorian(now.getFullYear(), now.getMonth());
  if (!isProjectActiveLifecycle(project.status) && project.progressPlanLabels?.efyLabel) {
    const parsed = parseInt(String(project.progressPlanLabels.efyLabel).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed > 1990) {
      return parsed;
    }
  }
  return liveEfy;
}

interface ParsedMonthlyPoint {
  raw: string;
  year: number;
  monthIndex: number; // 0..11
  serial: number; // year * 12 + monthIndex
  efy: number;
  key: string;
  plan: number;
  actual: number | null;
}

interface FinancialPaMetrics {
  ipcCount: number;
  totalGross: number;
  totalPa: number;
  empiricalPaRate: number;
  empiricalPn: number;
  firstPaRate: number;
  latestPaRate: number;
  paRateGainPct: number; // percentage-point gain from earliest to latest IPC (or single IPC rate)
  empiricalAnnualIncrement: number; // annualized escalation increment rate r (decimal e.g. 0.0435)
  paByEfy: Record<number, { pa: number; gross: number; count: number }>;
  methodologySummary: string;
}

function deriveFinancialPaMetrics(project: Project): FinancialPaMetrics {
  const ipcTracker = project.ipcTracker || [];
  const exchangeRate = project.usdExchangeRate !== undefined ? project.usdExchangeRate : 57.50;
  const isUsdEnabled = project.enableUsdPayments !== undefined
    ? Boolean(project.enableUsdPayments)
    : Boolean(
        project.supervisionConsultant?.enableUsdPayments ||
        ipcTracker.some(i => (i.certifiedUsd || 0) > 0 || (i.grossBillUsd || 0) > 0 || (i.priceAdjustmentUsd || 0) > 0)
      );

  const validIpcs = ipcTracker
    .map((item, idx) => {
      const gross = (item.grossBillEtb || 0) + (isUsdEnabled ? (item.grossBillUsd || 0) * exchangeRate : 0);
      const pa = (item.priceAdjustmentEtb || 0) + (isUsdEnabled ? (item.priceAdjustmentUsd || 0) * exchangeRate : 0);
      const parsedPeriod = parseMonthKey(item.period);
      const fallbackDate = parseLocalDate(item.certificationDate || item.submissionDate);

      let year: number | null = null;
      let monthIndex: number | null = null;
      if (parsedPeriod) {
        year = parsedPeriod.year;
        monthIndex = parsedPeriod.monthIndex;
      } else if (fallbackDate) {
        year = fallbackDate.getFullYear();
        monthIndex = fallbackDate.getMonth();
      }

      const efy = year !== null && monthIndex !== null ? getEfyFromGregorian(year, monthIndex) : null;
      const timeMs =
        year !== null && monthIndex !== null
          ? new Date(year, monthIndex, 15).getTime()
          : idx * 30 * 86400 * 1000;

      return {
        item,
        idx,
        gross,
        pa,
        paRate: gross > 0 ? pa / gross : 0,
        efy,
        timeMs
      };
    })
    .filter(entry => entry.gross > 0 || entry.pa > 0)
    .sort((a, b) => a.timeMs - b.timeMs);

  const paByEfy: Record<number, { pa: number; gross: number; count: number }> = {};
  validIpcs.forEach(entry => {
    if (entry.efy !== null) {
      if (!paByEfy[entry.efy]) {
        paByEfy[entry.efy] = { pa: 0, gross: 0, count: 0 };
      }
      paByEfy[entry.efy].pa += entry.pa;
      paByEfy[entry.efy].gross += entry.gross;
      paByEfy[entry.efy].count += 1;
    }
  });

  const ipcTotalGross = validIpcs.reduce((s, e) => s + e.gross, 0);
  const ipcTotalPa = validIpcs.reduce((s, e) => s + e.pa, 0);

  // Payment Milestones fallback from Financial Data page
  const paymentList = project.payment || [];
  const paymentPaRow = paymentList.find(p => p.item.trim().toLowerCase().includes('price adjustment'));
  const paymentBillRow = paymentList.find(p => p.item.trim().toLowerCase().includes('total todate bill summary'));

  const totalGross = ipcTotalGross > 0 ? ipcTotalGross : (paymentBillRow?.amount || 0);
  const totalPa = ipcTotalPa > 0 ? ipcTotalPa : (paymentPaRow?.amount || 0);

  const empiricalPaRate = totalGross > 0 ? totalPa / totalGross : 0;
  const empiricalPn = 1.0 + empiricalPaRate;

  // Compute PA Increment gained across IPCs on Financial Data page
  const ipcsWithGross = validIpcs.filter(x => x.gross > 0);
  let firstPaRate = empiricalPaRate;
  let latestPaRate = empiricalPaRate;
  let paRateGainPct = empiricalPaRate * 100;
  let empiricalAnnualIncrement = 0;
  let methodologySummary = 'No Price Adjustment recorded on Financial Data page yet.';

  if (ipcsWithGross.length >= 2) {
    firstPaRate = ipcsWithGross[0].paRate;
    latestPaRate = ipcsWithGross[ipcsWithGross.length - 1].paRate;
    const netDeltaRate = latestPaRate - firstPaRate;

    // Also compute step-by-step positive increments across IPCs
    let positiveStepsSum = 0;
    let positiveStepsCount = 0;
    for (let i = 1; i < ipcsWithGross.length; i++) {
      const diff = ipcsWithGross[i].paRate - ipcsWithGross[i - 1].paRate;
      if (diff > 0) {
        positiveStepsSum += diff;
        positiveStepsCount += 1;
      }
    }

    const spanYears = Math.max(
      0.25,
      (ipcsWithGross[ipcsWithGross.length - 1].timeMs - ipcsWithGross[0].timeMs) / (365.25 * 86400 * 1000)
    );

    if (netDeltaRate > 0.0005) {
      paRateGainPct = netDeltaRate * 100;
      empiricalAnnualIncrement = Math.min(0.25, Math.max(0.005, netDeltaRate / spanYears));
      methodologySummary = `PA rate rose from ${(firstPaRate * 100).toFixed(2)}% (${ipcsWithGross[0].item.paymentNo}) to ${(latestPaRate * 100).toFixed(2)}% (${ipcsWithGross[ipcsWithGross.length - 1].item.paymentNo}): +${paRateGainPct.toFixed(2)}% gained over ${spanYears.toFixed(2)} yrs -> ${(empiricalAnnualIncrement * 100).toFixed(2)}% p.a.`;
    } else if (positiveStepsCount > 0) {
      paRateGainPct = (positiveStepsSum / positiveStepsCount) * 100;
      empiricalAnnualIncrement = Math.min(0.25, Math.max(0.005, positiveStepsSum / spanYears));
      methodologySummary = `Derived from upward PA step increments across ${ipcsWithGross.length} Financial Data IPCs (+${paRateGainPct.toFixed(2)}% avg step -> ${(empiricalAnnualIncrement * 100).toFixed(2)}% p.a.).`;
    } else {
      paRateGainPct = empiricalPaRate * 100;
      empiricalAnnualIncrement = Math.min(0.25, empiricalPaRate);
      methodologySummary = `Baseline PA ratio of ${paRateGainPct.toFixed(2)}% across ${ipcsWithGross.length} certified IPCs applied as annual escalation trend.`;
    }
  } else if (totalPa > 0 && totalGross > 0) {
    paRateGainPct = empiricalPaRate * 100;
    empiricalAnnualIncrement = Math.min(0.25, empiricalPaRate);
    methodologySummary = `Derived from certified Financial Data Price Adjustment (${paRateGainPct.toFixed(2)}% of Gross Bill Summary).`;
  }

  return {
    ipcCount: validIpcs.length,
    totalGross,
    totalPa,
    empiricalPaRate,
    empiricalPn,
    firstPaRate,
    latestPaRate,
    paRateGainPct,
    empiricalAnnualIncrement: Number(empiricalAnnualIncrement.toFixed(4)),
    paByEfy,
    methodologySummary
  };
}

// ==========================================
// 2. Interactive Header Tooltip Component
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
    <div
      className={`group relative inline-flex items-center gap-1 cursor-help select-none ${
        align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : 'justify-start'
      }`}
    >
      <span className="truncate">{title}</span>
      <Info className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors shrink-0" />

      {/* Tooltip Card */}
      <div
        className={`absolute bottom-full mb-2.5 hidden group-hover:block w-72 sm:w-80 p-3 bg-slate-900 dark:bg-slate-950 text-slate-100 text-left text-xs rounded-xl shadow-2xl border border-slate-700 dark:border-indigo-500/70 z-50 pointer-events-none backdrop-blur-md transition-all ${
          align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
        }`}
      >
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
        <div
          className={`absolute top-full -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-950 ${
            align === 'right' ? 'right-4' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-4'
          }`}
        />
      </div>
    </div>
  );
};

// ==========================================
// 3. Custom Recharts Forecast Tooltip
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
      <div className="bg-slate-900/95 dark:bg-slate-950/95 p-3 rounded-xl border border-slate-700 dark:border-indigo-500/60 shadow-2xl text-xs space-y-1.5 text-white backdrop-blur-md min-w-[260px]">
        <div className="flex items-center justify-between border-b border-slate-800 dark:border-indigo-900 pb-1.5">
          <span className="font-bold text-amber-300">{data.fullPeriod || label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 dark:bg-indigo-950 border border-slate-700 dark:border-indigo-700/60 text-indigo-300">
            Pn: {data.pnFactor.toFixed(4)}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-semibold">
          {data.isPast ? 'Basis: Monthly Cumulative Actual Accomplishment + Certified PA' : 'Basis: Monthly Cumulative Plan + Forecasted PA'}
        </div>
        <div className="space-y-1 pt-1 font-mono text-[11px]">
          <div className="flex justify-between items-center text-slate-300">
            <span>{data.isPast ? 'Actual Work Value:' : 'Base Planned Work:'}</span>
            <span className="font-bold text-white">{formatBr(data.baseCost)}</span>
          </div>
          <div className="flex justify-between items-center text-rose-300">
            <span>{data.isPast ? 'Price Adjustment:' : 'Forecasted PA Adder:'}</span>
            <span className="font-bold">+{formatBr(data.paAdder)}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-300 font-bold border-t border-slate-800 pt-1">
            <span>Total Cost incl. PA:</span>
            <span>{formatBr(data.escalatedCost)}</span>
          </div>
          <div className="flex justify-between items-center text-purple-300">
            <span>Cumulative Outlay:</span>
            <span>{formatBr(data.cumulativeEscalated)}</span>
          </div>
          <div className="flex justify-between items-center text-amber-300 text-[10px] pt-1 border-t border-slate-800">
            <span>{data.isPast ? 'Monthly Cum. Actual Δ:' : 'Monthly Cum. Plan Δ:'}</span>
            <span>+{data.fyProgressIncrement.toFixed(1)}% ({data.sharePct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ==========================================
// 4. Main Yearly Cost Forecast Section
// ==========================================
interface YearlyCostForecastSectionProps {
  project: Project;
  BAC: number;
  EV: number;
  formatBr: (v: number) => string;
}

export interface ForecastYearRow {
  efyYear: number;
  year: string; // EFY start Gregorian year string
  efy: string;
  periodLabel: string;
  efyLabel: string;
  isPast: boolean;
  isCurrent: boolean;
  isFinish: boolean;
  basisType: 'actual' | 'plan' | 'fallback_plan';
  sharePct: number;
  fyProgressIncrement: number;
  startRefLabel: string;
  startRefVal: number;
  endRefLabel: string;
  endRefVal: number;
  baseCost: number;
  pnFactor: number;
  paAdder: number;
  paSourceTag: string;
  escalatedCost: number;
  cumulativeEscalated: number;
  balanceRemaining: number;
}

export default function YearlyCostForecastSection({
  project,
  BAC,
  EV,
  formatBr
}: YearlyCostForecastSectionProps) {
  // 1. Derive Empirical Baseline Pn AND PA Increment Rate directly from Financial Data page
  const financialPa = useMemo(() => deriveFinancialPaMetrics(project), [project]);

  // Interactive Sensitivity Parameters (auto-linked to Financial Data PA metrics unless user overrides)
  const [basePaFactor, setBasePaFactor] = useState<number>(() => Number(financialPa.empiricalPn.toFixed(4)));
  const [annualInflation, setAnnualInflation] = useState<number>(() => Number(financialPa.empiricalAnnualIncrement.toFixed(4)));
  const [hasCustomPn, setHasCustomPn] = useState<boolean>(false);
  const [hasCustomIncrement, setHasCustomIncrement] = useState<boolean>(false);

  useEffect(() => {
    setHasCustomPn(false);
    setHasCustomIncrement(false);
  }, [project.id]);

  useEffect(() => {
    if (!hasCustomPn) {
      setBasePaFactor(Number(financialPa.empiricalPn.toFixed(4)));
    }
  }, [financialPa.empiricalPn, hasCustomPn]);

  useEffect(() => {
    if (!hasCustomIncrement) {
      setAnnualInflation(Number(financialPa.empiricalAnnualIncrement.toFixed(4)));
    }
  }, [financialPa.empiricalAnnualIncrement, hasCustomIncrement]);

  const [calendarView, setCalendarView] = useState<'EFY' | 'G.C.'>('EFY');
  const [scopeView, setScopeView] = useState<'future' | 'all'>('all');
  const [showDivisionBreakdown, setShowDivisionBreakdown] = useState<boolean>(false);
  const [showChart, setShowChart] = useState<boolean>(true);
  const [chartUnit, setChartUnit] = useState<'millions' | 'full'>('millions');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [copied, setCopied] = useState<boolean>(false);

  // 2. Division Work Quantities & Contract Values
  const seriesList = project.series || [];
  const totalSeriesContract = seriesList.reduce((sum, s) => sum + (s.contractAmt || 0), 0) || BAC;
  const totalSeriesExec = seriesList.reduce((sum, s) => sum + (s.execAmt || 0), 0) || EV;
  const remainingBalance = Math.max(0, totalSeriesContract - totalSeriesExec);
  const executedPct = totalSeriesContract > 0 ? (totalSeriesExec / totalSeriesContract) * 100 : 0;
  const remainingPct = Math.max(0, 100 - executedPct);

  // 3. Parse Monthly Cumulative Entries (`project.monthly`) sorted chronologically
  const parsedMonthly: ParsedMonthlyPoint[] = useMemo(() => {
    return (project.monthly || [])
      .map(m => {
        const p = parseMonthKey(m.month);
        if (!p) return null;
        const planVal = Number(m.revisedPlan ?? m.originalPlan ?? 0);
        const hasActual = m.actual !== undefined && m.actual !== null && m.actual !== '' && !isNaN(Number(m.actual));
        const actualVal = hasActual ? Number(m.actual) : null;
        return {
          raw: m.month,
          year: p.year,
          monthIndex: p.monthIndex,
          serial: p.year * 12 + p.monthIndex,
          efy: getEfyFromGregorian(p.year, p.monthIndex),
          key: p.key,
          plan: isNaN(planVal) ? 0 : planVal,
          actual: actualVal
        };
      })
      .filter((item): item is ParsedMonthlyPoint => item !== null)
      .sort((a, b) => a.serial - b.serial);
  }, [project.monthly]);

  // Boundary reader at the end of a specific EFY `efyYear` (June of `efyYear + 8`, or closest preceding point)
  const getCumulativeAtEfyEnd = (efyYear: number, metric: 'actual' | 'plan'): { value: number; matched: string } => {
    if (parsedMonthly.length === 0) {
      return { value: 0, matched: 'N/A' };
    }

    const endBoundarySerial = getEfyEndGregYear(efyYear) * 12 + 5; // June of (efyYear + 8)
    const startBoundarySerial = getEfyStartGregYear(efyYear) * 12 + 6; // July of (efyYear + 7)

    const validPoints = parsedMonthly.filter(pt =>
      metric === 'actual' ? pt.actual !== null : true
    );
    if (validPoints.length === 0) {
      return { value: 0, matched: 'N/A' };
    }

    const onOrBeforeEnd = validPoints.filter(pt => pt.serial <= endBoundarySerial);
    if (onOrBeforeEnd.length > 0) {
      const latest = onOrBeforeEnd[onOrBeforeEnd.length - 1];
      const val = metric === 'actual' ? (latest.actual ?? 0) : latest.plan;
      return { value: val, matched: latest.key };
    }

    // If no entries exist on or before EFY end (i.e. project starts after this EFY)
    const first = validPoints[0];
    if (first.serial >= startBoundarySerial) {
      return { value: 0, matched: `< ${first.key}` };
    }
    return { value: 0, matched: 'N/A' };
  };

  // Monthly plan velocity baseline (June -> July increment from Monthly Cumulative)
  const juneJulIncrement = useMemo(() => {
    const juneEntry = (project.monthly || []).find(m => m.month && (m.month.toLowerCase().includes('jun') || m.month.includes('-06')));
    const julyEntry = (project.monthly || []).find(m => m.month && (m.month.toLowerCase().includes('jul') || m.month.includes('-07')));
    const jPlan = Number(juneEntry?.revisedPlan ?? juneEntry?.originalPlan ?? 0);
    const jlPlan = Number(julyEntry?.revisedPlan ?? julyEntry?.originalPlan ?? 0);
    if (jlPlan > jPlan) return jlPlan - jPlan;
    if (parsedMonthly.length >= 2) {
      const first = parsedMonthly[0].plan;
      const last = parsedMonthly[parsedMonthly.length - 1].plan;
      const span = Math.max(1, parsedMonthly[parsedMonthly.length - 1].serial - parsedMonthly[0].serial);
      return Math.max(0.1, (last - first) / span);
    }
    return 1.5;
  }, [project.monthly, parsedMonthly]);

  // 4. Determine Current EFY, Previous EFYs, and Upcoming EFYs
  const currentEfy = getCurrentEfy(project);

  const { pastProjections, futureProjections, totalPrevBase, totalPrevPa, totalPrevEscalated } = useMemo(() => {
    const efySet = new Set<number>();
    parsedMonthly.forEach(pt => efySet.add(pt.efy));
    Object.keys(financialPa.paByEfy).forEach(k => efySet.add(parseInt(k, 10)));

    // Include start/completion dates if available
    const startDt = parseLocalDate(project.startDate);
    if (startDt) {
      efySet.add(getEfyFromGregorian(startDt.getFullYear(), startDt.getMonth()));
    }
    efySet.add(currentEfy);

    const allRecordedEfys = Array.from(efySet).sort((a, b) => a - b);

    // Previous EFYs: strictly < currentEfy that had activity or monthly entries
    const previousEfys = allRecordedEfys.filter(e => e < currentEfy);

    // Current & Upcoming EFYs: >= currentEfy (ensure at least Current EFY + 2 upcoming when needed, or follow monthly plan horizon)
    let upcomingAndCurrentEfys = allRecordedEfys.filter(e => e >= currentEfy);
    if (upcomingAndCurrentEfys.length === 0) {
      upcomingAndCurrentEfys = [currentEfy, currentEfy + 1, currentEfy + 2];
    } else if (remainingBalance > 0) {
      let lastEfy = upcomingAndCurrentEfys[upcomingAndCurrentEfys.length - 1];
      const latestPlanAtLast = getCumulativeAtEfyEnd(lastEfy, 'plan').value;
      // Extend horizon up to 3 EFYs only when the recorded monthly plan has not yet reached 100%
      if (latestPlanAtLast < 99.9) {
        while (upcomingAndCurrentEfys.length < 3) {
          lastEfy += 1;
          upcomingAndCurrentEfys.push(lastEfy);
        }
      }
    }

    // -----------------------------------------------------------------------
    // A. PREVIOUS EFYs: Monthly Cumulative Actual Accomplishment + Price Adj
    // -----------------------------------------------------------------------
    const prevRaw = previousEfys.map(efy => {
      const startActual = getCumulativeAtEfyEnd(efy - 1, 'actual');
      const endActual = getCumulativeAtEfyEnd(efy, 'actual');
      const actualIncPct = Math.max(0, endActual.value - startActual.value);
      const baseCost = totalSeriesContract * (actualIncPct / 100);
      const ipcInfo = financialPa.paByEfy[efy];

      return {
        efyYear: efy,
        startActual,
        endActual,
        actualIncPct,
        baseCost,
        directIpcPa: ipcInfo ? ipcInfo.pa : 0,
        hasDirectIpc: Boolean(ipcInfo && ipcInfo.pa > 0)
      };
    });

    // Reconcile historical Price Adjustment from Financial Data across Previous EFYs:
    // Any IPCs strictly inside `currentEfy` remain in current EFY; all prior PA belongs to Previous EFYs.
    const currentAndFutureDirectPa = Object.keys(financialPa.paByEfy)
      .filter((efyKey) => parseInt(efyKey, 10) >= currentEfy)
      .reduce((s, efyKey) => s + (financialPa.paByEfy[Number(efyKey)]?.pa || 0), 0);

    const historicalTotalPaTarget = Math.max(0, financialPa.totalPa - currentAndFutureDirectPa);
    const directMappedOnPrev = prevRaw.reduce(
      (s, r) => s + (r.hasDirectIpc ? r.directIpcPa : 0),
      0
    );
    const unallocatedPrevPa = Math.max(0, historicalTotalPaTarget - directMappedOnPrev);
    const unmappedPrevBaseSum = prevRaw.reduce(
      (s, r) => s + (r.baseCost > 0 && !r.hasDirectIpc ? r.baseCost : 0),
      0
    );
    const totalPrevBaseSum = prevRaw.reduce((s, r) => s + r.baseCost, 0);

    let runningPrevCum = 0;
    let runningPrevBase = 0;

    const builtPast: ForecastYearRow[] = prevRaw.map((r, rIdx) => {
      const startGreg = getEfyStartGregYear(r.efyYear);
      const endGreg = getEfyEndGregYear(r.efyYear);

      let paAdder = 0;
      let paSourceTag = 'No PA';

      if (r.hasDirectIpc) {
        paAdder = r.directIpcPa;
        paSourceTag = 'Certified IPC PA';
        if (unallocatedPrevPa > 0 && unmappedPrevBaseSum === 0 && totalPrevBaseSum > 0 && r.baseCost > 0) {
          paAdder += unallocatedPrevPa * (r.baseCost / totalPrevBaseSum);
          paSourceTag = 'Certified IPC + Historical PA';
        }
      } else if (unallocatedPrevPa > 0 && r.baseCost > 0 && unmappedPrevBaseSum > 0) {
        paAdder = unallocatedPrevPa * (r.baseCost / unmappedPrevBaseSum);
        paSourceTag = 'Financial Data Historical PA';
      } else if (unallocatedPrevPa > 0 && totalPrevBaseSum === 0 && rIdx === prevRaw.length - 1) {
        paAdder = unallocatedPrevPa;
        paSourceTag = 'Financial Data Historical PA';
      } else if (r.baseCost > 0 && basePaFactor > 1.0 && financialPa.totalPa === 0) {
        paAdder = r.baseCost * (basePaFactor - 1.0);
        paSourceTag = 'Sensitivity Factor';
      }

      const pnFactor = r.baseCost > 0 ? 1.0 + paAdder / r.baseCost : basePaFactor;
      const escalatedCost = r.baseCost + paAdder;
      runningPrevCum += escalatedCost;
      runningPrevBase += r.baseCost;

      const shareOfContract = totalSeriesContract > 0 ? (r.baseCost / totalSeriesContract) * 100 : r.actualIncPct;

      return {
        efyYear: r.efyYear,
        year: String(startGreg),
        efy: `EFY ${r.efyYear}`,
        periodLabel: `${startGreg}/${endGreg} G.C.`,
        efyLabel: `EFY ${r.efyYear} (${startGreg}/${endGreg})`,
        isPast: true,
        isCurrent: false,
        isFinish: false,
        basisType: 'actual',
        sharePct: shareOfContract,
        fyProgressIncrement: r.actualIncPct,
        startRefLabel: r.startActual.matched,
        startRefVal: r.startActual.value,
        endRefLabel: r.endActual.matched,
        endRefVal: r.endActual.value,
        baseCost: r.baseCost,
        pnFactor,
        paAdder,
        paSourceTag,
        escalatedCost,
        cumulativeEscalated: runningPrevCum,
        balanceRemaining: Math.max(0, totalSeriesContract - runningPrevBase)
      };
    });

    // -----------------------------------------------------------------------
    // B. CURRENT EFY & UPCOMING EFYs: Monthly Cumulative Plan + Forecasted PA
    // -----------------------------------------------------------------------
    const futurePlansRaw = upcomingAndCurrentEfys.map(efy => {
      const startPlan = getCumulativeAtEfyEnd(efy - 1, 'plan');
      const endPlan = getCumulativeAtEfyEnd(efy, 'plan');
      const planInc = Math.max(0, endPlan.value - startPlan.value);
      return {
        efyYear: efy,
        startPlan,
        endPlan,
        planInc
      };
    });

    // Filter trailing zero-plan padding beyond last active year unless needed as minimum 3-year fallback
    const totalFuturePlanInc = futurePlansRaw.reduce((sum, item) => sum + item.planInc, 0);
    const hasExplicitMonthlyPlans = totalFuturePlanInc > 0;

    const effectiveFuturePlans = hasExplicitMonthlyPlans
      ? futurePlansRaw.filter(item => item.efyYear === currentEfy || item.planInc > 0)
      : futurePlansRaw;

    const effectivePlanSum = effectiveFuturePlans.reduce((sum, item) => sum + item.planInc, 0);

    const futureWeights = effectiveFuturePlans.map((item, idx) => {
      if (effectivePlanSum > 0 && item.planInc > 0) {
        return (item.planInc / effectivePlanSum) * 100;
      }
      if (effectivePlanSum > 0 && item.planInc === 0) {
        return 0;
      }
      // Fallback distribution only if monthly cumulative has zero future plan increments
      if (effectiveFuturePlans.length === 1) return 100;
      if (effectiveFuturePlans.length === 2) return idx === 0 ? 58 : 42;
      if (effectiveFuturePlans.length === 3) return idx === 0 ? 45 : idx === 1 ? 35 : 20;
      return 100 / effectiveFuturePlans.length;
    });

    const sumWeights = futureWeights.reduce((a, b) => a + b, 0) || 100;
    const normalizedFutureWeights = futureWeights.map(w => (w / sumWeights) * 100);

    let runningFutureEscalated = 0;
    let remBalanceTrack = remainingBalance;

    const builtFuture: ForecastYearRow[] = effectiveFuturePlans.map((planData, idx) => {
      const startGreg = getEfyStartGregYear(planData.efyYear);
      const endGreg = getEfyEndGregYear(planData.efyYear);
      const sharePct = normalizedFutureWeights[idx];
      const baseCost = remainingBalance * (sharePct / 100);

      // Forecasted Pn using Baseline P0 & Annual Increment Rate derived from Financial Data PA
      const pnFactor = basePaFactor * Math.pow(1 + annualInflation, idx);
      const paAdder = baseCost * Math.max(0, pnFactor - 1.0);
      const escalatedCost = baseCost + paAdder;

      runningFutureEscalated += escalatedCost;
      remBalanceTrack = Math.max(0, remBalanceTrack - baseCost);

      return {
        efyYear: planData.efyYear,
        year: String(startGreg),
        efy: `EFY ${planData.efyYear}`,
        periodLabel: `${startGreg}/${endGreg} G.C.`,
        efyLabel: `EFY ${planData.efyYear} (${startGreg}/${endGreg})`,
        isPast: false,
        isCurrent: planData.efyYear === currentEfy,
        isFinish: idx === effectiveFuturePlans.length - 1,
        basisType: planData.planInc > 0 ? 'plan' : 'fallback_plan',
        sharePct,
        fyProgressIncrement: planData.planInc,
        startRefLabel: planData.startPlan.matched,
        startRefVal: planData.startPlan.value,
        endRefLabel: planData.endPlan.matched,
        endRefVal: planData.endPlan.value,
        baseCost,
        pnFactor,
        paAdder,
        paSourceTag: idx === 0 ? 'Current Forecast (P0)' : `Forecast (P0 × (1+r)^${idx})`,
        escalatedCost,
        cumulativeEscalated: runningFutureEscalated,
        balanceRemaining: idx === effectiveFuturePlans.length - 1 ? 0 : remBalanceTrack
      };
    });

    const prevBase = builtPast.reduce((s, r) => s + r.baseCost, 0);
    const prevPa = builtPast.reduce((s, r) => s + r.paAdder, 0);
    const prevEsc = builtPast.reduce((s, r) => s + r.escalatedCost, 0);

    return {
      pastProjections: builtPast,
      futureProjections: builtFuture,
      totalPrevBase: prevBase,
      totalPrevPa: prevPa,
      totalPrevEscalated: prevEsc
    };
  }, [parsedMonthly, financialPa, project.startDate, currentEfy, totalSeriesContract, remainingBalance, basePaFactor, annualInflation]);

  // Cumulative progression when viewing Full Lifecycle (`scopeView === 'all'`)
  const activeProjections = useMemo(() => {
    if (scopeView === 'future') {
      return futureProjections;
    }
    // Re-accumulate total cumulative escalated cost smoothly from Previous EFYs -> Current -> Upcoming EFYs
    let runningAll = 0;
    return [...pastProjections, ...futureProjections].map(row => {
      runningAll += row.escalatedCost;
      return {
        ...row,
        cumulativeEscalated: runningAll
      };
    });
  }, [scopeView, pastProjections, futureProjections]);

  // Recharts dataset mirrors active scope
  const chartData = activeProjections.map((p) => {
    return {
      periodLabel: calendarView === 'EFY' ? p.efy : p.periodLabel,
      fullPeriod: `${p.efy} (${p.periodLabel})`,
      efyYearLabel: p.efy,
      isPast: p.isPast,
      baseCost: p.baseCost,
      baseCostM: p.baseCost / 1_000_000,
      paAdder: p.paAdder,
      paAdderM: p.paAdder / 1_000_000,
      escalatedCost: p.escalatedCost,
      escalatedCostM: p.escalatedCost / 1_000_000,
      cumulativeEscalated: p.cumulativeEscalated,
      cumulativeEscalatedM: p.cumulativeEscalated / 1_000_000,
      pnFactor: p.pnFactor,
      fyProgressIncrement: p.fyProgressIncrement,
      sharePct: p.sharePct
    };
  });

  // Summary aggregates
  const totalBaseForecast = futureProjections.reduce((sum, r) => sum + r.baseCost, 0);
  const totalFuturePaAdder = futureProjections.reduce((sum, r) => sum + r.paAdder, 0);
  const totalProjectedEscalated = futureProjections.reduce((sum, r) => sum + r.escalatedCost, 0);

  const grandTotalBase = totalPrevBase + totalBaseForecast;
  const grandTotalPa = totalPrevPa + totalFuturePaAdder;
  const grandTotalEscalated = totalPrevEscalated + totalProjectedEscalated;

  const totalLifetimePa = grandTotalPa;
  const ppaThresholdRatio = BAC > 0 ? (totalLifetimePa / BAC) * 100 : 0;
  const isPpaCompliant = ppaThresholdRatio <= 20.0;

  // Copy summary report to clipboard
  const handleCopySummary = () => {
    const summaryText = `=====================================================
YEARLY ESTIMATED COST FORECAST & PRICE ESCALATION AUDIT
Project: ${project.name} (ID: ${project.id || 'N/A'})
Evaluation Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
Current Operating EFY: EFY ${currentEfy}
Contract Price (BAC): ${formatBr(BAC)}
Total Executed To-Date: ${formatBr(totalSeriesExec)} (${executedPct.toFixed(1)}%)
Remaining Unexecuted Balance: ${formatBr(remainingBalance)} (${remainingPct.toFixed(1)}%)
Financial Data PA Baseline P0: ${basePaFactor.toFixed(4)} (${((basePaFactor - 1) * 100).toFixed(2)}% PA/Gross)
Financial Data Annual PA Increment (r): ${(annualInflation * 100).toFixed(2)}% p.a. (${financialPa.methodologySummary})
-----------------------------------------------------
PREVIOUS EFYs (MONTHLY CUMULATIVE ACTUALS + PA):
${pastProjections.length > 0 ? pastProjections.map(r => `• ${r.efy} [${r.periodLabel}] | Actual: +${r.fyProgressIncrement.toFixed(1)}% (${r.startRefLabel}→${r.endRefLabel}) | Work Value: ${formatBr(r.baseCost)} | PA (${r.paSourceTag}): +${formatBr(r.paAdder)} | Total: ${formatBr(r.escalatedCost)}`).join('\n') : '• No closed prior EFYs recorded.'}
-----------------------------------------------------
CURRENT & UPCOMING EFYs (MONTHLY CUMULATIVE PLAN + FORECASTED PA):
${futureProjections.map(r => `• ${r.efy} [${r.periodLabel}] ${r.isCurrent ? '[CURRENT]' : '[UPCOMING]'} | Plan Δ: +${r.fyProgressIncrement.toFixed(1)}% (${r.sharePct.toFixed(1)}% rem.) | Base: ${formatBr(r.baseCost)} | Pn: ${r.pnFactor.toFixed(4)} | PA: +${formatBr(r.paAdder)} | Escalated: ${formatBr(r.escalatedCost)} | Cum.: ${formatBr(r.cumulativeEscalated)}`).join('\n')}
-----------------------------------------------------
SUMMARY TO COMPLETION:
Previous EFYs Accomplished (incl. PA): ${formatBr(totalPrevEscalated)} (Base: ${formatBr(totalPrevBase)} + PA: ${formatBr(totalPrevPa)})
Current & Upcoming Plan Commitment: ${formatBr(totalProjectedEscalated)} (Base: ${formatBr(totalBaseForecast)} + PA: ${formatBr(totalFuturePaAdder)})
Total Lifetime PA (Certified + Forecasted): ${formatBr(totalLifetimePa)} (${ppaThresholdRatio.toFixed(2)}% of Contract Price)
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
      ['Current EFY', `EFY ${currentEfy}`],
      ['Contract Price (BAC)', formatBr(BAC)],
      ['Total Executed To Date', formatBr(totalSeriesExec)],
      ['Remaining Unexecuted Balance', formatBr(remainingBalance)],
      ['Financial Data Baseline Factor (P0)', basePaFactor.toFixed(4)],
      ['Forecasted PA Increment Rate (r p.a.)', `${(annualInflation * 100).toFixed(2)}%`],
      ['Financial Data PA Derivation', financialPa.methodologySummary],
      ['Export Timestamp', new Date().toISOString()],
      [],
      [
        'Operating Fiscal Year (EFY)',
        'Gregorian Calendar Period',
        'Period Stage',
        'Data Source Basis',
        'Monthly Cumulative Increment (%)',
        'Contract / Remaining Share (%)',
        'Base Work Value (ETB)',
        'Escalation Factor (Pn)',
        'Price Adjustment (ETB)',
        'PA Source',
        'Total Cost incl. PA (ETB)',
        'Cumulative Outlay (ETB)',
        'Remaining Balance Liability (ETB)'
      ]
    ];

    activeProjections.forEach(r => {
      csvRows.push([
        r.efy,
        r.periodLabel,
        r.isPast ? 'Previous EFY (Actual)' : r.isCurrent ? 'Current Operating EFY (Plan)' : r.isFinish ? 'Completion & Handover (Plan)' : 'Upcoming EFY (Plan)',
        r.basisType === 'actual' ? 'Monthly Cumulative Actual' : r.basisType === 'plan' ? 'Monthly Cumulative Plan' : 'Remaining Balance Schedule Fallback',
        r.fyProgressIncrement.toFixed(2),
        r.sharePct.toFixed(2),
        r.baseCost.toFixed(2),
        r.pnFactor.toFixed(4),
        r.paAdder.toFixed(2),
        r.paSourceTag,
        r.escalatedCost.toFixed(2),
        r.cumulativeEscalated.toFixed(2),
        r.balanceRemaining.toFixed(2)
      ]);
    });

    csvRows.push([]);
    csvRows.push([
      'SUBTOTAL PREVIOUS EFYs',
      '-',
      'Actual Accomplishment + PA',
      'Monthly Cumulative Actual',
      '-',
      '-',
      totalPrevBase.toFixed(2),
      totalPrevBase > 0 ? (1 + totalPrevPa / totalPrevBase).toFixed(4) : '1.0000',
      totalPrevPa.toFixed(2),
      'Financial Data',
      totalPrevEscalated.toFixed(2),
      totalPrevEscalated.toFixed(2),
      '-'
    ]);
    csvRows.push([
      'SUBTOTAL CURRENT & UPCOMING EFYs',
      '-',
      'Remaining Plan Forecast',
      'Monthly Cumulative Plan',
      '-',
      '100.00%',
      totalBaseForecast.toFixed(2),
      (futureProjections.reduce((a, b) => a + b.pnFactor, 0) / (futureProjections.length || 1)).toFixed(4),
      totalFuturePaAdder.toFixed(2),
      'Forecasted Increment',
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
                Previous Actuals + Current/Upcoming Plan &amp; PA Forecast
              </span>
            </div>
            <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
              Previous EFYs computed from Monthly Cumulative Actual Accomplishment (incl. Price Adjustment); Current (EFY {currentEfy}) &amp; Upcoming EFYs computed from Monthly Cumulative Plan with Price Adjustment forecasted from Financial Data PA increment.
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
        {/* Metric 1: Previous EFYs Accomplished (Actual + PA) */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-extrabold tracking-wide">
              Previous EFYs (Actual + PA)
            </span>
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white">
            {formatBr(totalPrevEscalated)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight font-mono">
            Base Actual: <strong className="text-slate-700 dark:text-slate-200">{formatBr(totalPrevBase)}</strong> + PA: <strong className="text-rose-600 dark:text-rose-400">+{formatBr(totalPrevPa)}</strong>
          </div>
        </div>

        {/* Metric 2: Empirical Pn & Financial Data PA Increment */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-extrabold tracking-wide">
              Financial Data PA Increment
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1.5 flex-wrap">
            <span>P0: {basePaFactor.toFixed(4)}</span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
              (+{(annualInflation * 100).toFixed(2)}%/yr)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            From <strong className="text-slate-700 dark:text-slate-200">{financialPa.ipcCount} Financial Data IPCs</strong> ({formatBr(financialPa.totalPa)} PA / {formatBr(financialPa.totalGross)} Gross).
          </div>
        </div>

        {/* Metric 3: Current & Upcoming Forecasted PA */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-extrabold tracking-wide">
              Forecasted Future PA Adder
            </span>
            <Activity className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-rose-600 dark:text-rose-400">
            +{formatBr(totalFuturePaAdder)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Rem. Base Plan: <strong className="text-slate-700 dark:text-slate-200 font-mono">{formatBr(remainingBalance)}</strong> ({remainingPct.toFixed(1)}% of BOQ).
          </div>
        </div>

        {/* Metric 4: Current & Upcoming Escalated Outlay */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-black tracking-wide">
              Current &amp; Upcoming Outlay
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-indigo-700 dark:text-indigo-300">
            {formatBr(totalProjectedEscalated)}
          </div>
          <div className="text-[10px] text-indigo-600/80 dark:text-indigo-300/80 leading-tight flex items-center justify-between">
            <span>Full Lifecycle Total:</span>
            <strong className="font-mono text-indigo-900 dark:text-white font-bold">
              {formatBr(grandTotalEscalated)}
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
                    {scopeView === 'all' ? 'All EFYs (Actuals + Plan Forecast)' : 'Current & Upcoming EFYs'}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Visual breakdown of Base Work Value (Actuals for prior EFYs / Plan for current &amp; upcoming EFYs), Price Adjustment, and Total Cost incl. PA.
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
                    name="Base Work Value (Actual / Plan)"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={chartUnit === 'millions' ? 'paAdderM' : 'paAdder'}
                    name="Price Adjustment (Certified / Forecasted)"
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
                    name="Total Annual Outlay (incl. PA)"
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
                    name="Base Work Value (Actual / Plan)"
                    fill="#6366f1"
                    stroke="#4f46e5"
                    fillOpacity={0.3}
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey={chartUnit === 'millions' ? 'paAdderM' : 'paAdder'}
                    name="Price Adjustment (Certified / Forecasted)"
                    fill="#f43f5e"
                    stroke="#e11d48"
                    fillOpacity={0.3}
                    stackId="1"
                  />
                  <Line
                    type="monotone"
                    dataKey={chartUnit === 'millions' ? 'escalatedCostM' : 'escalatedCost'}
                    name="Total Annual Outlay (incl. PA)"
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
                Division Work Quantities &amp; Financial Status (Series 1000 - 11000)
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
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            isFullyDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                          }`}
                        >
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
              Interactive Sensitivity &amp; Scenario Parameters
            </span>
          </div>

          {/* Scenario Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mr-1">Presets:</span>
            <button
              onClick={() => {
                setHasCustomPn(false);
                setHasCustomIncrement(false);
                setBasePaFactor(Number(financialPa.empiricalPn.toFixed(4)));
                setAnnualInflation(Number(financialPa.empiricalAnnualIncrement.toFixed(4)));
              }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
              title="Use exact empirical P0 & PA increment rate derived from the Financial Data page"
            >
              Financial Data Empirical ({(financialPa.empiricalAnnualIncrement * 100).toFixed(2)}%)
            </button>
            <button
              onClick={() => {
                setHasCustomIncrement(true);
                setAnnualInflation(0.03);
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              Low (3.0%)
            </button>
            <button
              onClick={() => {
                setHasCustomIncrement(true);
                setAnnualInflation(0.05);
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              Moderate (5.0%)
            </button>
            <button
              onClick={() => {
                setHasCustomIncrement(true);
                setAnnualInflation(0.08);
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
            >
              High (8.0%)
            </button>
            <button
              onClick={() => {
                setHasCustomIncrement(true);
                setAnnualInflation(0.12);
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
            >
              Stress (12.0%)
            </button>
          </div>
        </div>

        {/* Financial Data PA Empirical Increment Provenance Pill Strip */}
        <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 text-[10.5px] text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              <strong>Financial Data PA Source:</strong> {financialPa.methodologySummary}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
            Previous EFYs: Actuals + PA | Current/Upcoming: Plan + Forecasted PA
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
          {/* Parameter 1: Base Pn Factor */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-bold block">Base Factor (P0)</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">From Financial Data PA</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1.0"
                max="2.0"
                step="0.005"
                value={basePaFactor}
                onChange={(e) => {
                  setHasCustomPn(true);
                  setBasePaFactor(Math.max(1.0, parseFloat(e.target.value) || 1.0));
                }}
                className="w-16 bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 text-center font-mono font-bold text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-indigo-600 outline-none"
              />
              <button
                onClick={() => {
                  setHasCustomPn(false);
                  setBasePaFactor(Number(financialPa.empiricalPn.toFixed(4)));
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition"
                title="Reset to empirical P0 factor from Financial Data page"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Parameter 2: Forecasted PA Increment Rate (from Financial Data PA Gain) */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-bold block">Annual PA Increment (r)</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Gain from Financial Data</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="0.35"
                step="0.0025"
                value={annualInflation}
                onChange={(e) => {
                  setHasCustomIncrement(true);
                  setAnnualInflation(Math.max(0, parseFloat(e.target.value) || 0));
                }}
                className="w-16 bg-slate-50 dark:bg-slate-900 text-amber-600 dark:text-amber-400 text-center font-mono font-bold text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-indigo-600 outline-none"
              />
              <button
                onClick={() => {
                  setHasCustomIncrement(false);
                  setAnnualInflation(Number(financialPa.empiricalAnnualIncrement.toFixed(4)));
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition"
                title="Reset to empirical PA increment gained on Financial Data page"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Parameter 3: Scope View Horizon */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-bold block">Forecast Horizon</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Scope period display</span>
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setScopeView('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  scopeView === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All EFYs
              </button>
              <button
                onClick={() => setScopeView('future')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  scopeView === 'future' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Current+Future
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
                  formula="EFY N = Jul (N+7) to Jun (N+8)"
                  explanation={`Ethiopian Fiscal Year spans Hamle 1 to Sene 30 (July through June G.C.). Previous EFYs (< EFY ${currentEfy}) reflect Monthly Cumulative actual accomplishments; Current and Upcoming EFYs reflect Monthly Cumulative plans and forecasted Price Adjustment.`}
                  methodologyNote={`Current Operating EFY is EFY ${currentEfy} (Jul ${getEfyStartGregYear(currentEfy)}–Jun ${getEfyEndGregYear(currentEfy)}).`}
                  align="left"
                />
              </th>

              {/* Header 2: Status / Lifecycle */}
              <th className="p-3 text-center">
                <HeaderTooltip
                  title="Stage & Basis"
                  tooltipTitle="Fiscal Year Data Basis"
                  explanation="Previous EFYs use Monthly Cumulative Actual Accomplishment + Financial Data Price Adjustment. Current and Upcoming EFYs use the Monthly Cumulative Plan + Forecasted Price Adjustment."
                  align="center"
                />
              </th>

              {/* Header 3: Monthly Cumulative Progress & Share */}
              <th className="p-3 text-center">
                <HeaderTooltip
                  title="Monthly Cum. Δ & Share (%)"
                  tooltipTitle="Actuals (Prior EFY) / Plan (Current & Future)"
                  formula="ΔActual = Act(End) - Act(Start) | ΔPlan = Plan(End) - Plan(Start)"
                  explanation="Previous EFYs extract cumulative Actual accomplishment gained in that EFY from the Monthly Cumulative page. Current & Upcoming EFYs extract Planned increments from the Monthly Cumulative page."
                  align="center"
                />
              </th>

              {/* Header 4: Base Work Value */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Base Work Value (ETB)"
                  tooltipTitle="Actual Accomplished / Planned Valuation"
                  formula="Prior: Contract × ΔActual% | Future: Rem.Balance × NormPlan%"
                  explanation="Unescalated contract work value: calculated from Actual accomplishment % for prior EFYs and from Monthly Cumulative Plan share of remaining balance for current and upcoming EFYs."
                  align="right"
                />
              </th>

              {/* Header 5: Escalation Factor Pn */}
              <th className="p-3 text-center">
                <HeaderTooltip
                  title="Factor (Pn)"
                  tooltipTitle="FIDIC Sub-Clause 13.8 Price Adjustment"
                  formula="Pn = P0 × (1 + r)^t"
                  explanation="Price adjustment multiplier. For Previous EFYs, reflects actual PA ratio from Financial Data; for Current & Upcoming EFYs, compounds baseline P0 by the PA increment rate r derived from Financial Data IPCs."
                  align="center"
                />
              </th>

              {/* Header 6: Price Adjustment Adder */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Price Adjustment (ETB)"
                  tooltipTitle="Certified / Forecasted Price Adjustment"
                  formula="PA = Base Value × (Pn - 1.0)"
                  explanation="Historical certified Price Adjustment from Financial Data for prior EFYs, and forecasted Price Adjustment using the Financial Data PA increment rate for Current and Upcoming EFYs."
                  align="right"
                />
              </th>

              {/* Header 7: Total Cost incl. PA */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Total Outlay incl. PA (ETB)"
                  tooltipTitle="Total Fiscal Year Cost Commitment"
                  formula="Outlay = Base Work Value + Price Adjustment"
                  explanation="Combined fiscal year monetary cost combining base measured work (actual or planned) and Price Adjustment."
                  align="right"
                />
              </th>

              {/* Header 8: Cumulative Outlay */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Cumulative Outlay (ETB)"
                  tooltipTitle="Progressive Cash Commitment"
                  formula="Cumulative(t) = Σ Outlay(1..t)"
                  explanation="Running progressive total of annual outlays including Price Adjustment across the displayed horizon."
                  align="right"
                />
              </th>

              {/* Header 9: Remaining Balance */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Remaining Balance (ETB)"
                  tooltipTitle="Unexecuted Contract Liability"
                  formula="Balance(t) = Balance(t-1) - Base Value(t)"
                  explanation="Remaining base contract liability amortizing systematically down to Br. 0.00 upon completion."
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

              const rowClass = isPast
                ? 'bg-slate-50/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 border-l-4 border-slate-400'
                : isCurrent
                ? 'bg-amber-50/80 dark:bg-amber-950/25 border-l-4 border-amber-500 font-bold text-slate-900 dark:text-slate-100'
                : isFinish
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-l-4 border-emerald-500 font-semibold text-slate-900 dark:text-slate-100'
                : 'hover:bg-slate-50/80 dark:hover:bg-slate-750/50 border-l-4 border-indigo-400 transition text-slate-800 dark:text-slate-200';

              return (
                <tr key={`fiscal-pred-${row.isPast ? 'past' : 'fut'}-${row.efyYear}-${rIdx}`} className={rowClass}>
                  {/* 1. Operating Period */}
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isPast
                            ? 'bg-slate-400'
                            : isCurrent
                            ? 'bg-amber-500 animate-pulse'
                            : isFinish
                            ? 'bg-emerald-500'
                            : 'bg-indigo-500'
                        }`}
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white">
                          {calendarView === 'EFY' ? row.efy : row.periodLabel}
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
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold">
                          Previous EFY (Actual)
                        </span>
                        <span className="text-[8.5px] text-slate-400 font-normal">Monthly Cum. Actual</span>
                      </div>
                    ) : isCurrent ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold flex items-center justify-center gap-1 mx-auto w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          Current EFY (Plan)
                        </span>
                        <span className="text-[8.5px] text-amber-600 dark:text-amber-400 font-normal">Monthly Cum. Plan</span>
                      </div>
                    ) : isFinish ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold">
                          Upcoming / Handover
                        </span>
                        <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 font-normal">
                          {row.basisType === 'plan' ? 'Monthly Cum. Plan' : 'Schedule Rem. Share'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold">
                          Upcoming EFY (Plan)
                        </span>
                        <span className="text-[8.5px] text-indigo-500 dark:text-indigo-400 font-normal">
                          {row.basisType === 'plan' ? 'Monthly Cum. Plan' : 'Schedule Rem. Share'}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* 3. Monthly Cumulative Actual / Plan & Work Share */}
                  <td className="p-3 text-center font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <span className="text-amber-700 dark:text-amber-400 font-bold text-xs">
                          {row.sharePct.toFixed(1)}%
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded border ${
                            isPast
                              ? 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/50'
                              : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-700/50'
                          }`}
                          title={`${isPast ? 'Actual' : 'Plan'} increment: ${row.startRefLabel} (${row.startRefVal.toFixed(1)}%) -> ${row.endRefLabel} (${row.endRefVal.toFixed(1)}%)`}
                        >
                          +{row.fyProgressIncrement.toFixed(1)}% {isPast ? 'Actual' : 'Plan'}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans">
                        {row.startRefLabel} ({row.startRefVal.toFixed(1)}%) &rarr; {row.endRefLabel} ({row.endRefVal.toFixed(1)}%)
                      </span>
                      <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-1 mx-auto overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPast ? 'bg-sky-500' : isCurrent ? 'bg-amber-500' : isFinish ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, row.sharePct))}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 4. Base Work Value */}
                  <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300 font-medium">
                    {formatBr(row.baseCost)}
                  </td>

                  {/* 5. Factor (Pn) */}
                  <td className="p-3 text-center font-mono font-bold">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-750 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                        {row.pnFactor.toFixed(4)}
                      </span>
                      <span className="text-[8.5px] font-sans font-normal text-slate-400">
                        {row.paSourceTag}
                      </span>
                    </div>
                  </td>

                  {/* 6. Price Adjustment */}
                  <td className="p-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                    +{formatBr(row.paAdder)}
                  </td>

                  {/* 7. Total Cost incl. PA */}
                  <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                    {formatBr(row.escalatedCost)}
                  </td>

                  {/* 8. Cumulative Outlay */}
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
            {scopeView === 'all' && pastProjections.length > 0 && (
              <tr className="bg-slate-50 dark:bg-slate-900/60 font-bold text-[11px] border-b border-slate-200 dark:border-slate-700">
                <td className="p-2.5 uppercase text-slate-600 dark:text-slate-300" colSpan={2}>
                  Subtotal — Previous EFYs (Monthly Cum. Actuals + PA)
                </td>
                <td className="p-2.5 text-center font-mono text-sky-700 dark:text-sky-400">
                  {pastProjections.reduce((s, r) => s + r.fyProgressIncrement, 0).toFixed(1)}% Actual
                </td>
                <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-200">{formatBr(totalPrevBase)}</td>
                <td className="p-2.5 text-center font-mono text-slate-600 dark:text-slate-300">
                  {totalPrevBase > 0 ? (1 + totalPrevPa / totalPrevBase).toFixed(4) : basePaFactor.toFixed(4)}
                </td>
                <td className="p-2.5 text-right font-mono text-rose-600 dark:text-rose-400">+{formatBr(totalPrevPa)}</td>
                <td className="p-2.5 text-right font-mono text-slate-900 dark:text-white">{formatBr(totalPrevEscalated)}</td>
                <td className="p-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400">{formatBr(totalPrevEscalated)}</td>
                <td className="p-2.5 text-right font-mono text-slate-500 dark:text-slate-400">
                  {formatBr(Math.max(0, totalSeriesContract - totalPrevBase))}
                </td>
              </tr>
            )}
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <td className="p-3 uppercase" colSpan={2}>
                {scopeView === 'all' ? 'Subtotal — Current & Upcoming EFYs (Plan Forecast)' : 'Total Forecast to Project Completion'}
              </td>
              <td className="p-3 text-center font-mono text-amber-700 dark:text-amber-400">100.0%</td>
              <td className="p-3 text-right font-mono text-slate-800 dark:text-slate-200">{formatBr(totalBaseForecast)}</td>
              <td className="p-3 text-center font-mono text-indigo-700 dark:text-indigo-300">
                Avg {(futureProjections.reduce((a, b) => a + b.pnFactor, 0) / (futureProjections.length || 1)).toFixed(4)}
              </td>
              <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">+{formatBr(totalFuturePaAdder)}</td>
              <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">{formatBr(totalProjectedEscalated)}</td>
              <td className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                {formatBr(scopeView === 'all' ? grandTotalEscalated : totalProjectedEscalated)}
              </td>
              <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">Br. 0.00</td>
            </tr>
            {scopeView === 'all' && pastProjections.length > 0 && (
              <tr className="bg-indigo-50/70 dark:bg-indigo-950/30 font-black">
                <td className="p-3 uppercase text-indigo-900 dark:text-indigo-200" colSpan={2}>
                  Grand Total — Full Project Lifecycle (Previous + Planned)
                </td>
                <td className="p-3 text-center font-mono text-indigo-700 dark:text-indigo-300">Full Scope</td>
                <td className="p-3 text-right font-mono text-indigo-900 dark:text-white">{formatBr(grandTotalBase)}</td>
                <td className="p-3 text-center font-mono text-indigo-700 dark:text-indigo-300">
                  {grandTotalBase > 0 ? (1 + grandTotalPa / grandTotalBase).toFixed(4) : basePaFactor.toFixed(4)}
                </td>
                <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">+{formatBr(grandTotalPa)}</td>
                <td className="p-3 text-right font-mono text-emerald-700 dark:text-emerald-300 text-sm">{formatBr(grandTotalEscalated)}</td>
                <td className="p-3 text-right font-mono text-indigo-700 dark:text-indigo-300 text-sm">{formatBr(grandTotalEscalated)}</td>
                <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">Br. 0.00</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Statutory Compliance & FIDIC Sub-Clause 13.8 Audit Governance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Methodological Guidance */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>FIDIC Sub-Clause 13.8 &amp; Monthly Cumulative Methodology:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            Previous EFYs (&lt; EFY {currentEfy}) are computed directly from cumulative <strong>Actual accomplishment</strong> recorded on the Monthly Cumulative page plus historical Price Adjustment from Financial Data. Current (EFY {currentEfy}) and Upcoming EFYs are allocated from the Monthly Cumulative <strong>Plan</strong> (&Delta;Plan = Plan_end &minus; Plan_start) across the remaining BOQ balance ({formatBr(remainingBalance)}), with Price Adjustment forecasted via Pn = P0 &times; (1 + r)^t using P0 = {basePaFactor.toFixed(4)} and Financial Data increment r = {(annualInflation * 100).toFixed(2)}% p.a. (velocity baseline ~{juneJulIncrement.toFixed(2)}%/mo).
          </p>
        </div>

        {/* Statutory PPA 20% Variance Guardrail */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
          <div className="font-bold flex items-center justify-between text-slate-900 dark:text-white">
            <div className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Ethiopian PPA 20% Statutory Cap Check:</span>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isPpaCompliant
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
              }`}
            >
              {isPpaCompliant ? 'Compliant' : 'Warning'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            Total lifetime Price Adjustment (Previous EFYs {formatBr(totalPrevPa)} + Current &amp; Upcoming Forecast {formatBr(totalFuturePaAdder)}) equals <strong className="text-slate-900 dark:text-white font-mono">{formatBr(totalLifetimePa)}</strong>, representing <strong className={isPpaCompliant ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>{ppaThresholdRatio.toFixed(2)}%</strong> of Accepted Contract Amount ({formatBr(BAC)}).
          </p>
        </div>
      </div>
    </div>
  );
}
