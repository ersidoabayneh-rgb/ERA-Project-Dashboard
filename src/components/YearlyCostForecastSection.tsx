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
import { parseMonthKey, isProjectActiveLifecycle, resolveCurrentMonthKey, isSameMonth } from '../lib/monthlySync';
import { parseLocalDate, getRevisedCompletionDate } from '../lib/dateUtils';
import { calculateIpcMaturation } from '../lib/ipcCalculations';

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
  paRateGainPct: number;
  empiricalAnnualIncrement: number;
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
        timeMs
      };
    })
    .filter(entry => entry.gross > 0 || entry.pa > 0)
    .sort((a, b) => a.timeMs - b.timeMs);

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
    const isPastAccomplished = Boolean(data.isAccomplishedOnly);
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 p-3 rounded-xl border border-slate-700 dark:border-indigo-500/60 shadow-2xl text-xs space-y-1.5 text-white backdrop-blur-md min-w-[270px]">
        <div className="flex items-center justify-between border-b border-slate-800 dark:border-indigo-900 pb-1.5">
          <span className="font-bold text-amber-300">{data.fullPeriod || label}</span>
          {isPastAccomplished ? (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-950 border border-teal-700/60 text-teal-300">
              Accomplished EFY
            </span>
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 dark:bg-indigo-950 border border-slate-700 dark:border-indigo-700/60 text-indigo-300">
              Pn: {Number(data.pnFactor || 1).toFixed(4)}
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 font-semibold">
          {isPastAccomplished
            ? 'Historical Financial Data · Accomplishment & Net Payments'
            : 'Remaining Works Forecast · Plan & EFY Basis'}
        </div>
        <div className="space-y-1 pt-1 font-mono text-[11px]">
          {data.hasAccomplishedData && (
            <>
              <div className="flex justify-between items-center text-teal-300">
                <span>Accomplished Budget Used:</span>
                <span className="font-bold">{formatBr(data.accomplishedBudgetUsed || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sky-300">
                <span>Contractor Net Certified:</span>
                <span className="font-bold">{formatBr(data.contractorNetCertified || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-cyan-200">
                <span>Contractor Net Paid:</span>
                <span className="font-bold">{formatBr(data.contractorNetPaid || 0)}</span>
              </div>
              {data.accomplishedPct !== undefined && data.accomplishedPct > 0 && (
                <div className="flex justify-between items-center text-slate-300 text-[10px]">
                  <span>EFY Accomplishment:</span>
                  <span>{Number(data.accomplishedPct).toFixed(1)}%</span>
                </div>
              )}
            </>
          )}

          {!isPastAccomplished && (
            <>
              <div className={`flex justify-between items-center text-slate-300 ${data.hasAccomplishedData ? 'border-t border-slate-800 pt-1' : ''}`}>
                <span>Remaining Base Planned:</span>
                <span className="font-bold text-white">{formatBr(data.baseCost || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-300">
                <span>Forecasted PA Adder:</span>
                <span className="font-bold">+{formatBr(data.paAdder || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-300 font-bold border-t border-slate-800 pt-1">
                <span>Estimated Outlay incl. PA:</span>
                <span>{formatBr(data.escalatedCost || 0)}</span>
              </div>
              {data.budgetVarianceAbs !== undefined && (
                <div className="flex justify-between items-center text-amber-300 text-[10px]">
                  <span>Budget Variance ({data.budgetVarianceType === 'gap' ? 'Gap' : data.budgetVarianceType === 'surplus' ? 'Surplus' : 'On Plan'}):</span>
                  <span>{formatBr(data.budgetVarianceAbs)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-purple-300">
                <span>Cumulative Remaining:</span>
                <span>{formatBr(data.cumulativeEscalated || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-amber-300 text-[10px] pt-1 border-t border-slate-800">
                <span>Remaining Plan (EFY):</span>
                <span>{Number(data.remainingPlanPct || 0).toFixed(1)}%</span>
              </div>
            </>
          )}

          {isPastAccomplished && (
            <div className="flex justify-between items-center text-purple-300 border-t border-slate-800 pt-1">
              <span>Cumulative Budget Used:</span>
              <span className="font-bold">{formatBr(data.cumulativeTrajectory || 0)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// ==========================================
// 4. Main Yearly Cost Forecast Section (Remaining Works Only)
// ==========================================
interface YearlyCostForecastSectionProps {
  project: Project;
  BAC: number;
  EV: number;
  formatBr: (v: number) => string;
}

export interface ForecastYearRow {
  efyYear: number;
  year: string;
  efy: string;
  periodLabel: string;
  efyLabel: string;
  isCurrent: boolean;
  isFinish: boolean;
  basisType: 'plan' | 'efy_pace';
  remainingPlanPct: number;
  weightSharePct: number;
  activeMonthsInEfy: number;
  plannedBaseCost: number;
  baseCost: number;
  pnFactor: number;
  paAdder: number;
  paSourceTag: string;
  escalatedCost: number;
  budgetVarianceAbs: number;
  budgetVarianceSigned: number;
  budgetVarianceType: 'gap' | 'surplus' | 'balanced';
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
  const [showDivisionBreakdown, setShowDivisionBreakdown] = useState<boolean>(false);
  const [showChart, setShowChart] = useState<boolean>(true);
  const [showAccomplishedEfys, setShowAccomplishedEfys] = useState<boolean>(false);
  const [chartUnit, setChartUnit] = useState<'millions' | 'full'>('millions');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');
  const [copied, setCopied] = useState<boolean>(false);

  // 2. Parse Monthly Cumulative Entries (`project.monthly`) sorted chronologically
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

  // 3. Resolve Current Month & Actual on Monthly Cumulative page -> Remaining % = 100% - Actual(current month)
  const currentMonthResolution = useMemo(() => {
    const currentMonthKey = resolveCurrentMonthKey(project);
    const parsedCurrent = parseMonthKey(currentMonthKey);
    const now = new Date();
    const currentMonthSerial = parsedCurrent
      ? parsedCurrent.year * 12 + parsedCurrent.monthIndex
      : now.getFullYear() * 12 + now.getMonth();

    const exactRow = parsedMonthly.find(
      pt => (pt.serial === currentMonthSerial || isSameMonth(pt.raw, currentMonthKey)) && pt.actual !== null
    );
    const priorWithActual = parsedMonthly.filter(pt => pt.serial < currentMonthSerial && pt.actual !== null);
    const latestPrior = priorWithActual.length > 0 ? priorWithActual[priorWithActual.length - 1] : null;

    let actualAtCurrentMonth = 0;
    let actualRefMonthLabel = parsedCurrent?.key || currentMonthKey;
    let hasExactCurrentMonthActual = false;

    if (exactRow && exactRow.actual !== null) {
      // Preserve non-decreasing cumulative progress against previous month's actual cumulative
      actualAtCurrentMonth = latestPrior && latestPrior.actual !== null
        ? Math.max(exactRow.actual, latestPrior.actual)
        : exactRow.actual;
      actualRefMonthLabel = exactRow.key;
      hasExactCurrentMonthActual = true;
    } else if (latestPrior && latestPrior.actual !== null) {
      // Current month has no actual yet -> take value from previous month's actual cumulative
      actualAtCurrentMonth = latestPrior.actual;
      actualRefMonthLabel = latestPrior.key;
    } else {
      const anyWithActual = parsedMonthly.filter(pt => pt.actual !== null);
      if (anyWithActual.length > 0) {
        const latestAny = anyWithActual[anyWithActual.length - 1];
        actualAtCurrentMonth = latestAny.actual!;
        actualRefMonthLabel = latestAny.key;
      } else {
        actualAtCurrentMonth = Number(project.physicalProgress) || 0;
      }
    }

    const clampedActual = Math.max(0, Math.min(100, actualAtCurrentMonth));
    const remainingPct = Math.max(0, Math.min(100, 100 - clampedActual));

    // Plan value at reporting month (for Plan vs Actual EFY budget adjustment)
    const planOnOrBefore = parsedMonthly.filter(pt => pt.serial <= currentMonthSerial);
    const planAtCurrentMonth = planOnOrBefore.length > 0
      ? Math.max(0, Math.min(100, planOnOrBefore[planOnOrBefore.length - 1].plan))
      : 0;
    // Positive => Plan > Actual (add difference to EFY budget); Negative => Actual > Plan (subtract difference from EFY budget)
    const monthPlanActualDiff = planAtCurrentMonth - clampedActual;

    return {
      currentMonthKey: parsedCurrent?.key || currentMonthKey,
      currentMonthSerial,
      actualAtCurrentMonth: clampedActual,
      planAtCurrentMonth,
      monthPlanActualDiff,
      remainingPct,
      actualRefMonthLabel,
      hasExactCurrentMonthActual
    };
  }, [project, parsedMonthly]);

  const {
    currentMonthSerial,
    actualAtCurrentMonth,
    planAtCurrentMonth,
    monthPlanActualDiff,
    remainingPct,
    actualRefMonthLabel,
    hasExactCurrentMonthActual
  } = currentMonthResolution;

  // Contract Base & Remaining Works Value derived directly from Remaining % (100% - Actual at current month)
  const seriesList = project.series || [];
  const totalSeriesContract = seriesList.reduce((sum, s) => sum + (s.contractAmt || 0), 0) || BAC;
  const totalSeriesExec = seriesList.reduce((sum, s) => sum + (s.execAmt || 0), 0) || EV;
  const boqExecutedPct = totalSeriesContract > 0 ? (totalSeriesExec / totalSeriesContract) * 100 : 0;
  const boqRemainingBalance = Math.max(0, totalSeriesContract - totalSeriesExec);

  const contractBase = totalSeriesContract || BAC;
  const executedAmtMonthly = contractBase * (actualAtCurrentMonth / 100);
  const remainingBalance = Math.max(0, contractBase * (remainingPct / 100));

  // Average Monthly Plan pace (% per month) derived from Monthly Cumulative Plan active curve
  const avgMonthlyPlanPace = useMemo(() => {
    const juneEntry = (project.monthly || []).find(m => m.month && (m.month.toLowerCase().includes('jun') || m.month.includes('-06')));
    const julyEntry = (project.monthly || []).find(m => m.month && (m.month.toLowerCase().includes('jul') || m.month.includes('-07')));
    const jPlan = Number(juneEntry?.revisedPlan ?? juneEntry?.originalPlan ?? 0);
    const jlPlan = Number(julyEntry?.revisedPlan ?? julyEntry?.originalPlan ?? 0);

    if (parsedMonthly.length >= 2) {
      const firstPt = parsedMonthly[0];
      const maxPlan = Math.max(...parsedMonthly.map(p => p.plan));
      const peakPt = parsedMonthly.find(p => p.plan >= maxPlan - 0.001) || parsedMonthly[parsedMonthly.length - 1];
      const span = Math.max(1, peakPt.serial - firstPt.serial);
      const avg = (peakPt.plan - firstPt.plan) / span;
      if (avg > 0.1) return avg;
    }
    if (jlPlan > jPlan) return jlPlan - jPlan;
    return 1.5;
  }, [project.monthly, parsedMonthly]);

  // 4. Determine Current EFY & Forecast Remaining Works across Current + Upcoming EFYs based on Monthly Cumulative Plan & EFY
  const currentEfy = getCurrentEfy(project);

  const futureProjections: ForecastYearRow[] = useMemo(() => {
    const getPlanAtSerial = (targetSerial: number): { value: number; matched: string } => {
      if (parsedMonthly.length === 0) return { value: 0, matched: 'N/A' };
      const onOrBefore = parsedMonthly.filter(pt => pt.serial <= targetSerial);
      if (onOrBefore.length > 0) {
        const latest = onOrBefore[onOrBefore.length - 1];
        return { value: latest.plan, matched: latest.key };
      }
      return { value: 0, matched: `< ${parsedMonthly[0].key}` };
    };

    const getEfyStartSerial = (efy: number) => getEfyStartGregYear(efy) * 12 + 6; // July
    const getEfyEndSerial = (efy: number) => getEfyEndGregYear(efy) * 12 + 5; // June

    // Remaining active months inside an EFY relative to current reporting month
    const getRemainingMonthsInEfy = (efy: number): number => {
      const firstRemainingSerial = hasExactCurrentMonthActual ? currentMonthSerial + 1 : currentMonthSerial;
      const startSerial = Math.max(getEfyStartSerial(efy), firstRemainingSerial);
      const endSerial = getEfyEndSerial(efy);
      return Math.max(0, endSerial - startSerial + 1);
    };

    // Determine candidate EFYs (>= currentEfy) from Monthly Cumulative Plan & Contract Revision Date
    const efySet = new Set<number>([currentEfy]);
    parsedMonthly.forEach(pt => {
      if (pt.efy >= currentEfy) efySet.add(pt.efy);
    });

    const revCompDate = getRevisedCompletionDate(
      project.startDate,
      project.origDays,
      project.eotDays,
      project.interimEotDays
    );
    const revCompEfy = revCompDate
      ? getEfyFromGregorian(revCompDate.getFullYear(), revCompDate.getMonth())
      : currentEfy;

    if (revCompEfy > currentEfy && remainingPct > 0) {
      const cappedRevEfy = Math.min(revCompEfy, currentEfy + 6);
      for (let e = currentEfy; e <= cappedRevEfy; e++) {
        efySet.add(e);
      }
    }

    const candidateEfys = Array.from(efySet).sort((a, b) => a - b);

    // Evaluate Monthly Cumulative Plan for each EFY >= currentEfy with explicit Plan vs Actual difference adjustment:
    // - Current EFY: remaining planned work in Current EFY (endPlan(EFY) - planAtCurrentMonth)
    //   + (Plan - Actual) if Plan > Actual (additional EFY budget)
    //   - (Actual - Plan) if Actual > Plan (subtracted from EFY budget; excess carries to subsequent EFYs)
    // - Upcoming EFYs: Monthly Cumulative Plan EFY increment minus any excess subtraction carried forward
    let carrySubtraction = 0;
    const waterfallRows = candidateEfys.map(efy => {
      const prevEfyEndSerial = getEfyEndSerial(efy - 1);
      const endSerial = getEfyEndSerial(efy);

      const prevEfyEndPlan = getPlanAtSerial(prevEfyEndSerial).value;
      const efyEndPlan = getPlanAtSerial(endSerial).value;

      if (efy === currentEfy) {
        const remPlannedAfterCurrentMonth = Math.max(0, efyEndPlan - planAtCurrentMonth);
        const adjustedCurrentBudget = remPlannedAfterCurrentMonth + monthPlanActualDiff;
        if (adjustedCurrentBudget >= 0) {
          return {
            efyYear: efy,
            unadjustedPlanPct: remPlannedAfterCurrentMonth,
            efyPlanBudget: adjustedCurrentBudget,
            activeMonths: getRemainingMonthsInEfy(efy)
          };
        }
        // Actual exceeded Current EFY's end plan -> Current EFY is 0%, carry excess subtraction to Upcoming EFYs
        carrySubtraction = Math.abs(adjustedCurrentBudget);
        return {
          efyYear: efy,
          unadjustedPlanPct: remPlannedAfterCurrentMonth,
          efyPlanBudget: 0,
          activeMonths: getRemainingMonthsInEfy(efy)
        };
      }

      const upcomingEfyPlanInc = Math.max(0, efyEndPlan - prevEfyEndPlan);
      const netUpcomingBudget = Math.max(0, upcomingEfyPlanInc - carrySubtraction);
      carrySubtraction = Math.max(0, carrySubtraction - upcomingEfyPlanInc);

      return {
        efyYear: efy,
        unadjustedPlanPct: upcomingEfyPlanInc,
        efyPlanBudget: netUpcomingBudget,
        activeMonths: getRemainingMonthsInEfy(efy)
      };
    });

    const totalWaterfallBudget = waterfallRows.reduce((sum, item) => sum + item.efyPlanBudget, 0);

    interface EfyAllocationRow {
      efyYear: number;
      basisType: 'plan' | 'efy_pace';
      unadjustedPlanPct: number;
      remainingPlanPct: number;
      weightSharePct: number;
      activeMonths: number;
    }

    let allocatedEfys: EfyAllocationRow[] = [];

    if (remainingPct <= 0) {
      allocatedEfys = [
        {
          efyYear: currentEfy,
          basisType: 'plan',
          unadjustedPlanPct: 0,
          remainingPlanPct: 0,
          weightSharePct: 0,
          activeMonths: getRemainingMonthsInEfy(currentEfy)
        }
      ];
    } else if (totalWaterfallBudget > 0 && !(revCompEfy > currentEfy && getPlanAtSerial(getEfyEndSerial(currentEfy - 1)).value >= 99.99)) {
      // Standard Plan + Plan-vs-Actual Variance Allocation across Current & Upcoming EFYs
      const activePlanRows = waterfallRows.filter(item => item.efyYear === currentEfy || item.efyPlanBudget > 0.0001);
      const effectiveSum = activePlanRows.reduce((sum, item) => sum + item.efyPlanBudget, 0) || 1;

      allocatedEfys = activePlanRows.map(item => {
        const weightSharePct = (item.efyPlanBudget / effectiveSum) * 100;
        const efyRemainingPlanPct = remainingPct * (weightSharePct / 100);
        return {
          efyYear: item.efyYear,
          basisType: 'plan',
          unadjustedPlanPct: item.unadjustedPlanPct,
          remainingPlanPct: efyRemainingPlanPct,
          weightSharePct,
          activeMonths: item.activeMonths
        };
      });
    } else if (revCompEfy > currentEfy) {
      // Approved EOT extends completion past Current EFY after monthly plan hit 100% -> distribute across active EFY months
      const horizonRows = candidateEfys.map(efy => {
        const wf = waterfallRows.find(w => w.efyYear === efy);
        return {
          efyYear: efy,
          unadjustedPlanPct: wf ? wf.unadjustedPlanPct : 0,
          activeMonths: getRemainingMonthsInEfy(efy)
        };
      });
      const totalActiveMonths = horizonRows.reduce((s, r) => s + r.activeMonths, 0) || 1;
      allocatedEfys = horizonRows.map(item => {
        const weightSharePct = (item.activeMonths / totalActiveMonths) * 100;
        return {
          efyYear: item.efyYear,
          basisType: 'efy_pace',
          unadjustedPlanPct: item.unadjustedPlanPct,
          remainingPlanPct: remainingPct * (weightSharePct / 100),
          weightSharePct,
          activeMonths: item.activeMonths
        };
      });
    } else {
      // Incomplete S-curve fallback: walk EFYs from currentEfy using Monthly Cumulative Plan pace (%/mo)
      const pace = Math.max(0.5, avgMonthlyPlanPace);
      let remLeft = remainingPct;
      const paceRows: { efyYear: number; alloc: number; activeMonths: number; unadjustedPlanPct: number }[] = [];

      for (let step = 0; step < 6 && remLeft > 0.0001; step++) {
        const efy = currentEfy + step;
        const activeMonths = getRemainingMonthsInEfy(efy);
        const wf = waterfallRows.find(w => w.efyYear === efy);
        if (activeMonths <= 0 && step === 0) {
          paceRows.push({ efyYear: efy, alloc: 0, activeMonths: 0, unadjustedPlanPct: wf?.unadjustedPlanPct || 0 });
          continue;
        }
        const effectiveMonths = Math.max(1, activeMonths);
        const capacity = effectiveMonths * pace;
        const alloc = step === 5 ? remLeft : Math.min(remLeft, capacity);
        paceRows.push({ efyYear: efy, alloc, activeMonths, unadjustedPlanPct: wf?.unadjustedPlanPct || 0 });
        remLeft = Math.max(0, remLeft - alloc);
      }

      if (paceRows.length === 0) {
        paceRows.push({ efyYear: currentEfy, alloc: remainingPct, activeMonths: getRemainingMonthsInEfy(currentEfy), unadjustedPlanPct: 0 });
      }

      allocatedEfys = paceRows.map(item => ({
        efyYear: item.efyYear,
        basisType: 'efy_pace',
        unadjustedPlanPct: item.unadjustedPlanPct,
        remainingPlanPct: item.alloc,
        weightSharePct: remainingPct > 0 ? (item.alloc / remainingPct) * 100 : 0,
        activeMonths: item.activeMonths
      }));
    }

    let runningRemainingEscalated = 0;
    let remBalanceTrack = remainingBalance;

    return allocatedEfys.map((planData, idx) => {
      const startGreg = getEfyStartGregYear(planData.efyYear);
      const endGreg = getEfyEndGregYear(planData.efyYear);
      const weightSharePct = planData.weightSharePct;
      const remainingPlanPct = planData.remainingPlanPct;
      const plannedBaseCost = contractBase * (planData.unadjustedPlanPct / 100);
      const baseCost = remainingBalance * (weightSharePct / 100);

      // Forecasted Pn using Baseline P0 & Annual PA Increment Rate derived from Financial Data page
      const pnFactor = basePaFactor * Math.pow(1 + annualInflation, idx);
      const paAdder = baseCost * Math.max(0, pnFactor - 1.0);
      const escalatedCost = baseCost + paAdder;

      // Projected Budget Variance: absolute difference between planned baseline cost and actual projected outlay
      const budgetVarianceSigned = escalatedCost - plannedBaseCost;
      const budgetVarianceAbs = Math.abs(budgetVarianceSigned);
      const budgetVarianceType: 'gap' | 'surplus' | 'balanced' =
        Math.abs(budgetVarianceSigned) <= 1
          ? 'balanced'
          : budgetVarianceSigned > 0
          ? 'gap'
          : 'surplus';

      runningRemainingEscalated += escalatedCost;
      remBalanceTrack = Math.max(0, remBalanceTrack - baseCost);

      return {
        efyYear: planData.efyYear,
        year: String(startGreg),
        efy: `EFY ${planData.efyYear}`,
        periodLabel: `${startGreg}/${endGreg} G.C.`,
        efyLabel: `EFY ${planData.efyYear} (${startGreg}/${endGreg})`,
        isCurrent: planData.efyYear === currentEfy,
        isFinish: idx === allocatedEfys.length - 1,
        basisType: planData.basisType,
        remainingPlanPct,
        weightSharePct,
        activeMonthsInEfy: planData.activeMonths,
        plannedBaseCost,
        baseCost,
        pnFactor,
        paAdder,
        paSourceTag: idx === 0 ? 'Current Forecast (P0)' : `Forecast (P0 × (1+r)^${idx})`,
        escalatedCost,
        budgetVarianceAbs,
        budgetVarianceSigned,
        budgetVarianceType,
        cumulativeEscalated: runningRemainingEscalated,
        balanceRemaining: idx === allocatedEfys.length - 1 ? 0 : remBalanceTrack
      };
    });
  }, [parsedMonthly, currentMonthSerial, hasExactCurrentMonthActual, actualAtCurrentMonth, planAtCurrentMonth, monthPlanActualDiff, contractBase, project.startDate, project.origDays, project.eotDays, project.interimEotDays, currentEfy, remainingBalance, remainingPct, avgMonthlyPlanPace, basePaFactor, annualInflation]);

  // 5. Accomplished EFYs History (from Financial Data IPCs / Net Payments & Accomplishment)
  const accomplishedEfyData = useMemo(() => {
    const ipcTracker = project.ipcTracker || [];
    const exchangeRate = project.usdExchangeRate !== undefined ? project.usdExchangeRate : 57.50;
    const annualInterestRate = project.annualInterestRate !== undefined ? project.annualInterestRate : 16.50;
    const isUsdEnabled = project.enableUsdPayments !== undefined
      ? Boolean(project.enableUsdPayments)
      : Boolean(
          project.supervisionConsultant?.enableUsdPayments ||
          ipcTracker.some(i => (i.certifiedUsd || 0) > 0 || (i.grossBillUsd || 0) > 0 || (i.priceAdjustmentUsd || 0) > 0)
        );

    const ipcByEfy: Record<number, { grossWithPa: number; pa: number; netCertified: number; netPaid: number }> = {};

    ipcTracker.forEach(ipc => {
      const parsedPeriod = parseMonthKey(ipc.period);
      const fallbackDate = parseLocalDate(ipc.certificationDate || ipc.paymentDate || ipc.submissionDate);
      let efyYear: number | null = null;
      if (parsedPeriod) {
        efyYear = getEfyFromGregorian(parsedPeriod.year, parsedPeriod.monthIndex);
      } else if (fallbackDate) {
        efyYear = getEfyFromGregorian(fallbackDate.getFullYear(), fallbackDate.getMonth());
      }
      if (efyYear === null) return;

      const maturation = calculateIpcMaturation(ipc, annualInterestRate, exchangeRate, new Date(), isUsdEnabled);
      const grossEqv = (ipc.grossBillEtb || 0) + (isUsdEnabled ? (ipc.grossBillUsd || 0) * exchangeRate : 0);
      const paEqv = (ipc.priceAdjustmentEtb || 0) + (isUsdEnabled ? (ipc.priceAdjustmentUsd || 0) * exchangeRate : 0);
      const netCertEqv = (ipc.certifiedEtb || 0) + (isUsdEnabled ? (ipc.certifiedUsd || 0) * exchangeRate : 0);
      const netPaidEqv = maturation.paidCertifiedEtb + (isUsdEnabled ? maturation.paidCertifiedUsd * exchangeRate : 0);

      if (!ipcByEfy[efyYear]) {
        ipcByEfy[efyYear] = { grossWithPa: 0, pa: 0, netCertified: 0, netPaid: 0 };
      }
      ipcByEfy[efyYear].grossWithPa += grossEqv + paEqv;
      ipcByEfy[efyYear].pa += paEqv;
      ipcByEfy[efyYear].netCertified += netCertEqv;
      ipcByEfy[efyYear].netPaid += netPaidEqv;
    });

    const getEfyEndSerial = (efy: number) => getEfyEndGregYear(efy) * 12 + 5;
    const getActualOnOrBefore = (targetSerial: number): number => {
      const limitSerial = Math.min(targetSerial, currentMonthSerial);
      const pts = parsedMonthly.filter(pt => pt.serial <= limitSerial && pt.actual !== null);
      return pts.length > 0 ? Math.max(0, Math.min(100, pts[pts.length - 1].actual!)) : 0;
    };

    const efyCandidates = new Set<number>();
    const parsedStart = parseLocalDate(project.startDate);
    if (parsedStart) {
      const startEfy = getEfyFromGregorian(parsedStart.getFullYear(), parsedStart.getMonth());
      if (startEfy < currentEfy) efyCandidates.add(startEfy);
    }
    parsedMonthly.forEach(pt => {
      if (pt.efy < currentEfy && pt.actual !== null) efyCandidates.add(pt.efy);
    });
    Object.keys(ipcByEfy).forEach(k => {
      const yr = Number(k);
      if (yr <= currentEfy) efyCandidates.add(yr);
    });

    if (efyCandidates.size === 0) {
      return {
        pastRows: [] as Array<{
          efyYear: number;
          efy: string;
          periodLabel: string;
          accomplishedPct: number;
          accomplishedBudgetUsed: number;
          contractorNetCertified: number;
          contractorNetPaid: number;
          efyPaCertified: number;
        }>,
        currentEfyExecuted: {
          accomplishedPct: 0,
          accomplishedBudgetUsed: 0,
          contractorNetCertified: ipcByEfy[currentEfy]?.netCertified || 0,
          contractorNetPaid: ipcByEfy[currentEfy]?.netPaid || 0
        },
        totals: {
          accomplishedBudgetUsed: 0,
          contractorNetCertified: 0,
          contractorNetPaid: 0
        }
      };
    }

    const sortedAll = Array.from(efyCandidates).sort((a, b) => a - b);
    const minEfy = sortedAll[0];
    const pastEfys: number[] = [];
    for (let e = minEfy; e < currentEfy; e++) {
      pastEfys.push(e);
    }

    // Also evaluate Financial Data 'Payment Milestones' unitemized certified fallback if ipcTracker is empty
    const paymentList = project.payment || [];
    const paymentTotalCertRow = paymentList.find(p => p.item.trim().toLowerCase().includes('total todate certified ipc'));
    const totalIpcNetCert = Object.values(ipcByEfy).reduce((s, x) => s + x.netCertified, 0);
    const fallbackUnitemizedNetCert = totalIpcNetCert === 0 && paymentTotalCertRow ? (paymentTotalCertRow.amount || 0) : 0;

    const rawPastRows = pastEfys.map(efy => {
      const prevAct = getActualOnOrBefore(getEfyEndSerial(efy - 1));
      const endAct = getActualOnOrBefore(getEfyEndSerial(efy));
      const accomplishedPct = Math.max(0, endAct - prevAct);
      const ipcData = ipcByEfy[efy] || { grossWithPa: 0, pa: 0, netCertified: 0, netPaid: 0 };

      // Budget used for accomplishment: prefer Financial Data IPC Gross+PA if logged for that EFY, otherwise accomplished progress scaled by empirical Financial Data Pn
      const accomplishedPhysicalInclPa = (contractBase * (accomplishedPct / 100)) * financialPa.empiricalPn;
      const accomplishedBudgetUsed = ipcData.grossWithPa > 0
        ? Math.max(ipcData.grossWithPa, accomplishedPhysicalInclPa)
        : accomplishedPhysicalInclPa;

      return {
        efyYear: efy,
        efy: `EFY ${efy}`,
        periodLabel: `${getEfyStartGregYear(efy)}/${getEfyEndGregYear(efy)} G.C.`,
        accomplishedPct,
        accomplishedBudgetUsed,
        contractorNetCertified: ipcData.netCertified,
        contractorNetPaid: ipcData.netPaid,
        efyPaCertified: ipcData.pa
      };
    });

    // If ipcTracker had zero entries, distribute Financial Data Payment Milestone net certified proportionally across accomplished EFYs
    const totalPastAccomp = rawPastRows.reduce((s, r) => s + r.accomplishedPct, 0);
    const pastRows = rawPastRows.map(r => {
      if (fallbackUnitemizedNetCert > 0 && totalPastAccomp > 0) {
        const netCertShare = fallbackUnitemizedNetCert * (r.accomplishedPct / totalPastAccomp);
        return {
          ...r,
          contractorNetCertified: netCertShare,
          contractorNetPaid: netCertShare
        };
      }
      return r;
    }).filter(r => r.accomplishedBudgetUsed > 0 || r.contractorNetCertified > 0 || r.accomplishedPct > 0);

    // Current EFY accomplished-to-date portion
    const currStartAct = getActualOnOrBefore(getEfyEndSerial(currentEfy - 1));
    const currAccompPct = Math.max(0, actualAtCurrentMonth - currStartAct);
    const currIpc = ipcByEfy[currentEfy] || { grossWithPa: 0, pa: 0, netCertified: 0, netPaid: 0 };
    const currAccompBudgetUsed = currIpc.grossWithPa > 0
      ? Math.max(currIpc.grossWithPa, (contractBase * (currAccompPct / 100)) * basePaFactor)
      : (contractBase * (currAccompPct / 100)) * basePaFactor;

    const totalAccompBudgetUsed = pastRows.reduce((s, r) => s + r.accomplishedBudgetUsed, 0) + currAccompBudgetUsed;
    const totalNetCert = pastRows.reduce((s, r) => s + r.contractorNetCertified, 0) + currIpc.netCertified;
    const totalNetPaid = pastRows.reduce((s, r) => s + r.contractorNetPaid, 0) + currIpc.netPaid;

    return {
      pastRows,
      currentEfyExecuted: {
        accomplishedPct: currAccompPct,
        accomplishedBudgetUsed: currAccompBudgetUsed,
        contractorNetCertified: currIpc.netCertified,
        contractorNetPaid: currIpc.netPaid
      },
      totals: {
        accomplishedBudgetUsed: totalAccompBudgetUsed,
        contractorNetCertified: totalNetCert,
        contractorNetPaid: totalNetPaid
      }
    };
  }, [project.ipcTracker, project.usdExchangeRate, project.annualInterestRate, project.enableUsdPayments, project.supervisionConsultant?.enableUsdPayments, project.startDate, project.payment, parsedMonthly, currentEfy, currentMonthSerial, actualAtCurrentMonth, contractBase, financialPa.empiricalPn, basePaFactor]);

  // Recharts dataset: Remaining Works only by default, or Accomplished EFYs + Remaining Works when toggled
  const chartData = useMemo(() => {
    let runningCombined = 0;

    const pastPoints = showAccomplishedEfys
      ? accomplishedEfyData.pastRows.map(row => {
          runningCombined += row.accomplishedBudgetUsed;
          return {
            periodLabel: calendarView === 'EFY' ? row.efy : row.periodLabel,
            fullPeriod: `${row.efy} (${row.periodLabel})`,
            efyYearLabel: row.efy,
            isAccomplishedOnly: true,
            hasAccomplishedData: true,
            accomplishedPct: row.accomplishedPct,
            accomplishedBudgetUsed: row.accomplishedBudgetUsed,
            accomplishedBudgetUsedM: row.accomplishedBudgetUsed / 1_000_000,
            contractorNetCertified: row.contractorNetCertified,
            contractorNetCertifiedM: row.contractorNetCertified / 1_000_000,
            contractorNetPaid: row.contractorNetPaid,
            contractorNetPaidM: row.contractorNetPaid / 1_000_000,
            efyPaCertified: row.efyPaCertified,
            baseCost: null as number | null,
            baseCostM: null as number | null,
            paAdder: null as number | null,
            paAdderM: null as number | null,
            escalatedCost: null as number | null,
            escalatedCostM: null as number | null,
            cumulativeEscalated: null as number | null,
            cumulativeEscalatedM: null as number | null,
            cumulativeTrajectory: runningCombined,
            cumulativeTrajectoryM: runningCombined / 1_000_000,
            pnFactor: financialPa.empiricalPn,
            remainingPlanPct: 0,
            budgetVarianceAbs: undefined as number | undefined,
            budgetVarianceType: undefined as 'gap' | 'surplus' | 'balanced' | undefined
          };
        })
      : [];

    const futurePoints = futureProjections.map(p => {
      const currExec = p.isCurrent && showAccomplishedEfys ? accomplishedEfyData.currentEfyExecuted : null;
      const hasCurrentAccomp = Boolean(
        currExec && (currExec.accomplishedBudgetUsed > 0 || currExec.contractorNetCertified > 0 || currExec.contractorNetPaid > 0)
      );
      runningCombined += (currExec ? currExec.accomplishedBudgetUsed : 0) + p.escalatedCost;

      return {
        periodLabel: calendarView === 'EFY' ? p.efy : p.periodLabel,
        fullPeriod: `${p.efy} (${p.periodLabel})`,
        efyYearLabel: p.efy,
        isAccomplishedOnly: false,
        hasAccomplishedData: hasCurrentAccomp,
        accomplishedPct: currExec?.accomplishedPct,
        accomplishedBudgetUsed: hasCurrentAccomp ? currExec!.accomplishedBudgetUsed : null,
        accomplishedBudgetUsedM: hasCurrentAccomp ? currExec!.accomplishedBudgetUsed / 1_000_000 : null,
        contractorNetCertified: hasCurrentAccomp ? currExec!.contractorNetCertified : null,
        contractorNetCertifiedM: hasCurrentAccomp ? currExec!.contractorNetCertified / 1_000_000 : null,
        contractorNetPaid: hasCurrentAccomp ? currExec!.contractorNetPaid : null,
        contractorNetPaidM: hasCurrentAccomp ? currExec!.contractorNetPaid / 1_000_000 : null,
        efyPaCertified: 0,
        baseCost: p.baseCost,
        baseCostM: p.baseCost / 1_000_000,
        paAdder: p.paAdder,
        paAdderM: p.paAdder / 1_000_000,
        escalatedCost: p.escalatedCost,
        escalatedCostM: p.escalatedCost / 1_000_000,
        cumulativeEscalated: p.cumulativeEscalated,
        cumulativeEscalatedM: p.cumulativeEscalated / 1_000_000,
        cumulativeTrajectory: showAccomplishedEfys ? runningCombined : p.cumulativeEscalated,
        cumulativeTrajectoryM: (showAccomplishedEfys ? runningCombined : p.cumulativeEscalated) / 1_000_000,
        pnFactor: p.pnFactor,
        remainingPlanPct: p.remainingPlanPct,
        budgetVarianceAbs: p.budgetVarianceAbs,
        budgetVarianceType: p.budgetVarianceType
      };
    });

    return [...pastPoints, ...futurePoints];
  }, [showAccomplishedEfys, accomplishedEfyData, futureProjections, calendarView, financialPa.empiricalPn]);

  // Summary aggregates (strictly Remaining Works)
  const totalRemainingPlanPct = futureProjections.reduce((sum, r) => sum + r.remainingPlanPct, 0);
  const totalPlannedBaseForecast = futureProjections.reduce((sum, r) => sum + r.plannedBaseCost, 0);
  const totalBaseForecast = futureProjections.reduce((sum, r) => sum + r.baseCost, 0);
  const totalFuturePaAdder = futureProjections.reduce((sum, r) => sum + r.paAdder, 0);
  const totalProjectedEscalated = futureProjections.reduce((sum, r) => sum + r.escalatedCost, 0);
  const avgFuturePn = futureProjections.reduce((a, b) => a + b.pnFactor, 0) / (futureProjections.length || 1);

  const netPortfolioVarianceSigned = totalProjectedEscalated - totalPlannedBaseForecast;
  const netPortfolioVarianceAbs = Math.abs(netPortfolioVarianceSigned);
  const netPortfolioVarianceType: 'gap' | 'surplus' | 'balanced' =
    Math.abs(netPortfolioVarianceSigned) <= 1
      ? 'balanced'
      : netPortfolioVarianceSigned > 0
      ? 'gap'
      : 'surplus';

  const totalLifetimePa = financialPa.totalPa + totalFuturePaAdder;
  const ppaThresholdRatio = BAC > 0 ? (totalLifetimePa / BAC) * 100 : 0;
  const isPpaCompliant = ppaThresholdRatio <= 20.0;

  const firstForecastEfy = futureProjections[0]?.efy || `EFY ${currentEfy}`;
  const lastForecastEfy = futureProjections[futureProjections.length - 1]?.efy || `EFY ${currentEfy}`;
  const firstChartEfy = chartData[0]?.efyYearLabel || firstForecastEfy;
  const lastChartEfy = chartData[chartData.length - 1]?.efyYearLabel || lastForecastEfy;

  // Copy summary report to clipboard
  const handleCopySummary = () => {
    const summaryText = `=====================================================
YEARLY ESTIMATED COST FORECAST (REMAINING WORKS ONLY)
Project: ${project.name} (ID: ${project.id || 'N/A'})
Evaluation Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
Forecast Horizon: ${firstForecastEfy} – ${lastForecastEfy} (Current & Upcoming EFYs)
Total Contract Price (Contract Base): ${formatBr(contractBase)}
Actual Progress at Current Month (${actualRefMonthLabel}): ${actualAtCurrentMonth.toFixed(1)}% (${formatBr(executedAmtMonthly)})
Remaining Works (100% − Actual): ${remainingPct.toFixed(1)}% (${formatBr(remainingBalance)})
Financial Data PA Baseline P0: ${basePaFactor.toFixed(4)} (${((basePaFactor - 1) * 100).toFixed(2)}% PA/Gross)
Financial Data Annual PA Increment (r): ${(annualInflation * 100).toFixed(2)}% p.a. (${financialPa.methodologySummary})
-----------------------------------------------------
REMAINING WORKS FORECAST BY EFY (MONTHLY CUMULATIVE PLAN & EFY BASIS):
${futureProjections.map(r => `• ${r.efy} [${r.periodLabel}] ${r.isCurrent ? '[CURRENT]' : '[UPCOMING]'} | Remaining Plan: ${r.remainingPlanPct.toFixed(1)}% | Base: ${formatBr(r.baseCost)} | Pn: ${r.pnFactor.toFixed(4)} | PA: +${formatBr(r.paAdder)} | Est. Outlay: ${formatBr(r.escalatedCost)} | Budget Variance: ${formatBr(r.budgetVarianceAbs)} (${r.budgetVarianceType === 'gap' ? 'Funding Gap' : r.budgetVarianceType === 'surplus' ? 'Surplus' : 'On Plan'}) | Cum.: ${formatBr(r.cumulativeEscalated)}`).join('\n')}
-----------------------------------------------------
TOTAL FORECAST FOR REMAINING WORKS:
Total Remaining Plan (%): ${totalRemainingPlanPct.toFixed(1)}%
Base Remaining Works: ${formatBr(totalBaseForecast)}
Forecasted Price Adjustment: +${formatBr(totalFuturePaAdder)}
Total Estimated Outlay to Completion: ${formatBr(totalProjectedEscalated)}
Net Projected Budget Variance: ${formatBr(netPortfolioVarianceAbs)} (${netPortfolioVarianceType === 'gap' ? 'Funding Gap' : netPortfolioVarianceType === 'surplus' ? 'Surplus' : 'On Plan'})
PPA 20% Statutory Cap (Certified + Forecasted PA): ${formatBr(totalLifetimePa)} (${ppaThresholdRatio.toFixed(2)}% of Contract) -> ${isPpaCompliant ? 'COMPLIANT' : 'EXCEEDS 20% CAP'}
=====================================================`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const csvRows: string[][] = [
      ['# ETHIOPIAN ROADS ADMINISTRATION - YEARLY ESTIMATED COST FORECAST (REMAINING WORKS ONLY)'],
      ['Project Name', project.name],
      ['Project ID', project.id || 'N/A'],
      ['Current Operating EFY', `EFY ${currentEfy}`],
      ['Contract Base (ETB)', formatBr(contractBase)],
      [`Monthly Cumulative Actual (${actualRefMonthLabel})`, `${actualAtCurrentMonth.toFixed(2)}% (${formatBr(executedAmtMonthly)})`],
      ['Remaining Works (100% - Actual)', `${remainingPct.toFixed(2)}% (${formatBr(remainingBalance)})`],
      ['Financial Data Baseline Factor (P0)', basePaFactor.toFixed(4)],
      ['Forecasted PA Increment Rate (r p.a.)', `${(annualInflation * 100).toFixed(2)}%`],
      ['Financial Data PA Derivation', financialPa.methodologySummary],
      ['Export Timestamp', new Date().toISOString()],
      [],
      [
        'Operating Fiscal Year (EFY)',
        'Gregorian Calendar Period',
        'Period Stage',
        'Plan / EFY Basis',
        'Remaining Plan (%)',
        'Remaining Base Cost (ETB)',
        'Escalation Factor (Pn)',
        'Forecasted PA (ETB)',
        'PA Formula Tier',
        'Estimated Outlay incl. PA (ETB)',
        'Projected Budget Variance (ETB)',
        'Budget Variance Status',
        'Cumulative Remaining Outlay (ETB)',
        'Remaining Balance Liability (ETB)'
      ]
    ];

    futureProjections.forEach(r => {
      csvRows.push([
        r.efy,
        r.periodLabel,
        r.isCurrent ? 'Current Operating EFY' : r.isFinish ? 'Completion & Handover EFY' : 'Upcoming EFY',
        r.basisType === 'plan' ? 'Monthly Cumulative Plan' : `EFY Horizon (${r.activeMonthsInEfy} mos)`,
        r.remainingPlanPct.toFixed(2),
        r.baseCost.toFixed(2),
        r.pnFactor.toFixed(4),
        r.paAdder.toFixed(2),
        r.paSourceTag,
        r.escalatedCost.toFixed(2),
        r.budgetVarianceAbs.toFixed(2),
        r.budgetVarianceType === 'gap' ? 'Funding Gap' : r.budgetVarianceType === 'surplus' ? 'Surplus' : 'On Plan',
        r.cumulativeEscalated.toFixed(2),
        r.balanceRemaining.toFixed(2)
      ]);
    });

    csvRows.push([]);
    csvRows.push([
      'TOTAL REMAINING WORKS FORECAST',
      `${firstForecastEfy} - ${lastForecastEfy}`,
      'Current + Upcoming EFYs',
      'Plan & EFY Basis',
      `${totalRemainingPlanPct.toFixed(2)}%`,
      totalBaseForecast.toFixed(2),
      avgFuturePn.toFixed(4),
      totalFuturePaAdder.toFixed(2),
      'Financial Data PA Increment',
      totalProjectedEscalated.toFixed(2),
      netPortfolioVarianceAbs.toFixed(2),
      netPortfolioVarianceType === 'gap' ? 'Net Funding Gap' : netPortfolioVarianceType === 'surplus' ? 'Net Surplus' : 'On Plan',
      totalProjectedEscalated.toFixed(2),
      '0.00'
    ]);

    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Remaining_Works_Cost_Forecast_${project.id || 'project'}_${calendarView}.csv`);
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
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                · Remaining Works Only · Plan &amp; EFY Basis
              </span>
            </div>
            <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
              Remaining % is {remainingPct.toFixed(1)}% (100% &minus; {actualAtCurrentMonth.toFixed(1)}% Actual at {actualRefMonthLabel} on Monthly Cumulative) = {formatBr(remainingBalance)}, planned across Current (EFY {currentEfy}) &amp; Upcoming EFYs from the Monthly Cumulative Plan.
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
            title="Copy remaining works forecast summary to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-2xs transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-indigo-500"
            title="Export Remaining Works Cost Forecast ledger as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Executive Financial KPI Cards (Remaining Works Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Remaining Works Base Value */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-extrabold tracking-wide">
              Remaining Works (Base Plan)
            </span>
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white">
            {formatBr(remainingBalance)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight font-mono space-y-0.5">
            <div>{remainingPct.toFixed(1)}% remaining (100% &minus; {actualAtCurrentMonth.toFixed(1)}% Actual @ {actualRefMonthLabel})</div>
            {Math.abs(monthPlanActualDiff) >= 0.05 && (
              <div className={monthPlanActualDiff > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                {monthPlanActualDiff > 0
                  ? `Plan (${planAtCurrentMonth.toFixed(1)}%) > Actual: +${monthPlanActualDiff.toFixed(1)}% added to EFY ${currentEfy}`
                  : `Actual > Plan (${planAtCurrentMonth.toFixed(1)}%): −${Math.abs(monthPlanActualDiff).toFixed(1)}% deducted from EFY`}
              </div>
            )}
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

        {/* Metric 3: Forecasted PA on Remaining Works */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-extrabold tracking-wide">
              Forecasted PA (Remaining)
            </span>
            <Activity className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-rose-600 dark:text-rose-400">
            +{formatBr(totalFuturePaAdder)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Avg Esc. Pn: <strong className="text-slate-700 dark:text-slate-200 font-mono">{avgFuturePn.toFixed(4)}</strong> across {futureProjections.length} EFYs.
          </div>
        </div>

        {/* Metric 4: Total Estimated Cost for Remaining Works */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-black tracking-wide">
              Total Remaining Cost incl. PA
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-mono font-black text-indigo-700 dark:text-indigo-300">
            {formatBr(totalProjectedEscalated)}
          </div>
          <div className="text-[10px] text-indigo-600/80 dark:text-indigo-300/80 leading-tight flex items-center justify-between">
            <span>EFY Horizon:</span>
            <strong className="font-mono text-indigo-900 dark:text-white font-bold">
              {firstForecastEfy} &ndash; {lastForecastEfy}
            </strong>
          </div>
        </div>
      </div>

      {/* Visual Line Chart for Remaining Works Multi-Year Forecast */}
      {showChart && (
        <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  Remaining Works Cost Forecast Trajectory
                  <span className="text-[9px] font-mono font-normal px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                    {firstChartEfy} &ndash; {lastChartEfy}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {showAccomplishedEfys
                    ? 'Full project EFY trajectory combining Financial Data Accomplished EFYs & Contractor Net Payments with Remaining Works Forecast.'
                    : 'Visual breakdown of Base Remaining Works (Plan & EFY), Forecasted Price Adjustment, and Total Estimated Outlay to Completion.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              {/* Toggle Accomplished EFYs from Financial Data */}
              <button
                onClick={() => setShowAccomplishedEfys(!showAccomplishedEfys)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  showAccomplishedEfys
                    ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="Include accomplished historical EFYs budget used and contractor net payments from Financial Data page"
              >
                <Layers className="w-3 h-3" />
                <span>{showAccomplishedEfys ? 'Accomplished EFYs: On' : 'Show Accomplished EFYs'}</span>
              </button>

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

          {showAccomplishedEfys && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-teal-50/70 dark:bg-teal-950/25 border border-teal-200/80 dark:border-teal-800/50 text-[11px] font-mono">
              <div className="flex items-center justify-between sm:block">
                <span className="text-[9.5px] font-sans font-bold uppercase text-teal-700 dark:text-teal-300 block">
                  Accomplished EFYs Budget Used
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatBr(accomplishedEfyData.totals.accomplishedBudgetUsed)}
                </span>
              </div>
              <div className="flex items-center justify-between sm:block">
                <span className="text-[9.5px] font-sans font-bold uppercase text-sky-700 dark:text-sky-300 block">
                  Contractor Net Certified (IPCs)
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatBr(accomplishedEfyData.totals.contractorNetCertified)}
                </span>
              </div>
              <div className="flex items-center justify-between sm:block">
                <span className="text-[9.5px] font-sans font-bold uppercase text-cyan-700 dark:text-cyan-300 block">
                  Contractor Net Paid (Disbursed)
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatBr(accomplishedEfyData.totals.contractorNetPaid)}
                </span>
              </div>
            </div>
          )}

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
                  <RechartsTooltip content={<CustomForecastTooltip formatBr={formatBr} />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  {showAccomplishedEfys && (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={chartUnit === 'millions' ? 'accomplishedBudgetUsedM' : 'accomplishedBudgetUsed'}
                      name="Accomplished Budget Used (Financial Data)"
                      stroke="#14b8a6"
                      strokeWidth={2.5}
                      connectNulls={false}
                      dot={{ r: 4, fill: '#14b8a6', strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {showAccomplishedEfys && (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={chartUnit === 'millions' ? 'contractorNetCertifiedM' : 'contractorNetCertified'}
                      name="Contractor Net Certified (IPCs)"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      connectNulls={false}
                      dot={{ r: 3.5, fill: '#0ea5e9', strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                  {showAccomplishedEfys && (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={chartUnit === 'millions' ? 'contractorNetPaidM' : 'contractorNetPaid'}
                      name="Contractor Net Paid"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      strokeDasharray="2 3"
                      connectNulls={false}
                      dot={{ r: 3, fill: '#06b6d4' }}
                    />
                  )}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={chartUnit === 'millions' ? 'baseCostM' : 'baseCost'}
                    name="Remaining Base Work (Plan)"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={chartUnit === 'millions' ? 'paAdderM' : 'paAdder'}
                    name="Forecasted Price Adjustment"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    connectNulls={false}
                    dot={{ r: 4, fill: '#f43f5e', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={chartUnit === 'millions' ? 'escalatedCostM' : 'escalatedCost'}
                    name="Annual Estimated Outlay (incl. PA)"
                    stroke="#10b981"
                    strokeWidth={3.5}
                    connectNulls={false}
                    dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={
                      showAccomplishedEfys
                        ? chartUnit === 'millions'
                          ? 'cumulativeTrajectoryM'
                          : 'cumulativeTrajectory'
                        : chartUnit === 'millions'
                        ? 'cumulativeEscalatedM'
                        : 'cumulativeEscalated'
                    }
                    name={showAccomplishedEfys ? 'Cumulative Project Trajectory (Right Axis)' : 'Cumulative Remaining (Right Axis)'}
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
                  <RechartsTooltip content={<CustomForecastTooltip formatBr={formatBr} />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  {showAccomplishedEfys && (
                    <Area
                      type="monotone"
                      dataKey={chartUnit === 'millions' ? 'accomplishedBudgetUsedM' : 'accomplishedBudgetUsed'}
                      name="Accomplished Budget Used (Financial Data)"
                      fill="#14b8a6"
                      stroke="#0d9488"
                      fillOpacity={0.28}
                      stackId="accomplished"
                    />
                  )}
                  {showAccomplishedEfys && (
                    <Line
                      type="monotone"
                      dataKey={chartUnit === 'millions' ? 'contractorNetPaidM' : 'contractorNetPaid'}
                      name="Contractor Net Paid"
                      stroke="#0ea5e9"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#0ea5e9' }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey={chartUnit === 'millions' ? 'baseCostM' : 'baseCost'}
                    name="Remaining Base Work (Plan)"
                    fill="#6366f1"
                    stroke="#4f46e5"
                    fillOpacity={0.3}
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey={chartUnit === 'millions' ? 'paAdderM' : 'paAdder'}
                    name="Forecasted Price Adjustment"
                    fill="#f43f5e"
                    stroke="#e11d48"
                    fillOpacity={0.3}
                    stackId="1"
                  />
                  <Line
                    type="monotone"
                    dataKey={chartUnit === 'millions' ? 'escalatedCostM' : 'escalatedCost'}
                    name="Annual Estimated Outlay (incl. PA)"
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
                Division Work Quantities &amp; Remaining Balance (Series 1000 - 11000)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              BOQ unexecuted balance: <strong className="text-amber-600 dark:text-amber-400">{formatBr(boqRemainingBalance)}</strong> (Forecast uses Monthly Cum. 100% &minus; Actual = {formatBr(remainingBalance)})
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
                  <td className="p-2.5 text-center font-mono text-indigo-600 dark:text-indigo-400">{boqExecutedPct.toFixed(1)}%</td>
                  <td className="p-2.5 text-right font-mono text-amber-600 dark:text-amber-400 font-black">{formatBr(boqRemainingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Sensitivity & Scenario Parameters Toolbar */}
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

        {/* Financial Data PA Empirical Increment Provenance Strip */}
        <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 text-[10.5px] text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              <strong>Financial Data PA Source:</strong> {financialPa.methodologySummary}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
            Scope: {remainingPct.toFixed(1)}% Remaining (100% &minus; {actualAtCurrentMonth.toFixed(1)}% Actual @ {actualRefMonthLabel})
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

          {/* Parameter 3: Forecast Scope & Plan Basis */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-bold block">Forecast Scope</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">{firstForecastEfy} &ndash; {lastForecastEfy}</span>
            </div>
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono">
              Remaining Only
            </span>
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

      {/* Remaining Works Forecast Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-900/80 text-[10px] uppercase font-mono font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {/* Header 1: Operating EFY */}
              <th className="p-3">
                <HeaderTooltip
                  title={`Operating Period (${calendarView === 'EFY' ? 'EFY' : 'G.C.'})`}
                  tooltipTitle="Ethiopian Fiscal Year Horizon"
                  formula="EFY N = Jul (N+7) to Jun (N+8)"
                  explanation={`Forecast starts strictly from Current Operating EFY (EFY ${currentEfy}) through completion EFY for unexecuted remaining works only.`}
                  methodologyNote={`Current EFY ${currentEfy} spans Jul ${getEfyStartGregYear(currentEfy)} to Jun ${getEfyEndGregYear(currentEfy)}.`}
                  align="left"
                />
              </th>

              {/* Header 2: EFY Stage & Plan Basis */}
              <th className="p-3 text-center">
                <HeaderTooltip
                  title="Stage & Plan Basis"
                  tooltipTitle="Remaining Works Schedule Basis"
                  explanation="Allocates remaining unexecuted BOQ work across Current & Upcoming EFYs strictly using the Monthly Cumulative Plan increments (or EFY horizon pace if monthly plan ended early)."
                  align="center"
                />
              </th>

              {/* Header 3: Remaining Plan (%) */}
              <th className="p-3 text-center">
                <HeaderTooltip
                  title="Remaining Plan (%)"
                  tooltipTitle="Remaining Plan Percentage per EFY"
                  formula={`Total = 100% − Actual (${actualRefMonthLabel})`}
                  explanation={`Total remaining % is always 100% minus Monthly Cumulative Actual at ${actualRefMonthLabel} (${actualAtCurrentMonth.toFixed(1)}% -> ${remainingPct.toFixed(1)}% remaining). When Plan (${planAtCurrentMonth.toFixed(1)}%) > Actual, the difference (+${Math.max(0, monthPlanActualDiff).toFixed(1)}%) is added to Current EFY budget; when Actual > Plan, the difference is subtracted from the EFY budget.`}
                  align="center"
                />
              </th>

              {/* Header 4: Remaining Base Cost */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Remaining Base Cost (ETB)"
                  tooltipTitle="Base Remaining Planned Allocation"
                  formula="Base = Contract × Remaining Plan (%)"
                  explanation="Portion of the contract remaining balance allocated to this EFY prior to Price Adjustment escalation."
                  align="right"
                />
              </th>

              {/* Header 5: Escalation Factor Pn */}
              <th className="p-3 text-center">
                <HeaderTooltip
                  title="Factor (Pn)"
                  tooltipTitle="FIDIC Sub-Clause 13.8 Escalation Factor"
                  formula="Pn = P0 × (1 + r)^t"
                  explanation="Price adjustment multiplier compounding empirical Financial Data baseline P0 by the annual PA increment rate r across upcoming EFYs."
                  align="center"
                />
              </th>

              {/* Header 6: Forecasted Price Adjustment */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Forecasted PA (ETB)"
                  tooltipTitle="Projected Price Adjustment"
                  formula="PA = Remaining Base × (Pn - 1.0)"
                  explanation="Estimated Price Adjustment liability for the remaining works scheduled in this EFY."
                  align="right"
                />
              </th>

              {/* Header 7: Total Estimated Outlay incl. PA */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Estimated Outlay incl. PA (ETB)"
                  tooltipTitle="Total EFY Remaining Work Commitment"
                  formula="Outlay = Remaining Base + Forecasted PA"
                  explanation="Total projected monetary commitment for remaining works in this EFY including forecasted Price Adjustment."
                  align="right"
                />
              </th>

              {/* Header 8: Projected Budget Variance */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Projected Budget Variance"
                  tooltipTitle="Absolute Plan vs Actual Cost Variance"
                  formula="Variance = |Projected Outlay − Plan Base Cost|"
                  explanation="Calculates the absolute difference between the unadjusted Monthly Plan cost and the actual-adjusted projected outlay per EFY to highlight potential funding gaps or budget surpluses."
                  align="right"
                />
              </th>

              {/* Header 9: Cumulative Remaining Outlay */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Cumulative Remaining (ETB)"
                  tooltipTitle="Progressive Remaining Cash Flow"
                  formula="Cumulative(t) = Σ Outlay(current..t)"
                  explanation="Running cumulative cash requirement across the remaining forecast horizon from Current EFY to completion."
                  align="right"
                />
              </th>

              {/* Header 10: Unexecuted Balance After EFY */}
              <th className="p-3 text-right">
                <HeaderTooltip
                  title="Remaining Balance (ETB)"
                  tooltipTitle="Post-EFY Unexecuted Contract Balance"
                  formula="Balance(t) = Balance(t-1) - Base(t)"
                  explanation="Remaining base contract balance diminishing systematically to Br. 0.00 upon completion."
                  align="right"
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200 tabular-nums">
            {futureProjections.map((row, rIdx) => {
              const isCurrent = row.isCurrent;
              const isFinish = row.isFinish;

              const rowClass = isCurrent
                ? 'bg-amber-50/60 dark:bg-amber-950/20 font-semibold text-slate-900 dark:text-slate-100'
                : isFinish
                ? 'bg-emerald-50/50 dark:bg-emerald-950/15 font-semibold text-slate-900 dark:text-slate-100'
                : 'hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition text-slate-800 dark:text-slate-200';

              return (
                <tr key={`rem-efy-${row.efyYear}-${rIdx}`} className={rowClass}>
                  {/* 1. Operating Period */}
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-white">
                        {calendarView === 'EFY' ? row.efy : row.periodLabel}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums font-normal">
                        {calendarView === 'EFY' ? row.periodLabel : row.efy}
                      </span>
                    </div>
                  </td>

                  {/* 2. Stage & Plan Basis */}
                  <td className="p-3 text-center">
                    {isCurrent ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          Current EFY
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-normal">
                          {row.basisType === 'plan' ? 'Monthly Cum. Plan' : `${row.activeMonthsInEfy} mos EFY Horizon`}
                        </span>
                      </div>
                    ) : isFinish ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          Completion EFY
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-normal">
                          {row.basisType === 'plan' ? 'Monthly Cum. Plan' : `${row.activeMonthsInEfy} mos EFY Horizon`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                          Upcoming EFY
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-normal">
                          {row.basisType === 'plan' ? 'Monthly Cum. Plan' : `${row.activeMonthsInEfy} mos EFY Horizon`}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* 3. Remaining Plan (%) only */}
                  <td className="p-3 text-center font-mono tabular-nums">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-amber-700 dark:text-amber-400 font-bold text-xs">
                        {row.remainingPlanPct.toFixed(1)}%
                      </span>
                      <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-1 mx-auto overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isCurrent ? 'bg-amber-500' : isFinish ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, row.weightSharePct))}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 4. Remaining Base Cost */}
                  <td className="p-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                    {formatBr(row.baseCost)}
                  </td>

                  {/* 5. Factor (Pn) */}
                  <td className="p-3 text-center font-mono tabular-nums font-bold">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-slate-700 dark:text-slate-200">
                        {row.pnFactor.toFixed(4)}
                      </span>
                      <span className="text-[9px] font-sans font-normal text-slate-400">
                        {row.paSourceTag}
                      </span>
                    </div>
                  </td>

                  {/* 6. Forecasted Price Adjustment */}
                  <td className="p-3 text-right font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                    +{formatBr(row.paAdder)}
                  </td>

                  {/* 7. Total Estimated Outlay incl. PA */}
                  <td className="p-3 text-right font-mono tabular-nums font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                    {formatBr(row.escalatedCost)}
                  </td>

                  {/* 8. Projected Budget Variance */}
                  <td className="p-3 text-right font-mono tabular-nums">
                    <div className="flex flex-col items-end gap-0.5">
                      <span
                        className={`font-bold ${
                          row.budgetVarianceType === 'gap'
                            ? 'text-rose-600 dark:text-rose-400'
                            : row.budgetVarianceType === 'surplus'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {formatBr(row.budgetVarianceAbs)}
                      </span>
                      <span
                        className={`text-[9px] font-sans font-semibold ${
                          row.budgetVarianceType === 'gap'
                            ? 'text-rose-500 dark:text-rose-400'
                            : row.budgetVarianceType === 'surplus'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.budgetVarianceType === 'gap'
                          ? 'Funding Gap'
                          : row.budgetVarianceType === 'surplus'
                          ? 'Surplus'
                          : 'On Plan'}
                      </span>
                    </div>
                  </td>

                  {/* 9. Cumulative Remaining Outlay */}
                  <td className="p-3 text-right font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                    {formatBr(row.cumulativeEscalated)}
                  </td>

                  {/* 10. Remaining Balance Liability */}
                  <td className="p-3 text-right font-mono tabular-nums font-semibold text-slate-500 dark:text-slate-400">
                    {formatBr(row.balanceRemaining)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Summary Footer */}
          <tfoot className="bg-slate-100 dark:bg-slate-850 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white tabular-nums">
            <tr className="bg-indigo-50/70 dark:bg-indigo-950/30">
              <td className="p-3 uppercase text-indigo-900 dark:text-indigo-200" colSpan={2}>
                Total Forecast — Remaining Works ({firstForecastEfy} &ndash; {lastForecastEfy})
              </td>
              <td className="p-3 text-center font-mono tabular-nums text-amber-700 dark:text-amber-400">
                {totalRemainingPlanPct.toFixed(1)}%
              </td>
              <td className="p-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-100">{formatBr(totalBaseForecast)}</td>
              <td className="p-3 text-center font-mono tabular-nums text-indigo-700 dark:text-indigo-300">
                Avg {avgFuturePn.toFixed(4)}
              </td>
              <td className="p-3 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">+{formatBr(totalFuturePaAdder)}</td>
              <td className="p-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 text-sm">{formatBr(totalProjectedEscalated)}</td>
              <td className="p-3 text-right font-mono tabular-nums">
                <div className="flex flex-col items-end">
                  <span
                    className={
                      netPortfolioVarianceType === 'gap'
                        ? 'text-rose-600 dark:text-rose-400'
                        : netPortfolioVarianceType === 'surplus'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }
                  >
                    {formatBr(netPortfolioVarianceAbs)}
                  </span>
                  <span className="text-[9px] font-sans font-semibold text-slate-500 dark:text-slate-400">
                    {netPortfolioVarianceType === 'gap'
                      ? 'Net Funding Gap'
                      : netPortfolioVarianceType === 'surplus'
                      ? 'Net Surplus'
                      : 'On Plan'}
                  </span>
                </div>
              </td>
              <td className="p-3 text-right font-mono tabular-nums text-indigo-600 dark:text-indigo-400 text-sm">{formatBr(totalProjectedEscalated)}</td>
              <td className="p-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">Br. 0.00</td>
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
            <span>Remaining Works Plan &amp; EFY Methodology:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            Remaining % is always <strong>100% &minus; Monthly Cumulative Actual at {actualRefMonthLabel} ({actualAtCurrentMonth.toFixed(1)}%) = {remainingPct.toFixed(1)}%</strong> (<strong>{formatBr(remainingBalance)}</strong>), planned across <strong>{firstForecastEfy}</strong> through <strong>{lastForecastEfy}</strong>. Whenever Monthly Plan &gt; Actual for the reporting month, the shortfall (+Plan &minus; Actual) is added as additional budget on Current EFY; whenever Actual &gt; Plan, the surplus is subtracted from the EFY budget. Price Adjustment compounds via <strong>Pn = P0 &times; (1 + r)^t</strong> using Financial Data baseline <strong>P0 = {basePaFactor.toFixed(4)}</strong> and increment rate <strong>r = {(annualInflation * 100).toFixed(2)}% p.a.</strong>
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
            Combined Price Adjustment (Certified PA to-date {formatBr(financialPa.totalPa)} + Forecasted PA on remaining works {formatBr(totalFuturePaAdder)}) equals <strong className="text-slate-900 dark:text-white font-mono">{formatBr(totalLifetimePa)}</strong>, representing <strong className={isPpaCompliant ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>{ppaThresholdRatio.toFixed(2)}%</strong> of Accepted Contract Amount ({formatBr(BAC)}).
          </p>
        </div>
      </div>
    </div>
  );
}
