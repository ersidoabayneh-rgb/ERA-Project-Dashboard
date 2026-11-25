import { Project, isProjectClosed } from '../types';

export type EacScenarioId =
  | 'cpi_continues'
  | 'original_plan_resumes'
  | 'cost_and_schedule'
  | 'bottom_up_etc';

export interface EacScenarioResult {
  id: EacScenarioId;
  number: 1 | 2 | 3 | 4;
  title: string;
  formula: string;
  whenToUse: string;
  etc: number;
  eac: number;
  vac: number;
  tcpiEac: number | null;
}

export interface EvmMetrics {
  BAC: number; // Budget At Completion (ETB)
  AC: number;  // Actual Cost (ETB)
  EV: number;  // Earned Value (ETB)
  PV: number;  // Planned Value (ETB)
  plannedPct: number; // Planned physical progress % (Original cumulative plan %)
  originalPlannedPct?: number; // Baseline Original Plan %
  revisedPlannedPct?: number; // Optional Revised Plan % for reference
  planLabel?: string; // "Original Plan"
  actualPct: number;  // Actual physical progress %
  CPI: number; // Cost Performance Index (EV / AC)
  SPI: number; // Schedule Performance Index (EV / PV)
  CV: number;  // Cost Variance (EV - AC) in ETB
  SV: number;  // Schedule Variance (EV - PV) in ETB
  CV_pct: number; // (EV - AC) / AC * 100
  SV_pct: number; // (EV - PV) / PV * 100
  scheduleGapPct: number; // actualPct - plannedPct
  EAC: number; // Estimate At Completion (active scenario)
  ETC: number; // Estimate To Complete (active scenario)
  VAC: number; // Variance At Completion (BAC - EAC)
  activeEacScenario: EacScenarioId;
  bottomUpEtc: number;
  eacScenarios: EacScenarioResult[];
  TCPI: number; // To-Complete Performance Index (BAC - EV) / (BAC - AC)
  remainingWork: number; // BAC - EV
  remainingFundsBac: number; // BAC - AC
  remainingFundsEac: number; // EAC - AC
  tcpiBac: number | null; // To meet original budget (BAC): (BAC - EV) / (BAC - AC), null if BAC - AC <= 0
  tcpiEac: number | null; // To meet revised forecast (EAC): (BAC - EV) / (EAC - AC), null if EAC - AC <= 0
  cpiStatus: {
    label: string;
    description: string;
    isGood: boolean;
    isWarn: boolean;
    isCritical: boolean;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  };
  spiStatus: {
    label: string;
    description: string;
    isGood: boolean;
    isWarn: boolean;
    isCritical: boolean;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  };
}

/**
 * Computes unified, standard Earned Value Management (EVM) metrics for any Project.
 * Single source of truth across all views, executive summaries, audit modules, and reports.
 * 
 * EVM Fundamentals:
 * - BAC (Budget At Completion): Original Contract Amount (in ETB).
 * - AC (Actual Cost): Total Certified IPC Value (in ETB).
 * - EV (Earned Value): BAC * (Physical Progress % / 100).
 * - PV (Planned Value): BAC * (Original Plan % / 100) from the monthly cumulative page.
 *   If the original plan reaches or exceeds 100%, PV = 100% * Original Contract Amount (BAC).
 * - CPI (Cost Performance Index): EV / AC.
 * - SPI (Schedule Performance Index): EV / PV = Physical Progress % / Original Plan %.
 */
