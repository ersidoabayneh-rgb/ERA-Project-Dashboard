import { jsPDF } from 'jspdf';
import { DailyActivityRecord, Project, User } from '../types';
import {
  drawStandardPdfPageFrame,
  drawSafeTable,
  drawUniversalSignatureBlock,
  STRICT_1_INCH_MARGIN,
  enforceArchivedProjectDataSource
} from './pdfReportEngine';
import { parseMonthKey, resolveCurrentMonthKey } from './monthlySync';

export interface SummarySectionDef {
  id: string;
  name: string;
  isSpecial?: boolean;
  isCustom?: boolean;
  customLabel?: string;
}

export const STANDARD_WORK_SECTIONS_FALLBACK: SummarySectionDef[] = [
  { id: '1', name: 'Clearing and Grubbing' },
  { id: '2', name: 'Road bed' },
  { id: '3.1', name: 'undercut Excavation' },
  { id: '3.2', name: 'undercut Replacement Fill' },
  { id: '4', name: 'Cut to Spoil/Stock' },
  { id: '5', name: 'Embankment Construction' },
  { id: '6', name: 'Capping layer' },
  { id: '7', name: 'Subgrade' },
  { id: '8', name: 'Sub-Base' },
  { id: '9', name: 'Base course' },
  { id: '10', name: 'Prime and Tack Coat' },
  { id: '11', name: 'AC' },
  { id: '12', name: 'Shoulder DBST' },
  { id: '13', name: 'RCP Production' },
  { id: '18', name: 'Ditch Construction' },
  { id: '14', name: 'RCP Pipe Construction', isSpecial: true },
  { id: '15', name: 'Box Culvert Construction', isSpecial: true },
  { id: '16', name: 'Slab Culvert Construction', isSpecial: true },
  { id: '17', name: 'Bridge Construction', isSpecial: true }
];

export function resolveDefaultUnitForSection(sectionId: string): string {
  if (['1', '2', '10', '11', '12'].includes(sectionId)) return 'km';
  if (['3.1', '3.2', '4', '5'].includes(sectionId)) return 'm³';
  if (['6', '7', '8', '9', '18'].includes(sectionId)) return 'm';
  if (sectionId === '13') return 'pcs';
  if (['14', '14.1', '14.2', '15', '16', '17'].includes(sectionId)) return 'No.';
  return 'km';
}

export function normalizeSpecialSectionId(activityType: string, act?: DailyActivityRecord): string {
  if (activityType === '14.1') return '15';
  if (activityType === '14.2') return '16';
  if (activityType === '15' && act && Boolean(act.bridgeLocation || act.bridgeSelectedStage)) return '17';
  return activityType || 'Other';
}

export function extractActivityExecutedQty(act: DailyActivityRecord): number {
  const secId = normalizeSpecialSectionId(act.activityType, act);

  if (['14', '15', '16', '17'].includes(secId)) {
    const q = Number(act.quantityExecuted);
    if (!isNaN(q) && q > 0) return q;
    if (secId === '17') {
      return Number(act.bridgeDailyProgress) || Number(act.metricKm) || 0;
    }
    return Number(act.metricKm) || 0;
  }

  if (secId === '13') {
    return Number(act.pcsThisDay) || Number(act.quantityExecuted) || 0;
  }

  if (['3.1', '3.2', '4', '5'].includes(secId)) {
    return Number(act.metricM3) || Number(act.metricKm) || Number(act.quantityExecuted) || 0;
  }

  return Number(act.metricKm) || Number(act.metricM3) || Number(act.quantityExecuted) || Number(act.bridgeDailyProgress) || 0;
}

export function resolveActivityLocation(act: DailyActivityRecord): string {
  return (
    act.pipeLocation ||
    act.boxCulvertLocation ||
    act.slabCulvertLocation ||
    act.bridgeLocation ||
    act.startStationKm ||
    (act.endStationKm ? `To ${act.endStationKm}` : '') ||
    '-'
  );
}

export interface ActivityAggregateRow {
  sectionId: string;
  sectionName: string;
  unit: string;
  entryCount: number;
  completedCount: number;
  activeDays: number;
  periodExecuted: number;
  priorCumulative: number;
  cumulativeToDate: number;
  isSpecial: boolean;
}

export interface UnitTotalSummary {
  unit: string;
  totalQty: number;
  sectionCount: number;
  entryCount: number;
}

export interface DailyExecutionSummary {
  date: string;
  totalEntries: number;
  completedEntries: number;
  activeSectionsCount: number;
  rows: ActivityAggregateRow[];
  unitTotals: UnitTotalSummary[];
}

