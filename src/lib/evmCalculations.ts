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
 */
export function calculateProjectEvm(project: Project): EvmMetrics {
  const MILLION = 1_000_000;
  
  // 1. Budget At Completion (BAC)
  const BAC = project.revisedContractAmountEtb 
    || project.contractAmountEtb 
    || ((project.origAmount || 0) * MILLION) 
    || 1;

  // 2. Actual Cost (AC) - Certified expenditure
  const rateIpc = project.usdExchangeRate || 57.50;
  const trackerIpcs = project.ipcTracker || [];

  const trackerCertifiedCombined = trackerIpcs.reduce((sum, item) => {
    return sum + (item.certifiedEtb || 0) + ((item.certifiedUsd || 0) * rateIpc);
  }, 0);

  const paymentList = project.payment || [];
  const paymentIpc = (paymentList.find(x => x.item.trim().toLowerCase().includes('total todate certified ipc')) || { amount: 0 }).amount;

  const actualPct = project.physicalProgress || 0;

  let AC = 0;
  if (trackerCertifiedCombined > 0) {
    AC = trackerCertifiedCombined;
  } else if (paymentIpc > 0) {
    AC = paymentIpc;
  } else {
    // Fallback if no IPCs are entered yet
    AC = BAC * (actualPct / 100) * 0.95;
  }

  // 3. Earned Value (EV) = BAC * Physical Progress %
  const EV = BAC * (actualPct / 100);

  // 4. Planned Progress % and Planned Value (PV)
  const monthlyList = project.monthly || [];
  let plannedPct = 100;

  if (monthlyList.length > 0) {
    const reportingMonths = monthlyList.filter(m => typeof m.actual === 'number' && m.actual > 0);
    const targetIdx = reportingMonths.length > 0 
      ? monthlyList.indexOf(reportingMonths[reportingMonths.length - 1]) 
      : (monthlyList.findIndex(m => typeof m.originalPlan === 'number' && m.originalPlan > 0) !== -1 
          ? monthlyList.findIndex(m => typeof m.originalPlan === 'number' && m.originalPlan > 0) 
          : 0);
    
    if (targetIdx !== -1) {
      const targetMonth = monthlyList[targetIdx];
      const hasReached100 = monthlyList.slice(0, targetIdx + 1).some(m => typeof m.originalPlan === 'number' && m.originalPlan >= 100);
      if (hasReached100) {
        plannedPct = 100;
      } else {
        const val = targetMonth ? (targetMonth.revisedPlan ?? targetMonth.originalPlan) : 100;
        plannedPct = typeof val === 'number' ? val : (Number(val) || 100);
      }
    }
  }

  const PV = BAC * (plannedPct / 100);

  // 5. CPI & SPI Ratios
  const CPI = AC > 0 ? (EV / AC) : 1.0;
  const SPI = PV > 0 ? (EV / PV) : 1.0;

  // 6. Variances
  const CV = EV - AC;
  const SV = EV - PV;
  const CV_pct = AC > 0 ? ((EV - AC) / AC) * 100 : 0;
  const SV_pct = PV > 0 ? ((EV - PV) / PV) * 100 : 0;
  const scheduleGapPct = actualPct - plannedPct;

  // 7. Forecasts
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
