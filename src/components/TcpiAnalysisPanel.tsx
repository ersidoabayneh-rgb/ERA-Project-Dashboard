import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, Info, Target } from 'lucide-react';
import { Project } from '../types';
import { EacScenarioId, EvmMetrics } from '../lib/evmCalculations';

interface TcpiAnalysisPanelProps {
  project: Project;
  evm: EvmMetrics;
  activeScenario: EacScenarioId;
  onSelectScenario: (scenario: EacScenarioId) => void;
  formatBr: (v: number) => string;
}

interface TcpiEvaluation {
  value: number | null;
  remainingWork: number;
  remainingFunds: number;
  thresholdRule: 'equal' | 'greater' | 'less' | 'complete' | 'exhausted';
  thresholdText: string;
  judgmentLabel: string;
  judgmentTone: 'favorable' | 'realistic' | 'caution' | 'critical';
  judgmentDetail: string;
  efficiencyGap: number | null;
  efficiencyChangePct: number | null;
}

function evaluateTcpiTarget(
  targetName: string,
  targetAmount: number,
  EV: number,
  AC: number,
  CPI: number,
  BAC: number
): TcpiEvaluation {
  const remainingWork = Math.max(0, BAC - EV);
  const remainingFunds = targetAmount - AC;

  if (remainingWork <= 1) {
    return {
      value: 0,
      remainingWork: 0,
      remainingFunds,
      thresholdRule: 'complete',
      thresholdText: 'All planned baseline value (BAC) has been earned; no remaining work efficiency constraint applies.',
      judgmentLabel: 'Scope Earned (Complete)',
      judgmentTone: 'favorable',
      judgmentDetail: `Earned Value (${EV >= BAC ? '100%' : 'full BAC'}) matches Budget at Completion. Cost efficiency on remaining baseline work is no longer at risk.`,
      efficiencyGap: null,
      efficiencyChangePct: null,
    };
  }

  if (remainingFunds <= 0) {
    return {
      value: null,
      remainingWork,
      remainingFunds,
      thresholdRule: 'exhausted',
      thresholdText: `Remaining funds (${targetName} − AC) are zero or negative; budget ceiling is already exhausted.`,
      judgmentLabel: 'Unattainable (Budget Exhausted)',
      judgmentTone: 'critical',
      judgmentDetail: `Actual Cost (AC) already equals or exceeds ${targetName}. Under PMI EVM rules, remaining work cannot be funded within ${targetName} without a formal budget revision or switching control to a revised EAC.`,
      efficiencyGap: null,
      efficiencyChangePct: null,
    };
  }

  const tcpi = remainingWork / remainingFunds;
  const isApproxOne = Math.abs(tcpi - 1.0) <= 0.005;

  let thresholdRule: TcpiEvaluation['thresholdRule'];
  let thresholdText: string;
  if (isApproxOne) {
    thresholdRule = 'equal';
    thresholdText = 'TCPI = 1.0: Remaining work must be done at the exact planned cost efficiency.';
  } else if (tcpi > 1.0) {
    thresholdRule = 'greater';
    thresholdText = 'TCPI > 1.0: Higher cost efficiency is required than planned to hit the target.';
  } else {
    thresholdRule = 'less';
    thresholdText = 'TCPI < 1.0: Lower cost efficiency is needed; there is budget breathing room.';
  }

  const efficiencyGap = tcpi - CPI;
  const efficiencyChangePct = CPI > 0 ? ((tcpi - CPI) / CPI) * 100 : null;
  const pctGapStr = efficiencyChangePct !== null ? `${Math.abs(efficiencyChangePct).toFixed(1)}%` : 'N/A';

  let judgmentLabel: string;
  let judgmentTone: TcpiEvaluation['judgmentTone'];
  let judgmentDetail: string;

  if (tcpi < 1.0 && CPI >= tcpi) {
    judgmentLabel = 'Achievable · Budget Breathing Room';
    judgmentTone = 'favorable';
    judgmentDetail = `Required future efficiency (${tcpi.toFixed(3)}) is below historical CPI (${CPI.toFixed(3)}) and below 1.000. The project carries budget breathing room and can realistically hit ${targetName} at current or slightly relaxed cost efficiency.`;
  } else if (Math.abs(efficiencyGap) <= 0.03 && tcpi <= 1.05) {
    judgmentLabel = 'Realistic · Maintain Current Pace';
    judgmentTone = 'realistic';
    judgmentDetail = `Required efficiency (${tcpi.toFixed(3)}) aligns closely with cumulative CPI (${CPI.toFixed(3)}). Hitting ${targetName} is realistic provided existing cost controls and certification discipline are sustained.`;
  } else if (tcpi <= CPI) {
    judgmentLabel = 'Achievable · Within Historical CPI';
    judgmentTone = 'favorable';
    judgmentDetail = `Required efficiency (${tcpi.toFixed(3)}) is at or below cumulative CPI (${CPI.toFixed(3)}), indicating historical cost performance supports achieving ${targetName}.`;
  } else if (efficiencyGap <= 0.12 && tcpi <= 1.15) {
    judgmentLabel = 'Challenging · Recovery Needed';
    judgmentTone = 'caution';
    judgmentDetail = `To hit ${targetName}, remaining work requires ${tcpi.toFixed(3)} efficiency—${pctGapStr} higher than cumulative CPI (${CPI.toFixed(3)}). Recoverable only with active cost containment, strict variation control, and tighter IPC scrutiny.`;
  } else {
    judgmentLabel = 'Unrealistic · High Overrun Risk';
    judgmentTone = 'critical';
    judgmentDetail = `Requires ${tcpi.toFixed(3)} efficiency on remaining work—a ${pctGapStr} jump above cumulative CPI (${CPI.toFixed(3)}). Per PMI EVM guidance, sustaining such a sharp reversal late in delivery is typically unrealistic without scope adjustment or formal EAC re-baselining.`;
  }

  return {
    value: tcpi,
    remainingWork,
    remainingFunds,
    thresholdRule,
    thresholdText,
    judgmentLabel,
    judgmentTone,
    judgmentDetail,
    efficiencyGap,
    efficiencyChangePct,
  };
}

