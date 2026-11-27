import { EfyAnnualLayerPlan, ProgressPlan, ProgressPlanHistoryItem, Project } from '../types';
import { parseMonthKey, parseProgressPlanMonthRank, sortProgressPlanHistoryDescending } from './monthlySync';

export const EFY_MONTH_SHORT = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const GREGORIAN_MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface EfyPeriodSlot {
  efyYear: string;             // e.g. "2017", "2018", "2019"
  monthIndex: number;          // 0..11 (Jul=0 .. Jun=11)
  quarterIndex: 0 | 1 | 2 | 3; // 0=Q1(Jul-Sep), 1=Q2(Oct-Dec), 2=Q3(Jan-Mar), 3=Q4(Apr-Jun)
  quarterMonthIndices: [number, number, number];
  gregorianYear: number;       // e.g. 2024
  gregorianMonthIndex: number; // 0..11 (Jan=0 .. Dec=11)
  gregorianMonthLabel: string; // e.g. "Sep-24"
  quarterRangeLabel: string;   // e.g. "October 2026-November 2026" (up to current month)
  efyRangeLabel: string;       // e.g. "Jul-26 to Nov-26" (Jul up to current month)
}

export interface LinkedEfySeriesValues {
  month: number | null;
  quarter: number | null;
  efy: number | null;
  todate: number | null;
}

export interface LinkedEfyMetricsResult {
  slot: EfyPeriodSlot;
  hasYearPlan: boolean;
  hasContractorData: boolean;
  hasEraData: boolean;
  contractor: LinkedEfySeriesValues;
  era: LinkedEfySeriesValues;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function createEmpty12(): Array<number | null> {
  return Array.from({ length: 12 }, () => null);
}

export function normalize12(arr?: Array<number | null>): Array<number | null> {
  const out = createEmpty12();
  if (!Array.isArray(arr)) return out;
  for (let i = 0; i < 12; i++) {
    const v = arr[i];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      out[i] = v;
    } else {
      out[i] = null;
    }
  }
  return out;
}

export function normalizeEfyYearPlan(
  efyYear: string,
  raw?: Partial<EfyAnnualLayerPlan>
): EfyAnnualLayerPlan {
  return {
    efyYear,
    physicalContractorPlan: normalize12(raw?.physicalContractorPlan),
    physicalEraPlan: normalize12(raw?.physicalEraPlan),
    subBasePlan: normalize12(raw?.subBasePlan),
    subBaseActual: normalize12(raw?.subBaseActual),
    baseCoursePlan: normalize12(raw?.baseCoursePlan),
    baseCourseActual: normalize12(raw?.baseCourseActual),
    asphaltPlan: normalize12(raw?.asphaltPlan),
    asphaltActual: normalize12(raw?.asphaltActual),
    updatedAt: raw?.updatedAt
  };
}

/**
 * Resolves a Monthly Status Report period (monthLabel, optional efyLabel)
 * to its exact Ethiopian Fiscal Year (Jul..Jun) slot and quarter indices.
 */
