import {
  Project,
  DailyActivityRecord,
  DailySiteLogEntry,
  DailyActivityLaborItem,
  DailyEquipmentFleetItem,
  DailyMaterialItem,
  DailyProductionItem,
  DailyTomorrowPlanItem,
  MaterialProductionItem,
  MonthlyResourceRecord
} from '../types';
import { MONTH_NAMES, parseMonthKey } from './monthlySync';
import { safeDispatchCustomEvent } from './storage';

export const DEFAULT_LABOR_CATEGORIES: Array<DailyActivityLaborItem['category']> = [
  'Project Manager / Engineers',
  'Site Foremen / Supervisors',
  'Heavy Equipment Operators',
  'Skilled Labor / Masons',
  'Unskilled Labor / Flagmen'
];

export const createDefaultLaborSummary = (): DailyActivityLaborItem[] =>
  DEFAULT_LABOR_CATEGORIES.map((category) => ({ category, count: 0 }));

export const createDefaultProductionList = (): DailyProductionItem[] => [
  { id: 'p1', equipmentType: 'Asphalt Batching Plant', facilityName: 'Asphalt Plant @ Ch. 203+400', itemProduced: 'Asphalt Concrete AC 60/70', unit: 'Tons', targetOutput: 450, actualOutput: 380, previousCumulative: 14200, operatingHours: 7.5, remarks: 'Continuous run' },
  { id: 'p2', equipmentType: 'Concrete Batching Plant', facilityName: 'Concrete Batching Plant #1', itemProduced: 'C-30 Concrete', unit: 'm³', targetOutput: 120, actualOutput: 95, previousCumulative: 3100, operatingHours: 6.0, remarks: 'Structure pour' },
  { id: 'p3', equipmentType: 'Crushing & Screening Plant', facilityName: 'Primary Stone Crusher', itemProduced: 'Crushed Base Aggregate', unit: 'm³', targetOutput: 800, actualOutput: 720, previousCumulative: 42500, operatingHours: 8.0, remarks: 'Quarry B' },
  { id: 'p4', equipmentType: 'Precast Concrete Yard', facilityName: 'Precast RCP Yard', itemProduced: 'RCP Ø1000mm Pipes', unit: 'Pcs', targetOutput: 40, actualOutput: 35, previousCumulative: 890, operatingHours: 8.0, remarks: 'Curing chamber' }
];

export const createDefaultEquipmentFleet = (): DailyEquipmentFleetItem[] => [
  { id: 'eq1', name: 'Bulldozer CAT D8R', typeCapacity: 'Heavy Earthmoving', status: 'Operating', workingHours: 8.0, remarks: 'Subgrade excavation km 213+860' },
  { id: 'eq2', name: 'Motor Grader 140K', typeCapacity: 'Blade 14ft', status: 'Operating', workingHours: 7.5, remarks: 'Base course levelling km 209' },
  { id: 'eq3', name: 'Vibratory Roller 15T', typeCapacity: 'Compaction 15 Ton', status: 'Operating', workingHours: 8.0, remarks: 'Sub-base rolling' },
  { id: 'eq4', name: 'Water Truck 18,000L', typeCapacity: '18,000 Liters', status: 'Standby', workingHours: 4.0, remarks: 'Station Camp 203+400' }
];

export const createDefaultMaterialsList = (): DailyMaterialItem[] => [
  { id: 'm1', material: 'Portland Cement (42.5N Grade)', received: 150, used: 85, remarks: 'Messobo cement' },
  { id: 'm2', material: 'Crushed Base Aggregate (0-31.5mm)', received: 500, used: 320, remarks: 'Quarry #2' },
  { id: 'm3', material: 'Asphalt Bitumen (60/70 Penetration)', received: 40, used: 25, remarks: 'Bitumen tanks full' }
];

export const createDefaultSiteChallenges = (): string[] => [
  'Traffic management & dust control along active detour km 210',
  'Shortage of water trucks hinders earthwork compaction'
];

export const createDefaultTomorrowPlans = (): DailyTomorrowPlanItem[] => [
  { id: 'pl1', area: 'Km 209+880 - 210+080', description: 'Mixing, Placing & Rolling Sub-Base', unit: 'm³', target: 460, remarks: '2 rollers active' },
  { id: 'pl2', area: 'Km 200+313', description: 'Pipe Installation and Backfill', unit: 'm', target: 25, remarks: 'Crane assigned' }
];

/**
 * Converts a YYYY-MM-DD date string to canonical Mon-YY key (e.g., "2026-09-18" -> "Sep-26").
 */