export interface MonthlyActivityLogRow {
  id: string;
  date: string;
  sectionId: string;
  activityName: string;
  description: string;
  location: string;
  side: string;
  unit: string;
  executedQty: number;
  status: string;
}

export interface MonthlyExecutionSummary {
  monthYYYYMM: string;
  monthDisplayLabel: string;
  totalEntries: number;
  completedEntries: number;
  activeWorkDays: number;
  standstillDays: number;
  activeSectionsCount: number;
  rows: ActivityAggregateRow[];
  unitTotals: UnitTotalSummary[];
  logs: MonthlyActivityLogRow[];
}

export function resolveTargetMonthYYYYMM(project?: Partial<Project>, explicitMonth?: string): string {
  if (explicitMonth && /^\d{4}-\d{2}$/.test(explicitMonth.trim())) {
    return explicitMonth.trim();
  }
  const key = resolveCurrentMonthKey(project);
  const parsed = parseMonthKey(key);
  if (parsed) {
    return `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, '0')}`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthDisplayLabel(monthYYYYMM: string): string {
  const match = monthYYYYMM.match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthYYYYMM;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const d = new Date(year, monthIdx, 1);
  if (isNaN(d.getTime())) return monthYYYYMM;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function buildSectionCatalog(
  sections: SummarySectionDef[] | undefined,
  activities: DailyActivityRecord[]
): SummarySectionDef[] {
  const base = sections && sections.length > 0 ? sections : STANDARD_WORK_SECTIONS_FALLBACK;
  const map = new Map<string, SummarySectionDef>();
  base.forEach(s => {
    if (s && s.id && !map.has(s.id)) {
      map.set(s.id, s);
    }
  });
  activities.forEach(a => {
    const normId = normalizeSpecialSectionId(a.activityType, a);
    if (normId && !map.has(normId)) {
      map.set(normId, {
        id: normId,
        name: a.activityName || `Section ${normId}`,
        isSpecial: ['14', '15', '16', '17'].includes(normId)
      });
    }
  });
  return Array.from(map.values());
}

function computeUnitTotals(rows: ActivityAggregateRow[]): UnitTotalSummary[] {
  const unitMap = new Map<string, UnitTotalSummary>();
  rows.forEach(r => {
    if (r.entryCount === 0 && r.periodExecuted === 0) return;
    const u = r.unit || 'Units';
    const existing = unitMap.get(u);
    if (existing) {
      existing.totalQty += r.periodExecuted;
      existing.sectionCount += 1;
      existing.entryCount += r.entryCount;
    } else {
      unitMap.set(u, {
        unit: u,
        totalQty: r.periodExecuted,
        sectionCount: 1,
        entryCount: r.entryCount
      });
    }
  });
  return Array.from(unitMap.values()).sort((a, b) => b.totalQty - a.totalQty);
}

export function computeDailyActivitySummary(
  activities: DailyActivityRecord[],
  selectedDate: string,
  sections?: SummarySectionDef[],
  getDefaultUnit: (id: string) => string = resolveDefaultUnitForSection
): DailyExecutionSummary {
  const catalog = buildSectionCatalog(sections, activities);
  const rows: ActivityAggregateRow[] = [];

  let totalEntries = 0;
  let completedEntries = 0;
  let activeSectionsCount = 0;

  catalog.forEach(sec => {
    const todayActs = activities.filter(
      a => a.date === selectedDate && normalizeSpecialSectionId(a.activityType, a) === sec.id
    );
    const priorActs = activities.filter(
      a => a.date < selectedDate && normalizeSpecialSectionId(a.activityType, a) === sec.id
    );

    const defaultUnit = getDefaultUnit(sec.id);
    const firstUnit = todayActs.find(a => a.unit)?.unit || priorActs.find(a => a.unit)?.unit || defaultUnit;

    const periodExecuted = todayActs.reduce((sum, a) => sum + extractActivityExecutedQty(a), 0);
    const priorCumulative = priorActs.reduce((sum, a) => sum + extractActivityExecutedQty(a), 0);
    const completedCount = todayActs.filter(a => Boolean(a.isComplete)).length;

    if (todayActs.length > 0) {
      activeSectionsCount += 1;
      totalEntries += todayActs.length;
      completedEntries += completedCount;
    }

    rows.push({
      sectionId: sec.customLabel || sec.id,
      sectionName: sec.name,
      unit: sec.isSpecial ? 'No.' : firstUnit,
      entryCount: todayActs.length,
      completedCount,
      activeDays: todayActs.length > 0 ? 1 : 0,
      periodExecuted,
      priorCumulative,
      cumulativeToDate: priorCumulative + periodExecuted,
      isSpecial: Boolean(sec.isSpecial)
    });
  });

  return {
    date: selectedDate,
    totalEntries,
    completedEntries,
    activeSectionsCount,
    rows,
    unitTotals: computeUnitTotals(rows)
  };
}

export function computeMonthlyActivitySummary(
  project: Project,
  targetMonthYYYYMM?: string,
  sections?: SummarySectionDef[],
  getDefaultUnit: (id: string) => string = resolveDefaultUnitForSection
): MonthlyExecutionSummary {
  const monthYYYYMM = resolveTargetMonthYYYYMM(project, targetMonthYYYYMM);
  const monthStart = `${monthYYYYMM}-01`;
  const allActivities = Array.isArray(project.dailyActivities) ? project.dailyActivities : [];
  const catalog = buildSectionCatalog(sections, allActivities);

  const monthActivities = allActivities.filter(a => Boolean(a.date) && a.date.startsWith(monthYYYYMM));
  const priorActivities = allActivities.filter(a => Boolean(a.date) && a.date < monthStart);

  const siteLogs = project.dailySiteLogs || {};
  const activeDaySet = new Set<string>();
  const standstillDaySet = new Set<string>();

  Object.entries(siteLogs).forEach(([dateKey, log]) => {
    if (dateKey.startsWith(monthYYYYMM)) {
      if (log?.isNoWorkDay) {
        standstillDaySet.add(dateKey);
      } else {
        activeDaySet.add(dateKey);
      }
    }
  });
  monthActivities.forEach(a => {
    if (a.date && !standstillDaySet.has(a.date)) {
      activeDaySet.add(a.date);
    }
  });

  const rows: ActivityAggregateRow[] = [];
  let totalEntries = 0;
  let completedEntries = 0;
  let activeSectionsCount = 0;

  catalog.forEach(sec => {
    const secMonthActs = monthActivities.filter(
      a => normalizeSpecialSectionId(a.activityType, a) === sec.id
    );
    const secPriorActs = priorActivities.filter(
      a => normalizeSpecialSectionId(a.activityType, a) === sec.id
    );

    const defaultUnit = getDefaultUnit(sec.id);
    const resolvedUnit = secMonthActs.find(a => a.unit)?.unit || secPriorActs.find(a => a.unit)?.unit || defaultUnit;

    const periodExecuted = secMonthActs.reduce((sum, a) => sum + extractActivityExecutedQty(a), 0);
    const priorCumulative = secPriorActs.reduce((sum, a) => sum + extractActivityExecutedQty(a), 0);
    const completedCount = secMonthActs.filter(a => Boolean(a.isComplete)).length;
    const secActiveDays = new Set(secMonthActs.map(a => a.date).filter(Boolean)).size;

    if (secMonthActs.length > 0) {
      activeSectionsCount += 1;
      totalEntries += secMonthActs.length;
      completedEntries += completedCount;
    }

    rows.push({
      sectionId: sec.customLabel || sec.id,
      sectionName: sec.name,
      unit: sec.isSpecial ? 'No.' : resolvedUnit,
      entryCount: secMonthActs.length,
      completedCount,
      activeDays: secActiveDays,
      periodExecuted,
      priorCumulative,
      cumulativeToDate: priorCumulative + periodExecuted,
      isSpecial: Boolean(sec.isSpecial)
    });
  });

  const logs: MonthlyActivityLogRow[] = [...monthActivities]
    .sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.activityType || '').localeCompare(b.activityType || '', undefined, { numeric: true });
    })
    .map(a => {
      const normId = normalizeSpecialSectionId(a.activityType, a);
      const secMatch = catalog.find(s => s.id === normId);
      const unit = a.unit || (secMatch?.isSpecial ? 'No.' : getDefaultUnit(normId));
      return {
        id: a.id,
        date: a.date,
        sectionId: normId,
        activityName: secMatch ? `${secMatch.customLabel || secMatch.id}. ${secMatch.name}` : (a.activityName || normId),
        description: a.description || secMatch?.name || '-',
        location: resolveActivityLocation(a),
        side: a.side || 'BHS',
        unit,
        executedQty: extractActivityExecutedQty(a),
        status: a.isComplete ? 'Complete' : (a.qcStatus || 'Logged')
      };
    });

  return {
    monthYYYYMM,
    monthDisplayLabel: formatMonthDisplayLabel(monthYYYYMM),
    totalEntries,
    completedEntries,
    activeWorkDays: activeDaySet.size,
    standstillDays: standstillDaySet.size,
    activeSectionsCount,
    rows,
    unitTotals: computeUnitTotals(rows),
    logs
  };
}

