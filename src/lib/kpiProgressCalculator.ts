import { Project, KpiAllocatedItem } from '../types';
import { isSameMonth, resolveCurrentMonthKey } from './monthlySync';

export interface ProgressKpiCalculationResult {
  monthKey: string;
  monthLabel: string;
  sourceDescription: string;
  unit: string;
  calculationBasis: 'monthly' | 'cumulative';
  
  // Specific Month from Monthly Status Report (% of Actual Divided by ERA Plan)
  eraMonthPlan: number;
  actualMonthAccomplishment: number;
  monthlyPerformanceRatio: number;   // ((actualMonth / eraMonth) * 100)
  monthlyVariance: number;          // actualMonth - eraMonth
  monthlySpi: number;               // actualMonth / eraMonth
  monthlyPp1Score: number;          // min(100, max(0, monthlyPerformanceRatio))
  monthlyFormulaExplanation: string;

  // Cumulative To-Date from Monthly Status Report (% of Actual Divided by ERA Plan)
  eraTodatePlan: number;
  actualTodateAccomplishment: number;
  cumulativePerformanceRatio: number; // ((actualTodate / eraTodate) * 100)
  cumulativeVariance: number;         // actualTodate - eraTodate
  cumulativeSpi: number;              // actualTodate / eraTodate
  cumulativePp1Score: number;         // min(100, max(0, cumulativePerformanceRatio))
  cumulativeFormulaExplanation: string;

  // Active / Selected PP-1 score & performance metrics
  pp1Score: number;
  performanceRatio: number;
  variancePctPoints: number;
  spi: number;
  status: 'Ahead' | 'On Track' | 'Minor Lag' | 'Critical Lag';
  statusDescription: string;
  formulaExplanation: string;

  // Standard compatibility fields
  plannedProgressToDate: number;
  actualProgressToDate: number;
  monthlyPlannedInc: number;
  monthlyActualInc: number;
  updatedKpiAllocated: KpiAllocatedItem[];
}

/**
 * Computes KPI scores for PP-1 (Planned vs actual physical completion)
 * directly from the Monthly Status Report of the specific month by dividing
 * actual accomplishment for ERA plan (% of Actual Divided by ERA Plan).
 *
 * Primary Source:
 * 1. project.progressPlanHistory (Archived Monthly Status Reports for completed months)
 * 2. project.progressPlan (Current/Live Monthly Status Report baseline)
 * 3. project.monthly (S-Curve Cumulative Baseline fallback)
 */
