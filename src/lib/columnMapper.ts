import { WorkProgramActivity } from '../types';
import { 
  parseAnyDate, 
  formatDateString, 
  parseDurationToDays, 
  parsePredecessorString, 
  normalizeDepType,
  calculateCPM,
  parseMsProjectXml,
  parseMsProjectBinary
} from './mppParser';

export interface ColumnMappingConfig {
  idCol: number; // Column index (0-based) or -1 for auto-generate
  nameCol: number;
  durationCol: number;
  predecessorCol: number;
  lagCol: number;
  seqTypeCol: number;
  startCol: number;
  finishCol: number;
  defaultDuration: number;
  defaultSeqType: 'FS' | 'SS' | 'FF' | 'SF';
  defaultLag: number;
  hasHeaderRow: boolean;
}

export interface RawFilePreview {
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'mpp' | 'xml' | 'mpx' | 'tsv' | 'txt';
  formatLabel: string;
  headers: string[];
  rawRows: string[][];
  totalRows: number;
  detectedMapping: ColumnMappingConfig;
  warnings?: string[];
}

/**
 * Intelligent fuzzy matching for column headers
 */
export function detectColumnMapping(headers: string[], firstDataRow?: string[]): ColumnMappingConfig {
  const normHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const findCol = (patterns: string[]): number => {
    return normHeaders.findIndex(h => patterns.some(p => h === p || h.includes(p)));
  };

  const idCol = findCol(['id', 'taskid', 'actid', 'activityid', 'code', 'sn', 'no', 'sno', 'wbs', 'item']);
  const nameCol = findCol(['name', 'taskname', 'activity', 'activityname', 'task', 'description', 'title', 'desc']);
  const durationCol = findCol(['duration', 'dur', 'days', 'workdays', 'durationdays', 'origdur', 'time']);
  const predecessorCol = findCol(['predecessors', 'predecessor', 'preds', 'pred', 'dependency', 'dependencies', 'logic', 'link']);
  const lagCol = findCol(['lag', 'lagdays', 'delay', 'leadlag', 'offset', 'buffer']);
  const seqTypeCol = findCol(['sequencetype', 'type', 'deptype', 'dependencytype', 'relation', 'relationshiptype', 'linktype']);
  const startCol = findCol(['start', 'startdate', 'earlystart', 'plannedstart', 'actualstart', 'baselinestart']);
  const finishCol = findCol(['finish', 'finishdate', 'earlyfinish', 'end', 'enddate', 'plannedfinish', 'actualfinish', 'baselinefinish']);

  return {
    idCol: idCol !== -1 ? idCol : (headers.length > 0 ? 0 : -1),
    nameCol: nameCol !== -1 ? nameCol : (headers.length > 1 ? 1 : 0),
    durationCol: durationCol !== -1 ? durationCol : (headers.length > 2 ? 2 : -1),
    predecessorCol: predecessorCol !== -1 ? predecessorCol : (headers.length > 3 ? 3 : -1),
    lagCol: lagCol !== -1 ? lagCol : -1,
    seqTypeCol: seqTypeCol !== -1 ? seqTypeCol : -1,
    startCol: startCol !== -1 ? startCol : -1,
    finishCol: finishCol !== -1 ? finishCol : -1,
    defaultDuration: 10,
    defaultSeqType: 'FS',
    defaultLag: 0,
    hasHeaderRow: true,
  };
}

/**
 * Parses raw text into table rows respecting quotes and delimiters
 */
export function splitDelimitedText(text: string): { headers: string[]; rows: string[][]; delimiter: string } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [], delimiter: ',' };

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

  const parsedAll = lines.map(parseRow).filter(r => r.length > 0 && r.some(c => c.length > 0));
  if (parsedAll.length === 0) return { headers: [], rows: [], delimiter };

  // Assume first row is header if contains non-numeric strings
  const firstRow = parsedAll[0];
  const headers = firstRow.map((col, idx) => col || `Column ${idx + 1}`);
  const rows = parsedAll.slice(1);

  return { headers, rows, delimiter };
}

