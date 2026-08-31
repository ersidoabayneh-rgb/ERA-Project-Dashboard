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
 * Ensures that the live tracking month row is ALWAYS the last row of the Monthly Cumulative table.
 * If the live row exists anywhere before the end, it moves it to the last row.
 * If the live row does not exist and liveActualValue is provided, it creates and appends it.
 */
export function ensureLiveRowIsLast(
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

  const list = [...monthlyList];
  const liveIdx = list.findIndex(m => isSameMonth(m.month, currentMonthKey));

  if (liveIdx !== -1) {
    // If the live row is already at the last position, return as-is (or updated with live value if given)
    if (liveIdx === list.length - 1) {
      if (liveActualValue !== undefined && list[liveIdx].actual !== liveActualValue) {
        list[liveIdx] = { ...list[liveIdx], actual: liveActualValue };
      }
      return list;
    }

    // Move the live row to the very end
    const [liveRow] = list.splice(liveIdx, 1);
    const updatedLiveRow = liveActualValue !== undefined 
      ? { ...liveRow, actual: liveActualValue }
      : liveRow;
    list.push(updatedLiveRow);
    return list;
  }

  // If live row does not exist in the list and a live value is provided, append it to the end
  if (liveActualValue !== undefined) {
    list.push({
      month: currentMonthKey,
      originalPlan: '',
      revisedPlan: '',
      actual: liveActualValue
    });
  }

  return list;
}

/**
 * Inserts a new month row directly ABOVE the live row so the live row remains the last row.
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
    // If live row is at liveIdx, insert newRow before liveIdx
    currentList.splice(liveIdx, 0, newRow);
    // Ensure live row is positioned at the very end
    return ensureLiveRowIsLast(currentList, currentMonthKey, liveActualValue);
  } else {
    // If live row doesn't exist yet, insert newRow and append live row at the bottom
    currentList.push(newRow);
    return ensureLiveRowIsLast(currentList, currentMonthKey, liveActualValue);
  }
}

/**
 * Updates the monthly cumulative table following all user rules:
 * 1. If current month does not exist, add a new row for current month at the very bottom (last row) and set Actual = newProgress.
 * 2. If current month already exists, edit the Actual column for that month and guarantee it is the last row.
 * 3. Validates that newProgress >= last recorded value in the Actual column before the live row.
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

  if (existingIndex !== -1) {
    // 2. Current month already exists: edit the Actual column and ensure it is the last row
    let updatedMonthly = monthlyList.map((m, idx) => {
      if (idx === existingIndex) {
        return {
          ...m,
          actual: newProgress
        };
      }
      return m;
    });

    // Ensure live row is always the last row
    updatedMonthly = ensureLiveRowIsLast(updatedMonthly, currentMonthKey, newProgress);

    return {
      updatedMonthly,
      action: 'edited',
      monthKey: currentMonthKey,
      lastActual: lastValue
    };
  } else {
    // 1. Current month does not exist: add new row at the very bottom (last row)
    const newRow: MonthlyProgress = {
      month: currentMonthKey,
      originalPlan: '',
      revisedPlan: '',
      actual: newProgress
    };

    const updatedMonthly = [...monthlyList, newRow];

    return {
      updatedMonthly,
      action: 'added',
      monthKey: currentMonthKey,
      lastActual: lastValue
    };
  }
}
