import {
  Project,
  DailyActivityRecord,
  DailySiteLogEntry,
  DailyActivityLaborItem,
  DailyEquipmentFleetItem,
  DailyMaterialItem,
  DailyProductionItem,
  DailyTomorrowPlanItem
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
  { id: 'p1', facilityName: 'Asphalt Plant @ Ch. 203+400', itemProduced: 'Asphalt Concrete AC 60/70', unit: 'Tons', targetOutput: 450, actualOutput: 380, previousCumulative: 14200, operatingHours: 7.5, remarks: 'Continuous run' },
  { id: 'p2', facilityName: 'Concrete Batching Plant #1', itemProduced: 'C-30 Concrete', unit: 'm³', targetOutput: 120, actualOutput: 95, previousCumulative: 3100, operatingHours: 6.0, remarks: 'Structure pour' },
  { id: 'p3', facilityName: 'Primary Stone Crusher', itemProduced: 'Crushed Base Aggregate', unit: 'm³', targetOutput: 800, actualOutput: 720, previousCumulative: 42500, operatingHours: 8.0, remarks: 'Quarry B' },
  { id: 'p4', facilityName: 'Precast RCP Yard', itemProduced: 'RCP Ø1000mm Pipes', unit: 'Pcs', targetOutput: 40, actualOutput: 35, previousCumulative: 890, operatingHours: 8.0, remarks: 'Curing chamber' }
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

    records.push({
      date,
      monthKey: getMonthKeyFromIsoDate(date),
      weather: log?.weather || dayActs[0]?.weatherCondition || 'Sunny',
      shift: log?.shift || dayActs[0]?.shift || 'Day Shift (Standard)',
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
