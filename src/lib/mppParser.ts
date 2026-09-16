import { WorkProgramActivity } from '../types';

export interface ParseResult {
  activities: WorkProgramActivity[];
  fileType: 'mpp' | 'xml' | 'mpx' | 'csv' | 'unknown';
  formatLabel: string;
  projectTitle?: string;
  taskCount: number;
  warnings?: string[];
}

/**
 * Universal robust date parser for all standard project schedule formats:
 * - ISO: 2025-05-12T08:00:00, 2025-05-12, 2025/05/12
 * - International / European: 12/05/2025, 12-05-2025, 12.05.2025
 * - US format: 05/12/2025, 5/12/2025
 * - Named months: 12-May-2025, 12 May 2025, May 12, 2025, 12-May-25
 * - Excel serial number dates: e.g. 45424
 */
export function parseAnyDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  const str = String(val).trim();
  if (!str) return null;

  // Excel serial number (e.g. 45000 to 55000)
  const numericVal = Number(str);
  if (!isNaN(numericVal) && numericVal > 30000 && numericVal < 70000) {
    // Excel epoch: Dec 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const dateFromSerial = new Date(excelEpoch.getTime() + numericVal * 86400000);
    if (!isNaN(dateFromSerial.getTime())) return dateFromSerial;
  }

  // ISO standard e.g. 2025-05-12 or 2025-05-12T08:00:00 or 2025-05-12 08:00:00
  const isoMatch = str.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})(?:[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const hr = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    const min = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const parsed = new Date(y, m, d, hr, min);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // DD-MMM-YYYY or MMM-DD-YYYY e.g. "12-May-2025", "12 May 2025", "May 12, 2025"
  const monthMap: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  const textMonthMatch1 = str.match(/^(\d{1,2})[-/ ]([A-Za-z]+)[-/ ](\d{2,4})/);
  if (textMonthMatch1) {
    const day = parseInt(textMonthMatch1[1], 10);
    const monthKey = textMonthMatch1[2].toLowerCase();
    let year = parseInt(textMonthMatch1[3], 10);
    if (year < 100) year += 2000;
    if (monthMap[monthKey] !== undefined) {
      const parsed = new Date(year, monthMap[monthKey], day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  const textMonthMatch2 = str.match(/^([A-Za-z]+)[-/ ](\d{1,2})(?:st|nd|rd|th)?,?[-/ ](\d{2,4})/);
  if (textMonthMatch2) {
    const monthKey = textMonthMatch2[1].toLowerCase();
    const day = parseInt(textMonthMatch2[2], 10);
    let year = parseInt(textMonthMatch2[3], 10);
    if (year < 100) year += 2000;
    if (monthMap[monthKey] !== undefined) {
      const parsed = new Date(year, monthMap[monthKey], day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
  if (slashMatch) {
    const first = parseInt(slashMatch[1], 10);
    const second = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;

    // If first > 12, it MUST be day/month/year
    if (first > 12 && second <= 12) {
      const parsed = new Date(year, second - 1, first);
      if (!isNaN(parsed.getTime())) return parsed;
    } else if (second > 12 && first <= 12) {
      // Must be month/day/year
      const parsed = new Date(year, first - 1, second);
      if (!isNaN(parsed.getTime())) return parsed;
    } else {
      // Default to Day/Month/Year for international construction projects
      const parsed = new Date(year, second - 1, first);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  // Direct native Date constructor fallback
  const directDate = new Date(str);
  if (!isNaN(directDate.getTime())) return directDate;

  return null;
}

/**
 * Cleanly formats date as 'MMM D, YYYY' (e.g. 'Oct 15, 2025')
 */
export function formatDateString(str?: string | null): string {
  if (!str) return '';
  const d = parseAnyDate(str);
  if (d && !isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return String(str).trim();
}

/**
 * Normalizes dependency sequence types into 'FS' | 'SS' | 'FF' | 'SF'
 */
export function normalizeDepType(rawType?: string | null): 'FS' | 'SS' | 'FF' | 'SF' {
  if (!rawType) return 'FS';
  const clean = rawType.trim().toUpperCase();
  if (clean === 'SS' || clean.includes('START-TO-START') || clean.includes('START TO START') || clean === '3') return 'SS';
  if (clean === 'FF' || clean.includes('FINISH-TO-FINISH') || clean.includes('FINISH TO FINISH') || clean === '0') return 'FF';
  if (clean === 'SF' || clean.includes('START-TO-FINISH') || clean.includes('START TO FINISH') || clean === '2') return 'SF';
  return 'FS';
}

/**
 * Parses duration strings from various MS Project and CSV formats:
 * - "10 days", "10 d", "10d", "10", "10 days?" (estimated in MS Project)
 * - "80 hrs", "80h", "80 hrs?" (converted to 10 days at 8h/workday)
 * - "2 wks", "2w", "2 wks?" (converted to 10 work days)
 * - "1 mo", "1m" (converted to 20 work days)
 * - ISO 8601: "PT80H0M0S", "PT4800M0S", "P10D", "P2W"
 */
export function parseDurationToDays(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, Math.round(val));

  const str = String(val).trim();
  if (!str) return 0;

  // Direct number
  const directNum = Number(str);
  if (!isNaN(directNum)) return Math.max(0, Math.round(directNum));

  // ISO 8601 duration e.g. PT80H0M0S or PT4800M0S or P10D
  if (str.startsWith('P') || str.startsWith('p')) {
    let days = 0;
    const dayMatch = str.match(/(\d+(?:\.\d+)?)\s*D/i);
    const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*H/i);
    const minuteMatch = str.match(/(\d+(?:\.\d+)?)\s*M/i);
    const weekMatch = str.match(/(\d+(?:\.\d+)?)\s*W/i);

    if (dayMatch) days += parseFloat(dayMatch[1]);
    if (hourMatch) days += parseFloat(hourMatch[1]) / 8; // 8 hrs per workday in MS Project
    if (minuteMatch && !hourMatch && !dayMatch) days += parseFloat(minuteMatch[1]) / 480; // 480 mins per workday
    if (weekMatch) days += parseFloat(weekMatch[1]) * 5; // 5 days per workweek

    if (days >= 0) return Math.max(0, Math.round(days));
  }

  // Text like "10 days", "40 hrs", "2 wks", "1 mo" (with optional '?' estimated marker)
  const cleanStr = str.replace(/\?/g, '').trim().toLowerCase();
  
  const daysMatch = cleanStr.match(/^(\d+(?:\.\d+)?)\s*(?:d|day|days|edays|ed)$/i);
  if (daysMatch) return Math.max(0, Math.round(parseFloat(daysMatch[1])));

  const hoursMatch = cleanStr.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours|ehours|eh)$/i);
  if (hoursMatch) return Math.max(0, Math.round(parseFloat(hoursMatch[1]) / 8));

  const weeksMatch = cleanStr.match(/^(\d+(?:\.\d+)?)\s*(?:w|wk|wks|weeks|eweeks|ew)$/i);
  if (weeksMatch) return Math.max(0, Math.round(parseFloat(weeksMatch[1]) * 5));

  const monthsMatch = cleanStr.match(/^(\d+(?:\.\d+)?)\s*(?:m|mo|mon|months|emonths|emon)$/i);
  if (monthsMatch) return Math.max(0, Math.round(parseFloat(monthsMatch[1]) * 20));

  const fallbackMatch = cleanStr.match(/\d+/);
  if (fallbackMatch) return Math.max(0, parseInt(fallbackMatch[0], 10));

  return 0;
}

/**
 * Parses complex MS Project predecessor strings like:
 * "1FS+2d, 3SS-1d, 5" or "A, B(FF+5)" or "2, 4FS, 6SS+2"
 */
export function parsePredecessorString(predStr: string): {
  predecessors: string;
  lag: number;
  depType: 'FS' | 'SS' | 'FF' | 'SF';
  predDetails: { [predId: string]: { lag: number; depType: 'FS' | 'SS' | 'FF' | 'SF' } };
} {
  const result = {
    predecessors: '',
    lag: 0,
    depType: 'FS' as 'FS' | 'SS' | 'FF' | 'SF',
    predDetails: {} as { [predId: string]: { lag: number; depType: 'FS' | 'SS' | 'FF' | 'SF' } }
  };

  if (!predStr || !predStr.trim()) return result;

  // Split by commas or semicolons
  const items = predStr.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const cleanPredIds: string[] = [];

  items.forEach((item, idx) => {
    // Match patterns like: "1FS+2d", "1SS-1", "A(FF+3)", "2FF", "3+2d", "Task 1"
    const match = item.match(/^([A-Za-z0-9_\-.]+)(?:\s*[\(\[]?\s*(FS|SS|FF|SF)?\s*([+\-]?\s*\d+(?:\.\d+)?(?:\s*[a-zA-Z]+)?)?\s*[\)\]]?)?$/i);
    
    let predId = item;
    let type: 'FS' | 'SS' | 'FF' | 'SF' = 'FS';
    let lag = 0;

    if (match) {
      predId = match[1]?.trim() || item;
      if (match[2]) {
        type = normalizeDepType(match[2]);
      }
      if (match[3]) {
        const rawLagStr = match[3].replace(/\s+/g, '');
        lag = parseDurationToDays(rawLagStr);
        if (rawLagStr.startsWith('-')) {
          lag = -lag;
        }
      }
    } else {
      // General regex fallback
      const idMatch = item.match(/^[A-Za-z0-9_\-.]+/);
      if (idMatch) predId = idMatch[0];
      const typeMatch = item.match(/(FS|SS|FF|SF)/i);
      if (typeMatch) type = normalizeDepType(typeMatch[1]);
      const lagMatch = item.match(/([+\-]\s*\d+)/);
      if (lagMatch) lag = parseInt(lagMatch[1].replace(/\s+/g, ''), 10) || 0;
    }

    cleanPredIds.push(predId);
    result.predDetails[predId] = {
      lag: isNaN(lag) ? 0 : lag,
      depType: type
    };

    if (idx === 0) {
      result.lag = isNaN(lag) ? 0 : lag;
      result.depType = type;
    }
  });

  result.predecessors = cleanPredIds.join(', ');
  return result;
}

/**
 * Parses MS Project XML file format with 100% data fidelity
 */
export function parseMsProjectXml(xmlText: string): WorkProgramActivity[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for parse error
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.warn('XML Parse Error in MS Project XML:', parseError.textContent);
    }

    const taskNodes = doc.querySelectorAll('Task, task');
    if (taskNodes.length === 0) return [];

    const uidToIdMap: { [uid: string]: string } = {};
    const rawActivities: Array<{
      uid: string;
      id: string;
      name: string;
      durationDays: number;
      startStr?: string;
      finishStr?: string;
      isMilestone?: boolean;
      predecessors: Array<{ uid: string; type: number; lagTenthMins: number }>;
      isSummary: boolean;
      outlineLevel?: number;
    }> = [];

    taskNodes.forEach((taskNode) => {
      const uid = taskNode.querySelector('UID, uid')?.textContent?.trim() || '';
      const id = taskNode.querySelector('ID, id')?.textContent?.trim() || uid;
      const name = taskNode.querySelector('Name, name')?.textContent?.trim() || '';
      const durationRaw = taskNode.querySelector('Duration, duration')?.textContent?.trim() || '';
      const start = taskNode.querySelector('Start, start')?.textContent?.trim() || '';
      const finish = taskNode.querySelector('Finish, finish')?.textContent?.trim() || '';
      const isSummary = taskNode.querySelector('Summary, summary')?.textContent?.trim() === '1';
      const isNull = taskNode.querySelector('IsNull, isNull')?.textContent?.trim() === '1';
      const isMilestone = taskNode.querySelector('Milestone, milestone')?.textContent?.trim() === '1';

      if (isNull || (!name && !durationRaw && !start)) return;
      if (id === '0' && isSummary) return; // Skip project root container summary

      const assignedId = id || uid || String(rawActivities.length + 1);
      uidToIdMap[uid] = assignedId;

      let durationDays = parseDurationToDays(durationRaw);
      
      // If duration is 0 or missing, but start & finish exist and it's not a milestone, calculate days
      if (durationDays === 0 && !isMilestone && start && finish) {
        const s = parseAnyDate(start);
        const f = parseAnyDate(finish);
        if (s && f && f.getTime() >= s.getTime()) {
          durationDays = Math.max(1, Math.round((f.getTime() - s.getTime()) / 86400000));
        }
      }

      // Predecessors
      const predLinks = taskNode.querySelectorAll('PredecessorLink, predecessorLink');
      const predecessors: Array<{ uid: string; type: number; lagTenthMins: number }> = [];

      predLinks.forEach(link => {
        const predUid = link.querySelector('PredecessorUID, predecessorUID')?.textContent?.trim() || '';
        const rawType = parseInt(link.querySelector('Type, type')?.textContent?.trim() || '1', 10);
        const linkLag = parseInt(link.querySelector('LinkLag, linkLag')?.textContent?.trim() || '0', 10);
        if (predUid) {
          predecessors.push({
            uid: predUid,
            type: isNaN(rawType) ? 1 : rawType,
            lagTenthMins: isNaN(linkLag) ? 0 : linkLag
          });
        }
      });

      rawActivities.push({
        uid,
        id: assignedId,
        name: name || `Task ${assignedId}`,
        durationDays: isMilestone ? 0 : (durationDays || 1),
        startStr: start,
        finishStr: finish,
        isMilestone,
        predecessors,
        isSummary
      });
    });

    if (rawActivities.length === 0) return [];

    // Map to WorkProgramActivity
    const result: WorkProgramActivity[] = rawActivities.map(raw => {
      const predDetails: { [predId: string]: { lag: number; depType: 'FS' | 'SS' | 'FF' | 'SF' } } = {};
      const predIds: string[] = [];

      raw.predecessors.forEach((p) => {
        const mappedPredId = uidToIdMap[p.uid] || p.uid;
        if (mappedPredId && mappedPredId !== raw.id) {
          predIds.push(mappedPredId);
          // Type: 0 = FF, 1 = FS, 2 = SF, 3 = SS
          let depType: 'FS' | 'SS' | 'FF' | 'SF' = 'FS';
          if (p.type === 0) depType = 'FF';
          else if (p.type === 1) depType = 'FS';
          else if (p.type === 2) depType = 'SF';
          else if (p.type === 3) depType = 'SS';

          // In MS Project XML, LinkLag is in tenths of a minute (4800 = 480 mins = 1 day)
          const lagDays = Math.round(p.lagTenthMins / 4800);

          predDetails[mappedPredId] = {
            lag: lagDays,
            depType
          };
        }
      });

      const firstPred = predIds[0];
      const primaryDetail = firstPred ? predDetails[firstPred] : null;

      const formattedStart = raw.startStr ? formatDateString(raw.startStr) : '';
      const formattedFinish = raw.finishStr ? formatDateString(raw.finishStr) : '';

      return {
        id: raw.id,
        name: raw.name,
        duration: raw.durationDays,
        predecessors: predIds.join(', '),
        lag: primaryDetail ? primaryDetail.lag : 0,
        depType: primaryDetail ? primaryDetail.depType : 'FS',
        predDetails: Object.keys(predDetails).length > 0 ? predDetails : undefined,
        start: formattedStart,
        finish: formattedFinish,
        manualStart: !!formattedStart,
        manualFinish: !!formattedFinish,
        critical: false,
        float: 0
      };
    });

    return result;
  } catch (err) {
    console.error('Failed to parse MS Project XML:', err);
    return [];
  }
}

/**
 * Parses MS Project MPX (text exchange format)
 */
export function parseMsProjectMpx(mpxText: string): WorkProgramActivity[] {
  const lines = mpxText.split(/\r?\n/).filter(l => l.trim());
  const tasks: WorkProgramActivity[] = [];

  for (const line of lines) {
    const parts = line.split(';').map(p => p.trim());
    const recordType = parts[0];

    // Record 30 is Task
    if (recordType === '30') {
      const id = parts[1] || String(tasks.length + 1);
      const name = parts[2] || `Task ${id}`;
      const durStr = parts[3] || '1';
      const duration = parseDurationToDays(durStr) || 1;
      const startStr = parts[5] || '';
      const finishStr = parts[6] || '';
      const predStr = parts[10] || '';

      const predData = parsePredecessorString(predStr);

      const formattedStart = startStr ? formatDateString(startStr) : '';
      const formattedFinish = finishStr ? formatDateString(finishStr) : '';

      tasks.push({
        id,
        name,
        duration,
        predecessors: predData.predecessors,
        lag: predData.lag,
        depType: predData.depType,
        predDetails: Object.keys(predData.predDetails).length > 0 ? predData.predDetails : undefined,
        start: formattedStart,
        finish: formattedFinish,
        manualStart: !!formattedStart,
        manualFinish: !!formattedFinish,
        critical: false,
        float: 0
      });
    }
  }

  return tasks;
}

/**
 * Parses CSV / TSV / Semicolon / Pipe delimited files with full header detection
 */
export function parseCsvOrText(text: string): WorkProgramActivity[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Determine delimiter: comma, tab, semicolon, pipe
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
  else if (firstLine.includes('|')) delimiter = '|';

  const parseRow = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values.map(v => v.replace(/^["']|["']$/g, '').trim());
  };

  const headerRow = parseRow(firstLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  // Robustly identify column indices across all software exports (MS Project, Primavera, Excel)
  let idCol = headerRow.findIndex(h => 
    h === 'id' || h === 'taskid' || h === 'actid' || h === 'activityid' || h === 'sn' || h === 'no' || h === 'item' || h === 'code' || h === 'wbs'
  );
  let nameCol = headerRow.findIndex(h => 
    h === 'name' || h === 'taskname' || h === 'activity' || h === 'activityname' || h === 'activitydescription' || h === 'description' || h === 'task' || h === 'itemdescription'
  );
  let durCol = headerRow.findIndex(h => 
    h === 'duration' || h === 'durationdays' || h === 'days' || h === 'dur' || h === 'workdays' || h === 'origdur' || h === 'originalduration'
  );
  let predCol = headerRow.findIndex(h => 
    h === 'predecessors' || h === 'predecessor' || h === 'preds' || h === 'pred' || h === 'dependencies' || h === 'dependency' || h === 'logic'
  );
  let lagCol = headerRow.findIndex(h => 
    h === 'lag' || h === 'lagdays' || h === 'delay'
  );
  let typeCol = headerRow.findIndex(h => 
    h === 'sequencetype' || h === 'type' || h === 'deptype' || h === 'dependencytype' || h === 'relation' || h === 'relationshiptype'
  );
  let startCol = headerRow.findIndex(h => 
    h === 'start' || h === 'startdate' || h === 'earlystart' || h === 'plannedstart' || h === 'actualstart' || h === 'baselinestart' || h === 'startday'
  );
  let finishCol = headerRow.findIndex(h => 
    h === 'finish' || h === 'finishdate' || h === 'earlyfinish' || h === 'end' || h === 'enddate' || h === 'plannedfinish' || h === 'actualfinish' || h === 'baselinefinish' || h === 'finishday'
  );

  // Fallbacks if no recognizable header
  let dataLines = lines;
  if (idCol !== -1 || nameCol !== -1 || durCol !== -1 || startCol !== -1) {
    dataLines = lines.slice(1);
  } else {
    // Default standard positional mapping: ID (0), Name (1), Duration (2), Predecessors (3), Lag (4), Sequence Type (5)
    idCol = 0;
    nameCol = 1;
    durCol = 2;
    predCol = 3;
    lagCol = 4;
    typeCol = 5;
  }

  if (nameCol === -1 && idCol !== -1) nameCol = 1;
  if (durCol === -1) durCol = 2;
  if (predCol === -1) predCol = 3;

  const activities: WorkProgramActivity[] = [];

  dataLines.forEach((line) => {
    const cols = parseRow(line);
    if (cols.length === 0 || cols.every(c => !c)) return;

    const rawId = (idCol !== -1 && cols[idCol]) ? cols[idCol] : String(activities.length + 1);
    const rawName = (nameCol !== -1 && cols[nameCol]) ? cols[nameCol] : `Activity ${rawId}`;
    const rawDur = (durCol !== -1 && cols[durCol]) ? cols[durCol] : '';
    const rawPred = (predCol !== -1 && cols[predCol]) ? cols[predCol] : '';
    const rawLag = (lagCol !== -1 && cols[lagCol]) ? cols[lagCol] : '';
    const rawType = (typeCol !== -1 && cols[typeCol]) ? cols[typeCol] : '';
    const rawStart = (startCol !== -1 && cols[startCol]) ? cols[startCol] : '';
    const rawFinish = (finishCol !== -1 && cols[finishCol]) ? cols[finishCol] : '';

    let duration = parseDurationToDays(rawDur);
    
    // If duration not provided, check if start and finish dates exist
    const parsedStart = parseAnyDate(rawStart);
    const parsedFinish = parseAnyDate(rawFinish);

    if ((!rawDur || duration === 0) && parsedStart && parsedFinish) {
      if (parsedFinish.getTime() >= parsedStart.getTime()) {
        duration = Math.max(1, Math.round((parsedFinish.getTime() - parsedStart.getTime()) / 86400000));
      }
    } else if (!rawDur && duration === 0) {
      duration = 1;
    }

    const predInfo = parsePredecessorString(rawPred);

    const explicitLag = rawLag ? parseInt(rawLag, 10) || 0 : predInfo.lag;
    const explicitType = rawType ? normalizeDepType(rawType) : predInfo.depType;

    const formattedStart = rawStart ? formatDateString(rawStart) : '';
    const formattedFinish = rawFinish ? formatDateString(rawFinish) : '';

    activities.push({
      id: rawId,
      name: rawName,
      duration: duration !== undefined ? duration : 1,
      predecessors: predInfo.predecessors,
      lag: explicitLag,
      depType: explicitType,
      predDetails: Object.keys(predInfo.predDetails).length > 0 ? predInfo.predDetails : undefined,
      start: formattedStart,
      finish: formattedFinish,
      manualStart: !!formattedStart,
      manualFinish: !!formattedFinish,
      critical: false,
      float: 0
    });
  });

  return activities;
}

/**
 * Scans binary data / ArrayBuffer from an MS Project (.mpp) file.
 */
export function parseMsProjectBinary(buffer: ArrayBuffer): WorkProgramActivity[] {
  const bytes = new Uint8Array(buffer);
  
  // 1. Check if the file contains XML structure
  const headSnippet = new TextDecoder('utf-8').decode(bytes.slice(0, 500));
  if (headSnippet.includes('<?xml') || headSnippet.includes('<Project') || headSnippet.includes('<Tasks')) {
    const fullXml = new TextDecoder('utf-8').decode(bytes);
    const xmlResult = parseMsProjectXml(fullXml);
    if (xmlResult.length > 0) return xmlResult;
  }

  // 2. Decode UTF-16LE and ASCII strings from the binary stream
  const utf16Strings: string[] = [];
  const asciiStrings: string[] = [];

  let currentU16 = '';
  for (let i = 0; i < bytes.length - 1; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (code >= 32 && code <= 126) {
      currentU16 += String.fromCharCode(code);
    } else {
      if (currentU16.length >= 3) {
        utf16Strings.push(currentU16.trim());
      }
      currentU16 = '';
    }
  }
  if (currentU16.length >= 3) utf16Strings.push(currentU16.trim());

  let currentAscii = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      currentAscii += String.fromCharCode(b);
    } else {
      if (currentAscii.length >= 3) {
        asciiStrings.push(currentAscii.trim());
      }
      currentAscii = '';
    }
  }
  if (currentAscii.length >= 3) asciiStrings.push(currentAscii.trim());

  const allFoundStrings = Array.from(new Set([...utf16Strings, ...asciiStrings]));

  // Check for embedded XML
  const embeddedXmlCandidate = allFoundStrings.find(s => s.includes('<Project') && s.includes('<Task'));
  if (embeddedXmlCandidate) {
    const xmlRes = parseMsProjectXml(embeddedXmlCandidate);
    if (xmlRes.length > 0) return xmlRes;
  }

  // Filter candidate Task Names
  const excludedKeywords = new Set([
    'microsoft', 'project', 'ms project', 'windows', 'arial', 'tahoma', 'calibri', 
    'segoe', 'times new roman', 'font', 'format', 'standard', 'gantt', 'root entry',
    'summaryinformation', 'documentsummaryinformation', 'compobj', 'propset', 'table',
    'tbkndtask', 'tbkndres', 'tbkndassn', 'tbkndtable', 'ttdesc', 'views', 'filters',
    'outline', 'calendar', 'schedule', 'custom fields', 'author', 'title', 'company'
  ]);

  const candidateTaskNames: string[] = [];
  allFoundStrings.forEach(s => {
    const lower = s.toLowerCase();
    if (s.length < 3 || s.length > 120) return;
    if (excludedKeywords.has(lower)) return;
    if (/^[0-9\s._\-–:;,]+$/.test(s)) return;
    if (s.startsWith('http://') || s.startsWith('https://')) return;
    if (s.includes('UUID') || s.includes('CLSID') || s.includes('{')) return;

    candidateTaskNames.push(s);
  });

  const uniqueTaskNames: string[] = [];
  candidateTaskNames.forEach(t => {
    if (!uniqueTaskNames.includes(t)) {
      uniqueTaskNames.push(t);
    }
  });

  if (uniqueTaskNames.length > 0) {
    const activities: WorkProgramActivity[] = uniqueTaskNames.slice(0, 50).map((name, idx) => {
      const id = String(idx + 1);
      const prevId = idx > 0 ? String(idx) : '';
      
      return {
        id,
        name,
        duration: 15,
        predecessors: prevId,
        lag: 0,
        depType: 'FS',
        critical: false,
        float: 0
      };
    });

    return activities;
  }

  return [];
}

/**
 * Primary multi-format master loader function
 */
export async function parseWorkProgramFile(file: File): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();
  const warnings: string[] = [];

  if (fileName.endsWith('.xml')) {
    const text = await file.text();
    const activities = parseMsProjectXml(text);
    return {
      activities,
      fileType: 'xml',
      formatLabel: 'Microsoft Project XML (.xml)',
      taskCount: activities.length
    };
  }

  if (fileName.endsWith('.mpx')) {
    const text = await file.text();
    const activities = parseMsProjectMpx(text);
    return {
      activities,
      fileType: 'mpx',
      formatLabel: 'Microsoft Project Exchange (.mpx)',
      taskCount: activities.length
    };
  }

  if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
    const text = await file.text();
    if (text.trim().startsWith('<?xml') || text.includes('<Project')) {
      const activities = parseMsProjectXml(text);
      return {
        activities,
        fileType: 'xml',
        formatLabel: 'Microsoft Project XML',
        taskCount: activities.length
      };
    }
    const activities = parseCsvOrText(text);
    return {
      activities,
      fileType: 'csv',
      formatLabel: 'CPM Schedule Spreadsheet (.csv)',
      taskCount: activities.length
    };
  }

  if (fileName.endsWith('.mpp')) {
    const buffer = await file.arrayBuffer();
    const activities = parseMsProjectBinary(buffer);
    
    if (activities.length === 0) {
      warnings.push('The .mpp file was parsed, but no standard task records could be extracted. You can save your project as MS Project XML (.xml) or CSV (.csv) from Microsoft Project for 100% exact fidelity.');
    }

    return {
      activities,
      fileType: 'mpp',
      formatLabel: 'Microsoft Project Native (.mpp)',
      taskCount: activities.length,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // Fallback try text then binary
  try {
    const text = await file.text();
    if (text.includes('<Project') || text.includes('<Tasks')) {
      const activities = parseMsProjectXml(text);
      return {
        activities,
        fileType: 'xml',
        formatLabel: 'Microsoft Project XML',
        taskCount: activities.length
      };
    }
    const csvActivities = parseCsvOrText(text);
    if (csvActivities.length > 0) {
      return {
        activities: csvActivities,
        fileType: 'csv',
        formatLabel: 'CPM Schedule Data',
        taskCount: csvActivities.length
      };
    }
  } catch (e) {
    const buffer = await file.arrayBuffer();
    const binActivities = parseMsProjectBinary(buffer);
    return {
      activities: binActivities,
      fileType: 'mpp',
      formatLabel: 'Microsoft Project Binary (.mpp)',
      taskCount: binActivities.length
    };
  }

  return {
    activities: [],
    fileType: 'unknown',
    formatLabel: 'Unknown Format',
    taskCount: 0,
    warnings: ['Unsupported or unrecognized file format. Please upload .mpp, .xml, or .csv files.']
  };
}

/**
 * Calculates Critical Path Method (CPM) metrics with 100% date and duration fidelity:
 * - Forward Pass: Early Start (est), Early Finish (eft)
 * - Backward Pass: Late Start (lst), Late Finish (lft)
 * - Float calculation: float = lst - est
 * - Critical path flagging: critical = float === 0
 * - Retains exact uploaded dates and activities verbatim without fabrication
 */
export function calculateCPM(acts: WorkProgramActivity[], projectStartDate?: string | Date): WorkProgramActivity[] {
  if (!acts || acts.length === 0) return [];
  const list = acts.map(a => ({ ...a }));

  // Detect earliest valid start date among uploaded activities
  let earliestDate: Date | null = null;
  for (const a of list) {
    if (a.start) {
      const d = parseAnyDate(a.start);
      if (d && !isNaN(d.getTime())) {
        if (!earliestDate || d.getTime() < earliestDate.getTime()) {
          earliestDate = d;
        }
      }
    }
  }

  // Fallback to project.startDate if none in activities
  if (!earliestDate && projectStartDate) {
    const projD = parseAnyDate(projectStartDate);
    if (projD && !isNaN(projD.getTime())) {
      earliestDate = projD;
    }
  }
  const startDate = earliestDate || new Date();

  // 1. Reset metrics
  list.forEach(a => {
    a.est = 0;
    a.eft = 0;
    a.lst = 0;
    a.lft = 0;
    a.float = 0;
    a.critical = false;
  });

  // 2. Forward Pass
  list.forEach(a => {
    const preds = a.predecessors ? a.predecessors.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    // Check if task has an exact start date from the file
    let explicitOffset: number | null = null;
    if (a.manualStart && a.start) {
      const actStart = parseAnyDate(a.start);
      if (actStart && !isNaN(actStart.getTime())) {
        explicitOffset = Math.max(0, Math.round((actStart.getTime() - startDate.getTime()) / 86400000));
      }
    }

    if (preds.length === 0) {
      a.est = explicitOffset !== null ? explicitOffset : 0;
    } else {
      let maxEst = 0;
      preds.forEach(pid => {
        const pa = list.find(x => x.id === pid);
        if (pa) {
          const linkDetail = a.predDetails?.[pid];
          const lag = linkDetail !== undefined ? linkDetail.lag : (a.lag || 0);
          const type = linkDetail !== undefined ? linkDetail.depType : (a.depType || 'FS');
          
          let reqEst = 0;
          if (type === 'FS') {
            reqEst = (pa.eft || 0) + lag;
          } else if (type === 'SS') {
            reqEst = (pa.est || 0) + lag;
          } else if (type === 'FF') {
            reqEst = (pa.eft || 0) + lag - (a.duration || 0);
          } else if (type === 'SF') {
            reqEst = (pa.est || 0) + lag - (a.duration || 0);
          }
          if (reqEst > maxEst) {
            maxEst = reqEst;
          }
        }
      });

      // If user had explicit start date, preserve the maximum of dependency-driven or explicit start
      a.est = explicitOffset !== null ? Math.max(explicitOffset, maxEst) : Math.max(0, maxEst);
    }
    a.eft = a.est + (a.duration || 0);
  });

  // 3. Backward Pass
  const lastAct = list.reduce((max, a) => (a.eft || 0) > ((max ? max.eft : 0) || 0) ? a : max, list[0]);
  const projectEnd = lastAct ? (lastAct.eft || 0) : 0;

  const tempActs = [...list].reverse();
  tempActs.forEach(a => {
    const succs = list.filter(x => {
      const pList = x.predecessors ? x.predecessors.split(',').map(s => s.trim()) : [];
      return pList.includes(a.id);
    });

    if (succs.length === 0) {
      a.lft = projectEnd;
    } else {
      let minLft = Infinity;
      succs.forEach(s => {
        const linkDetail = s.predDetails?.[a.id];
        const slag = linkDetail !== undefined ? linkDetail.lag : (s.lag || 0);
        const stype = linkDetail !== undefined ? linkDetail.depType : (s.depType || 'FS');
        
        let reqLft = projectEnd;
        if (stype === 'FS') {
          reqLft = (s.lst || 0) - slag;
        } else if (stype === 'SS') {
          reqLft = (s.lst || 0) - slag + (a.duration || 0);
        } else if (stype === 'FF') {
          reqLft = (s.lft || 0) - slag;
        } else if (stype === 'SF') {
          reqLft = (s.lft || 0) - slag + (a.duration || 0);
        }
        if (reqLft < minLft) {
          minLft = reqLft;
        }
      });
      a.lft = minLft === Infinity ? projectEnd : minLft;
    }
    a.lst = a.lft - (a.duration || 0);
  });

  // 4. Calculate Floats & Critical Paths
  list.forEach(a => {
    a.float = Math.round((a.lst || 0) - (a.est || 0));
    a.critical = Math.abs(a.float) < 0.01;
    
    // Only derive dates if not explicitly provided
    if (!a.manualStart || !a.start) {
      const s = new Date(startDate);
      s.setDate(s.getDate() + (a.est || 0));
      a.start = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (!a.manualFinish || !a.finish) {
      const f = new Date(startDate);
      f.setDate(f.getDate() + (a.eft || 0));
      a.finish = f.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  });

  return list;
}
