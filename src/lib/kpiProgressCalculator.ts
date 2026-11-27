import { DailyActivityRecord, EfyAnnualLayerPlan, KpiAllocatedItem, Project } from '../types';
import { isSameMonth, resolveCurrentMonthKey } from './monthlySync';
import {
  clampTodateToProjectLength,
  computeLinkedEfyMetrics,
  normalize12,
  normalizeEfyYearPlan,
  resolveEfySlot
} from './efyPlanSync';
import { computeMonthlyKmSummary, normalizeSpecialSectionId } from './monthlyActivitiesPdfGenerator';

export interface PavementLayerKpiComparison {
  key: 'subbase' | 'basecourse' | 'asphalt';
  label: string;
  sectionId: string;
  monthPlanKm: number;
  monthActualKm: number;
  todatePlanKm: number;
  todateActualKm: number;
  monthlyRatioPct: number;
  cumulativeRatioPct: number;
  varianceKm: number;
  scorePct: number;
  hasMonthPlan: boolean;
  hasTodatePlan: boolean;
  dailyEntryCount: number;
  dailyLoggedDays: number;
}

export interface PavementKpiCalculationResult {
  monthKey: string;
  targetMonthYYYYMM: string;
  layers: PavementLayerKpiComparison[];
  subbase: PavementLayerKpiComparison;
  basecourse: PavementLayerKpiComparison;
  asphalt: PavementLayerKpiComparison;
  pp3Score: number;
  pp3PerformanceRatio: number;
  pp3SourceDescription: string;
  pp3FormulaExplanation: string;
  usesEfyPlan: boolean;
  usesDailyActivities: boolean;
  plannedMonthTotalKm: number;
  actualMonthTotalKm: number;
  overallMonthlyRatioPct: number;
}

export interface ProgressKpiCalculationResult {
  monthKey: string;
  monthLabel: string;
  sourceDescription: string;
  unit: string;
  calculationBasis: 'monthly' | 'cumulative';

  // Specific Month (% of Actual Divided by Plan)
  eraMonthPlan: number;
  contractorMonthPlan?: number;
  actualMonthAccomplishment: number;
  monthlyPerformanceRatio: number;   // ((actualMonth / eraMonth) * 100)
  monthlyVariance: number;          // actualMonth - eraMonth
  monthlySpi: number;               // actualMonth / eraMonth
  monthlyPp1Score: number;          // min(100, max(0, monthlyPerformanceRatio))
  monthlyFormulaExplanation: string;

  // Cumulative To-Date (% of Actual Divided by Plan)
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

  // EFY & Daily Activities telemetry flags
  dailyLoggedDaysCount?: number;
  usesEfyPhysicalPlan?: boolean;
  usesDailyKmAccomplishment?: boolean;
  targetMonthYYYYMM?: string;

  // Pavement KPI Comparison (Sub-Base, Base Course, Asphalt Concrete -> PP-3)
  pavement: PavementKpiCalculationResult;