/**
 * Extracts preview information and detected column mappings from an uploaded file
 */
export async function extractFileForMapping(file: File): Promise<RawFilePreview> {
  const fileName = file.name.toLowerCase();
  const warnings: string[] = [];

  // 1. Text / CSV / TSV / Semicolon files
  if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
    const text = await file.text();
    
    // Check if it's actually XML text
    if (text.trim().startsWith('<?xml') || text.includes('<Project')) {
      const activities = parseMsProjectXml(text);
      const headers = ['ID', 'Name', 'Duration (Days)', 'Predecessors', 'Lag (Days)', 'Sequence Type', 'Start Date', 'Finish Date'];
      const rows = activities.map(a => [
        a.id,
        a.name,
        String(a.duration || 1),
        a.predecessors || '',
        String(a.lag || 0),
        a.depType || 'FS',
        a.start || '',
        a.finish || ''
      ]);
      return {
        fileName: file.name,
        fileSize: file.size,
        fileType: 'xml',
        formatLabel: 'Microsoft Project XML (.xml)',
        headers,
        rawRows: rows,
        totalRows: rows.length,
        detectedMapping: detectColumnMapping(headers)
      };
    }

    const { headers, rows } = splitDelimitedText(text);
    const mapping = detectColumnMapping(headers, rows[0]);

    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: fileName.endsWith('.tsv') ? 'tsv' : 'csv',
      formatLabel: fileName.endsWith('.tsv') ? 'Tab-Separated Schedule (.tsv)' : 'CPM Schedule CSV / Spreadsheet',
      headers,
      rawRows: rows,
      totalRows: rows.length,
      detectedMapping: mapping
    };
  }

  // 2. XML files
  if (fileName.endsWith('.xml') || fileName.endsWith('.mpx')) {
    const text = await file.text();
    const activities = parseMsProjectXml(text);
    const headers = ['ID', 'Name', 'Duration (Days)', 'Predecessors', 'Lag (Days)', 'Sequence Type', 'Start Date', 'Finish Date'];
    const rows = activities.map(a => [
      a.id,
      a.name,
      String(a.duration || 1),
      a.predecessors || '',
      String(a.lag || 0),
      a.depType || 'FS',
      a.start || '',
      a.finish || ''
    ]);
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'xml',
      formatLabel: fileName.endsWith('.mpx') ? 'MS Project Exchange (.mpx)' : 'Microsoft Project XML (.xml)',
      headers,
      rawRows: rows,
      totalRows: rows.length,
      detectedMapping: detectColumnMapping(headers)
    };
  }

  // 3. MPP Binary files
  if (fileName.endsWith('.mpp')) {
    const buffer = await file.arrayBuffer();
    const activities = parseMsProjectBinary(buffer);
    
    if (activities.length === 0) {
      warnings.push('Binary MPP extracted limited task names. You can map custom columns or export your MPP schedule to CSV from MS Project for 100% exact fidelity.');
    }

    const headers = ['ID', 'Task Name', 'Duration (Days)', 'Predecessors', 'Lag (Days)', 'Sequence Type', 'Start Date', 'Finish Date'];
    const rows = activities.map((a, i) => [
      a.id || String(i + 1),
      a.name,
      String(a.duration || 15),
      a.predecessors || '',
      String(a.lag || 0),
      a.depType || 'FS',
      a.start || '',
      a.finish || ''
    ]);

    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'mpp',
      formatLabel: 'Microsoft Project Native (.mpp)',
      headers,
      rawRows: rows,
      totalRows: rows.length,
      detectedMapping: detectColumnMapping(headers),
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // Fallback try text
  try {
    const text = await file.text();
    const { headers, rows } = splitDelimitedText(text);
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'csv',
      formatLabel: 'Text / Schedule Data',
      headers,
      rawRows: rows,
      totalRows: rows.length,
      detectedMapping: detectColumnMapping(headers, rows[0])
    };
  } catch (err) {
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'csv',
      formatLabel: 'Uploaded Schedule Data',
      headers: ['ID', 'Name', 'Duration', 'Predecessors'],
      rawRows: [],
      totalRows: 0,
      detectedMapping: {
        idCol: 0,
        nameCol: 1,
        durationCol: 2,
        predecessorCol: 3,
        lagCol: -1,
        seqTypeCol: -1,
        startCol: -1,
        finishCol: -1,
        defaultDuration: 10,
        defaultSeqType: 'FS',
        defaultLag: 0,
        hasHeaderRow: true
      },
      warnings: ['Could not extract tabular text from the uploaded file.']
    };
  }
}

