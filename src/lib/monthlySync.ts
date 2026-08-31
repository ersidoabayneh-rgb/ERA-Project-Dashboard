import { Project, MonthlyProgress } from '../types';

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const FULL_MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june', 
  'july', 'august', 'september', 'october', 'november', 'december'
];

export interface ParsedMonth {
  monthIndex: number; // 0-11
  year: number;       // e.g. 2026
  key: string;        // e.g. "Aug-26"
}

/**
 * Parses any common month-year string into a normalized structure.
 * Supports: "Aug-26", "Aug 2026", "August 2026", "2026-08", "08/2026", "Aug-2026", etc.
 */
export function parseMonthKey(str: string | undefined | null): ParsedMonth | null {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();
  if (!s) return null;

  // 1. Format: YYYY-MM or YYYY/MM
  const yyyymm = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yyyymm) {
    const year = parseInt(yyyymm[1], 10);
    const mNum = parseInt(yyyymm[2], 10);
    if (mNum >= 1 && mNum <= 12) {
      const monthIndex = mNum - 1;
      return {
        monthIndex,
        year,
        key: `${MONTH_NAMES[monthIndex]}-${(year % 100).toString().padStart(2, '0')}`
      };
    }
  }

  // 2. Format: MM/YYYY or MM-YYYY
  const mmyyyy = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mmyyyy) {
    const mNum = parseInt(mmyyyy[1], 10);
    const year = parseInt(mmyyyy[2], 10);
    if (mNum >= 1 && mNum <= 12) {
      const monthIndex = mNum - 1;
      return {
        monthIndex,
        year,
        key: `${MONTH_NAMES[monthIndex]}-${(year % 100).toString().padStart(2, '0')}`
      };
    }
  }

  // 3. Format: Mon-YY or Mon-YYYY (e.g., Aug-26, Feb-2026)
  const monYearDash = s.match(/^([a-zA-Z]+)[-/\s]+(\d{2,4})$/);
  if (monYearDash) {
    const monStr = monYearDash[1].toLowerCase();
    let year = parseInt(monYearDash[2], 10);
    if (year < 100) year += 2000;

    let monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === monStr.substring(0, 3));
    if (monthIndex === -1) {
      monthIndex = FULL_MONTH_NAMES.findIndex(m => m.startsWith(monStr));
    }

    if (monthIndex !== -1) {
      return {
        monthIndex,
        year,
        key: `${MONTH_NAMES[monthIndex]}-${(year % 100).toString().padStart(2, '0')}`
      };
    }
  }

  // 4. Any string containing month name and a 2-digit or 4-digit number
  for (let i = 0; i < 12; i++) {
    const shortName = MONTH_NAMES[i].toLowerCase();
    const fullName = FULL_MONTH_NAMES[i];
    const sLower = s.toLowerCase();

    if (sLower.includes(shortName) || sLower.includes(fullName)) {
      const yearMatch = s.match(/\b(20\d{2}|\d{2})\b/);
      let year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
      if (year < 100) year += 2000;

      return {
        monthIndex: i,
        year,
        key: `${MONTH_NAMES[i]}-${(year % 100).toString().padStart(2, '0')}`
      };
    }
  }

  return null;
}

/**
 * Checks if two month strings represent the same month and year.
 */
export function isSameMonth(monthA: string | undefined | null, monthB: string | undefined | null): boolean {
  if (!monthA || !monthB) return false;
  const pA = parseMonthKey(monthA);
  const pB = parseMonthKey(monthB);

  if (pA && pB) {
    return pA.monthIndex === pB.monthIndex && pA.year === pB.year;
  }

  // Fallback string sanitization comparison
  const cleanA = monthA.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanB = monthB.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleanA === cleanB && cleanA.length > 0;
}

/**
 * Resolves the target current month key for a project.
 * Uses project.progressPlanLabels.monthLabel if valid, else falls back to current calendar month.
 */
export function resolveCurrentMonthKey(project: Partial<Project> | undefined): string {
  if (project?.progressPlanLabels?.monthLabel) {
    const parsed = parseMonthKey(project.progressPlanLabels.monthLabel);
    if (parsed) {
      return parsed.key;
    }
  }

  const now = new Date();
  const mIdx = now.getMonth();
  const yr = (now.getFullYear() % 100).toString().padStart(2, '0');
  return `${MONTH_NAMES[mIdx]}-${yr}`;
}