export function resolveEfySlot(
  monthLabel?: string | null,
  efyLabel?: string | null
): EfyPeriodSlot {
  let gregYear: number | null = null;
  let gregMonthIdx: number | null = null;

  const parsedStd = parseMonthKey(monthLabel);
  if (parsedStd) {
    gregYear = parsedStd.year;
    gregMonthIdx = parsedStd.monthIndex;
  } else {
    const rank = parseProgressPlanMonthRank(monthLabel, efyLabel);
    if (rank > 0) {
      const totalMonths = Math.floor(rank / 100) - 1;
      gregYear = Math.floor(totalMonths / 12);
      gregMonthIdx = totalMonths % 12;
    }
  }

  if (gregYear === null || gregMonthIdx === null) {
    const now = new Date();
    gregYear = now.getFullYear();
    gregMonthIdx = now.getMonth();
  }

  const efyYearNum = gregMonthIdx >= 6 ? gregYear - 7 : gregYear - 8;
  const monthIndex = gregMonthIdx >= 6 ? gregMonthIdx - 6 : gregMonthIdx + 6;
  const quarterIndex = Math.floor(monthIndex / 3) as 0 | 1 | 2 | 3;
  const qStart = quarterIndex * 3;
  const quarterMonthIndices: [number, number, number] = [qStart, qStart + 1, qStart + 2];

  const yy = String(gregYear % 100).padStart(2, '0');
  const gregorianMonthLabel = `${EFY_MONTH_SHORT[monthIndex]}-${yy}`;

  const qStartGregYear = quarterIndex < 2 ? efyYearNum + 7 : efyYearNum + 8;
  const qStartGregMonth = (qStart + 6) % 12;
  const quarterRangeLabel =
    monthIndex === qStart
      ? `${GREGORIAN_MONTH_FULL[qStartGregMonth]} ${qStartGregYear}`
      : `${GREGORIAN_MONTH_FULL[qStartGregMonth]} ${qStartGregYear}-${GREGORIAN_MONTH_FULL[gregMonthIdx]} ${gregYear}`;

  const efyStartYy = String((efyYearNum + 7) % 100).padStart(2, '0');
  const efyRangeLabel =
    monthIndex === 0
      ? `Jul-${efyStartYy}`
      : `Jul-${efyStartYy} to ${gregorianMonthLabel}`;

  return {
    efyYear: String(efyYearNum),
    monthIndex,
    quarterIndex,
    quarterMonthIndices,
    gregorianYear: gregYear,
    gregorianMonthIndex: gregMonthIdx,
    gregorianMonthLabel,
    quarterRangeLabel,
    efyRangeLabel
  };
}

export function clampTodateToProjectLength(val: number, maxLengthKm?: number): number {
  const safe = Math.max(0, Number.isFinite(val) ? val : 0);
  if (typeof maxLengthKm === 'number' && Number.isFinite(maxLengthKm) && maxLengthKm > 0) {
    return round2(Math.min(safe, maxLengthKm));
  }
  return round2(safe);
}

function computeSeriesValuesForSlot(
  efyPlans: Record<string, EfyAnnualLayerPlan> | undefined,
  slot: EfyPeriodSlot,
  field: 'physicalContractorPlan' | 'physicalEraPlan',
  maxLengthKm?: number
): LinkedEfySeriesValues {
  const yearPlan = efyPlans?.[slot.efyYear];
  const arr = yearPlan ? normalize12(yearPlan[field]) : createEmpty12();

  const rawMonth = arr[slot.monthIndex];
  const month = typeof rawMonth === 'number' ? round2(rawMonth) : null;

  // Quarter-to-date within the active quarter: sum only months in this quarter up to slot.monthIndex
  // e.g. for November (Q2: Oct..Dec), sum October + November only.
  let hasQuarter = false;
  let qSum = 0;
  for (const idx of slot.quarterMonthIndices) {
    if (idx > slot.monthIndex) continue;
    const v = arr[idx];
    if (typeof v === 'number') {
      hasQuarter = true;
      qSum += v;
    }
  }
  const quarter = hasQuarter ? round2(qSum) : null;

  // EFY-to-date within the active EFY: sum months from July (index 0) up to slot.monthIndex
  // e.g. for November, sum July through November only.
  let hasEfy = false;
  let efySum = 0;
  for (let i = 0; i <= slot.monthIndex; i++) {
    const v = arr[i];
    if (typeof v === 'number') {
      hasEfy = true;
      efySum += v;
    }
  }
  const efy = hasEfy ? round2(efySum) : null;

  // Cumulative up to and including (slot.efyYear, slot.monthIndex) across all recorded EFY years
  const targetYearNum = Number(slot.efyYear);
  let hasTodate = false;
  let todateSum = 0;
  if (efyPlans) {
    const sortedYears = Object.keys(efyPlans)
      .filter(k => /^\d{4}$/.test(k))
      .sort((a, b) => Number(a) - Number(b));
    for (const yrKey of sortedYears) {
      const yrNum = Number(yrKey);
      if (yrNum > targetYearNum) continue;
      const yrArr = normalize12(efyPlans[yrKey]?.[field]);
      const limit = yrNum === targetYearNum ? slot.monthIndex : 11;
      for (let i = 0; i <= limit; i++) {
        const v = yrArr[i];
        if (typeof v === 'number') {
          hasTodate = true;
          todateSum += v;
        }
      }
    }
  }
  const todate = hasTodate ? clampTodateToProjectLength(todateSum, maxLengthKm) : null;

  return { month, quarter, efy, todate };
}