export function getMonthKeyFromIsoDate(dateStr: string | undefined | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const mIdx = parseInt(match[2], 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_NAMES[mIdx]}-${(year % 100).toString().padStart(2, '0')}`;
    }
  }
  const parsed = parseMonthKey(dateStr);
  return parsed ? parsed.key : null;
}

export interface NormalizedDailyDayRecord {
  date: string;
  monthKey: string | null;
  weather: string;
  shift: string;
  dailyKmAccomplishment?: number;
  dailyNotes: string;
  isNoWorkDay: boolean;
  noWorkReason: string;
  noWorkNotes: string;
  activities: DailyActivityRecord[];
  laborSummary: DailyActivityLaborItem[];
  totalLabor: number;
  equipmentFleet: DailyEquipmentFleetItem[];
  operatingEquipment: number;
  standbyEquipment: number;
  breakdownEquipment: number;
  totalEquipmentUnits: number;
  totalEquipmentHours: number;
  materialsList: DailyMaterialItem[];
  totalMaterialReceived: number;
  totalMaterialUsed: number;
  materialNetBalance: number;
  productionList: DailyProductionItem[];
  totalPlantActual: number;
  totalPlantTarget: number;
  executedKm: number;
  executedM3: number;
  executedStructures: number;
  siteChallenges: string[];
  tomorrowPlans: DailyTomorrowPlanItem[];
  updatedAt?: string;
  updatedBy?: string;
  hasExplicitLog: boolean;
}

/**
 * Normalizes both `project.dailySiteLogs` and `project.dailyActivities` into a unified, date-keyed ledger.
 */
export function getNormalizedDailyRecordsByDate(project: Project | undefined | null): NormalizedDailyDayRecord[] {
  if (!project) return [];

  const activities = Array.isArray(project.dailyActivities) ? project.dailyActivities : [];
  const siteLogs = project.dailySiteLogs && typeof project.dailySiteLogs === 'object' ? project.dailySiteLogs : {};

  const actsByDate = new Map<string, DailyActivityRecord[]>();
  activities.forEach((act) => {
    if (!act || !act.date) return;
    const list = actsByDate.get(act.date) || [];
    list.push(act);
    actsByDate.set(act.date, list);
  });

  const allDates = new Set<string>([
    ...Array.from(actsByDate.keys()),
    ...Object.keys(siteLogs)
  ]);

  const records: NormalizedDailyDayRecord[] = [];

  allDates.forEach((date) => {
    const dayActs = actsByDate.get(date) || [];
    const log: Partial<DailySiteLogEntry> | undefined = siteLogs[date];
    const hasExplicitLog = Boolean(log);

    // Resolve Labor: prefer explicit dailySiteLogs laborSummary; fallback to activity laborSummary sum
    let laborSummary: DailyActivityLaborItem[] = [];
    if (log && Array.isArray(log.laborSummary) && log.laborSummary.length > 0) {
      laborSummary = log.laborSummary.map((l) => ({ category: l.category, count: Number(l.count) || 0 }));
    } else {
      const catMap = new Map<string, number>();
      dayActs.forEach((act) => {
        (act.laborSummary || []).forEach((l) => {
          if (l?.category) {
            catMap.set(l.category, (catMap.get(l.category) || 0) + (Number(l.count) || 0));
          }
        });
      });
      laborSummary = Array.from(catMap.entries()).map(([category, count]) => ({ category, count }));
    }
    const totalLabor = laborSummary.reduce((sum, l) => sum + (Number(l.count) || 0), 0);

    // Resolve Equipment: prefer explicit dailySiteLogs equipmentFleet; fallback to activity equipmentList
    let equipmentFleet: DailyEquipmentFleetItem[] = [];
    let operatingEquipment = 0;
    let standbyEquipment = 0;
    let breakdownEquipment = 0;
    let totalEquipmentUnits = 0;
    let totalEquipmentHours = 0;

    if (log && Array.isArray(log.equipmentFleet)) {
      equipmentFleet = log.equipmentFleet;
      equipmentFleet.forEach((eq) => {
        totalEquipmentUnits += 1;
        totalEquipmentHours += Number(eq.workingHours) || 0;
        if (eq.status === 'Operating') operatingEquipment += 1;
        else if (eq.status === 'Standby') standbyEquipment += 1;
        else if (eq.status === 'Breakdown' || eq.status === 'Maintenance') breakdownEquipment += 1;
      });
    } else {
      dayActs.forEach((act) => {
        (act.equipmentList || []).forEach((eq, idx) => {
          const cnt = Math.max(1, Number(eq.count) || 1);
          const hrs = (Number(act.workingHours) || 8) * cnt;
          totalEquipmentUnits += cnt;
          totalEquipmentHours += hrs;
          if (eq.status === 'Operating') operatingEquipment += cnt;
          else if (eq.status === 'Standby') standbyEquipment += cnt;
          else if (eq.status === 'Breakdown' || eq.status === 'Maintenance') breakdownEquipment += cnt;
          equipmentFleet.push({
            id: eq.id || `${act.id}_eq_${idx}`,
            name: eq.name,
            typeCapacity: act.activityName || `Sec ${act.activityType}`,
            status: eq.status,
            workingHours: Number(act.workingHours) || 8,
            remarks: act.startStationKm ? `Stn ${act.startStationKm} (${cnt} units)` : `${cnt} units`
          });
        });
      });
    }

    // Resolve Materials & Plant Production
    const materialsList: DailyMaterialItem[] = log && Array.isArray(log.materialsList) ? log.materialsList : [];
    const totalMaterialReceived = materialsList.reduce((s, m) => s + (Number(m.received) || 0), 0);
    const totalMaterialUsed = materialsList.reduce((s, m) => s + (Number(m.used) || 0), 0);
    const materialNetBalance = totalMaterialReceived - totalMaterialUsed;

    const productionList: DailyProductionItem[] = log && Array.isArray(log.productionList) ? log.productionList : [];
    const totalPlantActual = productionList.reduce((s, p) => s + (Number(p.actualOutput) || 0), 0);
    const totalPlantTarget = productionList.reduce((s, p) => s + (Number(p.targetOutput) || 0), 0);

    // Resolve Executed Metrics across work activities
    let executedKm = 0;
    let executedM3 = 0;
    let executedStructures = 0;

    dayActs.forEach((a) => {
      if (['3.1', '3.2', '4', '5'].includes(a.activityType)) {
        executedM3 += Number(a.metricM3) || Number(a.metricKm) || 0;
      } else if (['14', '14.1', '14.2', '15', '16', '17'].includes(a.activityType)) {
        executedStructures += Number(a.quantityExecuted) || Number(a.metricKm) || 0;
      } else if (['1', '2', '6', '7', '8', '9', '10', '11', '12'].includes(a.activityType)) {
        const kmVal = Number(a.metricKm) || (a.metricM ? Number(a.metricM) / 1000 : 0);
        executedKm += kmVal;
        if (a.metricM3) executedM3 += Number(a.metricM3);
      } else {
        executedKm += Number(a.metricKm) || 0;
      }
    });

    // Resolve Daily Notes
    const activityNotes = dayActs
      .map((a) => (a.dailyNotes || '').trim())
      .filter(Boolean)
      .join(' | ');
    const resolvedDailyNotes = (log?.dailyNotes ?? activityNotes ?? '').trim();

    const latestActTimestamp = dayActs.reduce<string | undefined>((latest, act) => {
      const candidate = act.updatedAt || act.createdAt;
      if (!candidate) return latest;
      if (!latest || candidate > latest) return candidate;
      return latest;
    }, undefined);

    const rawDailyKm = (log as { dailyKmAccomplishment?: number | string } | undefined)?.dailyKmAccomplishment;
    const parsedDailyKm = typeof rawDailyKm === 'number'
      ? rawDailyKm
      : (typeof rawDailyKm === 'string' && rawDailyKm.trim() !== '' ? Number(rawDailyKm) : NaN);
    const dailyKmAccomplishment = !isNaN(parsedDailyKm) && parsedDailyKm >= 0 ? Number(parsedDailyKm.toFixed(3)) : undefined;

    records.push({
      date,
      monthKey: getMonthKeyFromIsoDate(date),
      weather: log?.weather || dayActs[0]?.weatherCondition || 'Sunny',
      shift: log?.shift || dayActs[0]?.shift || 'Day Shift (Standard)',
      dailyKmAccomplishment,
      dailyNotes: resolvedDailyNotes,
      isNoWorkDay: Boolean(log?.isNoWorkDay),
      noWorkReason: log?.noWorkReason || '',
      noWorkNotes: log?.noWorkNotes || '',
      activities: dayActs,
      laborSummary,
      totalLabor,
      equipmentFleet,
      operatingEquipment,
      standbyEquipment,
      breakdownEquipment,
      totalEquipmentUnits,
      totalEquipmentHours,
      materialsList,
      totalMaterialReceived,
      totalMaterialUsed,
      materialNetBalance,
      productionList,
      totalPlantActual,
      totalPlantTarget,
      executedKm: Number(executedKm.toFixed(3)),
      executedM3: Number(executedM3.toFixed(2)),
      executedStructures: Number(executedStructures.toFixed(3)),
      siteChallenges: Array.isArray(log?.siteChallenges) ? log!.siteChallenges! : [],
      tomorrowPlans: Array.isArray(log?.tomorrowPlans) ? log!.tomorrowPlans! : [],
      updatedAt: log?.updatedAt || latestActTimestamp,
      updatedBy: log?.updatedBy || dayActs[0]?.recordedBy,
      hasExplicitLog
    });
  });

  return records.sort((a, b) => b.date.localeCompare(a.date));
}

export interface MonthlyDailySyncSummary {
  monthKey: string;
  loggedDaysCount: number;
  activeWorkDays: number;
  standstillDays: number;
  totalActivitiesCount: number;
  totalLaborHeadcount: number;
  avgDailyLabor: number;
  operatingEquipmentUnits: number;
  totalEquipmentUnits: number;
  equipmentHoursTotal: number;
  totalMaterialReceived: number;
  totalMaterialUsed: number;
  plantProductionActual: number;
  plantProductionTarget: number;
  executedKmSum: number;
  dailyKmAccomplishmentSum: number;
  executedM3Sum: number;
  executedStructuresSum: number;
  notesCount: number;
  latestNotePreview: string;
  latestUpdatedAt?: string;
  days: NormalizedDailyDayRecord[];
}

/**
 * Aggregates Daily Activities, Labor, Equipment, Materials, Plant Output & Daily Notes by month (`Mon-YY`).
 */
export function aggregateDailyDataByMonth(project: Project | undefined | null): {
  byMonth: Record<string, MonthlyDailySyncSummary>;
  monthKeys: string[];
  allDays: NormalizedDailyDayRecord[];
  latestUpdatedAt?: string;
} {
  const allDays = getNormalizedDailyRecordsByDate(project);
  const byMonth: Record<string, MonthlyDailySyncSummary> = {};
  let globalLatestUpdatedAt: string | undefined;

  allDays.forEach((day) => {
    if (day.updatedAt && (!globalLatestUpdatedAt || day.updatedAt > globalLatestUpdatedAt)) {
      globalLatestUpdatedAt = day.updatedAt;
    }
    if (!day.monthKey) return;

    if (!byMonth[day.monthKey]) {
      byMonth[day.monthKey] = {
        monthKey: day.monthKey,
        loggedDaysCount: 0,
        activeWorkDays: 0,
        standstillDays: 0,
        totalActivitiesCount: 0,
        totalLaborHeadcount: 0,
        avgDailyLabor: 0,
        operatingEquipmentUnits: 0,
        totalEquipmentUnits: 0,
        equipmentHoursTotal: 0,
        totalMaterialReceived: 0,
        totalMaterialUsed: 0,
        plantProductionActual: 0,
        plantProductionTarget: 0,
        executedKmSum: 0,
        dailyKmAccomplishmentSum: 0,
        executedM3Sum: 0,
        executedStructuresSum: 0,
        notesCount: 0,
        latestNotePreview: '',
        latestUpdatedAt: day.updatedAt,
        days: []
      };
    }

    const bucket = byMonth[day.monthKey];
    bucket.loggedDaysCount += 1;
    if (day.isNoWorkDay) bucket.standstillDays += 1;
    else bucket.activeWorkDays += 1;

    bucket.totalActivitiesCount += day.activities.length;
    bucket.totalLaborHeadcount += day.totalLabor;
    bucket.operatingEquipmentUnits += day.operatingEquipment;
    bucket.totalEquipmentUnits += day.totalEquipmentUnits;
    bucket.equipmentHoursTotal += day.totalEquipmentHours;
    bucket.totalMaterialReceived += day.totalMaterialReceived;
    bucket.totalMaterialUsed += day.totalMaterialUsed;
    bucket.plantProductionActual += day.totalPlantActual;
    bucket.plantProductionTarget += day.totalPlantTarget;
    bucket.executedKmSum = Number((bucket.executedKmSum + day.executedKm).toFixed(3));
    if (typeof day.dailyKmAccomplishment === 'number' && !isNaN(day.dailyKmAccomplishment)) {
      bucket.dailyKmAccomplishmentSum = Number((bucket.dailyKmAccomplishmentSum + day.dailyKmAccomplishment).toFixed(3));
    }
    bucket.executedM3Sum = Number((bucket.executedM3Sum + day.executedM3).toFixed(2));
    bucket.executedStructuresSum = Number((bucket.executedStructuresSum + day.executedStructures).toFixed(3));

    if (day.dailyNotes) {
      bucket.notesCount += 1;
      if (!bucket.latestNotePreview) {
        bucket.latestNotePreview = day.dailyNotes;
      }
    }
    if (day.updatedAt && (!bucket.latestUpdatedAt || day.updatedAt > bucket.latestUpdatedAt)) {
      bucket.latestUpdatedAt = day.updatedAt;
    }
    bucket.days.push(day);
  });

  Object.values(byMonth).forEach((bucket) => {
    bucket.avgDailyLabor = bucket.loggedDaysCount > 0
      ? Math.round(bucket.totalLaborHeadcount / bucket.loggedDaysCount)
      : 0;
  });

  const monthKeys = Object.keys(byMonth).sort((a, b) => {
    const pA = parseMonthKey(a);
    const pB = parseMonthKey(b);
    if (!pA && !pB) return 0;
    if (!pA) return 1;
    if (!pB) return -1;
    return (pB.year * 12 + pB.monthIndex) - (pA.year * 12 + pA.monthIndex);
  });

  return { byMonth, monthKeys, allDays, latestUpdatedAt: globalLatestUpdatedAt };
}

export interface ComprehensiveDailyOperationsSummary {
  totalLoggedDays: number;
  activeWorkDays: number;
  standstillDays: number;
  totalActivitiesLogged: number;
  totalNotesLogged: number;
  latestDate: string | null;
  latestDailyNotes: string;
  latestUpdatedAt?: string;
  totalLaborDeployments: number;
  avgCrewPerDay: number;
  laborByCategory: Array<{ category: string; totalCount: number }>;
  operatingUnits: number;
  standbyUnits: number;
  breakdownUnits: number;
  totalEquipmentUnits: number;
  equipmentUtilizationPct: number;
  totalEquipmentHours: number;
  totalMaterialsReceived: number;
  totalMaterialsUsed: number;
  materialNetBalance: number;
  aggregatedMaterials: Array<{ material: string; received: number; used: number; balance: number }>;
  totalPlantActual: number;
  totalPlantTarget: number;
  plantOutputEfficiencyPct: number;
  totalExecutedKm: number;
  totalExecutedM3: number;
  totalExecutedStructures: number;
  days: NormalizedDailyDayRecord[];
  operationalSignals: Array<{ severity: 'healthy' | 'caution' | 'risk'; title: string; detail: string }>;
}

/**
 * Computes full project-wide daily operations diagnostics and Daily Notes context for Comprehensive Analysis.
 */
export function computeComprehensiveDailyOperationsSummary(
  project: Project | undefined | null
): ComprehensiveDailyOperationsSummary {
  const days = getNormalizedDailyRecordsByDate(project);
  let activeWorkDays = 0;
  let standstillDays = 0;
  let totalActivitiesLogged = 0;
  let totalNotesLogged = 0;
  let totalLaborDeployments = 0;
  let operatingUnits = 0;
  let standbyUnits = 0;
  let breakdownUnits = 0;
  let totalEquipmentUnits = 0;
  let totalEquipmentHours = 0;
  let totalMaterialsReceived = 0;
  let totalMaterialsUsed = 0;
  let totalPlantActual = 0;
  let totalPlantTarget = 0;
  let totalExecutedKm = 0;
  let totalExecutedM3 = 0;
  let totalExecutedStructures = 0;
  let latestUpdatedAt: string | undefined;

  const laborCategoryMap = new Map<string, number>();
  const materialAggMap = new Map<string, { material: string; received: number; used: number }>();

  days.forEach((d) => {
    if (d.isNoWorkDay) standstillDays += 1;
    else activeWorkDays += 1;

    totalActivitiesLogged += d.activities.length;
    if (d.dailyNotes) totalNotesLogged += 1;
    totalLaborDeployments += d.totalLabor;

    d.laborSummary.forEach((l) => {
      if (l.category && l.count > 0) {
        laborCategoryMap.set(l.category, (laborCategoryMap.get(l.category) || 0) + l.count);
      }
    });

    operatingUnits += d.operatingEquipment;
    standbyUnits += d.standbyEquipment;
    breakdownUnits += d.breakdownEquipment;
    totalEquipmentUnits += d.totalEquipmentUnits;
    totalEquipmentHours += d.totalEquipmentHours;

    totalMaterialsReceived += d.totalMaterialReceived;
    totalMaterialsUsed += d.totalMaterialUsed;

    d.materialsList.forEach((m) => {
      const key = (m.material || '').trim();
      if (!key) return;
      const existing = materialAggMap.get(key) || { material: key, received: 0, used: 0 };
      existing.received += Number(m.received) || 0;
      existing.used += Number(m.used) || 0;
      materialAggMap.set(key, existing);
    });

    totalPlantActual += d.totalPlantActual;
    totalPlantTarget += d.totalPlantTarget;
    totalExecutedKm += d.executedKm;
    totalExecutedM3 += d.executedM3;
    totalExecutedStructures += d.executedStructures;

    if (d.updatedAt && (!latestUpdatedAt || d.updatedAt > latestUpdatedAt)) {
      latestUpdatedAt = d.updatedAt;
    }
  });

  const equipmentUtilizationPct = totalEquipmentUnits > 0
    ? Math.round((operatingUnits / totalEquipmentUnits) * 100)
    : 0;

  const plantOutputEfficiencyPct = totalPlantTarget > 0
    ? Math.round((totalPlantActual / totalPlantTarget) * 100)
    : 0;

  const avgCrewPerDay = days.length > 0 ? Math.round(totalLaborDeployments / days.length) : 0;

  const laborByCategory = Array.from(laborCategoryMap.entries())
    .map(([category, totalCount]) => ({ category, totalCount }))
    .sort((a, b) => b.totalCount - a.totalCount);

  const aggregatedMaterials = Array.from(materialAggMap.values())
    .map((m) => ({ ...m, balance: m.received - m.used }))
    .sort((a, b) => b.used - a.used);

  const operationalSignals: ComprehensiveDailyOperationsSummary['operationalSignals'] = [];

  if (days.length === 0) {
    operationalSignals.push({
      severity: 'caution',
      title: 'No Daily Field Logs Synchronized Yet',
      detail: 'Record labor, equipment, materials, and Daily Notes in the Daily Activities view to feed field telemetry here.'
    });
  } else {
    if (breakdownUnits > 0 && totalEquipmentUnits > 0 && breakdownUnits / totalEquipmentUnits >= 0.2) {
      operationalSignals.push({
        severity: 'risk',
        title: 'Elevated Equipment Breakdown Ratio',
        detail: `${breakdownUnits} of ${totalEquipmentUnits} logged machinery units are in Breakdown/Maintenance status. Review mechanic turnaround and manager Daily Notes.`
      });
    } else if (totalEquipmentUnits > 0) {
      operationalSignals.push({
        severity: 'healthy',
        title: 'Healthy Fleet Availability',
        detail: `${equipmentUtilizationPct}% fleet utilization (${operatingUnits} operating units / ${totalEquipmentHours.toFixed(1)} machine-hours logged).`
      });
    }

    if (standstillDays > 0) {
      operationalSignals.push({
        severity: standstillDays >= 3 ? 'risk' : 'caution',
        title: `${standstillDays} Standstill Day${standstillDays > 1 ? 's' : ''} Recorded`,
        detail: 'Zero-increment days logged on site. Cross-reference standstill causes and Daily Notes against schedule variance (SPI).'
      });
    }

    if (totalPlantTarget > 0 && plantOutputEfficiencyPct < 75) {
      operationalSignals.push({
        severity: 'caution',
        title: 'Batching & Crushing Output Below Daily Target',
        detail: `Cumulative plant output is at ${plantOutputEfficiencyPct}% of target (${totalPlantActual.toLocaleString()} / ${totalPlantTarget.toLocaleString()} units).`
      });
    }

    if (totalNotesLogged > 0) {
      operationalSignals.push({
        severity: 'healthy',
        title: `${totalNotesLogged} Daily Manager Note${totalNotesLogged > 1 ? 's' : ''} Linked`,
        detail: 'Construction manager contextual notes are synchronized with daily labor, equipment, and material inputs.'
      });
    }
  }

  return {
    totalLoggedDays: days.length,
    activeWorkDays,
    standstillDays,
    totalActivitiesLogged,
    totalNotesLogged,
    latestDate: days[0]?.date || null,
    latestDailyNotes: days.find((d) => Boolean(d.dailyNotes))?.dailyNotes || '',
    latestUpdatedAt,
    totalLaborDeployments,
    avgCrewPerDay,
    laborByCategory,
    operatingUnits,
    standbyUnits,
    breakdownUnits,
    totalEquipmentUnits,
    equipmentUtilizationPct,
    totalEquipmentHours: Number(totalEquipmentHours.toFixed(1)),
    totalMaterialsReceived,
    totalMaterialsUsed,
    materialNetBalance: totalMaterialsReceived - totalMaterialsUsed,
    aggregatedMaterials,
    totalPlantActual,
    totalPlantTarget,
    plantOutputEfficiencyPct,
    totalExecutedKm: Number(totalExecutedKm.toFixed(3)),
    totalExecutedM3: Number(totalExecutedM3.toFixed(2)),
    totalExecutedStructures: Number(totalExecutedStructures.toFixed(3)),
    days,
    operationalSignals
  };
}

/**
 * Broadcasts an explicit daily log sync notification across listeners & browser tabs.
 */
export function broadcastDailyActivitiesSync(projectId: string, date: string, updatedAt: string): void {
  safeDispatchCustomEvent('era_daily_activities_synced', { projectId, date, updatedAt });
  if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
    try {
      const bc = new BroadcastChannel('era_broadcast_channel');
      bc.postMessage({ type: 'DAILY_ACTIVITIES_SYNCED', projectId, date, updatedAt });
      bc.close();
    } catch {}
  }
}

/**
 * Shared chronological monthly calculator for Logistics & Resources (`monthlyResourceRecords`):
 * totalToDate = previousMonthTotal + thisMonth
 * used = max(0, totalToDate - availableStock)
 * remainingBalance = max(0, scopeNum - totalToDate)
 */
export function linkAndRecalculateMonthlyResourceRecords(
  records: MonthlyResourceRecord[]
): MonthlyResourceRecord[] {
  if (!records || records.length === 0) return [];

  const sortedAsc = [...records].map(rec => ({
    ...rec,
    resourceMobilization: [...(rec.resourceMobilization || [])],
    materialProduction: [...(rec.materialProduction || [])]
  })).sort((a, b) => a.month.localeCompare(b.month));

  for (let i = 0; i < sortedAsc.length; i++) {
    const rec = sortedAsc[i];
    const prevRec = i > 0 ? sortedAsc[i - 1] : null;

    rec.materialProduction = (rec.materialProduction || []).map(item => {
      let prevTotal = 0;

      if (prevRec) {
        const prevMatch = (prevRec.materialProduction || []).find(
          p => p.id === item.id || p.desc.trim().toLowerCase() === item.desc.trim().toLowerCase()
        );
        if (prevMatch) {
          prevTotal = prevMatch.totalToDate || 0;
        } else if (typeof item.previousMonthTotal === 'number') {
          prevTotal = item.previousMonthTotal;
        } else {
          prevTotal = Math.max(0, (item.totalToDate || 0) - (item.thisMonth || 0));
        }
      } else {
        if (typeof item.previousMonthTotal === 'number') {
          prevTotal = item.previousMonthTotal;
        } else {
          prevTotal = Math.max(0, (item.totalToDate || 0) - (item.thisMonth || 0));
        }
      }

      const thisMonth = Number(item.thisMonth) || 0;
      const totalToDate = Number((prevTotal + thisMonth).toFixed(2));
      const stock = Number(item.availableStock) || 0;
      const used = Math.max(0, Number((totalToDate - stock).toFixed(2)));

      const scopeStr = item.scope || '';
      const scopeClean = scopeStr.replace(/,/g, '').match(/[\d.]+/);
      const scopeNum = scopeClean ? parseFloat(scopeClean[0]) : 0;
      const remainingBalance = Math.max(0, Number((scopeNum - totalToDate).toFixed(2)));

      return {
        ...item,
        previousMonthTotal: prevTotal,
        thisMonth,
        totalToDate,
        used,
        remainingBalance
      };
    });
  }

  return sortedAsc.sort((a, b) => b.month.localeCompare(a.month));
}

export function isLogisticsProductionItem(item: MaterialProductionItem): boolean {
  if (item.category === 'Production') return true;
  const text = `${item.desc || ''} ${item.scope || ''}`.toLowerCase();
  return (
    text.includes('produce') ||
    text.includes('production') ||
    text.includes('crush') ||
    text.includes('aggregate') ||
    text.includes('quarry') ||
    text.includes('batching') ||
    text.includes('precast')
  );
}

export function extractUnitFromLogisticsItem(item: MaterialProductionItem): string {
  if (item.unit && item.unit.trim()) return item.unit.trim();
  const scope = (item.scope || '').toLowerCase();
  if (scope.includes('m3') || scope.includes('m³')) return 'm³';
  if (scope.includes('m2') || scope.includes('m²')) return 'm²';
  if (scope.includes('ton')) return 'Tons';
  if (scope.includes('pcs') || scope.includes('pc') || scope.includes('pipe')) return 'pcs';
  if (scope.includes('km')) return 'km';
  if (scope.includes('meter')) return 'm';
  if (scope.includes('no.')) return 'No.';
  return 'm³';
}

export function inferFacilityNameFromLogisticsItem(item: MaterialProductionItem): string {
  const desc = (item.desc || '').toLowerCase();
  if (desc.includes('asphalt')) return 'Asphalt Batching Plant';
  if (desc.includes('concrete') || desc.includes('batching')) return 'Concrete Batching Plant';
  if (desc.includes('precast') || desc.includes('culvert') || desc.includes('pipe')) return 'Precast Concrete Yard';
  if (desc.includes('sub-base') || desc.includes('subbase')) return 'Primary Crusher & Sub-Base Quarry';
  if (desc.includes('base') || desc.includes('aggregate') || desc.includes('crush') || desc.includes('quarry')) return 'Primary Stone Crusher / Quarry';
  return item.desc || 'Site Production Facility';
}

export function inferEquipmentTypeFromProductionRow(item: {
  equipmentType?: string;
  facilityName?: string;
  itemProduced?: string;
}): string {
  if (item.equipmentType && item.equipmentType.trim()) {
    return item.equipmentType.trim();
  }
  const combined = `${item.facilityName || ''} ${item.itemProduced || ''}`.toLowerCase();
  if (combined.includes('asphalt')) return 'Asphalt Batching Plant';
  if (combined.includes('concrete') || combined.includes('batching')) return 'Concrete Batching Plant';
  if (combined.includes('precast') || combined.includes('culvert') || combined.includes('pipe') || combined.includes('rcp')) {
    return 'Precast Concrete Yard';
  }
  if (
    combined.includes('crush') ||
    combined.includes('quarry') ||
    combined.includes('aggregate') ||
    combined.includes('sub-base') ||
    combined.includes('subbase') ||
    combined.includes('screen')
  ) {
    return 'Crushing & Screening Plant';
  }
  return item.facilityName?.trim() || 'Production Plant';
}

export interface LogisticsProductionContext {
  allRecords: MonthlyResourceRecord[];
  targetRecord: MonthlyResourceRecord | null;
  monthKey: string;
  isExactMonthMatch: boolean;
  allItems: MaterialProductionItem[];
  productionItems: MaterialProductionItem[];
  supplyItems: MaterialProductionItem[];
}

export function resolveLogisticsProductionContext(
  project: Project | undefined | null,
  dateStr: string
): LogisticsProductionContext {
  const monthKey = (dateStr && dateStr.length >= 7) ? dateStr.slice(0, 7) : new Date().toISOString().slice(0, 7);

  let rawRecords: MonthlyResourceRecord[] = [];
  if (project?.monthlyResourceRecords && project.monthlyResourceRecords.length > 0) {
    rawRecords = project.monthlyResourceRecords;
  } else if (project?.materialProduction && project.materialProduction.length > 0) {
    const [y, m] = monthKey.split('-').map(Number);
    const monthName = (!isNaN(y) && !isNaN(m))
      ? new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      : monthKey;
    rawRecords = [{
      id: 'mrec_' + monthKey.replace('-', '_'),
      month: monthKey,
      monthName,
      recordedDate: dateStr || new Date().toISOString().split('T')[0],
      recordedBy: project.lastModifiedBy || 'Authorized Officer',
      status: 'Approved',
      resourceMobilization: project.resourceMobilization || [],
      materialProduction: project.materialProduction
    }];
  }

  const allRecords = linkAndRecalculateMonthlyResourceRecords(rawRecords);
  const exactMatch = allRecords.find(r => r.month === monthKey) || null;
  const targetRecord = exactMatch || allRecords[0] || null;

  const allItems = targetRecord?.materialProduction || [];
  const productionItems = allItems.filter(isLogisticsProductionItem);
  const supplyItems = allItems.filter(item => !isLogisticsProductionItem(item));

  return {
    allRecords,
    targetRecord,
    monthKey,
    isExactMonthMatch: Boolean(exactMatch),
    allItems,
    productionItems,
    supplyItems
  };
}

export function findMatchingLogisticsItem(
  prod: DailyProductionItem,
  allLogisticsItems: MaterialProductionItem[]
): MaterialProductionItem | undefined {
  if (!allLogisticsItems || allLogisticsItems.length === 0) return undefined;

  if (prod.linkedLogisticsId === '__unlinked__') {
    return undefined;
  }

  if (prod.linkedLogisticsId) {
    const byLinkedId = allLogisticsItems.find(m => m.id === prod.linkedLogisticsId);
    if (byLinkedId) return byLinkedId;
  }

  if (prod.id && prod.id.startsWith('p_')) {
    const rawId = prod.id.slice(2);
    const byPrefixedId = allLogisticsItems.find(m => m.id === rawId);
    if (byPrefixedId) return byPrefixedId;
  }

  const prodDesc = (prod.itemProduced || '').trim().toLowerCase();
  const facDesc = (prod.facilityName || '').trim().toLowerCase();

  if (prodDesc) {
    const exactDesc = allLogisticsItems.find(m => m.desc.trim().toLowerCase() === prodDesc);
    if (exactDesc) return exactDesc;
  }

  const combined = `${prodDesc} ${facDesc}`;
  if (combined.includes('asphalt') && combined.includes('concrete')) {
    const match = allLogisticsItems.find(m => {
      const d = m.desc.toLowerCase();
      return d.includes('asphalt') && (d.includes('concrete') || d.includes('ac'));
    });
    if (match) return match;
  }
  if (combined.includes('batching') || combined.includes('c-30') || (combined.includes('concrete') && !combined.includes('asphalt'))) {
    const match = allLogisticsItems.find(m => {
      const d = m.desc.toLowerCase();
      return d.includes('structural concrete') || (d.includes('concrete') && d.includes('batching'));
    });
    if (match) return match;
  }
  if (combined.includes('sub-base') || combined.includes('subbase')) {
    const match = allLogisticsItems.find(m => m.desc.toLowerCase().includes('sub-base') || m.desc.toLowerCase().includes('subbase'));
    if (match) return match;
  }
  if (combined.includes('crushed base') || combined.includes('base course') || combined.includes('stone crusher')) {
    const match = allLogisticsItems.find(m => {
      const d = m.desc.toLowerCase();
      return d.includes('aggregate base') || d.includes('base course');
    });
    if (match) return match;
  }
  if (combined.includes('precast') || combined.includes('rcp') || combined.includes('culvert') || combined.includes('pipe')) {
    const match = allLogisticsItems.find(m => {
      const d = m.desc.toLowerCase();
      return d.includes('precast') || d.includes('rcp') || d.includes('culvert') || d.includes('pipe');
    });
    if (match) return match;
  }

  return undefined;
}

export function buildProductionListFromLogistics(
  project: Project | undefined | null,
  dateStr: string
): DailyProductionItem[] {
  const ctx = resolveLogisticsProductionContext(project, dateStr);
  return ctx.productionItems.map(item => {
    const facilityName = inferFacilityNameFromLogisticsItem(item);
    return {
      id: `p_${item.id}`,
      linkedLogisticsId: item.id,
      linkedLogisticsCategory: item.category || 'Production',
      equipmentType: inferEquipmentTypeFromProductionRow({ facilityName, itemProduced: item.desc }),
      facilityName,
      itemProduced: item.desc,
      unit: extractUnitFromLogisticsItem(item),
      targetOutput: item.monthlyTarget ? Math.max(1, Math.round(item.monthlyTarget / 26)) : 0,
      actualOutput: 0,
      previousCumulative: item.totalToDate || 0,
      operatingHours: 8.0,
      remarks: `Linked to Logistics (${ctx.targetRecord?.monthName || ctx.monthKey})`
    };
  });
}

/**
 * Reconciles a Daily Activities `productionList` with current Logistics & Resources values.
 * Keeps daily `actualOutput` intact while aligning `previousCumulative = logisticsTotalToDate - actualOutput`
 * so `previousCumulative + actualOutput` matches Logistics & Resources `Total To Date`.
 */
export function reconcileProductionListWithLogistics(
  currentList: DailyProductionItem[],
  project: Project | undefined | null,
  dateStr: string,
  options: { appendMissingLogisticsProduction?: boolean } = {}
): DailyProductionItem[] {
  const ctx = resolveLogisticsProductionContext(project, dateStr);
  if (ctx.allItems.length === 0) return currentList;

  const matchedLogisticsIds = new Set<string>();

  const updated = currentList.map(row => {
    const matched = findMatchingLogisticsItem(row, ctx.allItems);
    if (!matched) return row;

    matchedLogisticsIds.add(matched.id);
    const actualToday = Number(row.actualOutput) || 0;
    const syncedPrevCum = Math.max(0, Number(((matched.totalToDate || 0) - actualToday).toFixed(2)));
    const syncedTarget = row.targetOutput > 0
      ? row.targetOutput
      : (matched.monthlyTarget ? Math.max(1, Math.round(matched.monthlyTarget / 26)) : 0);

    return {
      ...row,
      equipmentType: row.equipmentType || inferEquipmentTypeFromProductionRow(row),
      linkedLogisticsId: matched.id,
      linkedLogisticsCategory: matched.category || row.linkedLogisticsCategory || 'Production',
      unit: row.unit || extractUnitFromLogisticsItem(matched),
      targetOutput: syncedTarget,
      previousCumulative: syncedPrevCum
    };
  });

  if (options.appendMissingLogisticsProduction) {
    ctx.productionItems.forEach(item => {
      if (!matchedLogisticsIds.has(item.id)) {
        const facilityName = inferFacilityNameFromLogisticsItem(item);
        updated.push({
          id: `p_${item.id}`,
          linkedLogisticsId: item.id,
          linkedLogisticsCategory: item.category || 'Production',
          equipmentType: inferEquipmentTypeFromProductionRow({ facilityName, itemProduced: item.desc }),
          facilityName,
          itemProduced: item.desc,
          unit: extractUnitFromLogisticsItem(item),
          targetOutput: item.monthlyTarget ? Math.max(1, Math.round(item.monthlyTarget / 26)) : 0,
          actualOutput: 0,
          previousCumulative: item.totalToDate || 0,
          operatingHours: 8.0,
          remarks: `Linked to Logistics (${ctx.targetRecord?.monthName || ctx.monthKey})`
        });
      }
    });
  }

  return updated;
}

/**
 * Propagates daily production output deltas (`newActual - prevActual`) into Logistics & Resources
 * (`monthlyResourceRecords` and `materialProduction`) and runs chronological recalculation.
 * Returns `null` when no linked Logistics item has an output change.
 */
export function syncDailyProductionToLogistics(
  project: Project,
  dateStr: string,
  prevDayList: DailyProductionItem[],
  nextDayList: DailyProductionItem[],
  userEmail?: string
): { monthlyResourceRecords: MonthlyResourceRecord[]; materialProduction: MaterialProductionItem[] } | null {
  const ctx = resolveLogisticsProductionContext(project, dateStr);
  if (ctx.allItems.length === 0) return null;

  const prevByLogisticsId = new Map<string, number>();
  (prevDayList || []).forEach(row => {
    const matched = findMatchingLogisticsItem(row, ctx.allItems);
    const key = row.linkedLogisticsId || matched?.id;
    if (key) {
      prevByLogisticsId.set(key, (prevByLogisticsId.get(key) || 0) + (Number(row.actualOutput) || 0));
    }
  });

  const nextByLogisticsId = new Map<string, number>();
  const rowMetaByLogisticsId = new Map<string, DailyProductionItem>();
  (nextDayList || []).forEach(row => {
    const matched = findMatchingLogisticsItem(row, ctx.allItems);
    const key = row.linkedLogisticsId || matched?.id;
    if (key) {
      nextByLogisticsId.set(key, (nextByLogisticsId.get(key) || 0) + (Number(row.actualOutput) || 0));
      rowMetaByLogisticsId.set(key, row);
    }
  });

  const allAffectedIds = new Set<string>([
    ...Array.from(prevByLogisticsId.keys()),
    ...Array.from(nextByLogisticsId.keys())
  ]);

  const deltaById = new Map<string, number>();
  allAffectedIds.forEach(id => {
    const delta = (nextByLogisticsId.get(id) || 0) - (prevByLogisticsId.get(id) || 0);
    if (Math.abs(delta) > 1e-6) {
      deltaById.set(id, delta);
    }
  });

  if (deltaById.size === 0) return null;

  const workingRecords: MonthlyResourceRecord[] = ctx.allRecords.map(rec => ({
    ...rec,
    resourceMobilization: [...(rec.resourceMobilization || [])],
    materialProduction: [...(rec.materialProduction || [])]
  }));

  let targetIdx = workingRecords.findIndex(r => r.month === ctx.monthKey);
  if (targetIdx === -1) {
    // Auto-create the month record for dateStr by carrying forward totals from latest baseline
    const latestRec = workingRecords[0];
    const [y, m] = ctx.monthKey.split('-').map(Number);
    const monthName = (!isNaN(y) && !isNaN(m))
      ? new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      : ctx.monthKey;

    const newRec: MonthlyResourceRecord = {
      id: `mrec_${ctx.monthKey.replace('-', '_')}`,
      month: ctx.monthKey,
      monthName,
      recordedDate: dateStr,
      recordedBy: userEmail || project.lastModifiedBy || 'Authorized Officer',
      status: 'Draft',
      notes: `Auto-initialized from Daily Activities production tracking (${ctx.monthKey}).`,
      resourceMobilization: latestRec ? latestRec.resourceMobilization.map(r => ({ ...r })) : [...(project.resourceMobilization || [])],
      materialProduction: latestRec
        ? latestRec.materialProduction.map(item => ({
            ...item,
            previousMonthTotal: item.totalToDate || 0,
            thisMonth: 0,
            totalToDate: item.totalToDate || 0
          }))
        : []
    };
    workingRecords.push(newRec);
    targetIdx = workingRecords.length - 1;
  }

  const targetRec = workingRecords[targetIdx];
  targetRec.materialProduction = (targetRec.materialProduction || []).map(item => {
    const delta = deltaById.get(item.id);
    if (!delta) return item;
    const rowMeta = rowMetaByLogisticsId.get(item.id);
    const updatedThisMonth = Math.max(0, Number(((Number(item.thisMonth) || 0) + delta).toFixed(2)));
    return {
      ...item,
      unit: item.unit || rowMeta?.unit,
      thisMonth: updatedThisMonth
    };
  });

  const recalculated = linkAndRecalculateMonthlyResourceRecords(workingRecords);
  const newLatest = recalculated[0];

  return {
    monthlyResourceRecords: recalculated,
    materialProduction: newLatest ? newLatest.materialProduction : []
  };
}

/**
 * Creates a new Own Material Production item in Logistics & Resources from a Daily Activities row
 * and returns the updated Logistics arrays alongside the newly assigned `linkedLogisticsId`.
 */
export function createLogisticsProductionItemFromDaily(
  project: Project,
  dateStr: string,
  row: DailyProductionItem,
  userEmail?: string
): {
  newLogisticsId: string;
  monthlyResourceRecords: MonthlyResourceRecord[];
  materialProduction: MaterialProductionItem[];
} {
  const ctx = resolveLogisticsProductionContext(project, dateStr);
  const newLogisticsId = `mat_${Date.now()}`;
  const monthlyTarget = row.targetOutput ? Math.round(row.targetOutput * 26) : 500;

  const newMatItem: MaterialProductionItem = {
    id: newLogisticsId,
    desc: (row.itemProduced || row.facilityName || 'Site Plant Production').trim(),
    category: 'Production',
    scope: `${Math.max(monthlyTarget * 12, (row.previousCumulative || 0) + (row.actualOutput || 0)).toLocaleString()} ${row.unit || 'm³'}`,
    unit: row.unit || 'm³',
    monthlyTarget,
    previousMonthTotal: Number(row.previousCumulative) || 0,
    thisMonth: Number(row.actualOutput) || 0,
    totalToDate: (Number(row.previousCumulative) || 0) + (Number(row.actualOutput) || 0),
    used: (Number(row.previousCumulative) || 0) + (Number(row.actualOutput) || 0),
    availableStock: 0,
    remainingBalance: 0
  };

  const workingRecords: MonthlyResourceRecord[] = ctx.allRecords.map(rec => ({
    ...rec,
    resourceMobilization: [...(rec.resourceMobilization || [])],
    materialProduction: [...(rec.materialProduction || [])]
  }));

  let targetRec = workingRecords.find(r => r.month === ctx.monthKey);
  if (!targetRec) {
    const [y, m] = ctx.monthKey.split('-').map(Number);
    const monthName = (!isNaN(y) && !isNaN(m))
      ? new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      : ctx.monthKey;
    const latestRec = workingRecords[0];
    targetRec = {
      id: `mrec_${ctx.monthKey.replace('-', '_')}`,
      month: ctx.monthKey,
      monthName,
      recordedDate: dateStr,
      recordedBy: userEmail || project.lastModifiedBy || 'Authorized Officer',
      status: 'Draft',
      notes: `Monthly logistical record initialized from Daily Activities.`,
      resourceMobilization: latestRec ? latestRec.resourceMobilization.map(r => ({ ...r })) : [...(project.resourceMobilization || [])],
      materialProduction: latestRec
        ? latestRec.materialProduction.map(item => ({
            ...item,
            previousMonthTotal: item.totalToDate || 0,
            thisMonth: 0,
            totalToDate: item.totalToDate || 0
          }))
        : []
    };
    workingRecords.push(targetRec);
  }

  targetRec.materialProduction = [...targetRec.materialProduction, newMatItem];

  const recalculated = linkAndRecalculateMonthlyResourceRecords(workingRecords);
  const newLatest = recalculated[0];

  return {
    newLogisticsId,
    monthlyResourceRecords: recalculated,
    materialProduction: newLatest ? newLatest.materialProduction : []
  };
}

/**
 * Sums daily logged production output in `dailySiteLogs` for a specific month (`YYYY-MM`) keyed by `linkedLogisticsId`.
 */
export function getMonthlyDailyProductionTotalsMap(
  project: Project | undefined | null,
  monthStr: string
): Map<string, { dailySum: number; dayCount: number }> {
  const totals = new Map<string, { dailySum: number; dayCount: number }>();
  if (!project?.dailySiteLogs || !monthStr) return totals;

  const ctx = resolveLogisticsProductionContext(project, `${monthStr}-01`);

  Object.entries(project.dailySiteLogs).forEach(([dateKey, entry]) => {
    if (!dateKey.startsWith(monthStr) || !Array.isArray(entry?.productionList)) return;
    entry.productionList.forEach(row => {
      const matched = findMatchingLogisticsItem(row, ctx.allItems);
      const id = row.linkedLogisticsId || matched?.id;
      const actual = Number(row.actualOutput) || 0;
      if (id && actual > 0) {
        const cur = totals.get(id) || { dailySum: 0, dayCount: 0 };
        totals.set(id, {
          dailySum: Number((cur.dailySum + actual).toFixed(2)),
          dayCount: cur.dayCount + 1
        });
      }
    });
  });

  return totals;
}