/**
 * Retrieves the closest preceding numeric value for a specific column in the monthly cumulative table.
 */
export function getPreviousColumnValue(
  monthly: MonthlyProgress[] | undefined,
  rowIndex: number,
  field: 'originalPlan' | 'revisedPlan' | 'actual'
): { prevValue: number | null; prevMonth: string | null; prevIndex: number } {
  if (!monthly || rowIndex <= 0) {
    return { prevValue: null, prevMonth: null, prevIndex: -1 };
  }

  for (let i = rowIndex - 1; i >= 0; i--) {
    const val = monthly[i]?.[field];
    if (val !== '' && val !== null && val !== undefined && !isNaN(Number(val))) {
      return {
        prevValue: Number(val),
        prevMonth: monthly[i].month,
        prevIndex: i
      };
    }
  }

  return { prevValue: null, prevMonth: null, prevIndex: -1 };
}

/**
 * Retrieves the closest following numeric value for a specific column in the monthly cumulative table.
 */
export function getNextColumnValue(
  monthly: MonthlyProgress[] | undefined,
  rowIndex: number,
  field: 'originalPlan' | 'revisedPlan' | 'actual'
): { nextValue: number | null; nextMonth: string | null; nextIndex: number } {
  if (!monthly || rowIndex >= monthly.length - 1) {
    return { nextValue: null, nextMonth: null, nextIndex: -1 };
  }

  for (let i = rowIndex + 1; i < monthly.length; i++) {
    const val = monthly[i]?.[field];
    if (val !== '' && val !== null && val !== undefined && !isNaN(Number(val))) {
      return {
        nextValue: Number(val),
        nextMonth: monthly[i].month,
        nextIndex: i
      };
    }
  }

  return { nextValue: null, nextMonth: null, nextIndex: -1 };
}

/**
 * Validates that for the live month (or any row), values in a cumulative column are non-decreasing:
 * The live month must be >= the previous row / month in its column.
 * A previous row cannot exceed the live month in its column.
 */
export function validateMonthlyCellUpdate(
  monthlyList: MonthlyProgress[],
  rowIndex: number,
  field: 'originalPlan' | 'revisedPlan' | 'actual',
  newValue: number | '',
  currentMonthKey: string
): { isValid: boolean; error?: string; minAllowed?: number; maxAllowed?: number } {
  if (newValue === '') {
    return { isValid: true };
  }

  const liveIdx = monthlyList.findIndex(m => isSameMonth(m.month, currentMonthKey));
  const isLiveRow = liveIdx !== -1 && rowIndex === liveIdx;
  const isBeforeLive = liveIdx !== -1 && rowIndex < liveIdx;

  const colLabel = field === 'originalPlan' 
    ? 'Original Plan %' 
    : field === 'revisedPlan' 
    ? 'Revised Plan %' 
    : 'Actual %';

  const rowMonth = monthlyList[rowIndex]?.month || `Row ${rowIndex + 1}`;

  // Check previous value in this column
  const { prevValue, prevMonth } = getPreviousColumnValue(monthlyList, rowIndex, field);

  // If this is the live row (or any row), newValue MUST be >= prevValue
  if (prevValue !== null && newValue < prevValue) {
    return {
      isValid: false,
      minAllowed: prevValue,
      error: isLiveRow
        ? `The live month (${rowMonth}) ${colLabel} (${newValue.toFixed(2)}%) must be greater than or equal to the previous row (${prevValue.toFixed(2)}% in ${prevMonth || 'previous month'}).`
        : `The ${rowMonth} ${colLabel} (${newValue.toFixed(2)}%) must be greater than or equal to the previous row (${prevValue.toFixed(2)}% in ${prevMonth || 'previous month'}).`
    };
  }

  // If this row is before the live row, check if newValue exceeds the live row's value in this column
  if (isBeforeLive && liveIdx !== -1) {
    const liveVal = monthlyList[liveIdx]?.[field];
    if (liveVal !== '' && liveVal !== null && liveVal !== undefined && !isNaN(Number(liveVal))) {
      const liveNum = Number(liveVal);
      if (newValue > liveNum) {
        return {
          isValid: false,
          maxAllowed: liveNum,
          error: `The ${rowMonth} ${colLabel} (${newValue.toFixed(2)}%) cannot exceed the live month value (${liveNum.toFixed(2)}% in ${monthlyList[liveIdx]?.month || 'live month'}).`
        };
      }
    }
  }

  // Check next value if present
  const { nextValue, nextMonth } = getNextColumnValue(monthlyList, rowIndex, field);
  if (nextValue !== null && newValue > nextValue) {
    return {
      isValid: false,
      maxAllowed: nextValue,
      error: `The ${rowMonth} ${colLabel} (${newValue.toFixed(2)}%) cannot exceed the subsequent row (${nextValue.toFixed(2)}% in ${nextMonth || 'next month'}).`
    };
  }

  return { isValid: true, minAllowed: prevValue ?? undefined, maxAllowed: nextValue ?? undefined };
}