export function calculateProgressKpiScores(
  project: Project,
  targetMonthKey?: string,
  preferredBasis: 'monthly' | 'cumulative' = 'monthly'
): ProgressKpiCalculationResult {
  const monthKey = targetMonthKey || project.kpiActiveMonth || resolveCurrentMonthKey(project) || 'Oct-26';
  
  let eraMonthPlan = 0;
  let actualMonthAccomplishment = 0;
  let eraTodatePlan = 0;
  let actualTodateAccomplishment = 0;
  let source = '';
  let unit = 'Km';
  let isFoundInStatusReport = false;
  let resolvedMonthLabel = monthKey;

  // 1. Check project.progressPlanHistory (Archived Monthly Status Reports)
  const historyList = project.progressPlanHistory || [];
  const histItem = historyList.find(
    h => isSameMonth(h.monthLabel, monthKey) || 
         h.monthLabel.trim().toLowerCase() === monthKey.trim().toLowerCase() ||
         h.id === monthKey
  );

  if (histItem) {
    eraMonthPlan = typeof histItem.eraMonth === 'number' ? histItem.eraMonth : (typeof histItem.contractorMonth === 'number' ? histItem.contractorMonth : 0);
    actualMonthAccomplishment = typeof histItem.actualMonth === 'number' ? histItem.actualMonth : 0;
    eraTodatePlan = typeof histItem.eraTodate === 'number' ? histItem.eraTodate : (typeof histItem.contractorTodate === 'number' ? histItem.contractorTodate : 0);
    actualTodateAccomplishment = typeof histItem.actualTodate === 'number' ? histItem.actualTodate : (histItem.physicalProgress || 0);
    resolvedMonthLabel = histItem.monthLabel || monthKey;
    source = `Monthly Status Report Archive (${histItem.monthLabel})`;
    isFoundInStatusReport = true;
  } else {
    // 2. Check active project.progressPlan (Current / Live Monthly Status Report)
    const activeLabel = project.progressPlanLabels?.monthLabel || '';
    const isLiveMatch = isSameMonth(activeLabel, monthKey) || 
                        activeLabel.toLowerCase().includes(monthKey.toLowerCase()) || 
                        monthKey.toLowerCase().includes(activeLabel.toLowerCase()) ||
                        isSameMonth(resolveCurrentMonthKey(project), monthKey);

    if (project.progressPlan) {
      eraMonthPlan = project.progressPlan.era?.month ?? 0;
      actualMonthAccomplishment = project.progressPlan.actual?.month ?? 0;
      eraTodatePlan = project.progressPlan.era?.todate ?? 0;
      actualTodateAccomplishment = project.progressPlan.actual?.todate ?? 0;
      resolvedMonthLabel = isLiveMatch && activeLabel ? activeLabel : monthKey;
      source = `Current Monthly Status Report (${resolvedMonthLabel})`;
      isFoundInStatusReport = true;
    }
  }

  // 3. Fallback to project.monthly (S-Curve table) if no Status Report figures exist
  if (!isFoundInStatusReport || (eraMonthPlan === 0 && eraTodatePlan === 0)) {
    const monthlyList = project.monthly || [];
    const monthIdx = monthlyList.findIndex(m => isSameMonth(m.month, monthKey) || m.month.toLowerCase() === monthKey.toLowerCase());
    if (monthIdx !== -1) {
      unit = '%';
      const m = monthlyList[monthIdx];
      const rev = typeof m.revisedPlan === 'number' ? m.revisedPlan : parseFloat(String(m.revisedPlan || 0));
      const orig = typeof m.originalPlan === 'number' ? m.originalPlan : parseFloat(String(m.originalPlan || 0));
      eraTodatePlan = rev > 0 ? rev : orig;
      const act = typeof m.actual === 'number' ? m.actual : parseFloat(String(m.actual || 0));
      actualTodateAccomplishment = act > 0 ? act : (project.physicalProgress || 0);

      if (monthIdx > 0) {
        const prev = monthlyList[monthIdx - 1];
        const prevRev = typeof prev.revisedPlan === 'number' ? prev.revisedPlan : parseFloat(String(prev.revisedPlan || 0));
        const prevOrig = typeof prev.originalPlan === 'number' ? prev.originalPlan : parseFloat(String(prev.originalPlan || 0));
        const prevPlan = prevRev > 0 ? prevRev : prevOrig;
        const prevAct = typeof prev.actual === 'number' ? prev.actual : parseFloat(String(prev.actual || 0));
        eraMonthPlan = Math.max(0, eraTodatePlan - prevPlan);
        actualMonthAccomplishment = Math.max(0, actualTodateAccomplishment - prevAct);
      } else {
        eraMonthPlan = eraTodatePlan;
        actualMonthAccomplishment = actualTodateAccomplishment;
      }
      source = `Monthly Cumulative S-Curve Baseline (${monthKey})`;
    } else {
      unit = '%';
      actualTodateAccomplishment = project.physicalProgress || 0;
      eraTodatePlan = 100;
      actualMonthAccomplishment = actualTodateAccomplishment;
      eraMonthPlan = 100;
      source = `Overall Project Physical Progress Baseline`;
    }
  }

  // Ensure non-negative numbers
  eraMonthPlan = Math.max(0, Number(eraMonthPlan.toFixed(2)));
  actualMonthAccomplishment = Math.max(0, Number(actualMonthAccomplishment.toFixed(2)));
  eraTodatePlan = Math.max(0, Number(eraTodatePlan.toFixed(2)));
  actualTodateAccomplishment = Math.max(0, Number(actualTodateAccomplishment.toFixed(2)));

  // "% of Actual Divided by ERA Plan" Calculations:
  // 1. Monthly incremental conformance: (actualMonth / eraMonth) * 100
  const monthlyPerformanceRatio = eraMonthPlan > 0
    ? Number(((actualMonthAccomplishment / eraMonthPlan) * 100).toFixed(2))
    : (actualMonthAccomplishment > 0 ? 100 : 0);
  const monthlyVariance = Number((actualMonthAccomplishment - eraMonthPlan).toFixed(2));
  const monthlySpi = eraMonthPlan > 0 ? Number((actualMonthAccomplishment / eraMonthPlan).toFixed(3)) : 1.0;
  const monthlyPp1Score = Number(Math.min(100, Math.max(0, monthlyPerformanceRatio)).toFixed(2));

  // 2. Cumulative to-date conformance: (actualTodate / eraTodate) * 100
  const cumulativePerformanceRatio = eraTodatePlan > 0
    ? Number(((actualTodateAccomplishment / eraTodatePlan) * 100).toFixed(2))
    : (actualTodateAccomplishment > 0 ? 100 : 0);
  const cumulativeVariance = Number((actualTodateAccomplishment - eraTodatePlan).toFixed(2));
  const cumulativeSpi = eraTodatePlan > 0 ? Number((actualTodateAccomplishment / eraTodatePlan).toFixed(3)) : 1.0;
  const cumulativePp1Score = Number(Math.min(100, Math.max(0, cumulativePerformanceRatio)).toFixed(2));

  // Select effective basis (default to monthly specific-month if plan exists, else cumulative)
  const isMonthlyActive = preferredBasis === 'monthly' && eraMonthPlan > 0;
  const pp1Score = isMonthlyActive ? monthlyPp1Score : (eraTodatePlan > 0 ? cumulativePp1Score : monthlyPp1Score);
  const performanceRatio = isMonthlyActive ? monthlyPerformanceRatio : cumulativePerformanceRatio;
  const variancePctPoints = isMonthlyActive ? monthlyVariance : cumulativeVariance;
  const spi = isMonthlyActive ? monthlySpi : cumulativeSpi;

  // Formula explanations for transparency and auditing
  const monthlyFormulaExplanation = eraMonthPlan > 0
    ? `Monthly Status Report (${resolvedMonthLabel}): (Actual ${actualMonthAccomplishment.toFixed(2)} ${unit} / ERA Plan ${eraMonthPlan.toFixed(2)} ${unit}) * 100 = ${monthlyPerformanceRatio.toFixed(2)}% (Score: ${monthlyPp1Score.toFixed(2)}%)`
    : `Monthly Status Report (${resolvedMonthLabel}): ERA Monthly Plan is 0.00 ${unit}; Actual: ${actualMonthAccomplishment.toFixed(2)} ${unit}`;

  const cumulativeFormulaExplanation = eraTodatePlan > 0
    ? `Cumulative Status Report (${resolvedMonthLabel}): (Actual To-Date ${actualTodateAccomplishment.toFixed(2)} ${unit} / ERA To-Date Plan ${eraTodatePlan.toFixed(2)} ${unit}) * 100 = ${cumulativePerformanceRatio.toFixed(2)}% (Score: ${cumulativePp1Score.toFixed(2)}%)`
    : `Cumulative Status Report (${resolvedMonthLabel}): ERA To-Date Plan is 0.00 ${unit}; Actual: ${actualTodateAccomplishment.toFixed(2)} ${unit}`;

  const formulaExplanation = isMonthlyActive ? monthlyFormulaExplanation : cumulativeFormulaExplanation;

  // Status & Narrative
  let status: 'Ahead' | 'On Track' | 'Minor Lag' | 'Critical Lag' = 'On Track';
  let statusDescription = 'Physical progress aligns with the ERA Approved Plan.';
  if (performanceRatio >= 100) {
    status = 'Ahead';
    statusDescription = `Actual progress conforms to / exceeds ERA plan at ${performanceRatio.toFixed(1)}% (SPI: ${spi.toFixed(3)}).`;
  } else if (performanceRatio >= 90) {
    status = 'On Track';
    statusDescription = `Physical progress closely tracks ERA plan at ${performanceRatio.toFixed(1)}% (SPI: ${spi.toFixed(3)}).`;
  } else if (performanceRatio >= 75) {
    status = 'Minor Lag';
    statusDescription = `Minor progress shortfall against ERA plan at ${performanceRatio.toFixed(1)}% (SPI: ${spi.toFixed(3)}).`;
  } else {
    status = 'Critical Lag';
    statusDescription = `Critical progress shortfall against ERA plan at ${performanceRatio.toFixed(1)}% (SPI: ${spi.toFixed(3)}). Recovery schedule required.`;
  }

  // Update existing kpiAllocated items with PP-1 score
  const baseKpiList = project.kpiAllocated ? [...project.kpiAllocated] : [];
  const updatedKpiAllocated = baseKpiList.map(k => {
    if (k.itemId === 'PP-1') {
      return {
        ...k,
        alloc: pp1Score,
        isOverridden: false
      };
    }
    return k;
  });

  return {
    monthKey,
    monthLabel: resolvedMonthLabel,
    sourceDescription: source,
    unit,
    calculationBasis: preferredBasis,
    eraMonthPlan,
    actualMonthAccomplishment,
    monthlyPerformanceRatio,
    monthlyVariance,
    monthlySpi,
    monthlyPp1Score,
    monthlyFormulaExplanation,
    eraTodatePlan,
    actualTodateAccomplishment,
    cumulativePerformanceRatio,
    cumulativeVariance,
    cumulativeSpi,
    cumulativePp1Score,
    cumulativeFormulaExplanation,
    pp1Score,
    performanceRatio,
    variancePctPoints,
    spi,
    status,
    statusDescription,
    formulaExplanation,
    plannedProgressToDate: eraTodatePlan,
    actualProgressToDate: actualTodateAccomplishment,
    monthlyPlannedInc: eraMonthPlan,
    monthlyActualInc: actualMonthAccomplishment,
    updatedKpiAllocated
  };
}