export default function TcpiAnalysisPanel({
  evm,
  activeScenario,
  onSelectScenario,
  formatBr,
}: TcpiAnalysisPanelProps) {
  const { BAC, EV, AC, CPI, EAC, eacScenarios } = evm;
  const activeScenarioObj = eacScenarios.find(s => s.id === activeScenario) || eacScenarios[0];
  const activeEac = EAC;

  const bacEval = useMemo(
    () => evaluateTcpiTarget('BAC (Original Budget)', BAC, EV, AC, CPI, BAC),
    [BAC, EV, AC, CPI]
  );

  const eacEval = useMemo(
    () => evaluateTcpiTarget('EAC (Revised Forecast)', activeEac, EV, AC, CPI, BAC),
    [activeEac, EV, AC, CPI, BAC]
  );

  // Executive consolidated judgment comparing TCPI (BAC), TCPI (EAC), and Cumulative CPI
  const executiveSummary = useMemo(() => {
    if (bacEval.thresholdRule === 'complete') {
      return {
        headline: 'Baseline Scope Achieved — Monitor Final Closeout Settlement',
        tone: 'favorable' as const,
        narrative:
          'Earned Value matches Budget at Completion. TCPI no longer constrains ongoing baseline production; focus shifts to finalizing claims, retention, and Price Adjustment reconciliation.',
      };
    }
    if (bacEval.value === null) {
      return {
        headline: 'Original BAC Exhausted — Shift Cost Control Target to Revised EAC',
        tone: 'critical' as const,
        narrative: `Actual Cost (${formatBr(AC)}) already exceeds Original BAC (${formatBr(BAC)}), making TCPI to BAC unattainable. Management should govern remaining work using the revised EAC (${formatBr(activeEac)}), which requires TCPI = ${eacEval.value !== null ? eacEval.value.toFixed(3) : 'N/A'} against cumulative CPI ${CPI.toFixed(3)}.`,
      };
    }
    if (bacEval.value <= CPI && bacEval.value <= 1.0) {
      return {
        headline: 'On Track — Current Cost Efficiency Supports Original Budget (BAC)',
        tone: 'favorable' as const,
        narrative: `Cumulative CPI (${CPI.toFixed(3)}) outperforms TCPI to BAC (${bacEval.value.toFixed(3)}). Remaining work enjoys budget breathing room and can meet the approved BAC without extraordinary cost cuts.`,
      };
    }
    if (bacEval.judgmentTone === 'realistic') {
      return {
        headline: 'Realistic Target — Sustain Historical Cost Discipline to Hold BAC',
        tone: 'realistic' as const,
        narrative: `TCPI to BAC (${bacEval.value.toFixed(3)}) closely tracks cumulative CPI (${CPI.toFixed(3)}). Holding current productivity and preventing unapproved variations keeps BAC achievable.`,
      };
    }
    if (bacEval.judgmentTone === 'caution') {
      return {
        headline: 'Efficiency Recovery Required — Tighten Cost Control or Track EAC',
        tone: 'caution' as const,
        narrative: `Meeting BAC requires improving cost efficiency from CPI ${CPI.toFixed(3)} to TCPI ${bacEval.value.toFixed(3)}. If recovery measures cannot close this gap, use the revised EAC (${formatBr(activeEac)}, TCPI ${eacEval.value !== null ? eacEval.value.toFixed(3) : 'N/A'}) as the realistic funding baseline.`,
      };
    }
    return {
      headline: 'Critical Alert — Original BAC Unlikely Based on Historical CPI',
      tone: 'critical' as const,
      narrative: `TCPI to BAC (${bacEval.value.toFixed(3)}) exceeds cumulative CPI (${CPI.toFixed(3)}) by +${(bacEval.value - CPI).toFixed(3)}. Under PMI EVM principles, reversing an overrun of this magnitude without scope revision is unrealistic; re-baseline governance around EAC (${formatBr(activeEac)}, TCPI ${eacEval.value !== null ? eacEval.value.toFixed(3) : 'N/A'}).`,
    };
  }, [bacEval, eacEval, AC, BAC, activeEac, CPI, formatBr]);

  const toneStyles = (tone: TcpiEvaluation['judgmentTone']) => {
    if (tone === 'favorable') {
      return {
        text: 'text-emerald-700 dark:text-emerald-300',
        surface: 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/60',
        val: 'text-emerald-600 dark:text-emerald-400',
      };
    }
    if (tone === 'realistic') {
      return {
        text: 'text-blue-700 dark:text-blue-300',
        surface: 'bg-blue-50/70 dark:bg-blue-950/25 border-blue-200 dark:border-blue-800/60',
        val: 'text-blue-600 dark:text-blue-400',
      };
    }
    if (tone === 'caution') {
      return {
        text: 'text-amber-700 dark:text-amber-300',
        surface: 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/60',
        val: 'text-amber-600 dark:text-amber-400',
      };
    }
    return {
      text: 'text-rose-700 dark:text-rose-300',
      surface: 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800/60',
      val: 'text-rose-600 dark:text-rose-400',
    };
  };

  const bacStyle = toneStyles(bacEval.judgmentTone);
  const eacStyle = toneStyles(eacEval.judgmentTone);
  const execStyle = toneStyles(executiveSummary.tone);

  const maxBarScale = Math.max(
    1.5,
    CPI,
    bacEval.value ?? 0,
    eacEval.value ?? 0
  );

  const pctWidth = (v: number | null) => {
    if (v === null || v <= 0) return '0%';
    return `${Math.min(100, Math.max(4, (v / maxBarScale) * 100))}%`;
  };

  return (
    <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm p-4 sm:p-5 space-y-5 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/60 pb-3.5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              To-Complete Performance Index (TCPI) &amp; Cost Efficiency Judgment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Measures cost efficiency required on remaining work (BAC &minus; EV) relative to remaining funds available, benchmarked against cumulative CPI ({CPI.toFixed(3)}).
            </p>
          </div>
        </div>

        {/* Quick Scenario Switcher synced with EAC Scenarios */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/70 rounded-lg border border-slate-200 dark:border-slate-700/60 self-start lg:self-auto">
          {eacScenarios.map(sc => (
            <button
              key={sc.id}
              type="button"
              onClick={() => onSelectScenario(sc.id)}
              title={sc.title}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeScenario === sc.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              S{sc.number}: {sc.id === 'cpi_continues' ? 'BAC/CPI' : sc.id === 'original_plan_resumes' ? 'Orig. Plan' : sc.id === 'cost_and_schedule' ? 'CPI×SPI' : 'Bottom-up'}
            </button>
          ))}
        </div>
      </div>

      {/* Key EVM Inputs Reference Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            BAC · Budget at Completion
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatBr(BAC)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Total approved project budget
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            EV · Earned Value
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
            {formatBr(EV)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Value of work completed to date
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            AC · Actual Cost
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatBr(AC)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Money certified / spent to date
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            EAC · Scenario {activeScenarioObj.number}
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
            {formatBr(activeEac)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={activeScenarioObj.title}>
            {activeScenarioObj.title}
          </div>
        </div>
      </div>

      {/* Dual TCPI Formula & Target Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Card 1: TCPI to meet Original Budget (BAC) */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/35 flex flex-col justify-between space-y-3.5">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  1. To Meet Original Budget (BAC)
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  TCPI = (BAC &minus; EV) / (BAC &minus; AC)
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold font-mono tabular-nums ${bacStyle.val}`}>
                  {bacEval.value !== null ? bacEval.value.toFixed(3) : 'N/A'}
                </div>
                <div className={`text-[11px] font-semibold ${bacStyle.text}`}>
                  {bacEval.judgmentLabel}
                </div>
              </div>
            </div>

            {/* Numerator & Denominator Breakdown */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-sans">Remaining Work (BAC &minus; EV)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{formatBr(bacEval.remainingWork)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 block font-sans">Remaining Funds (BAC &minus; AC)</span>
                <span className={`font-bold ${bacEval.remainingFunds <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {formatBr(bacEval.remainingFunds)}
                </span>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${bacStyle.surface}`}>
            <div className={`font-semibold ${bacStyle.text}`}>
              {bacEval.thresholdText}
            </div>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-[11.5px]">
              {bacEval.judgmentDetail}
            </p>
          </div>
        </div>

        {/* Card 2: TCPI to meet Revised Forecast (EAC) */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/35 flex flex-col justify-between space-y-3.5">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  2. To Meet Revised Forecast (EAC)
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  TCPI = (BAC &minus; EV) / (EAC &minus; AC)
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold font-mono tabular-nums ${eacStyle.val}`}>
                  {eacEval.value !== null ? eacEval.value.toFixed(3) : 'N/A'}
                </div>
                <div className={`text-[11px] font-semibold ${eacStyle.text}`}>
                  {eacEval.judgmentLabel}
                </div>
              </div>
            </div>

            {/* Numerator & Denominator Breakdown */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-sans">Remaining Work (BAC &minus; EV)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{formatBr(eacEval.remainingWork)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 block font-sans">Remaining Funds (EAC &minus; AC)</span>
                <span className={`font-bold ${eacEval.remainingFunds <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {formatBr(eacEval.remainingFunds)}
                </span>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${eacStyle.surface}`}>
            <div className={`font-semibold ${eacStyle.text}`}>
              {eacEval.thresholdText}
            </div>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-[11.5px]">
              {eacEval.judgmentDetail}
            </p>
          </div>
        </div>
      </div>

      {/* TCPI vs. Cumulative CPI Comparison & Executive Judgment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Visual Comparison Bars */}
        <div className="lg:col-span-5 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/35 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              TCPI vs. Cumulative CPI Benchmark
            </span>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Baseline = 1.000
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Bar 1: Cumulative CPI */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="font-sans font-medium text-slate-700 dark:text-slate-300">Cumulative CPI (Past Performance)</span>
                <span className={`font-bold ${CPI >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' : CPI >= 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {CPI.toFixed(3)}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${CPI >= 1.0 ? 'bg-emerald-500' : CPI >= 0.9 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: pctWidth(CPI) }}
                />
              </div>
            </div>

            {/* Bar 2: TCPI (BAC) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="font-sans font-medium text-slate-700 dark:text-slate-300">TCPI to BAC (Original Budget)</span>
                <span className={`font-bold ${bacStyle.val}`}>
                  {bacEval.value !== null ? bacEval.value.toFixed(3) : 'Budget Exhausted'}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    bacEval.value === null
                      ? 'bg-rose-600'
                      : bacEval.judgmentTone === 'favorable'
                      ? 'bg-emerald-500'
                      : bacEval.judgmentTone === 'realistic'
                      ? 'bg-blue-500'
                      : bacEval.judgmentTone === 'caution'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: bacEval.value !== null ? pctWidth(bacEval.value) : '100%' }}
                />
              </div>
            </div>

            {/* Bar 3: TCPI (EAC) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="font-sans font-medium text-slate-700 dark:text-slate-300">TCPI to EAC (Revised Forecast)</span>
                <span className={`font-bold ${eacStyle.val}`}>
                  {eacEval.value !== null ? eacEval.value.toFixed(3) : 'Budget Exhausted'}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    eacEval.value === null
                      ? 'bg-rose-600'
                      : eacEval.judgmentTone === 'favorable'
                      ? 'bg-emerald-500'
                      : eacEval.judgmentTone === 'realistic'
                      ? 'bg-indigo-500'
                      : eacEval.judgmentTone === 'caution'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: eacEval.value !== null ? pctWidth(eacEval.value) : '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Efficiency Delta Summary */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
            <span>Efficiency Gap (TCPI_BAC &minus; CPI):</span>
            <span className="font-bold">
              {bacEval.efficiencyGap !== null
                ? `${bacEval.efficiencyGap >= 0 ? '+' : ''}${bacEval.efficiencyGap.toFixed(3)}`
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Executive Judgment & PMI Interpretation Guide */}
        <div className="lg:col-span-7 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/35 flex flex-col justify-between space-y-3">
          <div className={`p-3.5 rounded-xl border space-y-1.5 ${execStyle.surface}`}>
            <div className="flex items-center gap-2">
              {executiveSummary.tone === 'favorable' || executiveSummary.tone === 'realistic' ? (
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${execStyle.val}`} />
              ) : (
                <AlertTriangle className={`w-4 h-4 shrink-0 ${execStyle.val}`} />
              )}
              <span className={`text-xs font-bold ${execStyle.text}`}>
                Executive Judgment: {executiveSummary.headline}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              {executiveSummary.narrative}
            </p>
          </div>

          {/* PMI Interpretation & Methodological Limitations Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
              <div className="font-mono font-bold text-blue-600 dark:text-blue-400">TCPI = 1.0</div>
              <div className="text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                Remaining work must be executed at exact planned cost efficiency.
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
              <div className="font-mono font-bold text-rose-600 dark:text-rose-400">TCPI &gt; 1.0</div>
              <div className="text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                Higher cost efficiency than planned is required to hit the target.
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">TCPI &lt; 1.0</div>
              <div className="text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                Lower cost efficiency is needed; budget breathing room exists.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-700 dark:text-slate-300">PMI Forecasting Context:</strong> Always compare TCPI against cumulative CPI ({CPI.toFixed(3)}) to judge realism. If TCPI significantly exceeds CPI, historical productivity makes the budget target improbable without formal scope or EAC adjustment.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