/**
 * Retrieves the last recorded value in the Actual column of the monthly cumulative table.
 * If targetMonthKey is already in the table, it checks the latest actual recorded prior to targetMonthKey.
 */
export function getLastActualProgress(
  monthly: MonthlyProgress[] | undefined,
  targetMonthKey?: string
): { lastValue: number | null; lastMonth: string | null; lastIndex: number } {
  if (!monthly || monthly.length === 0) {
    return { lastValue: null, lastMonth: null, lastIndex: -1 };
  }

  let limitIdx = monthly.length - 1;
  if (targetMonthKey) {
    const existingIdx = monthly.findIndex(m => isSameMonth(m.month, targetMonthKey));
    if (existingIdx !== -1) {
      // If editing existing month, check values before it
      limitIdx = existingIdx - 1;
    }
  }

  for (let i = limitIdx; i >= 0; i--) {
    const m = monthly[i];
    const val = m.actual;
    if (val !== '' && val !== null && val !== undefined && !isNaN(Number(val))) {
      return {
        lastValue: Number(val),
        lastMonth: m.month,
        lastIndex: i
      };
    }
  }

  return { lastValue: null, lastMonth: null, lastIndex: -1 };
}

/**
 * Sorts monthly progress array in chronological order based on parsed month and year.
 */
export function sortMonthlyChronologically(monthlyList: MonthlyProgress[]): MonthlyProgress[] {
  return [...monthlyList].sort((a, b) => {
    const pA = parseMonthKey(a.month);
    const pB = parseMonthKey(b.month);
    if (!pA && !pB) return 0;
    if (!pA) return 1;
    if (!pB) return -1;
    const timeA = pA.year * 12 + pA.monthIndex;
    const timeB = pB.year * 12 + pB.monthIndex;
    return timeA - timeB;
  });
}

/**
 * Ensures that the live tracking month row is ALWAYS the last row for the Actual column ONLY.
 * - Other columns (Month, Original Plan %, Revised Plan %) can extend beyond the live row into future months.
 * - For the Actual % column, values are only allowed up to the live row; all rows after the live row have actual = ''.
 * - If the live row does not exist in the list, it is inserted into its proper chronological position.
 */
