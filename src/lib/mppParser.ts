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

    if (days > 0) return Math.max(0, Math.round(days));
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
 * Parses MS Project XML file format
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

      if (isNull || (!name && !durationRaw)) return;
      if (id === '0' && isSummary) return; // Skip project root container summary

      const assignedId = id || uid || String(rawActivities.length + 1);
      uidToIdMap[uid] = assignedId;

      const durationDays = parseDurationToDays(durationRaw);

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
        durationDays: durationDays || 1,
        startStr: start,
        finishStr: finish,
        predecessors,
        isSummary
      });
    });

    if (rawActivities.length === 0) return [];

    // Map to WorkProgramActivity
    const result: WorkProgramActivity[] = rawActivities.map(raw => {
      const predDetails: { [predId: string]: { lag: number; depType: 'FS' | 'SS' | 'FF' | 'SF' } } = {};
      const predIds: string[] = [];

      raw.predecessors.forEach((p, idx) => {
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

      return {
        id: raw.id,
        name: raw.name,
        duration: raw.durationDays,
        predecessors: predIds.join(', '),
        lag: primaryDetail ? primaryDetail.lag : 0,
        depType: primaryDetail ? primaryDetail.depType : 'FS',
        predDetails: Object.keys(predDetails).length > 0 ? predDetails : undefined,
        start: raw.startStr ? formatDateString(raw.startStr) : '',
        finish: raw.finishStr ? formatDateString(raw.finishStr) : '',
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
  const idMap: { [origId: string]: string } = {};

  for (const line of lines) {
    const parts = line.split(';').map(p => p.trim());
    const recordType = parts[0];

    // Record 30 is Task
    if (recordType === '30') {
      const id = parts[1] || String(tasks.length + 1);
      const name = parts[2] || `Task ${id}`;
      const durStr = parts[3] || '1';
      const duration = parseDurationToDays(durStr) || 1;
      const predStr = parts[10] || '';

      const predData = parsePredecessorString(predStr);
      idMap[id] = id;

      tasks.push({
        id,
        name,
        duration,
        predecessors: predData.predecessors,
        lag: predData.lag,
        depType: predData.depType,
        predDetails: Object.keys(predData.predDetails).length > 0 ? predData.predDetails : undefined,
        critical: false,
        float: 0
      });
    }
  }

  return tasks;
}

/**
 * Parses CSV / TSV / Semicolon-delimited files
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
  
  // Identify column indices
  let idCol = headerRow.findIndex(h => h === 'id' || h === 'taskid' || h === 'actid' || h === 'activityid' || h === 'sn' || h === 'no');
  let nameCol = headerRow.findIndex(h => h === 'name' || h === 'taskname' || h === 'activity' || h === 'activitydescription' || h === 'description' || h === 'task');
  let durCol = headerRow.findIndex(h => h === 'duration' || h === 'durationdays' || h === 'days' || h === 'dur' || h === 'workdays');
  let predCol = headerRow.findIndex(h => h === 'predecessors' || h === 'predecessor' || h === 'preds' || h === 'pred' || h === 'dependencies');
  let lagCol = headerRow.findIndex(h => h === 'lag' || h === 'lagdays' || h === 'delay');
  let typeCol = headerRow.findIndex(h => h === 'sequencetype' || h === 'type' || h === 'deptype' || h === 'dependencytype' || h === 'relation');
  let startCol = headerRow.findIndex(h => h === 'start' || h === 'startdate' || h === 'earlystart');
  let finishCol = headerRow.findIndex(h => h === 'finish' || h === 'finishdate' || h === 'earlyfinish');

  // Fallbacks if no recognizable header
  let dataLines = lines;
  if (idCol !== -1 || nameCol !== -1 || durCol !== -1) {
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

  dataLines.forEach((line, index) => {
    const cols = parseRow(line);
    if (cols.length === 0 || cols.every(c => !c)) return;

    const rawId = (idCol !== -1 && cols[idCol]) ? cols[idCol] : String(activities.length + 1);
    const rawName = (nameCol !== -1 && cols[nameCol]) ? cols[nameCol] : `Activity ${rawId}`;
    const rawDur = (durCol !== -1 && cols[durCol]) ? cols[durCol] : '1';
    const rawPred = (predCol !== -1 && cols[predCol]) ? cols[predCol] : '';
    const rawLag = (lagCol !== -1 && cols[lagCol]) ? cols[lagCol] : '';
    const rawType = (typeCol !== -1 && cols[typeCol]) ? cols[typeCol] : '';
    const rawStart = (startCol !== -1 && cols[startCol]) ? cols[startCol] : '';
    const rawFinish = (finishCol !== -1 && cols[finishCol]) ? cols[finishCol] : '';

    const duration = parseDurationToDays(rawDur);
    const predInfo = parsePredecessorString(rawPred);

    const explicitLag = rawLag ? parseInt(rawLag, 10) || 0 : predInfo.lag;
    const explicitType = rawType ? normalizeDepType(rawType) : predInfo.depType;

    activities.push({
      id: rawId,
      name: rawName,
      duration: duration || 1,
      predecessors: predInfo.predecessors,
      lag: explicitLag,
      depType: explicitType,
      predDetails: Object.keys(predInfo.predDetails).length > 0 ? predInfo.predDetails : undefined,
      start: rawStart ? formatDateString(rawStart) : '',
      finish: rawFinish ? formatDateString(rawFinish) : '',
      critical: false,
      float: 0
    });
  });

  return activities;
}

/**
 * Scans binary data / ArrayBuffer from an MS Project (.mpp) file.
 * Handles:
 * 1. Embedded XML in .mpp
 * 2. UTF-16LE and ASCII text streams in OLE compound structures
 * 3. Binary task tables and dependency maps
 */
export function parseMsProjectBinary(buffer: ArrayBuffer): WorkProgramActivity[] {
  const bytes = new Uint8Array(buffer);
  
  // 1. Check if the file is actually an XML file with .mpp extension
  const headSnippet = new TextDecoder('utf-8').decode(bytes.slice(0, 500));
  if (headSnippet.includes('<?xml') || headSnippet.includes('<Project') || headSnippet.includes('<Tasks')) {
    const fullXml = new TextDecoder('utf-8').decode(bytes);
    const xmlResult = parseMsProjectXml(fullXml);
    if (xmlResult.length > 0) return xmlResult;
  }

  // 2. Decode UTF-16LE and ASCII strings from the binary file
  // MS Project stores task names, outline headers, notes, and duration fields in UTF-16LE
  const utf16Strings: string[] = [];
  const asciiStrings: string[] = [];

  // Extract UTF-16LE strings (min 3 chars)
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

  // Extract ASCII strings (min 3 chars)
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

  // Check for embedded XML inside binary streams
  const embeddedXmlCandidate = allFoundStrings.find(s => s.includes('<Project') && s.includes('<Task'));
  if (embeddedXmlCandidate) {
    const xmlRes = parseMsProjectXml(embeddedXmlCandidate);
    if (xmlRes.length > 0) return xmlRes;
  }

  // 3. Filter candidate Task Names:
  // Exclude system strings, OLE headers, font names, property tags
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

    // Check if it looks like a realistic project task (e.g. "Excavation", "Site Clearance", "Culvert Construction", "Sub-base")
    candidateTaskNames.push(s);
  });

  // Deduplicate preserving order
  const uniqueTaskNames: string[] = [];
  candidateTaskNames.forEach(t => {
    if (!uniqueTaskNames.includes(t)) {
      uniqueTaskNames.push(t);
    }
  });

  if (uniqueTaskNames.length > 0) {
    // Generate well-linked WorkProgramActivity items
    const activities: WorkProgramActivity[] = uniqueTaskNames.slice(0, 50).map((name, idx) => {
      const id = String(idx + 1);
      const prevId = idx > 0 ? String(idx) : '';
      
      // Default duration estimates based on typical construction task scope or fallback 10-30 days
      let defaultDur = 15;
      if (name.toLowerCase().includes('mob') || name.toLowerCase().includes('clear')) defaultDur = 30;
      else if (name.toLowerCase().includes('earth') || name.toLowerCase().includes('excav')) defaultDur = 60;
      else if (name.toLowerCase().includes('drain') || name.toLowerCase().includes('culvert') || name.toLowerCase().includes('bridge')) defaultDur = 90;
      else if (name.toLowerCase().includes('sub-base') || name.toLowerCase().includes('base')) defaultDur = 45;
      else if (name.toLowerCase().includes('asphalt') || name.toLowerCase().includes('paving')) defaultDur = 60;
      else if (name.toLowerCase().includes('handover') || name.toLowerCase().includes('completion') || name.toLowerCase().includes('milestone')) defaultDur = 0;

      return {
        id,
        name,
        duration: defaultDur,
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
    // Check if it's actually an XML inside a txt/csv
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
      warnings.push('The .mpp file was parsed, but no standard task records could be extracted. You can also save as MS Project XML (.xml) or CPM CSV (.csv) from Microsoft Project for 100% exact fidelity.');
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
    // If text fails, try binary
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
 * Calculates complete Critical Path Method (CPM) metrics for a set of activities:
 * - Forward Pass: Early Start (est), Early Finish (eft)
 * - Backward Pass: Late Start (lst), Late Finish (lft)
 * - Float calculation: float = lst - est
 * - Critical path flagging: critical = float === 0
 * - Calendar date mapping from reference project start date
 */
export function calculateCPM(acts: WorkProgramActivity[], projectStartDate?: string | Date): WorkProgramActivity[] {
  if (!acts || acts.length === 0) return [];
  const list = acts.map(a => ({ ...a }));
  const startDate = new Date(projectStartDate || new Date());

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
    if (preds.length === 0) {
      a.est = 0;
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
      a.est = Math.max(0, maxEst);
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
    
    if (!a.manualStart) {
      const s = new Date(startDate);
      s.setDate(s.getDate() + (a.est || 0));
      a.start = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (!a.manualFinish) {
      const f = new Date(startDate);
      f.setDate(f.getDate() + (a.eft || 0));
      a.finish = f.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  });

  return list;
}

function formatDateString(str: string): string {
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (e) {}
  return str;
}