/**
 * Computes Contractor Program Schedule & ERA Approved Milestone Plan metrics
 * from project.efyPlans for the given Monthly Status Report period.
 */
export function computeLinkedEfyMetrics(
  efyPlans: Record<string, EfyAnnualLayerPlan> | undefined,
  monthLabel?: string | null,
  efyLabel?: string | null,
  maxLengthKm?: number
): LinkedEfyMetricsResult {
  const slot = resolveEfySlot(monthLabel, efyLabel);
  const yearPlan = efyPlans?.[slot.efyYear];
  const contractor = computeSeriesValuesForSlot(efyPlans, slot, 'physicalContractorPlan', maxLengthKm);
  const era = computeSeriesValuesForSlot(efyPlans, slot, 'physicalEraPlan', maxLengthKm);

  return {
    slot,
    hasYearPlan: Boolean(yearPlan),
    hasContractorData: contractor.month !== null || contractor.quarter !== null || contractor.efy !== null,
    hasEraData: era.month !== null || era.quarter !== null || era.efy !== null,
    contractor,
    era
  };
}

/**
 * Builds an updated ProgressPlan object merging EFY Physical Plan numbers
 * into Contractor Program Schedule and ERA Approved Milestone Plan.
 * Preserves existing values when EFY Plan cells are null/empty.
 * Once cumulative reaches project length, keeps cumulative equal to project length.
 */
export function mergeLinkedEfyIntoProgressPlan(
  basePlan: ProgressPlan,
  linked: LinkedEfyMetricsResult,
  prevLinked?: LinkedEfyMetricsResult,
  options?: { includeTodate?: boolean; maxLengthKm?: number }
): ProgressPlan {
  const maxLen = options?.maxLengthKm;
  const maxCapped = typeof maxLen === 'number' && Number.isFinite(maxLen) && maxLen > 0 ? round2(maxLen) : null;

  const baseContractorTodate = clampTodateToProjectLength(basePlan.contractor.todate || 0, maxLen);
  const baseEraTodate = clampTodateToProjectLength(basePlan.era.todate || 0, maxLen);
  const baseActualTodate = clampTodateToProjectLength(basePlan.actual.todate || 0, maxLen);

  const nextContractor = { ...basePlan.contractor, todate: baseContractorTodate };
  const nextEra = { ...basePlan.era, todate: baseEraTodate };
  const nextActual = { ...basePlan.actual, todate: baseActualTodate };

  if (linked.contractor.month !== null) nextContractor.month = linked.contractor.month;
  if (linked.contractor.quarter !== null) nextContractor.quarter = linked.contractor.quarter;
  if (linked.contractor.efy !== null) nextContractor.efy = linked.contractor.efy;

  if (options?.includeTodate && linked.contractor.todate !== null) {
    nextContractor.todate = clampTodateToProjectLength(linked.contractor.todate, maxLen);
  } else if (linked.contractor.todate !== null) {
    if (maxCapped !== null && baseContractorTodate >= maxCapped) {
      if (
        prevLinked &&
        prevLinked.contractor.todate !== null &&
        prevLinked.contractor.todate >= maxCapped &&
        linked.contractor.todate < prevLinked.contractor.todate
      ) {
        const delta = linked.contractor.todate - prevLinked.contractor.todate;
        nextContractor.todate = clampTodateToProjectLength(baseContractorTodate + delta, maxLen);
      } else {
        nextContractor.todate = maxCapped;
      }
    } else if (prevLinked && prevLinked.contractor.todate !== null) {
      const delta = linked.contractor.todate - prevLinked.contractor.todate;
      nextContractor.todate = clampTodateToProjectLength(baseContractorTodate + delta, maxLen);
    } else if (baseContractorTodate === 0) {
      nextContractor.todate = clampTodateToProjectLength(linked.contractor.todate, maxLen);
    }
  }

  if (linked.era.month !== null) nextEra.month = linked.era.month;
  if (linked.era.quarter !== null) nextEra.quarter = linked.era.quarter;
  if (linked.era.efy !== null) nextEra.efy = linked.era.efy;

  if (options?.includeTodate && linked.era.todate !== null) {
    nextEra.todate = clampTodateToProjectLength(linked.era.todate, maxLen);
  } else if (linked.era.todate !== null) {
    if (maxCapped !== null && baseEraTodate >= maxCapped) {
      if (
        prevLinked &&
        prevLinked.era.todate !== null &&
        prevLinked.era.todate >= maxCapped &&
        linked.era.todate < prevLinked.era.todate
      ) {
        const delta = linked.era.todate - prevLinked.era.todate;
        nextEra.todate = clampTodateToProjectLength(baseEraTodate + delta, maxLen);
      } else {
        nextEra.todate = maxCapped;
      }
    } else if (prevLinked && prevLinked.era.todate !== null) {
      const delta = linked.era.todate - prevLinked.era.todate;
      nextEra.todate = clampTodateToProjectLength(baseEraTodate + delta, maxLen);
    } else if (baseEraTodate === 0) {
      nextEra.todate = clampTodateToProjectLength(linked.era.todate, maxLen);
    }
  }

  return {
    contractor: nextContractor,
    era: nextEra,
    actual: nextActual
  };
}