export function calculateProjectEvm(
  project: Project,
  options?: { eacScenario?: EacScenarioId; bottomUpEtcEtb?: number }
): EvmMetrics {
  const MILLION = 1_000_000;
  
  // 1. Budget At Completion (BAC) = Original Contract Amount
  const BAC = project.contractAmountEtb 
    || ((project.origAmount || 0) * MILLION) 
    || project.revisedContractAmountEtb 
    || 1;

  // 2. Actual Cost (AC) = Total Certified IPC Value
  const rateIpc = project.usdExchangeRate || 57.50;
  const trackerIpcs = project.ipcTracker || [];

  // Certified total from IPC Tracker (ETB + USD converted to ETB)
  const trackerCertifiedCombined = trackerIpcs.reduce((sum, item) => {
    return sum + (item.certifiedEtb || 0) + ((item.certifiedUsd || 0) * rateIpc);
  }, 0);

  // Certified total from Payment Table
  const paymentList = project.payment || [];
  const paymentIpc = (paymentList.find(x => x.item.trim().toLowerCase().includes('total todate certified ipc')) || { amount: 0 }).amount;

  const actualPct = typeof project.physicalProgress === 'number' 
    ? project.physicalProgress 
    : (Number(project.physicalProgress) || 0);

  let AC = 0;
  if (trackerCertifiedCombined > 0) {
    AC = trackerCertifiedCombined;
  } else if (paymentIpc > 0) {
    AC = paymentIpc;
  } else {
    // If no IPC records exist yet, fallback to 0 or estimated output
    AC = actualPct > 0 ? BAC * (actualPct / 100) * 0.95 : 0;
  }

  // 3. Earned Value (EV) = BAC * Physical Progress %
  const EV = BAC * (actualPct / 100);

  // 4. Planned Value (PV) based on Monthly Cumulative S-Curve Original Plan %
  // Rule: Planned Value (PV) = original cumulative planned % * original contract amount (BAC).
  // If the original cumulative % reached 100% before that month, take 100% as original cumulative %.
  const monthlyList = project.monthly || [];
  let plannedPct = 100;
  let originalPlannedPct = 100;
  let revisedPlannedPct: number | undefined = undefined;
  let planLabel = 'Original Plan';

  const parseNum = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  if (monthlyList.length > 0) {
    let targetIdx = -1;

    // Check if project has an explicit active evaluation month selected
    if (project.kpiActiveMonth) {
      const activeIdx = monthlyList.findIndex(
        m => m.month && m.month.toLowerCase().trim() === project.kpiActiveMonth?.toLowerCase().trim()
      );
      if (activeIdx !== -1) {
        targetIdx = activeIdx;
      }
    }

    // Otherwise, find reporting month with latest active actual progress
    if (targetIdx === -1) {
      const reportingMonths = monthlyList.filter(m => {
        const act = parseNum(m.actual);
        return act !== null && act > 0;
      });
      if (reportingMonths.length > 0) {
        targetIdx = monthlyList.indexOf(reportingMonths[reportingMonths.length - 1]);
      } else {
        // Fallback: first month where originalPlan or revisedPlan > 0
        targetIdx = monthlyList.findIndex(m => {
          const op = parseNum(m.originalPlan);
          const rp = parseNum(m.revisedPlan);
          return (op !== null && op > 0) || (rp !== null && rp > 0);
        });
        if (targetIdx === -1) targetIdx = 0;
      }
    }

    if (targetIdx !== -1) {
      const targetMonth = monthlyList[targetIdx];
      const rawOriginalPlan = parseNum(targetMonth?.originalPlan);
      const rawRevisedPlan = parseNum(targetMonth?.revisedPlan);

      if (rawRevisedPlan !== null) {
        revisedPlannedPct = Math.max(0, rawRevisedPlan);
      }

      // Check if original cumulative % reached 100% before that month (or at that month)
      const hasOrigReached100BeforeMonth = monthlyList.slice(0, targetIdx).some(m => {
        const op = parseNum(m.originalPlan);
        return op !== null && op >= 100;
      });
      const isCurrentMonthOrig100 = rawOriginalPlan !== null && rawOriginalPlan >= 100;

      if (hasOrigReached100BeforeMonth || isCurrentMonthOrig100) {
        // If original cumulative % reached 100% before or at that month, take 100% as original cumulative %
        originalPlannedPct = 100;
      } else if (rawOriginalPlan !== null) {
        originalPlannedPct = Math.max(0, rawOriginalPlan);
      } else {
        // If target month has no raw original plan entry, check if prior months reached 100% or take the latest prior original plan
        const priorOps = monthlyList
          .slice(0, targetIdx)
          .map(m => parseNum(m.originalPlan))
          .filter((v): v is number => v !== null);

        if (priorOps.length > 0 && Math.max(...priorOps) >= 100) {
          originalPlannedPct = 100;
        } else if (priorOps.length > 0) {
          originalPlannedPct = priorOps[priorOps.length - 1];
        } else {
          originalPlannedPct = 100;
        }
      }

      // Enforce: planned value on EVM must be the original cumulative planned % times the original contract amount
      plannedPct = originalPlannedPct;
      planLabel = 'Original Plan';
    }
  }

  // Planned Value (PV) = Planned % (Original Plan Cumulative %) * Original Contract Amount (BAC)
  const PV = BAC * (plannedPct / 100);

  const isClosed = isProjectClosed(project.status);

  // 5. Cost Performance Index (CPI) = EV / AC
  const CPI = AC > 0 ? (EV / AC) : 1.0;

  // 6. Schedule Performance Index (SPI) = EV / PV = Actual % / Planned %
  const SPI = PV > 0 ? (EV / PV) : 1.0;

  // 7. Variances
  const CV = EV - AC;
  const SV = EV - PV;
  const CV_pct = AC > 0 ? ((EV - AC) / AC) * 100 : 0;
  const SV_pct = PV > 0 ? ((EV - PV) / PV) * 100 : 0;
  const scheduleGapPct = actualPct - plannedPct;

  // 8. Forecasts (4 Standard EVM EAC Scenarios) & TCPI
  const remainingWork = Math.max(0, BAC - EV);

  // Scenario 1: Current cost performance continues -> EAC = BAC / CPI
  const eacS1 = CPI > 0 ? BAC / CPI : BAC;
  const etcS1 = Math.max(0, eacS1 - AC);

  // Scenario 2: Original budget plan resumes -> EAC = AC + (BAC - EV)
  const etcS2 = remainingWork;
  const eacS2 = AC + etcS2;

  // Scenario 3: Both cost and schedule affect future work -> EAC = AC + (BAC - EV) / (CPI * SPI)
  const cpiSpi = CPI * SPI;
  const etcS3 = cpiSpi > 0 ? remainingWork / cpiSpi : remainingWork;
  const eacS3 = AC + etcS3;

  // Scenario 4: Original estimate is fundamentally flawed -> EAC = AC + Bottom-up ETC
  const rawBottomUpEtc = options?.bottomUpEtcEtb ?? project.bottomUpEtcEtb;
  const bottomUpEtc =
    typeof rawBottomUpEtc === 'number' && !isNaN(rawBottomUpEtc) && rawBottomUpEtc >= 0
      ? rawBottomUpEtc
      : remainingWork;
  const eacS4 = AC + bottomUpEtc;

  const computeTcpiForEac = (eacVal: number): number | null => {
    if (remainingWork <= 0) return 0;
    const remFunds = eacVal - AC;
    return remFunds > 0 ? remainingWork / remFunds : null;
  };

  const eacScenarios: EacScenarioResult[] = [
    {
      id: 'cpi_continues',
      number: 1,
      title: 'Current cost performance continues',
      formula: 'EAC = BAC / CPI',
      whenToUse: 'Past cost variance is typical and expected to continue through the end of the project. (Most common)',
      etc: etcS1,
      eac: eacS1,
      vac: BAC - eacS1,
      tcpiEac: computeTcpiForEac(eacS1),
    },
    {
      id: 'original_plan_resumes',
      number: 2,
      title: 'Original budget plan resumes',
      formula: 'EAC = AC + (BAC − EV)',
      whenToUse: 'Past cost variances were one-time events, and future work will proceed at the originally planned rate.',
      etc: etcS2,
      eac: eacS2,
      vac: BAC - eacS2,
      tcpiEac: computeTcpiForEac(eacS2),
    },
    {
      id: 'cost_and_schedule',
      number: 3,
      title: 'Both cost and schedule affect future work',
      formula: 'EAC = AC + (BAC − EV) / (CPI × SPI)',
      whenToUse: 'The project is behind schedule, and you must spend extra money to meet a strict deadline.',
      etc: etcS3,
      eac: eacS3,
      vac: BAC - eacS3,
      tcpiEac: computeTcpiForEac(eacS3),
    },
    {
      id: 'bottom_up_etc',
      number: 4,
      title: 'Original estimate is fundamentally flawed',
      formula: 'EAC = AC + Bottom-up ETC',
      whenToUse: 'Original assumptions are no longer valid, requiring a completely new manual estimate for remaining work.',
      etc: bottomUpEtc,
      eac: eacS4,
      vac: BAC - eacS4,
      tcpiEac: computeTcpiForEac(eacS4),
    },
  ];

  const activeEacScenario: EacScenarioId = options?.eacScenario ?? project.eacScenario ?? 'cpi_continues';
  const selectedScenarioObj = eacScenarios.find(s => s.id === activeEacScenario) || eacScenarios[0];

  const EAC = selectedScenarioObj.eac;
  const ETC = selectedScenarioObj.etc;
  const VAC = BAC - EAC;
  const remainingFundsBac = BAC - AC;
  const remainingFundsEac = EAC - AC;
  const tcpiBac = remainingWork <= 0 ? 0 : remainingFundsBac > 0 ? remainingWork / remainingFundsBac : null;
  const tcpiEac = selectedScenarioObj.tcpiEac;
  const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : 1.0;

  // 8. Status Badges & Descriptive Text
  const isCpiGood = CPI >= 1.0;
  const isCpiWarn = CPI >= 0.90 && CPI < 1.0;
  const isCpiCritical = CPI < 0.90;

  let cpiStatusLabel = 'Under Budget';
  let cpiDescription = 'Spending is well within raw BOQ margin.';
  let cpiColor = 'text-emerald-600 dark:text-emerald-400';
  let cpiBg = 'bg-emerald-50 dark:bg-emerald-950/20';
  let cpiBorder = 'border-emerald-200 dark:border-emerald-800';

  if (isCpiCritical) {
    cpiStatusLabel = 'Critical Overrun';
    cpiDescription = 'Certified outlays substantially exceed physical earned value.';
    cpiColor = 'text-rose-600 dark:text-rose-400';
    cpiBg = 'bg-rose-50 dark:bg-rose-950/20';
    cpiBorder = 'border-rose-200 dark:border-rose-800';
  } else if (isCpiWarn) {
    cpiStatusLabel = 'Minor Overrun';
    cpiDescription = 'Certified progress slightly outpaces earned physical value.';
    cpiColor = 'text-amber-600 dark:text-amber-400';
    cpiBg = 'bg-amber-50 dark:bg-amber-950/20';
    cpiBorder = 'border-amber-200 dark:border-amber-800';
  }

  const isSpiGood = SPI >= 1.0;
  const isSpiWarn = SPI >= 0.90 && SPI < 1.0;
  const isSpiCritical = SPI < 0.90;

  const isTerminatedClosed = project.status === 'Terminated and Closed' || project.status === 'Terminated';
  let spiStatusLabel = isClosed ? (isTerminatedClosed ? 'Terminated & Closed' : 'Completed & Closed') : 'Ahead / On Track';
  let spiDescription = isClosed 
    ? (isTerminatedClosed ? 'Project lifecycle terminated & closed. Last evaluation values frozen.' : 'Project lifecycle completed & closed. Last evaluation values frozen.')
    : 'Progress meets or exceeds cumulative planned milestone.';
  let spiColor = isClosed ? (isTerminatedClosed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400') : 'text-emerald-600 dark:text-emerald-400';
  let spiBg = isClosed ? (isTerminatedClosed ? 'bg-rose-50 dark:bg-rose-950/20' : 'bg-emerald-50 dark:bg-emerald-950/20') : 'bg-emerald-50 dark:bg-emerald-950/20';
  let spiBorder = isClosed ? (isTerminatedClosed ? 'border-rose-200 dark:border-rose-800' : 'border-emerald-200 dark:border-emerald-800') : 'border-emerald-200 dark:border-emerald-800';

  if (!isClosed) {
    if (isSpiCritical) {
      spiStatusLabel = 'Critical Delay';
      spiDescription = 'Severe physical progress slippage compared to S-curve baseline.';
      spiColor = 'text-rose-600 dark:text-rose-400';
      spiBg = 'bg-rose-50 dark:bg-rose-950/20';
      spiBorder = 'border-rose-200 dark:border-rose-800';
    } else if (isSpiWarn) {
      spiStatusLabel = 'Minor Lag';
      spiDescription = 'Physical execution slightly behind S-curve plan.';
      spiColor = 'text-amber-600 dark:text-amber-400';
      spiBg = 'bg-amber-50 dark:bg-amber-950/20';
      spiBorder = 'border-amber-200 dark:border-amber-800';
    }
  }

  return {
    BAC,
    AC,
    EV,
    PV,
    plannedPct,
    originalPlannedPct,
    revisedPlannedPct,
    planLabel,
    actualPct,
    CPI,
    SPI,
    CV,
    SV,
    CV_pct,
    SV_pct,
    scheduleGapPct,
    EAC,
    ETC,
    VAC,
    activeEacScenario,
    bottomUpEtc,
    eacScenarios,
    TCPI,
    remainingWork,
    remainingFundsBac,
    remainingFundsEac,
    tcpiBac,
    tcpiEac,
    cpiStatus: {
      label: cpiStatusLabel,
      description: cpiDescription,
      isGood: isCpiGood,
      isWarn: isCpiWarn,
      isCritical: isCpiCritical,
      colorClass: cpiColor,
      bgClass: cpiBg,
      borderClass: cpiBorder,
    },
    spiStatus: {
      label: spiStatusLabel,
      description: spiDescription,
      isGood: isSpiGood,
      isWarn: isSpiWarn,
      isCritical: isSpiCritical,
      colorClass: spiColor,
      bgClass: spiBg,
      borderClass: spiBorder,
    },
  };
}
