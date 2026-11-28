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
  BAC: number,
  options?: {
    isThresholdMode?: boolean;
    budgetThreshold?: number;
    formatBr?: (v: number) => string;
  }
): TcpiEvaluation {
  const remainingWork = Math.max(0, BAC - EV);
  const remainingFunds = targetAmount - AC;
  const isThresholdMode = Boolean(options?.isThresholdMode);
  const budgetThreshold = options?.budgetThreshold ?? BAC * 1.2;
  const fmt = options?.formatBr ?? ((v: number) => v.toLocaleString());

  if (remainingWork <= 1) {
    if (isThresholdMode) {
      return {
        value: 0,
        remainingWork: 0,
        remainingFunds,
        thresholdRule: 'complete',
        thresholdText:
          remainingFunds >= 0
            ? 'Baseline physical scope is earned, while Original BAC is exhausted. Maintain strict closeout cost control within 120% Budget Threshold.'
            : 'Baseline physical scope is earned, but 120% Budget Threshold is already breached. Freeze final account extras.',
        judgmentLabel: remainingFunds >= 0 ? 'Scope Earned · Closeout Cost Control' : 'Scope Earned · 120% Cap Breached',
        judgmentTone: remainingFunds >= 0 ? 'caution' : 'critical',
        judgmentDetail:
          remainingFunds >= 0
            ? `Original BAC is exhausted, leaving ${fmt(remainingFunds)} under the 120% Budget Threshold (${fmt(budgetThreshold)}). Enforce strict cost monitoring over final IPCs, variations, retention, and price adjustments so final settlement never breaches the 120% cap.`
            : `Actual Cost (${fmt(AC)}) already exceeds the 120% Budget Threshold (${fmt(budgetThreshold)}) by ${fmt(Math.abs(remainingFunds))}. Enforce strict final-account auditing and reject non-contractual claims.`,
        efficiencyGap: null,
        efficiencyChangePct: null,
      };
    }

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
    if (isThresholdMode) {
      return {
        value: null,
        remainingWork,
        remainingFunds,
        thresholdRule: 'exhausted',
        thresholdText: `120% Budget Threshold (${fmt(budgetThreshold)}) is exhausted; immediate strict cost freeze and containment required.`,
        judgmentLabel: '120% Cap Breached · Freeze Spend',
        judgmentTone: 'critical',
        judgmentDetail: `Actual Cost (${fmt(AC)}) has reached or exceeded the 120% Budget Threshold (${fmt(budgetThreshold)}). Enforce an immediate freeze on unapproved variations and discretionary spending, audit all IPC measurements, and apply maximum cost control to curb further overrun.`,
        efficiencyGap: null,
        efficiencyChangePct: null,
      };
    }

    return {
      value: null,
      remainingWork,
      remainingFunds,
      thresholdRule: 'exhausted',
      thresholdText: `Remaining funds (${targetName} − AC) are zero or negative; budget ceiling is already exhausted.`,
      judgmentLabel: 'Unattainable (Budget Exhausted)',
      judgmentTone: 'critical',
      judgmentDetail: `Actual Cost (AC) already equals or exceeds ${targetName}. Enforce strict cost monitoring and govern remaining execution within the 120% Budget Threshold (Original Contract + 20% = ${fmt(budgetThreshold)}).`,
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
    thresholdText = isThresholdMode
      ? 'TCPI (120%) = 1.0: Strict cost monitoring must hold planned efficiency to finish inside the 120% Budget Threshold.'
      : 'TCPI = 1.0: Remaining work must be done at the exact planned cost efficiency.';
  } else if (tcpi > 1.0) {
    thresholdRule = 'greater';
    thresholdText = isThresholdMode
      ? 'TCPI (120%) > 1.0: Higher cost efficiency and strict spending discipline are mandatory to avoid breaching the 120% cap.'
      : 'TCPI > 1.0: Higher cost efficiency is required than planned to hit the target.';
  } else {
    thresholdRule = 'less';
    thresholdText = isThresholdMode
      ? 'TCPI (120%) < 1.0: Remaining 120% threshold headroom is manageable only with strict cost monitoring and zero unapproved variations.'
      : 'TCPI < 1.0: Lower cost efficiency is needed; there is budget breathing room.';
  }

  const efficiencyGap = tcpi - 1.0;
  const efficiencyChangePct = (tcpi - 1.0) * 100;
  const pctGapStr = `${Math.abs(efficiencyChangePct).toFixed(1)}%`;

  let judgmentLabel: string;
  let judgmentTone: TcpiEvaluation['judgmentTone'];
  let judgmentDetail: string;

  if (isThresholdMode) {
    if (tcpi < 0.995) {
      judgmentLabel = 'Controllable · Strict Monitoring Required';
      judgmentTone = 'realistic';
      judgmentDetail = `Original budget is exhausted, and finishing inside the 120% Budget Threshold (${fmt(budgetThreshold)}) requires ${tcpi.toFixed(3)} efficiency. Protect the remaining ${fmt(remainingFunds)} headroom with strict IPC audits, variation freezes, and tight site cost control.`;
    } else if (tcpi <= 1.03) {
      judgmentLabel = 'Tight Margin · Enforce Cost Discipline';
      judgmentTone = 'caution';
      judgmentDetail = `Holding the 120% Budget Threshold (${fmt(budgetThreshold)}) requires ${tcpi.toFixed(3)} cost efficiency on all remaining work. Enforce strict BOQ quantity verification, eliminate waste, and block discretionary variations immediately.`;
    } else if (tcpi <= 1.15) {
      judgmentLabel = 'High Risk · Aggressive Cost Containment';
      judgmentTone = 'caution';
      judgmentDetail = `Staying under the 120% Budget Threshold demands ${tcpi.toFixed(3)} cost efficiency (+${pctGapStr} above planned baseline). Implement strict cost monitoring, value engineering, resource optimization, and rigorous IPC scrutiny immediately.`;
    } else {
      judgmentLabel = 'Critical Risk · Emergency Cost Control';
      judgmentTone = 'critical';
      judgmentDetail = `Requires ${tcpi.toFixed(3)} efficiency (+${pctGapStr} above planned baseline) to stay within the 120% Budget Threshold (${fmt(budgetThreshold)}). Without immediate cost reduction, strict variation rejection, and tight resource control, the 120% ceiling will be breached.`;
    }
  } else if (tcpi < 0.995) {
    judgmentLabel = 'Achievable · Budget Breathing Room';
    judgmentTone = 'favorable';
    judgmentDetail = `Required future efficiency (${tcpi.toFixed(3)}) is below the 1.000 planned baseline. The project carries budget breathing room and can realistically hit ${targetName} at or slightly below planned cost efficiency.`;
  } else if (tcpi <= 1.03) {
    judgmentLabel = 'Realistic · Maintain Planned Pace';
    judgmentTone = 'realistic';
    judgmentDetail = `Required efficiency (${tcpi.toFixed(3)}) aligns closely with the 1.000 planned baseline. Hitting ${targetName} is realistic provided existing cost controls and certification discipline are sustained.`;
  } else if (tcpi <= 1.15) {
    judgmentLabel = 'Challenging · Recovery Needed';
    judgmentTone = 'caution';
    judgmentDetail = `To hit ${targetName}, remaining work requires ${tcpi.toFixed(3)} efficiency—${pctGapStr} higher than the 1.000 planned baseline. Recoverable only with active cost containment, strict variation control, and tighter IPC scrutiny.`;
  } else {
    judgmentLabel = 'Unrealistic · High Overrun Risk';
    judgmentTone = 'critical';
    judgmentDetail = `Requires ${tcpi.toFixed(3)} efficiency on remaining work—a ${pctGapStr} jump above the 1.000 planned baseline. Per PMI EVM guidance, sustaining such a sharp reversal late in delivery is typically unrealistic without scope adjustment or formal EAC re-baselining.`;
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
  const {
    BAC,
    EV,
    AC,
    EAC,
    eacScenarios,
    budgetThreshold,
    isOriginalBudgetExhausted,
    isBudgetThresholdExceeded,
    remainingFundsThreshold,
  } = evm;
  const activeScenarioObj = eacScenarios.find(s => s.id === activeScenario) || eacScenarios[0];
  const activeEac = EAC;
  const activeEacExceedsThreshold = isOriginalBudgetExhausted && activeEac > budgetThreshold;

  const primaryEval = useMemo(
    () =>
      isOriginalBudgetExhausted
        ? evaluateTcpiTarget('120% Budget Threshold (Original + 20%)', budgetThreshold, EV, AC, BAC, {
            isThresholdMode: true,
            budgetThreshold,
            formatBr,
          })
        : evaluateTcpiTarget('BAC (Original Budget)', BAC, EV, AC, BAC, {
            budgetThreshold,
            formatBr,
          }),
    [isOriginalBudgetExhausted, budgetThreshold, BAC, EV, AC, formatBr]
  );

  const eacEval = useMemo(() => {
    const base = evaluateTcpiTarget('EAC (Revised Forecast)', activeEac, EV, AC, BAC, {
      budgetThreshold,
      formatBr,
    });
    if (!isOriginalBudgetExhausted) return base;

    if (activeEacExceedsThreshold) {
      const overage = activeEac - budgetThreshold;
      return {
        ...base,
        judgmentLabel: 'Exceeds 120% Cap · Reduce Forecast',
        judgmentTone: 'critical' as const,
        thresholdText: `Forecast EAC exceeds the 120% Budget Threshold (${formatBr(budgetThreshold)}) by +${formatBr(overage)}.`,
        judgmentDetail: `Selected EAC (${formatBr(activeEac)}) breaches the 120% Budget Threshold (Original Contract + 20% = ${formatBr(budgetThreshold)}). Do not accept this overrun passively: enforce strict cost monitoring, cut discretionary ETC by at least ${formatBr(overage)}, block unapproved variations, and control site expenditure back within the 120% ceiling.`,
      };
    }

    return {
      ...base,
      judgmentTone: base.judgmentTone === 'favorable' ? ('realistic' as const) : base.judgmentTone,
      judgmentDetail: `${base.judgmentDetail} Because Original BAC is exhausted, enforce strict IPC verification and site cost control so this EAC remains safely within the 120% Budget Threshold (${formatBr(budgetThreshold)}).`,
    };
  }, [activeEac, EV, AC, BAC, budgetThreshold, formatBr, isOriginalBudgetExhausted, activeEacExceedsThreshold]);

  // Executive consolidated judgment
  const executiveSummary = useMemo(() => {
    if (isOriginalBudgetExhausted) {
      if (isBudgetThresholdExceeded) {
        return {
          headline: '120% Budget Threshold Breached — Emergency Cost Freeze & Strict Control',
          tone: 'critical' as const,
          narrative: `Original Contract Amount (${formatBr(BAC)}) is exhausted and Actual Cost (${formatBr(AC)}) has exceeded the 120% Budget Threshold (${formatBr(budgetThreshold)}) by ${formatBr(AC - budgetThreshold)}. Enforce immediate strict cost monitoring: freeze non-essential spending, reject unapproved variation orders, audit every certified IPC rate and quantity, and institute maximum project cost control to limit further escalation.`,
        };
      }
      if (primaryEval.thresholdRule === 'complete') {
        return {
          headline: 'Original Budget Exhausted — Strict Closeout Cost Control Within 120% Threshold',
          tone: 'caution' as const,
          narrative: `Baseline physical scope is earned while Original BAC (${formatBr(BAC)}) is exhausted. Enforce strict cost monitoring over final account settlements, variations, retention, and price adjustments so final expenditure stays inside the remaining ${formatBr(Math.max(0, remainingFundsThreshold))} headroom under the 120% Budget Threshold (${formatBr(budgetThreshold)}).`,
        };
      }
      if (activeEacExceedsThreshold) {
        return {
          headline: 'Original Budget Exhausted — Strict Cost Control Required to Hold 120% Threshold',
          tone: 'critical' as const,
          narrative: `Original BAC (${formatBr(BAC)}) is exhausted and active EAC (${formatBr(activeEac)}) projects a breach above the 120% Budget Threshold (${formatBr(budgetThreshold)}). Enforce strict cost monitoring, eliminate non-essential scope/variations, optimize resource productivity, and target TCPI (120%) = ${primaryEval.value !== null ? primaryEval.value.toFixed(3) : 'N/A'} to complete within the ${formatBr(Math.max(0, remainingFundsThreshold))} remaining threshold headroom.`,
        };
      }
      return {
        headline: 'Original Budget Exhausted — Active Strict Cost Monitoring Within 120% Threshold',
        tone: primaryEval.judgmentTone,
        narrative: `Original BAC (${formatBr(BAC)}) is exhausted; ${formatBr(Math.max(0, remainingFundsThreshold))} remains before reaching the 120% Budget Threshold (${formatBr(budgetThreshold)}). Enforce strict cost monitoring, rigorous IPC/BOQ verification, zero unapproved variations, and disciplined resource control (TCPI 120% = ${primaryEval.value !== null ? primaryEval.value.toFixed(3) : 'N/A'}) to keep final cost under the 120% cap.`,
      };
    }

    if (primaryEval.thresholdRule === 'complete') {
      return {
        headline: 'Baseline Scope Achieved — Monitor Final Closeout Settlement',
        tone: 'favorable' as const,
        narrative:
          'Earned Value matches Budget at Completion. TCPI no longer constrains ongoing baseline production; focus shifts to finalizing claims, retention, and Price Adjustment reconciliation.',
      };
    }
    if (primaryEval.value === null) {
      return {
        headline: 'Original BAC Exhausted — Enforce Strict Cost Control Within 120% Threshold',
        tone: 'critical' as const,
        narrative: `Actual Cost (${formatBr(AC)}) already exceeds Original BAC (${formatBr(BAC)}). Enforce strict cost monitoring and govern all remaining work to stay within the 120% Budget Threshold (${formatBr(budgetThreshold)}).`,
      };
    }
    if (primaryEval.value <= 1.0) {
      return {
        headline: 'On Track — Remaining Efficiency Supports Original Budget (BAC)',
        tone: 'favorable' as const,
        narrative: `TCPI to BAC (${primaryEval.value.toFixed(3)}) is at or below the 1.000 planned baseline. Remaining work enjoys budget breathing room and can meet the approved BAC without extraordinary cost cuts.`,
      };
    }
    if (primaryEval.judgmentTone === 'realistic') {
      return {
        headline: 'Realistic Target — Sustain Cost Discipline to Hold BAC',
        tone: 'realistic' as const,
        narrative: `TCPI to BAC (${primaryEval.value.toFixed(3)}) closely tracks the 1.000 planned baseline. Holding current productivity and preventing unapproved variations keeps BAC achievable.`,
      };
    }
    if (primaryEval.judgmentTone === 'caution') {
      return {
        headline: 'Efficiency Recovery Required — Tighten Cost Control or Track EAC',
        tone: 'caution' as const,
        narrative: `Meeting BAC requires achieving ${primaryEval.value.toFixed(3)} cost efficiency on remaining work. If recovery measures cannot close this gap, use the revised EAC (${formatBr(activeEac)}, TCPI ${eacEval.value !== null ? eacEval.value.toFixed(3) : 'N/A'}) as the realistic funding baseline.`,
      };
    }
    return {
      headline: 'Critical Alert — Original BAC Unlikely Without Re-Baselining',
      tone: 'critical' as const,
      narrative: `TCPI to BAC (${primaryEval.value.toFixed(3)}) exceeds the 1.000 baseline by +${(primaryEval.value - 1.0).toFixed(3)}. Under PMI EVM principles, reversing an overrun of this magnitude without scope revision is unrealistic; re-baseline governance around EAC (${formatBr(activeEac)}, TCPI ${eacEval.value !== null ? eacEval.value.toFixed(3) : 'N/A'}).`,
    };
  }, [
    isOriginalBudgetExhausted,
    isBudgetThresholdExceeded,
    primaryEval,
    eacEval,
    AC,
    BAC,
    budgetThreshold,
    remainingFundsThreshold,
    activeEac,
    activeEacExceedsThreshold,
    formatBr,
  ]);

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

  const primaryStyle = toneStyles(primaryEval.judgmentTone);
  const eacStyle = toneStyles(eacEval.judgmentTone);
  const execStyle = toneStyles(executiveSummary.tone);

  const maxBarScale = Math.max(
    1.5,
    primaryEval.value ?? 0,
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
              {isOriginalBudgetExhausted
                ? 'To-Complete Performance Index (TCPI) & Strict Cost Control Judgment (120% Threshold)'
                : 'To-Complete Performance Index (TCPI) & Cost Efficiency Judgment'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isOriginalBudgetExhausted
                ? `Original BAC is exhausted. Evaluates strict cost efficiency required on remaining work (BAC − EV) to hold total spend within the 120% Budget Threshold (Original Contract + 20% = ${formatBr(budgetThreshold)}).`
                : 'Measures cost efficiency required on remaining work (BAC − EV) relative to remaining funds available against the 1.000 planned baseline.'}
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
      <div className={`grid grid-cols-2 ${isOriginalBudgetExhausted ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isOriginalBudgetExhausted ? 'BAC · Original (Exhausted)' : 'BAC · Budget at Completion'}
          </div>
          <div className="mt-1 text-sm sm:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatBr(BAC)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isOriginalBudgetExhausted ? `Exceeded by ${formatBr(AC - BAC)}` : 'Total approved project budget'}
          </div>
        </div>

        {isOriginalBudgetExhausted && (
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
            <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              Budget Threshold (120%)
            </div>
            <div className="mt-1 text-sm sm:text-base font-bold font-mono tabular-nums text-amber-900 dark:text-amber-200">
              {formatBr(budgetThreshold)}
            </div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              Original Contract + 20% Cap
            </div>
          </div>
        )}

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
          <div className={`mt-1 text-sm sm:text-base font-bold font-mono tabular-nums ${activeEacExceedsThreshold ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
            {formatBr(activeEac)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={activeScenarioObj.title}>
            {isOriginalBudgetExhausted
              ? activeEacExceedsThreshold
                ? 'Breaches 120% Threshold'
                : 'Within 120% Threshold'
              : activeScenarioObj.title}
          </div>
        </div>
      </div>

      {/* Dual TCPI Formula & Target Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Card 1: TCPI to meet Original Budget (BAC) OR 120% Budget Threshold when Original Budget Exhausted */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/35 flex flex-col justify-between space-y-3.5">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {isOriginalBudgetExhausted
                    ? '1. To Meet 120% Budget Threshold (Original + 20%)'
                    : '1. To Meet Original Budget (BAC)'}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  {isOriginalBudgetExhausted
                    ? 'TCPI (120%) = (BAC − EV) / (1.20×BAC − AC)'
                    : 'TCPI = (BAC − EV) / (BAC − AC)'}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold font-mono tabular-nums ${primaryStyle.val}`}>
                  {primaryEval.value !== null ? primaryEval.value.toFixed(3) : 'N/A'}
                </div>
                <div className={`text-[11px] font-semibold ${primaryStyle.text}`}>
                  {primaryEval.judgmentLabel}
                </div>
              </div>
            </div>

            {/* Numerator & Denominator Breakdown */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-sans">Remaining Work (BAC &minus; EV)</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{formatBr(primaryEval.remainingWork)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 block font-sans">
                  {isOriginalBudgetExhausted ? 'Threshold Funds (120% Cap − AC)' : 'Remaining Funds (BAC − AC)'}
                </span>
                <span className={`font-bold ${primaryEval.remainingFunds <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {formatBr(primaryEval.remainingFunds)}
                </span>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${primaryStyle.surface}`}>
            <div className={`font-semibold ${primaryStyle.text}`}>
              {primaryEval.thresholdText}
            </div>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-[11.5px]">
              {primaryEval.judgmentDetail}
            </p>
          </div>
        </div>

        {/* Card 2: TCPI to meet Revised Forecast (EAC) */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/35 flex flex-col justify-between space-y-3.5">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {isOriginalBudgetExhausted
                    ? '2. To Control Selected Forecast (EAC vs. 120% Cap)'
                    : '2. To Meet Revised Forecast (EAC)'}
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

      {/* TCPI Target Comparison & Executive Judgment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Visual Comparison Bars */}
        <div className="lg:col-span-5 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/35 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              TCPI Target Comparison
            </span>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Baseline = 1.000
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Bar 1: TCPI (BAC or 120% Budget Threshold) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                <span className="font-sans font-medium text-slate-700 dark:text-slate-300">
                  {isOriginalBudgetExhausted ? 'TCPI to 120% Budget Threshold' : 'TCPI to BAC (Original Budget)'}
                </span>
                <span className={`font-bold ${primaryStyle.val}`}>
                  {primaryEval.value !== null
                    ? primaryEval.value.toFixed(3)
                    : isOriginalBudgetExhausted
                    ? '120% Cap Breached'
                    : 'Budget Exhausted'}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    primaryEval.value === null
                      ? 'bg-rose-600'
                      : primaryEval.judgmentTone === 'favorable'
                      ? 'bg-emerald-500'
                      : primaryEval.judgmentTone === 'realistic'
                      ? 'bg-blue-500'
                      : primaryEval.judgmentTone === 'caution'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: primaryEval.value !== null ? pctWidth(primaryEval.value) : '100%' }}
                />
              </div>
            </div>

            {/* Bar 2: TCPI (EAC) */}
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
            <span>
              {isOriginalBudgetExhausted
                ? 'Variance vs. Baseline (TCPI_120% − 1.000):'
                : 'Variance vs. Baseline (TCPI_BAC − 1.000):'}
            </span>
            <span className="font-bold">
              {primaryEval.efficiencyGap !== null
                ? `${primaryEval.efficiencyGap >= 0 ? '+' : ''}${primaryEval.efficiencyGap.toFixed(3)}`
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Executive Judgment & Cost Control Guide */}
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

          {/* Cost Control Interpretation Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
              <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {isOriginalBudgetExhausted ? 'TCPI (120%) = 1.0' : 'TCPI = 1.0'}
              </div>
              <div className="text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                {isOriginalBudgetExhausted
                  ? 'Strict cost discipline must sustain planned efficiency to stay inside the 120% threshold.'
                  : 'Remaining work must be executed at exact planned cost efficiency.'}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
              <div className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {isOriginalBudgetExhausted ? 'TCPI (120%) > 1.0' : 'TCPI > 1.0'}
              </div>
              <div className="text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                {isOriginalBudgetExhausted
                  ? 'Aggressive cost containment and IPC vetting are mandatory to avoid breaching the 120% ceiling.'
                  : 'Higher cost efficiency than planned is required to hit the target.'}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {isOriginalBudgetExhausted ? 'TCPI (120%) < 1.0' : 'TCPI < 1.0'}
              </div>
              <div className="text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                {isOriginalBudgetExhausted
                  ? 'Remaining 120% threshold headroom is protected only with strict cost monitoring.'
                  : 'Lower cost efficiency is needed; budget breathing room exists.'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            {isOriginalBudgetExhausted ? (
              <span>
                <strong className="text-slate-700 dark:text-slate-300">Strict Cost Control Mandate (120% Threshold):</strong> Once Original BAC is exhausted, the 120% Budget Threshold (Original Contract + 20% = {formatBr(budgetThreshold)}) is the absolute ceiling. Every project control action must focus on strict cost monitoring, eliminating unapproved variations, auditing IPC quantities, and efficient resource execution to finish within threshold.
              </span>
            ) : (
              <span>
                <strong className="text-slate-700 dark:text-slate-300">PMI Forecasting Context:</strong> Compare TCPI against the 1.000 planned baseline and revised EAC targets to judge realism. If TCPI significantly exceeds 1.000, meeting the budget target without formal scope or EAC adjustment becomes improbable.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
