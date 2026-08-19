import { Project } from '../types';

export interface EvmMetrics {
  BAC: number; // Budget At Completion (ETB)
  AC: number;  // Actual Cost (ETB)
  EV: number;  // Earned Value (ETB)
  PV: number;  // Planned Value (ETB)
  plannedPct: number; // Planned physical progress %
  actualPct: number;  // Actual physical progress %
  CPI: number; // Cost Performance Index (EV / AC)
  SPI: number; // Schedule Performance Index (EV / PV)
  CV: number;  // Cost Variance (EV - AC) in ETB
  SV: number;  // Schedule Variance (EV - PV) in ETB
  CV_pct: number; // (EV - AC) / AC * 100
  SV_pct: number; // (EV - PV) / PV * 100
  scheduleGapPct: number; // actualPct - plannedPct
  EAC: number; // Estimate At Completion (BAC / CPI)
  VAC: number; // Variance At Completion (BAC - EAC)
  TCPI: number; // To-Complete Performance Index (BAC - EV) / (BAC - AC)
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
export function calculateProjectEvm(project: Project): EvmMetrics {
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

  // 4. Planned Value (PV) based on Monthly Cumulative Original Plan %
  const monthlyList = project.monthly || [];
  let plannedPct = 100;

  const parseNum = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  if (monthlyList.length > 0) {
    // Find reporting months with active actual progress
    const reportingMonths = monthlyList.filter(m => {
      const act = parseNum(m.actual);
      return act !== null && act > 0;
    });

    let targetIdx = -1;
    if (reportingMonths.length > 0) {
      targetIdx = monthlyList.indexOf(reportingMonths[reportingMonths.length - 1]);
    } else {
      // If no actual progress is recorded yet, find the first month where originalPlan > 0
      targetIdx = monthlyList.findIndex(m => {
        const op = parseNum(m.originalPlan);
        return op !== null && op > 0;
      });
      if (targetIdx === -1) targetIdx = 0;
    }

    if (targetIdx !== -1) {
      // Check if original plan has reached 100% at or prior to the target reporting month
      const hasReached100 = monthlyList.slice(0, targetIdx + 1).some(m => {
        const op = parseNum(m.originalPlan);
        return op !== null && op >= 100;
      });

      if (hasReached100) {
        // If it reached 100%, take 100% of original contract amount
        plannedPct = 100;
      } else {
        const targetMonth = monthlyList[targetIdx];
        const rawOriginalPlan = parseNum(targetMonth?.originalPlan);
        
        if (rawOriginalPlan !== null) {
          if (rawOriginalPlan >= 100) {
            plannedPct = 100;
          } else {
            plannedPct = Math.max(0, rawOriginalPlan);
          }
        } else {
          // Fallback to revisedPlan or 100 if originalPlan is absent
          const rawRevisedPlan = parseNum(targetMonth?.revisedPlan);
          plannedPct = rawRevisedPlan !== null ? Math.min(100, Math.max(0, rawRevisedPlan)) : 100;
        }
      }
    }
  }

  // Planned Value (PV) = Planned % * Original Contract Amount (BAC)
  const PV = BAC * (plannedPct / 100);

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

  // 8. Forecasts
  const EAC = CPI > 0 ? (BAC / CPI) : BAC;
  const VAC = BAC - EAC;
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

  let spiStatusLabel = 'Ahead / On Track';
  let spiDescription = 'Progress meets or exceeds cumulative planned milestone.';
  let spiColor = 'text-emerald-600 dark:text-emerald-400';
  let spiBg = 'bg-emerald-50 dark:bg-emerald-950/20';
  let spiBorder = 'border-emerald-200 dark:border-emerald-800';

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

  return {
    BAC,
    AC,
    EV,
    PV,
    plannedPct,
    actualPct,
    CPI,
    SPI,
    CV,
    SV,
    CV_pct,
    SV_pct,
    scheduleGapPct,
    EAC,
    VAC,
    TCPI,
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