export function ensureLiveRowForActual(
  monthlyList: MonthlyProgress[] | undefined,
  currentMonthKey: string,
  liveActualValue?: number
): MonthlyProgress[] {
  if (!monthlyList || monthlyList.length === 0) {
    if (liveActualValue !== undefined) {
      return [{
        month: currentMonthKey,
        originalPlan: '',
        revisedPlan: '',
        actual: liveActualValue
      }];
    }
    return [];
  }

  let list = [...monthlyList];
  let liveIdx = list.findIndex(m => isSameMonth(m.month, currentMonthKey));

  if (liveIdx === -1) {
    // Live row doesn't exist yet: create it and insert it in chronological order
    const parsedTarget = parseMonthKey(currentMonthKey);
    const newLiveRow: MonthlyProgress = {
      month: currentMonthKey,
      originalPlan: '',
      revisedPlan: '',
      actual: liveActualValue !== undefined ? liveActualValue : ''
    };

    if (parsedTarget) {
      const targetTime = parsedTarget.year * 12 + parsedTarget.monthIndex;
      const insertIdx = list.findIndex(m => {
        const p = parseMonthKey(m.month);
        if (!p) return false;
        return (p.year * 12 + p.monthIndex) > targetTime;
      });

      if (insertIdx !== -1) {
        list.splice(insertIdx, 0, newLiveRow);
        liveIdx = insertIdx;
      } else {
        list.push(newLiveRow);
        liveIdx = list.length - 1;
      }
    } else {
      list.push(newLiveRow);
      liveIdx = list.length - 1;
    }
  }

  // Now ensure that:
  // 1. The live row has liveActualValue if provided
  // 2. For the ACTUAL column ONLY: no row AFTER the live row can have an actual value (actual is set to '')
  return list.map((m, idx) => {
    if (idx === liveIdx) {
      return {
        ...m,
        actual: liveActualValue !== undefined ? liveActualValue : m.actual
      };
    } else if (idx > liveIdx) {
      // Rows after the live row are future months: keep Original and Revised plans, but clear Actual
      return {
        ...m,
        actual: ''
      };
    }
    return m;
  });
}

/**
 * Inserts a new month row directly ABOVE the live row so the live row remains the last row for the Actual column.
 */
export function insertMonthAboveLiveRow(
  monthlyList: MonthlyProgress[] | undefined,
  currentMonthKey: string,
  newRow: MonthlyProgress,
  liveActualValue?: number
): MonthlyProgress[] {
  const currentList = Array.isArray(monthlyList) ? [...monthlyList] : [];
  
  if (currentList.length === 0) {
    const liveRow: MonthlyProgress = {
      month: currentMonthKey,
      originalPlan: '',
      revisedPlan: '',
      actual: liveActualValue !== undefined ? liveActualValue : ''
    };
    return [newRow, liveRow];
  }

  const liveIdx = currentList.findIndex(m => isSameMonth(m.month, currentMonthKey));
  
  if (liveIdx !== -1) {
    // Insert newRow before the live row
    currentList.splice(liveIdx, 0, newRow);
  } else {
    // If live row not found, add newRow and let ensureLiveRowForActual position the live row
    currentList.push(newRow);
  }

  return ensureLiveRowForActual(currentList, currentMonthKey, liveActualValue);
}

/**
 * Updates the monthly cumulative table following all user rules:
 * 1. If current month does not exist, insert it in its chronological position (above future plan months) and set Actual = newProgress.
 * 2. If current month already exists, edit the Actual column for that month.
 * 3. The live row is ALWAYS the last row for the Actual column (rows after it keep plan targets, but have no actuals).
 * 4. Validates that newProgress >= last recorded value in the Actual column before the live row.
 */
export function updateMonthlyWithProgress(
  project: Project,
  newProgress: number
): {
  updatedMonthly: MonthlyProgress[];
  action: 'added' | 'edited' | 'noop';
  monthKey: string;
  error?: string;
  lastActual?: number | null;
} {
  const currentMonthKey = resolveCurrentMonthKey(project);
  const monthlyList = Array.isArray(project.monthly) ? [...project.monthly] : [];

  // Validation: Dashboard Project Progress must be >= last value in the Actual column
  const { lastValue, lastMonth } = getLastActualProgress(monthlyList, currentMonthKey);
  if (lastValue !== null && newProgress < lastValue) {
    return {
      updatedMonthly: monthlyList,
      action: 'noop',
      monthKey: currentMonthKey,
      lastActual: lastValue,
      error: `The Project Progress value (${newProgress.toFixed(2)}%) must be greater than or equal to the last value in the Actual column of the monthly cumulative table (${lastValue.toFixed(2)}% in ${lastMonth}).`
    };
  }

  const existingIndex = monthlyList.findIndex(m => isSameMonth(m.month, currentMonthKey));
  const action = existingIndex !== -1 ? 'edited' : 'added';

  const updatedMonthly = ensureLiveRowForActual(monthlyList, currentMonthKey, newProgress);

  return {
    updatedMonthly,
    action,
    monthKey: currentMonthKey,
    lastActual: lastValue
  };
}