  // Standard compatibility fields
  plannedProgressToDate: number;
  actualProgressToDate: number;
  monthlyPlannedInc: number;
  monthlyActualInc: number;
  updatedKpiAllocated: KpiAllocatedItem[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Safely converts a DailyActivityRecord distance entry (Sub-Base sec '8', Base Course sec '9', AC sec '11')
 * to kilometers (Km), handling rows entered in meters (metricM / unit: 'm') or kilometers (metricKm / unit: 'km').
 */
export function extractDailyActivityKm(act: DailyActivityRecord): number {
  const unit = String(act.unit || '').trim().toLowerCase();
  const rawKm = Number(act.metricKm);
  const kmVal = Number.isFinite(rawKm) && rawKm >= 0 ? rawKm : 0;
  const rawM = Number(act.metricM);
  const mVal = Number.isFinite(rawM) && rawM >= 0 ? rawM : 0;
  const rawQty = Number(act.quantityExecuted);
  const qtyVal = Number.isFinite(rawQty) && rawQty >= 0 ? rawQty : 0;

  if (unit === 'km') {
    if (kmVal > 0) return kmVal;
    if (mVal > 0) return mVal / 1000;
    return qtyVal;
  }

  if (unit === 'm') {
    if (mVal > 0 && kmVal > 0 && Math.abs(kmVal - mVal / 1000) < 0.0005) {
      return kmVal;
    }
    if (mVal > 0 && kmVal === 0) {
      return mVal / 1000;
    }
    if (kmVal > 20 && qtyVal === kmVal) {
      return kmVal / 1000;
    }
    if (kmVal > 0) return kmVal > 20 ? kmVal / 1000 : kmVal;
    if (mVal > 0) return mVal / 1000;
    return qtyVal > 20 ? qtyVal / 1000 : qtyVal;
  }

  if (kmVal > 0) return kmVal;
  if (mVal > 0) return mVal / 1000;
  return qtyVal > 20 ? qtyVal / 1000 : qtyVal;
}

function computePavementEfyPlanForSlot(
  efyPlans: Record<string, EfyAnnualLayerPlan> | undefined,
  efyYear: string,
  monthIndex: number,
  field: 'subBasePlan' | 'baseCoursePlan' | 'asphaltPlan',
  maxLengthKm?: number
): {
  monthPlanKm: number;
  todatePlanKm: number;
  hasMonthPlan: boolean;
  hasTodatePlan: boolean;
} {
  const activeRaw = efyPlans?.[efyYear];
  const activeNormalized = activeRaw ? normalizeEfyYearPlan(efyYear, activeRaw) : null;
  const activeArr = activeNormalized ? activeNormalized[field] : [];
  const rawMonthVal = activeArr[monthIndex] ?? null;
  const hasMonthPlan = typeof rawMonthVal === 'number' && Number.isFinite(rawMonthVal);
  const monthPlanKm = hasMonthPlan ? round3(Math.max(0, rawMonthVal as number)) : 0;

  const targetYearNum = Number(efyYear);
  let hasTodatePlan = false;
  let todateSum = 0;

  if (efyPlans && Number.isFinite(targetYearNum)) {
    const sortedYears = Object.keys(efyPlans)
      .filter(k => /^\d{4}$/.test(k))
      .sort((a, b) => Number(a) - Number(b));
    for (const yrKey of sortedYears) {
      const yrNum = Number(yrKey);
      if (yrNum > targetYearNum) continue;
      const arr = normalize12(efyPlans[yrKey]?.[field]);
      const limit = yrNum === targetYearNum ? monthIndex : 11;
      for (let i = 0; i <= limit; i++) {
        const v = arr[i];
        if (typeof v === 'number' && Number.isFinite(v)) {
          hasTodatePlan = true;
          todateSum += v;
        }
      }
    }
  }

  const todatePlanKm = hasTodatePlan
    ? clampTodateToProjectLength(todateSum, maxLengthKm)
    : 0;

  return {
    monthPlanKm,
    todatePlanKm,
    hasMonthPlan,
    hasTodatePlan
  };
}

function computePavementKpiComparison(
  project: Project,
  monthKey: string,
  targetMonthYYYYMM: string,
  efyYear: string,
  monthIndex: number,
  preferredBasis: 'monthly' | 'cumulative'
): PavementKpiCalculationResult {
  const maxLengthKm = project.lengthKm && project.lengthKm > 0 ? project.lengthKm : undefined;
  const activities = Array.isArray(project.dailyActivities) ? project.dailyActivities : [];

  const layerConfigs: Array<{
    key: 'subbase' | 'basecourse' | 'asphalt';
    label: string;
    sectionId: string;
    planField: 'subBasePlan' | 'baseCoursePlan' | 'asphaltPlan';
  }> = [
    { key: 'subbase', label: 'Sub-Base', sectionId: '8', planField: 'subBasePlan' },
    { key: 'basecourse', label: 'Base Course', sectionId: '9', planField: 'baseCoursePlan' },
    { key: 'asphalt', label: 'Asphalt Concrete (AC)', sectionId: '11', planField: 'asphaltPlan' }
  ];

  const layers: PavementLayerKpiComparison[] = layerConfigs.map(cfg => {
    const planStats = computePavementEfyPlanForSlot(
      project.efyPlans,
      efyYear,
      monthIndex,
      cfg.planField,
      maxLengthKm
    );

    const matchingActs = activities.filter(
      act => Boolean(act.date) && normalizeSpecialSectionId(act.activityType, act) === cfg.sectionId
    );
    const monthActs = matchingActs.filter(act => act.date.slice(0, 7) === targetMonthYYYYMM);
    const todateActs = matchingActs.filter(act => act.date.slice(0, 7) <= targetMonthYYYYMM);

    const monthActualKm = round3(monthActs.reduce((sum, act) => sum + extractDailyActivityKm(act), 0));
    const todateActualKm = round3(todateActs.reduce((sum, act) => sum + extractDailyActivityKm(act), 0));
    const dailyLoggedDays = new Set(monthActs.map(act => act.date)).size;

    const monthlyRatioPct =
      planStats.monthPlanKm > 0
        ? round2((monthActualKm / planStats.monthPlanKm) * 100)
        : monthActualKm > 0
          ? 100
          : 0;
    const cumulativeRatioPct =
      planStats.todatePlanKm > 0
        ? round2((todateActualKm / planStats.todatePlanKm) * 100)
        : todateActualKm > 0
          ? 100
          : 0;

    const useMonthly = preferredBasis === 'monthly' && planStats.monthPlanKm > 0;
    const activeRatio = useMonthly
      ? monthlyRatioPct
      : planStats.todatePlanKm > 0
        ? cumulativeRatioPct
        : monthlyRatioPct;

    const scorePct = round2(Math.min(100, Math.max(0, activeRatio)));
    const varianceKm = round3(
      useMonthly
        ? monthActualKm - planStats.monthPlanKm
        : todateActualKm - planStats.todatePlanKm
    );

    return {
      key: cfg.key,
      label: cfg.label,
      sectionId: cfg.sectionId,
      monthPlanKm: planStats.monthPlanKm,
      monthActualKm,
      todatePlanKm: planStats.todatePlanKm,
      todateActualKm,
      monthlyRatioPct,
      cumulativeRatioPct,
      varianceKm,
      scorePct,
      hasMonthPlan: planStats.hasMonthPlan,
      hasTodatePlan: planStats.hasTodatePlan,
      dailyEntryCount: monthActs.length,
      dailyLoggedDays
    };
  });

  const subbase = layers[0];
  const basecourse = layers[1];
  const asphalt = layers[2];

  const usesEfyPlan = layers.some(l => l.hasMonthPlan || l.hasTodatePlan);
  const usesDailyActivities =
    asphalt.hasMonthPlan ||
    asphalt.hasTodatePlan ||
    asphalt.dailyEntryCount > 0 ||
    layers.some(l => l.dailyEntryCount > 0);

  const plannedMonthTotalKm = round3(layers.reduce((sum, l) => sum + l.monthPlanKm, 0));
  const actualMonthTotalKm = round3(layers.reduce((sum, l) => sum + l.monthActualKm, 0));
  const overallMonthlyRatioPct =
    plannedMonthTotalKm > 0
      ? round2((actualMonthTotalKm / plannedMonthTotalKm) * 100)
      : actualMonthTotalKm > 0
        ? 100
        : 0;

  // PP-3 Asphalt Progress: primary source is EFY Asphalt Plan vs Daily Activities Section 11 monthly cumulative
  const hasEfyAsphaltPlan = asphalt.hasMonthPlan || asphalt.hasTodatePlan;
  let pp3Score = 0;
  let pp3PerformanceRatio = 0;
  let pp3SourceDescription = '';
  let pp3FormulaExplanation = '';

  if (hasEfyAsphaltPlan) {
    const useMonthly = preferredBasis === 'monthly' && asphalt.monthPlanKm > 0;
    const planUsed = useMonthly ? asphalt.monthPlanKm : asphalt.todatePlanKm;
    const actualUsed = useMonthly ? asphalt.monthActualKm : asphalt.todateActualKm;
    pp3PerformanceRatio = useMonthly ? asphalt.monthlyRatioPct : asphalt.cumulativeRatioPct;
    pp3Score = asphalt.scorePct;
    pp3SourceDescription = `EFY ${efyYear} Asphalt Plan (${monthKey}) vs Daily Activities Monthly Cumulative (Sec 11 • ${targetMonthYYYYMM})`;
    pp3FormulaExplanation =
      planUsed > 0
        ? `${useMonthly ? 'Month' : 'To-Date'} AC (${monthKey}): (Daily Activities ${actualUsed.toFixed(3)} km / EFY Plan ${planUsed.toFixed(3)} km) * 100 = ${pp3PerformanceRatio.toFixed(2)}% (PP-3 Score: ${pp3Score.toFixed(2)}%)`
        : `${monthKey} EFY Asphalt Plan is 0.000 km; Daily Activities AC Monthly Cumulative: ${actualUsed.toFixed(3)} km`;
  } else {
    // Fallback to Linear Asphalt Layer / Bill Quantities if no EFY Asphalt Plan exists
    const linearAsphaltExecKm =
      (project.linear?.asphalt || []).reduce((s, r) => s + (Number(r.exec) || 0), 0) +
      (project.linearSpur?.asphalt || []).reduce((s, r) => s + (Number(r.exec) || 0), 0);
    const linearAsphaltPlanKm =
      (project.linearPlan?.asphalt?.plannedKm || 0) +
      (project.linearPlanSpur?.asphalt?.plannedKm || 0);
    const qtyAsphalt = (project.quantities || []).find(q => q.name.toLowerCase().includes('asphalt'));

    if (linearAsphaltPlanKm > 0 && (linearAsphaltExecKm > 0 || (project.linearPlan?.asphalt?.plannedKm ?? 0) > 0)) {
      pp3PerformanceRatio = round2((linearAsphaltExecKm / linearAsphaltPlanKm) * 100);
      pp3Score = round2(Math.min(100, Math.max(0, pp3PerformanceRatio)));
      pp3SourceDescription = 'Linear Asphalt Layer Elevation vs Baseline Plan';
      pp3FormulaExplanation = `Linear AC Fallback: (${linearAsphaltExecKm.toFixed(2)} km / ${linearAsphaltPlanKm.toFixed(2)} km) * 100 = ${pp3PerformanceRatio.toFixed(2)}%`;
    } else if (qtyAsphalt && qtyAsphalt.plan > 0) {
      pp3PerformanceRatio = round2((qtyAsphalt.exec / qtyAsphalt.plan) * 100);
      pp3Score = round2(Math.min(100, Math.max(0, pp3PerformanceRatio)));
      pp3SourceDescription = 'Bill Quantities Asphalt Progress';
      pp3FormulaExplanation = `Quantities AC Fallback: (${qtyAsphalt.exec.toFixed(2)} / ${qtyAsphalt.plan.toFixed(2)}) * 100 = ${pp3PerformanceRatio.toFixed(2)}%`;
    } else if (asphalt.monthActualKm > 0) {
      pp3PerformanceRatio = 100;
      pp3Score = 100;
      pp3SourceDescription = `Daily Activities Section 11 AC (${targetMonthYYYYMM})`;
      pp3FormulaExplanation = `Daily Activities AC Logged: ${asphalt.monthActualKm.toFixed(3)} km (No EFY plan target entered)`;
    } else {
      pp3SourceDescription = 'EFY Pavement Schedule / Daily Activities (Pending Data)';
      pp3FormulaExplanation = `No EFY Asphalt Plan or Daily Activities Section 11 records entered for ${monthKey}.`;
    }
  }

  return {
    monthKey,
    targetMonthYYYYMM,
    layers,
    subbase,
    basecourse,
    asphalt,
    pp3Score,
    pp3PerformanceRatio,
    pp3SourceDescription,
    pp3FormulaExplanation,
    usesEfyPlan,
    usesDailyActivities,
    plannedMonthTotalKm,
    actualMonthTotalKm,
    overallMonthlyRatioPct
  };
}

/**
 * Computes KPI scores for PP-1 (Linear / Physical Progress) and PP-3 (Pavement / Asphalt Progress).
 *
 * Primary Source:
 * 1. Specific month plan from EFY Plan & Pavement Progress Schedule (project.efyPlans[efyYear])
 * 2. Monthly cumulative accomplishment computed from Daily Activities (dailySiteLogs & dailyActivities)
 * 3. Clean fallbacks to Monthly Status Report (progressPlanHistory / progressPlan), S-Curve (monthly), or Linear Diagram
 */
export function calculateProgressKpiScores(
  project: Project,
  targetMonthKey?: string,
  preferredBasis: 'monthly' | 'cumulative' = 'monthly'
): ProgressKpiCalculationResult {
  const monthKey = targetMonthKey || project.kpiActiveMonth || resolveCurrentMonthKey(project) || 'Oct-26';
  const efySlot = resolveEfySlot(monthKey, project.progressPlanLabels?.efyLabel);
  const targetMonthYYYYMM = `${efySlot.gregorianYear}-${String(efySlot.gregorianMonthIndex + 1).padStart(2, '0')}`;
  const maxLengthKm = project.lengthKm && project.lengthKm > 0 ? project.lengthKm : undefined;

  // 1. Resolve EFY Physical Plan for target month
  const rawYearPlan = project.efyPlans?.[efySlot.efyYear];
  const normalizedYearPlan = rawYearPlan ? normalizeEfyYearPlan(efySlot.efyYear, rawYearPlan) : null;
  const efyEraCell = normalizedYearPlan ? normalizedYearPlan.physicalEraPlan[efySlot.monthIndex] : null;
  const efyContractorCell = normalizedYearPlan ? normalizedYearPlan.physicalContractorPlan[efySlot.monthIndex] : null;
  const efyMonthPlanCell = efyEraCell !== null ? efyEraCell : efyContractorCell;
  const hasEfyPhysicalPlan = efyMonthPlanCell !== null && Number.isFinite(efyMonthPlanCell);
  const linkedEfy = computeLinkedEfyMetrics(
    project.efyPlans,
    monthKey,
    project.progressPlanLabels?.efyLabel,
    maxLengthKm
  );
  const efyTodatePlan =
    linkedEfy.era.todate !== null
      ? linkedEfy.era.todate
      : linkedEfy.contractor.todate;

  // 2. Compute Daily Activities monthly cumulative linear Km (from dailySiteLogs)
  const dailyKmSummary = computeMonthlyKmSummary(project, targetMonthYYYYMM);

  let eraMonthPlan = 0;
  let contractorMonthPlan: number | undefined =
    efyContractorCell !== null && Number.isFinite(efyContractorCell)
      ? round2(efyContractorCell)
      : undefined;
  let actualMonthAccomplishment = 0;
  let eraTodatePlan = 0;
  let actualTodateAccomplishment = 0;
  let source = '';
  let unit = 'Km';
  let resolvedMonthLabel = monthKey;
  let usesEfyPhysicalPlan = false;
  let usesDailyKmAccomplishment = false;

  if (hasEfyPhysicalPlan) {
    usesEfyPhysicalPlan = true;
    usesDailyKmAccomplishment = true;
    eraMonthPlan = Math.max(0, efyMonthPlanCell as number);
    eraTodatePlan = efyTodatePlan !== null ? Math.max(0, efyTodatePlan) : eraMonthPlan;
    actualMonthAccomplishment = dailyKmSummary.dailyKmAccomplishmentMonth;
    actualTodateAccomplishment = dailyKmSummary.dailyKmAccomplishmentToDate;
    resolvedMonthLabel = efySlot.gregorianMonthLabel || monthKey;
    const planLabel = efyEraCell !== null ? 'ERA Physical Plan' : 'Contractor Physical Plan';
    source = `EFY ${efySlot.efyYear} Schedule (${planLabel}) vs Daily Activities Monthly Km (${dailyKmSummary.dailyKmLoggedDays} day${dailyKmSummary.dailyKmLoggedDays === 1 ? '' : 's'} logged in ${targetMonthYYYYMM})`;
  } else {
    // Fallback to Status Report Archive / Current Monthly Status Report / S-Curve
    let isFoundInStatusReport = false;
    const historyList = project.progressPlanHistory || [];
    const histItem = historyList.find(
      h =>
        isSameMonth(h.monthLabel, monthKey) ||
        h.monthLabel.trim().toLowerCase() === monthKey.trim().toLowerCase() ||
        h.id === monthKey
    );

    if (histItem) {
      eraMonthPlan =
        typeof histItem.eraMonth === 'number'
          ? histItem.eraMonth
          : typeof histItem.contractorMonth === 'number'
            ? histItem.contractorMonth
            : 0;
      actualMonthAccomplishment = typeof histItem.actualMonth === 'number' ? histItem.actualMonth : 0;
      eraTodatePlan =
        typeof histItem.eraTodate === 'number'
          ? histItem.eraTodate
          : typeof histItem.contractorTodate === 'number'
            ? histItem.contractorTodate
            : 0;
      actualTodateAccomplishment =
        typeof histItem.actualTodate === 'number'
          ? histItem.actualTodate
          : histItem.physicalProgress || 0;
      resolvedMonthLabel = histItem.monthLabel || monthKey;
      source = `Monthly Status Report Archive (${histItem.monthLabel})`;
      isFoundInStatusReport = true;
    } else {
      const activeLabel = project.progressPlanLabels?.monthLabel || '';
      const isLiveMatch =
        isSameMonth(activeLabel, monthKey) ||
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

    if (!isFoundInStatusReport || (eraMonthPlan === 0 && eraTodatePlan === 0)) {
      const monthlyList = project.monthly || [];
      const monthIdx = monthlyList.findIndex(
        m => isSameMonth(m.month, monthKey) || m.month.toLowerCase() === monthKey.toLowerCase()
      );
      if (monthIdx !== -1) {
        unit = '%';
        const m = monthlyList[monthIdx];
        const rev = typeof m.revisedPlan === 'number' ? m.revisedPlan : parseFloat(String(m.revisedPlan || 0));
        const orig = typeof m.originalPlan === 'number' ? m.originalPlan : parseFloat(String(m.originalPlan || 0));
        eraTodatePlan = rev > 0 ? rev : orig;
        const act = typeof m.actual === 'number' ? m.actual : parseFloat(String(m.actual || 0));
        actualTodateAccomplishment = act > 0 ? act : project.physicalProgress || 0;

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

    // If Daily Activities has logged Km for this target month while using Km-based fallback, prefer Daily Activities monthly cumulative
    if (unit === 'Km' && dailyKmSummary.dailyKmLoggedDays > 0) {
      usesDailyKmAccomplishment = true;
      actualMonthAccomplishment = dailyKmSummary.dailyKmAccomplishmentMonth;
      actualTodateAccomplishment = dailyKmSummary.dailyKmAccomplishmentToDate;
      source = `${source} vs Daily Activities Monthly Km (${targetMonthYYYYMM})`;
    }
  }

  // Ensure non-negative numbers (keep 3-decimal Km precision when using Daily Km)
  const decimals = unit === 'Km' ? 3 : 2;
  const fixVal = (v: number) => Math.max(0, Number(v.toFixed(decimals)));
  eraMonthPlan = fixVal(eraMonthPlan);
  actualMonthAccomplishment = fixVal(actualMonthAccomplishment);
  eraTodatePlan = fixVal(eraTodatePlan);
  actualTodateAccomplishment = fixVal(actualTodateAccomplishment);

  // "% of Actual Divided by Plan" Calculations:
  const monthlyPerformanceRatio =
    eraMonthPlan > 0
      ? Number(((actualMonthAccomplishment / eraMonthPlan) * 100).toFixed(2))
      : actualMonthAccomplishment > 0
        ? 100
        : 0;
  const monthlyVariance = Number((actualMonthAccomplishment - eraMonthPlan).toFixed(decimals));
  const monthlySpi = eraMonthPlan > 0 ? Number((actualMonthAccomplishment / eraMonthPlan).toFixed(3)) : 1.0;
  const monthlyPp1Score = Number(Math.min(100, Math.max(0, monthlyPerformanceRatio)).toFixed(2));

  const cumulativePerformanceRatio =
    eraTodatePlan > 0
      ? Number(((actualTodateAccomplishment / eraTodatePlan) * 100).toFixed(2))
      : actualTodateAccomplishment > 0
        ? 100
        : 0;
  const cumulativeVariance = Number((actualTodateAccomplishment - eraTodatePlan).toFixed(decimals));
  const cumulativeSpi = eraTodatePlan > 0 ? Number((actualTodateAccomplishment / eraTodatePlan).toFixed(3)) : 1.0;
  const cumulativePp1Score = Number(Math.min(100, Math.max(0, cumulativePerformanceRatio)).toFixed(2));

  const isMonthlyActive = preferredBasis === 'monthly' && eraMonthPlan > 0;
  const pp1Score = isMonthlyActive
    ? monthlyPp1Score
    : eraTodatePlan > 0
      ? cumulativePp1Score
      : monthlyPp1Score;
  const performanceRatio = isMonthlyActive ? monthlyPerformanceRatio : cumulativePerformanceRatio;
  const variancePctPoints = isMonthlyActive ? monthlyVariance : cumulativeVariance;
  const spi = isMonthlyActive ? monthlySpi : cumulativeSpi;

  const monthlySourceTag = usesEfyPhysicalPlan
    ? `EFY Plan vs Daily Activities (${resolvedMonthLabel})`
    : `Monthly Status Report (${resolvedMonthLabel})`;
  const cumulativeSourceTag = usesEfyPhysicalPlan
    ? `EFY Cumulative vs Daily Activities To-Date (${resolvedMonthLabel})`
    : `Cumulative Status Report (${resolvedMonthLabel})`;

  const monthlyFormulaExplanation =
    eraMonthPlan > 0
      ? `${monthlySourceTag}: (Actual ${actualMonthAccomplishment.toFixed(decimals)} ${unit} / Plan ${eraMonthPlan.toFixed(decimals)} ${unit}) * 100 = ${monthlyPerformanceRatio.toFixed(2)}% (Score: ${monthlyPp1Score.toFixed(2)}%)`
      : `${monthlySourceTag}: Monthly Plan is 0.00 ${unit}; Actual: ${actualMonthAccomplishment.toFixed(decimals)} ${unit}`;

  const cumulativeFormulaExplanation =
    eraTodatePlan > 0
      ? `${cumulativeSourceTag}: (Actual To-Date ${actualTodateAccomplishment.toFixed(decimals)} ${unit} / Plan To-Date ${eraTodatePlan.toFixed(decimals)} ${unit}) * 100 = ${cumulativePerformanceRatio.toFixed(2)}% (Score: ${cumulativePp1Score.toFixed(2)}%)`
      : `${cumulativeSourceTag}: To-Date Plan is 0.00 ${unit}; Actual: ${actualTodateAccomplishment.toFixed(decimals)} ${unit}`;

  const formulaExplanation = isMonthlyActive ? monthlyFormulaExplanation : cumulativeFormulaExplanation;

  let status: 'Ahead' | 'On Track' | 'Minor Lag' | 'Critical Lag' = 'On Track';
  let statusDescription = 'Physical progress aligns with the EFY Approved Plan.';
  if (performanceRatio >= 100) {
    status = 'Ahead';
    statusDescription = `Actual progress conforms to / exceeds plan at ${performanceRatio.toFixed(1)}% (SPI: ${spi.toFixed(3)}).`;
  } else if (performanceRatio >= 90) {
    status = 'On Track';
    statusDescription = `Physical progress closely tracks plan at ${performanceRatio.toFixed(1)}% (SPI: ${spi.toFixed(3)}).`;
  } else if (performanceRatio >= 75) {
    status = 'Minor Lag';
    statusDescription = `Minor progress shortfall against plan at ${performanceRatio.toFixed(1)}% (SPI: ${spi.toFixed(3)}).`;
  } else {
    status = 'Critical Lag';
    statusDescription = `Critical progress shortfall against plan at ${performanceRatio.toFixed(1)}% (SPI: ${spi.toFixed(3)}). Recovery schedule required.`;
  }

  // Compute Pavement Progress KPI comparisons (Sub-Base, Base Course, Asphalt -> PP-3)
  const pavement = computePavementKpiComparison(
    project,
    monthKey,
    targetMonthYYYYMM,
    efySlot.efyYear,
    efySlot.monthIndex,
    preferredBasis
  );

  // Update existing kpiAllocated items with PP-1 and PP-3 scores
  const baseKpiList = project.kpiAllocated ? [...project.kpiAllocated] : [];
  const updatedKpiAllocated = baseKpiList.map(k => {
    if (k.itemId === 'PP-1') {
      return {
        ...k,
        alloc: pp1Score,
        isOverridden: false
      };
    }
    if (k.itemId === 'PP-3') {
      return {
        ...k,
        alloc: pavement.pp3Score,
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
    contractorMonthPlan,
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
    dailyLoggedDaysCount: dailyKmSummary.dailyKmLoggedDays,
    usesEfyPhysicalPlan,
    usesDailyKmAccomplishment,
    targetMonthYYYYMM,
    pavement,
    plannedProgressToDate: eraTodatePlan,
    actualProgressToDate: actualTodateAccomplishment,
    monthlyPlannedInc: eraMonthPlan,
    monthlyActualInc: actualMonthAccomplishment,
    updatedKpiAllocated
  };
}