/**
 * Transforms raw rows into WorkProgramActivity[] based on user-configured column mapping
 */
export function applyColumnMapping(
  rows: string[][],
  mapping: ColumnMappingConfig,
  projectStartDate?: string | Date
): WorkProgramActivity[] {
  if (!rows || rows.length === 0) return [];

  const activities: WorkProgramActivity[] = [];

  rows.forEach((cols, idx) => {
    if (!cols || cols.length === 0 || cols.every(c => !c)) return;

    // 1. ID
    let rawId = mapping.idCol !== -1 && cols[mapping.idCol] !== undefined ? cols[mapping.idCol].trim() : '';
    if (!rawId) {
      rawId = String(activities.length + 1);
    }

    // 2. Name
    let rawName = mapping.nameCol !== -1 && cols[mapping.nameCol] !== undefined ? cols[mapping.nameCol].trim() : '';
    if (!rawName) {
      rawName = `Activity ${rawId}`;
    }

    // 3. Duration
    let rawDur = mapping.durationCol !== -1 && cols[mapping.durationCol] !== undefined ? cols[mapping.durationCol].trim() : '';
    let duration = parseDurationToDays(rawDur);

    // 4. Start & Finish
    const rawStart = mapping.startCol !== -1 && cols[mapping.startCol] !== undefined ? cols[mapping.startCol].trim() : '';
    const rawFinish = mapping.finishCol !== -1 && cols[mapping.finishCol] !== undefined ? cols[mapping.finishCol].trim() : '';

    const parsedStart = parseAnyDate(rawStart);
    const parsedFinish = parseAnyDate(rawFinish);

    if ((!rawDur || duration === 0) && parsedStart && parsedFinish) {
      if (parsedFinish.getTime() >= parsedStart.getTime()) {
        duration = Math.max(1, Math.round((parsedFinish.getTime() - parsedStart.getTime()) / 86400000));
      }
    } else if (!rawDur && duration === 0) {
      duration = mapping.defaultDuration || 10;
    }

    // 5. Predecessors & Links
    const rawPred = mapping.predecessorCol !== -1 && cols[mapping.predecessorCol] !== undefined ? cols[mapping.predecessorCol].trim() : '';
    const predInfo = parsePredecessorString(rawPred);

    // 6. Lag
    let explicitLag = mapping.defaultLag || 0;
    if (mapping.lagCol !== -1 && cols[mapping.lagCol] !== undefined && cols[mapping.lagCol].trim() !== '') {
      const parsedLag = parseInt(cols[mapping.lagCol].trim(), 10);
      if (!isNaN(parsedLag)) explicitLag = parsedLag;
    } else if (predInfo.lag !== 0) {
      explicitLag = predInfo.lag;
    }

    // 7. Sequence Type
    let explicitType: 'FS' | 'SS' | 'FF' | 'SF' = mapping.defaultSeqType || 'FS';
    if (mapping.seqTypeCol !== -1 && cols[mapping.seqTypeCol] !== undefined && cols[mapping.seqTypeCol].trim() !== '') {
      explicitType = normalizeDepType(cols[mapping.seqTypeCol]);
    } else if (predInfo.depType) {
      explicitType = predInfo.depType;
    }

    const formattedStart = rawStart ? formatDateString(rawStart) : '';
    const formattedFinish = rawFinish ? formatDateString(rawFinish) : '';

    activities.push({
      id: rawId,
      name: rawName,
      duration: duration !== undefined ? duration : (mapping.defaultDuration || 10),
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

  return calculateCPM(activities, projectStartDate);
}