export function formatQtyNumber(val: number, unit?: string): string {
  const decimals = unit === 'No.' ? 3 : unit === 'pcs' || unit === 'Trip' ? 0 : 2;
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export interface MonthlyActivitiesPdfOptions {
  project: Project;
  targetMonthYYYYMM?: string;
  currentUser?: User | null;
  sections?: SummarySectionDef[];
}

export function generateMonthlyActivitiesSummaryPdf(options: MonthlyActivitiesPdfOptions): jsPDF {
  const rawProject = options.project;
  const project = enforceArchivedProjectDataSource(rawProject, () => rawProject);
  const summary = computeMonthlyActivitySummary(project, options.targetMonthYYYYMM, options.sections);

  const doc = new jsPDF('l', 'pt', 'a4');
  const margin = STRICT_1_INCH_MARGIN;
  let pageNumber = 1;
  const estimatedPages = Math.max(1, Math.ceil((summary.rows.length + summary.logs.length) / 18));

  const drawFrameForPage = (pNo: number) =>
    drawStandardPdfPageFrame(doc, pNo, estimatedPages, {
      margin,
      title: 'MONTHLY DAILY ACTIVITIES EXECUTION SUMMARY',
      subtitle: `PROJECT: ${(project.name || 'ROAD PROJECT').toUpperCase()} • PERIOD: ${summary.monthDisplayLabel.toUpperCase()} (${summary.monthYYYYMM})`,
      projectCode: `ERA-DPR-${summary.monthYYYYMM}`,
      footerText: 'ETHIOPIAN ROADS ADMINISTRATION • END-OF-MONTH DAILY ACTIVITIES CONSOLIDATED REPORT'
    });

  const frame = drawFrameForPage(pageNumber);
  const contentWidth = frame.contentWidth;
  let curY = frame.contentY;

  // Project Metadata Ribbon
  const ribbonHeight = 36;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, curY, contentWidth, ribbonHeight, 4, 4, 'FD');

  const halfW = (contentWidth - 24) / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const projLine = doc.splitTextToSize(`PROJECT: ${(project.name || 'Road Project').toUpperCase()}`, halfW)[0];
  doc.text(projLine, margin + 10, curY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const partyLine = doc.splitTextToSize(
    `Contractor: ${project.contractor || 'N/A'}  |  Consultant: ${project.supervisionConsultant?.firmName || project.consultant || 'N/A'}`,
    halfW
  )[0];
  doc.text(partyLine, margin + 10, curY + 26);

  const rightX = margin + contentWidth / 2 + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`REPORTING MONTH: ${summary.monthDisplayLabel.toUpperCase()}`, rightX, curY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Active Days: ${summary.activeWorkDays}  |  Standstill Days: ${summary.standstillDays}  |  Entries Logged: ${summary.totalEntries}  |  Active Sections: ${summary.activeSectionsCount}`,
    rightX,
    curY + 26
  );

  curY += ribbonHeight + 10;

  // Unit-Wise Grand Totals Strip
  if (summary.unitTotals.length > 0) {
    const unitChips = summary.unitTotals.slice(0, 5);
    const cardGap = 8;
    const cardW = (contentWidth - cardGap * (unitChips.length - 1)) / unitChips.length;
    const cardH = 34;

    unitChips.forEach((ut, idx) => {
      const x = margin + idx * (cardW + cardGap);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x, curY, cardW, cardH, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`TOTAL EXECUTED (${ut.unit.toUpperCase()})`, x + 8, curY + 11);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${formatQtyNumber(ut.totalQty, ut.unit)} ${ut.unit}`, x + 8, curY + 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${ut.sectionCount} section(s) • ${ut.entryCount} log(s)`, x + 8, curY + 30);
    });

    curY += cardH + 12;
  }

  // Section 1: Aggregate Quantities Executed per Construction Activity
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`1. AGGREGATE QUANTITIES BY CONSTRUCTION ACTIVITY (${summary.monthDisplayLabel.toUpperCase()})`, margin, curY);
  curY += 8;

  const aggregateRowsForTable = summary.rows.map(r => ({
    secId: r.sectionId,
    activity: r.sectionName,
    unit: r.unit,
    days: String(r.activeDays),
    entries: String(r.entryCount),
    prior: `${formatQtyNumber(r.priorCumulative, r.unit)} ${r.unit}`,
    monthQty: `${formatQtyNumber(r.periodExecuted, r.unit)} ${r.unit}`,
    toDate: `${formatQtyNumber(r.cumulativeToDate, r.unit)} ${r.unit}`
  }));

  curY = drawSafeTable(doc, {
    startY: curY,
    margin,
    maxWidth: contentWidth,
    headerBgColor: [15, 23, 42],
    headerTextColor: [255, 255, 255],
    headerFontSize: 7.2,
    fontSize: 6.8,
    rowPadding: 3,
    columns: [
      { header: 'Sec #', dataKey: 'secId', widthPercent: 7, align: 'center' },
      { header: 'Construction Activity', dataKey: 'activity', widthPercent: 29, align: 'left' },
      { header: 'Unit', dataKey: 'unit', widthPercent: 7, align: 'center' },
      { header: 'Active Days', dataKey: 'days', widthPercent: 8, align: 'center' },
      { header: 'Entries', dataKey: 'entries', widthPercent: 7, align: 'center' },
      { header: 'Prior Cumulative', dataKey: 'prior', widthPercent: 14, align: 'right' },
      { header: 'Month Executed', dataKey: 'monthQty', widthPercent: 14, align: 'right' },
      { header: 'End-of-Month Cum.', dataKey: 'toDate', widthPercent: 14, align: 'right' }
    ],
    rows: aggregateRowsForTable,
    onPageBreak: () => {
      pageNumber += 1;
      const nextFrame = drawFrameForPage(pageNumber);
      return nextFrame.contentY;
    }
  });

  // Ensure clearance before Section 2
  const pageHeight = doc.internal.pageSize.getHeight();
  if (curY + 80 > pageHeight - margin - 25) {
    doc.addPage();
    pageNumber += 1;
    curY = drawFrameForPage(pageNumber).contentY;
  } else {
    curY += 6;
  }

  // Section 2: Detailed Monthly Activity Execution Logs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. CHRONOLOGICAL ACTIVITY LOGS (${summary.logs.length} ENTRIES IN ${summary.monthDisplayLabel.toUpperCase()})`, margin, curY);
  curY += 8;

  if (summary.logs.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, contentWidth, 32, 4, 4, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `No daily construction activity logs were recorded for ${summary.monthDisplayLabel} (${summary.monthYYYYMM}).`,
      margin + 12,
      curY + 19
    );
    curY += 42;
  } else {
    const logRowsForTable = summary.logs.map(l => ({
      date: l.date,
      activity: l.activityName,
      description: l.description,
      location: l.location,
      side: l.side,
      qty: `${formatQtyNumber(l.executedQty, l.unit)} ${l.unit}`,
      status: l.status
    }));

    curY = drawSafeTable(doc, {
      startY: curY,
      margin,
      maxWidth: contentWidth,
      headerBgColor: [30, 58, 138],
      headerTextColor: [255, 255, 255],
      headerFontSize: 7.2,
      fontSize: 6.6,
      rowPadding: 3,
      columns: [
        { header: 'Date', dataKey: 'date', widthPercent: 10, align: 'center' },
        { header: 'Activity Section', dataKey: 'activity', widthPercent: 21, align: 'left' },
        { header: 'Description of Work', dataKey: 'description', widthPercent: 29, align: 'left' },
        { header: 'Station / Location', dataKey: 'location', widthPercent: 15, align: 'center' },
        { header: 'Side', dataKey: 'side', widthPercent: 6, align: 'center' },
        { header: 'Executed Qty', dataKey: 'qty', widthPercent: 11, align: 'right' },
        { header: 'Status', dataKey: 'status', widthPercent: 8, align: 'center' }
      ],
      rows: logRowsForTable,
      onPageBreak: () => {
        pageNumber += 1;
        const nextFrame = drawFrameForPage(pageNumber);
        return nextFrame.contentY;
      }
    });
  }

  // Executive Sign-off Block
  if (curY + 85 > pageHeight - margin - 25) {
    doc.addPage();
    pageNumber += 1;
    curY = drawFrameForPage(pageNumber).contentY;
  }

  drawUniversalSignatureBlock(doc, options.currentUser, {
    y: curY,
    margin,
    contentWidth,
    orientation: 'landscape'
  });

  return doc;
}

export function downloadMonthlyActivitiesSummaryPdf(options: MonthlyActivitiesPdfOptions): string {
  const monthYYYYMM = resolveTargetMonthYYYYMM(options.project, options.targetMonthYYYYMM);
  const doc = generateMonthlyActivitiesSummaryPdf({ ...options, targetMonthYYYYMM: monthYYYYMM });
  const safeName = (options.project.name || 'Project')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const filename = `ERA_Monthly_Activities_Summary_${safeName}_${monthYYYYMM}.pdf`;
  doc.save(filename);
  return filename;
}