/**
 * Given an updated project.efyPlans map (edited on Monthly Cumulative page),
 * synchronizes project.progressPlan and matching unlocked ProgressPlanHistoryItems
 * so Progress Comparisons Monthly Status Report reflects the change immediately.
 */
export function buildProjectUpdatesFromEfyPlans(
  project: Project,
  nextEfyPlans: Record<string, EfyAnnualLayerPlan>
): Partial<Project> | null {
  const activeMonth = project.progressPlanLabels?.monthLabel || "Sep '24";
  const activeEfy = project.progressPlanLabels?.efyLabel || 'EFY 2017';
  const maxLengthKm = project.lengthKm && project.lengthKm > 0 ? project.lengthKm : 65.0;

  const prevLinked = computeLinkedEfyMetrics(project.efyPlans, activeMonth, activeEfy, maxLengthKm);
  const nextLinked = computeLinkedEfyMetrics(nextEfyPlans, activeMonth, activeEfy, maxLengthKm);

  const history = Array.isArray(project.progressPlanHistory) ? project.progressPlanHistory : [];
  const activeMatch = history.find(
    h => h.monthLabel && h.monthLabel.trim().toLowerCase() === activeMonth.trim().toLowerCase()
  );
  const isActiveLocked = Boolean(activeMatch?.isLocked);

  const updates: Partial<Project> = {};
  let hasAnyChange = false;

  if (!isActiveLocked && project.progressPlan) {
    const mergedPlan = mergeLinkedEfyIntoProgressPlan(project.progressPlan, nextLinked, prevLinked, { maxLengthKm });
    const changed =
      mergedPlan.contractor.month !== project.progressPlan.contractor.month ||
      mergedPlan.contractor.quarter !== project.progressPlan.contractor.quarter ||
      mergedPlan.contractor.efy !== project.progressPlan.contractor.efy ||
      mergedPlan.contractor.todate !== project.progressPlan.contractor.todate ||
      mergedPlan.era.month !== project.progressPlan.era.month ||
      mergedPlan.era.quarter !== project.progressPlan.era.quarter ||
      mergedPlan.era.efy !== project.progressPlan.era.efy ||
      mergedPlan.era.todate !== project.progressPlan.era.todate;

    if (changed) {
      updates.progressPlan = mergedPlan;
      hasAnyChange = true;
    }
  }

  if (history.length > 0) {
    let historyChanged = false;
    const updatedHistory = history.map(item => {
      if (item.isLocked) return item;
      const itemPrev = computeLinkedEfyMetrics(project.efyPlans, item.monthLabel, item.efyLabel, maxLengthKm);
      const itemNext = computeLinkedEfyMetrics(nextEfyPlans, item.monthLabel, item.efyLabel, maxLengthKm);
      if (!itemNext.hasYearPlan) return item;

      const baseItemPlan: ProgressPlan = {
        contractor: {
          month: item.contractorMonth,
          quarter: item.contractorQuarter || 0,
          efy: item.contractorEfy,
          todate: item.contractorTodate || 0
        },
        era: {
          month: item.eraMonth,
          quarter: item.eraQuarter || 0,
          efy: item.eraEfy,
          todate: item.eraTodate || 0
        },
        actual: {
          month: item.actualMonth,
          quarter: item.actualQuarter || 0,
          efy: item.actualEfy,
          todate: item.actualTodate || 0
        }
      };

      const mergedItemPlan = mergeLinkedEfyIntoProgressPlan(baseItemPlan, itemNext, itemPrev, { maxLengthKm });
      const itemDiff =
        mergedItemPlan.contractor.month !== item.contractorMonth ||
        mergedItemPlan.contractor.quarter !== (item.contractorQuarter || 0) ||
        mergedItemPlan.contractor.efy !== item.contractorEfy ||
        mergedItemPlan.contractor.todate !== (item.contractorTodate || 0) ||
        mergedItemPlan.era.month !== item.eraMonth ||
        mergedItemPlan.era.quarter !== (item.eraQuarter || 0) ||
        mergedItemPlan.era.efy !== item.eraEfy ||
        mergedItemPlan.era.todate !== (item.eraTodate || 0);

      if (!itemDiff) return item;
      historyChanged = true;
      return {
        ...item,
        contractorMonth: mergedItemPlan.contractor.month,
        contractorQuarter: mergedItemPlan.contractor.quarter,
        contractorEfy: mergedItemPlan.contractor.efy,
        contractorTodate: mergedItemPlan.contractor.todate,
        eraMonth: mergedItemPlan.era.month,
        eraQuarter: mergedItemPlan.era.quarter,
        eraEfy: mergedItemPlan.era.efy,
        eraTodate: mergedItemPlan.era.todate
      } as ProgressPlanHistoryItem;
    });

    if (historyChanged) {
      updates.progressPlanHistory = sortProgressPlanHistoryDescending(updatedHistory);
      hasAnyChange = true;
    }
  }

  return hasAnyChange ? updates : null;
}

/**
 * Pushes Contractor Program Schedule & ERA Approved Milestone Plan monthly values
 * from Progress Comparisons into project.efyPlans[slot.efyYear].
 */
export function buildEfyPlansFromProgressPlan(
  existingEfyPlans: Record<string, EfyAnnualLayerPlan> | undefined,
  monthLabel: string,
  efyLabel: string,
  contractorMonthKm: number,
  eraMonthKm: number
): { nextEfyPlans: Record<string, EfyAnnualLayerPlan>; slot: EfyPeriodSlot } {
  const slot = resolveEfySlot(monthLabel, efyLabel);
  const currentYearPlan = normalizeEfyYearPlan(slot.efyYear, existingEfyPlans?.[slot.efyYear]);

  const nextContractorArr = [...currentYearPlan.physicalContractorPlan];
  const nextEraArr = [...currentYearPlan.physicalEraPlan];

  nextContractorArr[slot.monthIndex] =
    Number.isFinite(contractorMonthKm) && contractorMonthKm >= 0 ? round3(contractorMonthKm) : null;
  nextEraArr[slot.monthIndex] =
    Number.isFinite(eraMonthKm) && eraMonthKm >= 0 ? round3(eraMonthKm) : null;

  const nextEfyPlans: Record<string, EfyAnnualLayerPlan> = {
    ...(existingEfyPlans || {}),
    [slot.efyYear]: {
      ...currentYearPlan,
      physicalContractorPlan: nextContractorArr,
      physicalEraPlan: nextEraArr,
      updatedAt: new Date().toISOString()
    }
  };

  return { nextEfyPlans, slot };
}
