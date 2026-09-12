import React, { useState, useMemo } from 'react';
import { Project, ResourceMobilizationItem, MaterialProductionItem, MonthlyResourceRecord } from '../types';
import { 
  Plus, 
  Trash2, 
  Truck, 
  Users, 
  Layers, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Save,
  Calendar,
  Clock,
  TrendingUp,
  ChevronDown,
  Copy,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Printer,
  Sparkles,
  Download,
  Filter,
  Check,
  Fuel,
  Hammer,
  Building2,
  Boxes,
  Calculator,
  ArrowRight
} from 'lucide-react';

interface AccountingInputProps {
  value: number;
  onChange?: (val: number) => void;
  disabled?: boolean;
  className?: string;
  focusColor?: string;
  decimals?: number;
}

function AccountingInput({
  value,
  onChange,
  disabled = false,
  className = "",
  focusColor = "focus:ring-emerald-500",
  decimals = 2
}: AccountingInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value.toString());

  React.useEffect(() => {
    if (!isEditing) {
      setLocalVal(value === 0 ? '' : value.toString());
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (onChange) {
      let clean = localVal.replace(/,/g, '').trim();
      let isNegative = false;
      if (clean.startsWith('(') && clean.endsWith(')')) {
        isNegative = true;
        clean = clean.slice(1, -1);
      }
      let num = parseFloat(clean);
      if (isNegative) num = -num;
      onChange(isNaN(num) ? 0 : num);
    }
  };

  let displayVal = "";
  if (value === 0) {
    displayVal = "—";
  } else if (value < 0) {
    displayVal = `(${Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })})`;
  } else {
    displayVal = value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  return (
    <input
      type="text"
      value={isEditing ? localVal : displayVal}
      disabled={disabled}
      onChange={(e) => setLocalVal(e.target.value)}
      onFocus={() => {
        setIsEditing(true);
        setLocalVal(value === 0 ? '' : value.toString());
      }}
      onBlur={handleBlur}
      className={`w-full bg-transparent text-right border-0 focus:ring-1 ${focusColor} focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold px-2 text-slate-800 dark:text-zinc-100 disabled:cursor-not-allowed ${className}`}
    />
  );
}

// Helper to calculate completion progress color & badges
function getProgressStatus(pct: number) {
  if (pct >= 100) {
    return {
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
      label: 'Target Met / Exceeded',
      status: 'success'
    };
  } else if (pct >= 80) {
    return {
      barColor: 'bg-blue-500',
      textColor: 'text-blue-700 dark:text-blue-400',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
      label: 'On Track',
      status: 'info'
    };
  } else if (pct >= 50) {
    return {
      barColor: 'bg-amber-500',
      textColor: 'text-amber-700 dark:text-amber-400',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
      label: 'Moderate Lag',
      status: 'warning'
    };
  } else {
    return {
      barColor: 'bg-rose-500',
      textColor: 'text-rose-700 dark:text-rose-400',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
      label: 'Critical Deficit',
      status: 'danger'
    };
  }
}

// Category progress summary item
interface CategoryProgressSummary {
  category: string;
  itemCount: number;
  totalTarget: number;
  totalActual: number;
  completionPct: number;
  remainingDeficit: number;
  unitExample?: string;
}

// Detect or fallback category for material supply
function detectSupplyCategory(desc: string, currentCategory?: string): string {
  if (currentCategory && currentCategory !== 'Supply' && currentCategory !== 'General') {
    return currentCategory;
  }
  const text = desc.toLowerCase();
  if (text.includes('steel') || text.includes('rebar') || text.includes('reinforcement') || text.includes('mesh')) {
    return 'Steel & Reinforcement';
  }
  if (text.includes('cement') || text.includes('ppc') || text.includes('opc') || text.includes('binder')) {
    return 'Cement & Binders';
  }
  if (text.includes('bitumen') || text.includes('asphalt binder') || text.includes('emulsion') || text.includes('prime coat')) {
    return 'Bitumen & Asphalt Logistics';
  }
  if (text.includes('fuel') || text.includes('diesel') || text.includes('lubricant') || text.includes('gas oil') || text.includes('oil')) {
    return 'Fuel & Energy Logistics';
  }
  if (text.includes('pipe') || text.includes('cmp') || text.includes('culvert') || text.includes('drainage') || text.includes('gabion')) {
    return 'Pipes & Drainage Structures';
  }
  if (text.includes('geotextile') || text.includes('fabric') || text.includes('membrane') || text.includes('geosynthetic')) {
    return 'Geosynthetics & Filters';
  }
  if (text.includes('explosive') || text.includes('dynamite') || text.includes('detonator') || text.includes('blasting')) {
    return 'Explosives & Blasting';
  }
  return 'General Logistics & Supplies';
}

const SUPPLY_CATEGORIES = [
  'Steel & Reinforcement',
  'Cement & Binders',
  'Bitumen & Asphalt Logistics',
  'Fuel & Energy Logistics',
  'Pipes & Drainage Structures',
  'Geosynthetics & Filters',
  'Explosives & Blasting',
  'General Logistics & Supplies'
];

/**
 * Recalculate all monthly material production and supply records chronologically.
 * CORE USER DIRECTIVE:
 * "The total todate production and supply should be the sum of the previous month total plus this month production and supply"
 * 
 * This function iterates chronologically from the earliest month to the latest month,
 * linking each material item with its corresponding item from the previous month,
 * and computing:
 *   totalToDate = previousMonthTotal + thisMonth
 *   used = totalToDate - availableStock
 *   remainingBalance = scope - totalToDate
 */
function linkAndRecalculateMonthlyRecords(records: MonthlyResourceRecord[]): MonthlyResourceRecord[] {
  if (!records || records.length === 0) return [];

  // Sort ascending by month string (e.g. 2026-08, 2026-09, 2026-10)
  const sortedAsc = [...records].sort((a, b) => a.month.localeCompare(b.month));

  for (let i = 0; i < sortedAsc.length; i++) {
    const rec = sortedAsc[i];
    const prevRec = i > 0 ? sortedAsc[i - 1] : null;

    rec.materialProduction = (rec.materialProduction || []).map(item => {
      let prevTotal = 0;

      if (prevRec) {
        // Match in previous month by ID first, then by normalized description
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
        // Earliest recorded baseline month
        if (typeof item.previousMonthTotal === 'number') {
          prevTotal = item.previousMonthTotal;
        } else {
          prevTotal = Math.max(0, (item.totalToDate || 0) - (item.thisMonth || 0));
        }
      }

      const thisMonth = item.thisMonth || 0;
      // Formula: Total Todate = Previous Month Total + This Month Production / Supply
      const totalToDate = prevTotal + thisMonth;

      // Used = Total Todate - Available Stock
      const stock = item.availableStock || 0;
      const used = Math.max(0, totalToDate - stock);

      // Remaining Balance = Scope - Total Todate
      const scopeStr = item.scope || '';
      const scopeClean = scopeStr.replace(/,/g, '').match(/[\d\.]+/);
      const scopeNum = scopeClean ? parseFloat(scopeClean[0]) : 0;
      const remainingBalance = Math.max(0, scopeNum - totalToDate);

      return {
        ...item,
        previousMonthTotal: prevTotal,
        totalToDate,
        used,
        remainingBalance
      };
    });
  }

  // Return sorted descending (latest month first)
  return sortedAsc.sort((a, b) => b.month.localeCompare(a.month));
}

interface ResourceMobilizationViewProps {
  project: Project;
  onUpdateProject: (fields: Partial<Project>, section: string) => void;
  isReadonly?: boolean;
}

export default function ResourceMobilizationView({ 
  project, 
  onUpdateProject, 
  isReadonly = false 
}: ResourceMobilizationViewProps) {

  // Current logged in user name or default
  const currentUserEmail = (() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return project.lastModifiedBy || 'Authorized Officer';
      const parsed = JSON.parse(raw);
      return parsed.email || parsed.username || project.lastModifiedBy || 'Authorized Officer';
    } catch {
      return project.lastModifiedBy || 'Authorized Officer';
    }
  })();

  // 1. Initialize or get monthly records with linked previous month + this month totals
  const monthlyRecords: MonthlyResourceRecord[] = useMemo(() => {
    if (project.monthlyResourceRecords && project.monthlyResourceRecords.length > 0) {
      return linkAndRecalculateMonthlyRecords(project.monthlyResourceRecords);
    }

    // Default fallback initial records
    const defaultRec: MonthlyResourceRecord = {
      id: 'mrec_2026_09',
      month: '2026-09',
      monthName: 'September 2026',
      recordedDate: '2026-09-12',
      recordedBy: currentUserEmail,
      status: 'Approved',
      notes: 'Initial monthly baseline synchronized from master project mobilization schedule.',
      resourceMobilization: project.resourceMobilization || [],
      materialProduction: project.materialProduction || []
    };

    return linkAndRecalculateMonthlyRecords([defaultRec]);
  }, [project.monthlyResourceRecords, project.resourceMobilization, project.materialProduction, currentUserEmail]);

  // Selected Month State: DEFAULT TO THE LATEST MONTH (the first in sorted records)
  const [selectedMonthId, setSelectedMonthId] = useState<string>(() => {
    return monthlyRecords[0]?.id || 'mrec_2026_09';
  });

  // Ensure selectedMonthId is valid if records changed
  const activeRecord: MonthlyResourceRecord = useMemo(() => {
    const found = monthlyRecords.find(r => r.id === selectedMonthId);
    return found || monthlyRecords[0];
  }, [monthlyRecords, selectedMonthId]);

  // Find the chronologically preceding month relative to activeRecord
  const previousRecord: MonthlyResourceRecord | null = useMemo(() => {
    const sortedAsc = [...monthlyRecords].sort((a, b) => a.month.localeCompare(b.month));
    const activeIndex = sortedAsc.findIndex(r => r.id === activeRecord.id);
    if (activeIndex > 0) {
      return sortedAsc[activeIndex - 1];
    }
    return null;
  }, [monthlyRecords, activeRecord.id]);

  // Is active record the latest recorded month?
  const isLatestMonth = monthlyRecords.length > 0 && activeRecord.id === monthlyRecords[0].id;
  const latestRecord = monthlyRecords[0];

  // Tab State
  const [activeTab, setActiveTab] = useState<'supplies' | 'production' | 'equipment' | 'personnel' | 'history'>('supplies');

  // Search States
  const [supplySearch, setSupplySearch] = useState('');
  const [productionSearch, setProductionSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [newMonthStr, setNewMonthStr] = useState('2026-10');
  const [newMonthName, setNewMonthName] = useState('October 2026');
  const [newMonthNotes, setNewMonthNotes] = useState('');
  const [newMonthPrefill, setNewMonthPrefill] = useState<'copy_clear_actuals' | 'copy_all' | 'blank'>('copy_clear_actuals');
  const [newMonthStatus, setNewMonthStatus] = useState<'Approved' | 'Submitted' | 'Draft'>('Approved');

  // Helper to persist updated records after recalculation
  const persistRecords = (updatedRecords: MonthlyResourceRecord[], logMsg: string) => {
    // Recalculate all totals: totalToDate = previousMonthTotal + thisMonth
    const recalculated = linkAndRecalculateMonthlyRecords(updatedRecords);
    const newLatest = recalculated[0];

    // Synchronize latest month with root project.resourceMobilization and project.materialProduction
    onUpdateProject({
      monthlyResourceRecords: recalculated,
      resourceMobilization: newLatest ? newLatest.resourceMobilization : [],
      materialProduction: newLatest ? newLatest.materialProduction : []
    }, logMsg);
  };

  // Helper to update active record
  const updateActiveRecord = (partial: Partial<MonthlyResourceRecord>, logMsg: string) => {
    const updated = monthlyRecords.map(r => {
      if (r.id === activeRecord.id) {
        return { ...r, ...partial };
      }
      return r;
    });
    persistRecords(updated, logMsg);
  };

  // ----------------------------------------------------------------
  // Current active data slices
  // ----------------------------------------------------------------
  const currentMobList = activeRecord.resourceMobilization || [];
  const currentMatList = activeRecord.materialProduction || [];

  // Partition Equipment vs Personnel
  const equipmentItems = currentMobList.filter(item => {
    if (item.category === 'personnel') return false;
    if (item.category === 'equipment') return true;
    const desc = item.desc.toLowerCase();
    const isPersonnel = desc.includes('engineer') || desc.includes('manager') || desc.includes('operator') || desc.includes('personnel') || desc.includes('staff') || desc.includes('labor') || desc.includes('team') || desc.includes('officer') || desc.includes('surveyor');
    return !isPersonnel;
  });

  const personnelItems = currentMobList.filter(item => {
    if (item.category === 'personnel') return true;
    if (item.category === 'equipment') return false;
    const desc = item.desc.toLowerCase();
    const isPersonnel = desc.includes('engineer') || desc.includes('manager') || desc.includes('operator') || desc.includes('personnel') || desc.includes('staff') || desc.includes('labor') || desc.includes('team') || desc.includes('officer') || desc.includes('surveyor');
    return isPersonnel;
  });

  // Partition Production vs Supply
  const productionItems = currentMatList.filter(item => {
    if (item.category === 'Production') return true;
    const text = (item.desc + ' ' + item.scope).toLowerCase();
    return text.includes('produce') || text.includes('production') || text.includes('crush') || text.includes('aggregate') || text.includes('quarry') || text.includes('batching');
  });

  const supplyItems = currentMatList.filter(item => {
    if (item.category === 'Production') return false;
    const text = (item.desc + ' ' + item.scope).toLowerCase();
    return !(text.includes('produce') || text.includes('production') || text.includes('crush') || text.includes('aggregate') || text.includes('quarry') || text.includes('batching'));
  });

  // ----------------------------------------------------------------
  // Material Supply Category Summary & Visual Progress Calculations
  // ----------------------------------------------------------------
  const categoryProgressSummaries: CategoryProgressSummary[] = useMemo(() => {
    const categoryMap: Record<string, { target: number; actual: number; count: number }> = {};

    supplyItems.forEach(item => {
      const cat = detectSupplyCategory(item.desc, item.category);
      if (!categoryMap[cat]) {
        categoryMap[cat] = { target: 0, actual: 0, count: 0 };
      }
      categoryMap[cat].target += item.monthlyTarget || 0;
      categoryMap[cat].actual += item.thisMonth || 0;
      categoryMap[cat].count += 1;
    });

    return Object.entries(categoryMap).map(([category, stats]) => {
      const completionPct = stats.target > 0 
        ? Math.round((stats.actual / stats.target) * 100)
        : (stats.actual > 0 ? 100 : 0);
      const remainingDeficit = Math.max(0, stats.target - stats.actual);

      return {
        category,
        itemCount: stats.count,
        totalTarget: stats.target,
        totalActual: stats.actual,
        completionPct,
        remainingDeficit
      };
    }).sort((a, b) => b.totalTarget - a.totalTarget);
  }, [supplyItems]);

  // Overall KPIs for Active Month
  const overallSupplyTarget = supplyItems.reduce((acc, i) => acc + (i.monthlyTarget || 0), 0);
  const overallSupplyActual = supplyItems.reduce((acc, i) => acc + (i.thisMonth || 0), 0);
  const overallSupplyPct = overallSupplyTarget > 0 
    ? Math.round((overallSupplyActual / overallSupplyTarget) * 100) 
    : (overallSupplyActual > 0 ? 100 : 0);

  const totalEquipmentPlan = equipmentItems.reduce((acc, i) => acc + (i.revisedPlan > 0 ? i.revisedPlan : i.originalPlan), 0);
  const totalEquipmentAvailable = equipmentItems.reduce((acc, i) => acc + (i.available || 0), 0);
  const totalEquipmentDeficiency = equipmentItems.reduce((acc, i) => acc + (i.deficiency || 0), 0);
  const equipmentReadinessPct = totalEquipmentPlan > 0 
    ? Math.min(100, Math.round((totalEquipmentAvailable / totalEquipmentPlan) * 100)) 
    : 100;

  const totalPersonnelPlan = personnelItems.reduce((acc, i) => acc + (i.revisedPlan > 0 ? i.revisedPlan : i.originalPlan), 0);
  const totalPersonnelAvailable = personnelItems.reduce((acc, i) => acc + (i.available || 0), 0);
  const personnelPresencePct = totalPersonnelPlan > 0 
    ? Math.min(100, Math.round((totalPersonnelAvailable / totalPersonnelPlan) * 100)) 
    : 100;

  const totalProductionTarget = productionItems.reduce((acc, i) => acc + (i.monthlyTarget || 0), 0);
  const totalProductionActual = productionItems.reduce((acc, i) => acc + (i.thisMonth || 0), 0);
  const productionPct = totalProductionTarget > 0 
    ? Math.round((totalProductionActual / totalProductionTarget) * 100) 
    : (totalProductionActual > 0 ? 100 : 0);

  // ----------------------------------------------------------------
  // Handlers for Resource Mobilization (Equipment / Personnel)
  // ----------------------------------------------------------------
  const handleResourceChange = (id: string, field: keyof ResourceMobilizationItem, value: any) => {
    const updated = currentMobList.map(item => {
      if (item.id === id) {
        const draft = { ...item, [field]: value };
        const plan = draft.revisedPlan > 0 ? draft.revisedPlan : draft.originalPlan;
        draft.deficiency = Math.max(0, plan - draft.available);
        return draft;
      }
      return item;
    });

    updateActiveRecord(
      { resourceMobilization: updated }, 
      `Updated ${activeRecord.monthName} resource mobilization: ${field}`
    );
  };

  const handleAddResourceRow = (isPersonnel: boolean) => {
    const newItem: ResourceMobilizationItem = {
      id: 'res_' + Date.now(),
      desc: isPersonnel ? 'New Key Personnel Title' : 'New Equipment / Machinery Item',
      category: isPersonnel ? 'personnel' : 'equipment',
      originalPlan: 0,
      revisedPlan: 0,
      available: 0,
      deficiency: 0,
      breakdown: 'Operational on site'
    };

    updateActiveRecord(
      { resourceMobilization: [...currentMobList, newItem] }, 
      `Added ${isPersonnel ? 'personnel' : 'machinery'} row to ${activeRecord.monthName}`
    );
  };

  const handleDeleteResourceRow = (id: string) => {
    const updated = currentMobList.filter(item => item.id !== id);
    updateActiveRecord(
      { resourceMobilization: updated }, 
      `Removed resource row from ${activeRecord.monthName}`
    );
  };

  // ----------------------------------------------------------------
  // Handlers for Material Items (Supply & Production)
  // With Automatic Sum: Total Todate = Previous Month Total + This Month
  // ----------------------------------------------------------------
  const handleMaterialChange = (id: string, field: keyof MaterialProductionItem, value: any) => {
    const updated = currentMatList.map(item => {
      if (item.id === id) {
        const draft = { ...item, [field]: value };

        // Autocalculate Total Todate as Previous Month Total + This Month
        const prevTotal = draft.previousMonthTotal || 0;
        const thisMonthVal = parseFloat(draft.thisMonth as any) || 0;
        draft.totalToDate = prevTotal + thisMonthVal;

        // Auto calculate used as total to date - available in stock
        const stockNum = parseFloat(draft.availableStock as any) || 0;
        draft.used = Math.max(0, draft.totalToDate - stockNum);

        // Auto calculate remaining balance as scope - total to date
        const scopeStr = draft.scope || '';
        const scopeClean = scopeStr.replace(/,/g, '').match(/[\d\.]+/);
        const scopeNum = scopeClean ? parseFloat(scopeClean[0]) : 0;
        draft.remainingBalance = Math.max(0, scopeNum - draft.totalToDate);

        return draft;
      }
      return item;
    });

    updateActiveRecord(
      { materialProduction: updated }, 
      `Updated ${activeRecord.monthName} material: ${field}`
    );
  };

  const handleAddMaterialRow = (isProduction: boolean) => {
    const newItem: MaterialProductionItem = {
      id: 'mat_' + Date.now(),
      desc: isProduction ? 'New Crusher / Batching Material' : 'New Logistical Supply Material',
      category: isProduction ? 'Production' : 'Steel & Reinforcement',
      scope: isProduction ? '50,000 M3' : '1,000 Ton',
      monthlyTarget: 500,
      previousMonthTotal: 0,
      thisMonth: 0,
      totalToDate: 0,
      used: 0,
      availableStock: 0,
      remainingBalance: 0
    };

    updateActiveRecord(
      { materialProduction: [...currentMatList, newItem] }, 
      `Added ${isProduction ? 'production' : 'supply'} material to ${activeRecord.monthName}`
    );
  };

  const handleDeleteMaterialRow = (id: string) => {
    const updated = currentMatList.filter(item => item.id !== id);
    updateActiveRecord(
      { materialProduction: updated }, 
      `Deleted material row from ${activeRecord.monthName}`
    );
  };

  // ----------------------------------------------------------------
  // Handlers for Monthly Records (Create, Clone, Delete, Status)
  // ----------------------------------------------------------------
  const handleCreateNewMonth = () => {
    if (!newMonthStr || !newMonthName) return;

    // Check if month key already exists
    const exists = monthlyRecords.some(r => r.month === newMonthStr);
    if (exists) {
      alert(`A monthly record for ${newMonthStr} already exists. Please select a different month or edit the existing record.`);
      return;
    }

    let prefilledMob: ResourceMobilizationItem[] = [];
    let prefilledMat: MaterialProductionItem[] = [];

    if (newMonthPrefill === 'copy_clear_actuals') {
      // Clone equipment and personnel
      prefilledMob = latestRecord.resourceMobilization.map(item => ({ ...item }));
      
      // For materials: previousMonthTotal becomes latestRecord's totalToDate, thisMonth resets to 0!
      // totalToDate starts equal to previousMonthTotal
      prefilledMat = latestRecord.materialProduction.map(item => {
        const prevTotal = item.totalToDate || 0;
        const stock = item.availableStock || 0;
        return {
          ...item,
          previousMonthTotal: prevTotal,
          thisMonth: 0,
          totalToDate: prevTotal,
          used: Math.max(0, prevTotal - stock),
          remainingBalance: item.remainingBalance || 0
        };
      });
    } else if (newMonthPrefill === 'copy_all') {
      prefilledMob = latestRecord.resourceMobilization.map(item => ({ ...item }));
      prefilledMat = latestRecord.materialProduction.map(item => ({ ...item }));
    } else {
      prefilledMob = [];
      prefilledMat = [];
    }

    const newRecordId = 'mrec_' + newMonthStr.replace('-', '_');
    const newRecord: MonthlyResourceRecord = {
      id: newRecordId,
      month: newMonthStr,
      monthName: newMonthName,
      recordedDate: new Date().toISOString().split('T')[0],
      recordedBy: currentUserEmail,
      status: newMonthStatus,
      notes: newMonthNotes || `Monthly logistical record for ${newMonthName}.`,
      resourceMobilization: prefilledMob,
      materialProduction: prefilledMat
    };

    const updated = [newRecord, ...monthlyRecords];
    persistRecords(updated, `Created new monthly resource log for ${newMonthName}`);
    setSelectedMonthId(newRecordId);
    setIsRecordModalOpen(false);
    setNewMonthNotes('');
  };

  const handleDeleteMonth = (recordId: string) => {
    if (monthlyRecords.length <= 1) {
      alert('Cannot delete the only remaining monthly record. At least one month must be kept in the repository.');
      return;
    }
    const target = monthlyRecords.find(r => r.id === recordId);
    if (!window.confirm(`Are you sure you want to delete the monthly record for ${target?.monthName || 'this month'}? This cannot be undone.`)) {
      return;
    }

    const updated = monthlyRecords.filter(r => r.id !== recordId);
    persistRecords(updated, `Deleted monthly record for ${target?.monthName}`);
    if (selectedMonthId === recordId) {
      setSelectedMonthId(updated[0].id);
    }
  };

  const handleCloneMonthForward = () => {
    const [yearStr, monthStr] = activeRecord.month.split('-');
    let year = parseInt(yearStr);
    let month = parseInt(monthStr) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const nextMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, 1);
    const nextMonthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    setNewMonthStr(nextMonthStr);
    setNewMonthName(nextMonthName);
    setNewMonthPrefill('copy_clear_actuals');
    setNewMonthStatus('Draft');
    setNewMonthNotes(`Cloned from ${activeRecord.monthName} baseline. Cumulative previous totals carried forward.`);
    setIsRecordModalOpen(true);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Ethiopian Roads Administration - Monthly Logistics & Resources Record'],
      [`Project: ${project.name}`, `Contractor: ${project.contractor}`, `Consultant: ${project.supervisionConsultant?.firmName || 'Supervision Consultant'}`],
      [`Period: ${activeRecord.monthName}`, `Status: ${activeRecord.status}`, `Recorded By: ${activeRecord.recordedBy || 'N/A'}`],
      ['Formula: Total Todate = Previous Month Total + Delivered/Produced This Month'],
      [''],
      ['--- MATERIAL SUPPLY & DELIVERIES ---'],
      ['Category', 'Material Description', 'Contract Scope', 'Monthly Target', 'Previous Month Total', 'Delivered This Month', 'Total To Date (Sum)', 'Completion %', 'Used', 'Available Stock', 'Remaining Balance'],
      ...supplyItems.map(item => {
        const prev = item.previousMonthTotal || 0;
        const actual = item.thisMonth || 0;
        const total = prev + actual;
        const target = item.monthlyTarget || 0;
        const pct = target > 0 ? Math.round((actual / target) * 100) : (actual > 0 ? 100 : 0);
        return [
          detectSupplyCategory(item.desc, item.category),
          item.desc,
          item.scope,
          target,
          prev,
          actual,
          total,
          `${pct}%`,
          item.used || 0,
          item.availableStock,
          item.remainingBalance
        ];
      }),
      [''],
      ['--- OWN MATERIAL PRODUCTION ---'],
      ['Material Description', 'Contract Scope', 'Monthly Target', 'Previous Month Total', 'Produced This Month', 'Total To Date (Sum)', 'Completion %', 'In Stock', 'Remaining Balance'],
      ...productionItems.map(item => {
        const prev = item.previousMonthTotal || 0;
        const actual = item.thisMonth || 0;
        const total = prev + actual;
        const target = item.monthlyTarget || 0;
        const pct = target > 0 ? Math.round((actual / target) * 100) : (actual > 0 ? 100 : 0);
        return [
          item.desc,
          item.scope,
          target,
          prev,
          actual,
          total,
          `${pct}%`,
          item.availableStock,
          item.remainingBalance
        ];
      }),
      [''],
      ['--- EQUIPMENT MOBILIZATION ---'],
      ['Equipment Description', 'Original Plan', 'Revised Plan', 'Available On Site', 'Deficiency', 'Status / Breakdown'],
      ...equipmentItems.map(item => [
        item.desc,
        item.originalPlan,
        item.revisedPlan,
        item.available,
        item.deficiency,
        item.breakdown
      ]),
      [''],
      ['--- KEY PERSONNEL MOBILIZATION ---'],
      ['Personnel Title', 'Original Plan', 'Revised Plan', 'Available On Site', 'Deficiency', 'Duty Details'],
      ...personnelItems.map(item => [
        item.desc,
        item.originalPlan,
        item.revisedPlan,
        item.available,
        item.deficiency,
        item.breakdown
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Logistics_Record_${project.id || 'ERA'}_${activeRecord.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

      {/* ---------------------------------------------------------------- */}
      {/* 1. UPFRONT LATEST MONTH SHOWCASE & EXECUTIVE LOGISTICS BANNER   */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-700/50 relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          
          {/* Top Row: Title, Month Selector & Action Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-700/60 pb-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="p-2 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl">
                  <Layers className="w-5 h-5" />
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-3">
                  Logistics, Material Production & Supply Portal
                </h1>
                {isLatestMonth ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    LATEST ACTIVE MONTH UP FRONT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Clock className="w-3.5 h-3.5" />
                    HISTORICAL MONTH ARCHIVE
                  </span>
                )}
              </div>

              {/* Automatic Calculation Guidance Formula */}
              <div className="flex items-center gap-2 mt-2 text-xs text-teal-300 font-mono bg-teal-950/50 border border-teal-800/60 px-3 py-1 rounded-lg w-fit">
                <Calculator className="w-3.5 h-3.5 text-teal-400" />
                <span>
                  <strong>Autocalculated Cumulative Formula:</strong> Total Todate = Previous Month Total + This Month Production / Supply
                </span>
              </div>
            </div>

            {/* Month Selector & Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Month Dropdown */}
              <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-600/80 rounded-xl px-3 py-1.5 text-xs shadow-inner">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span className="text-slate-400 font-medium">Reporting Month:</span>
                <select
                  value={selectedMonthId}
                  onChange={(e) => setSelectedMonthId(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer pr-2"
                >
                  {monthlyRecords.map((r, idx) => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                      {r.monthName} {idx === 0 ? '★ (Latest)' : ''} — [{r.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Jump to Latest Month Button if viewing older month */}
              {!isLatestMonth && (
                <button
                  onClick={() => setSelectedMonthId(latestRecord.id)}
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Jump to Latest Month
                </button>
              )}

              {/* Record New Month Button */}
              {!isReadonly && (
                <button
                  onClick={() => {
                    const [yearStr, monthStr] = latestRecord.month.split('-');
                    let year = parseInt(yearStr);
                    let month = parseInt(monthStr) + 1;
                    if (month > 12) {
                      month = 1;
                      year += 1;
                    }
                    const nextMonthStr = `${year}-${String(month).padStart(2, '0')}`;
                    const dateObj = new Date(year, month - 1, 1);
                    setNewMonthStr(nextMonthStr);
                    setNewMonthName(dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
                    setIsRecordModalOpen(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Record New Month
                </button>
              )}

              {/* Export Button */}
              <button
                onClick={handleExportCSV}
                title="Export current month data to CSV"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition border border-slate-700 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Upfront Key Performance Indicator (KPI) Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Material Supply Target Completion */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/80 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-teal-400" />
                    Material Supply Completion
                  </span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md ${getProgressStatus(overallSupplyPct).badgeBg}`}>
                    {overallSupplyPct}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-white">{overallSupplyActual.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 ml-1.5 font-medium">delivered</span>
                  </div>
                  <span className="text-xs text-slate-400">Target: {overallSupplyTarget.toLocaleString()}</span>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-700/80 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressStatus(overallSupplyPct).barColor}`}
                    style={{ width: `${Math.min(100, Math.max(3, overallSupplyPct))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400">
                  <span>{getProgressStatus(overallSupplyPct).label}</span>
                  <span>{overallSupplyTarget - overallSupplyActual > 0 ? `${(overallSupplyTarget - overallSupplyActual).toLocaleString()} to target` : 'Target Exceeded'}</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Equipment Fleet Mobilization */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/80 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    Equipment Fleet Readiness
                  </span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md ${totalEquipmentDeficiency === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {equipmentReadinessPct}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-white">{totalEquipmentAvailable}</span>
                    <span className="text-xs text-slate-400 ml-1.5 font-medium">active machines</span>
                  </div>
                  <span className="text-xs text-slate-400">Plan: {totalEquipmentPlan}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="w-full bg-slate-700/80 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${totalEquipmentDeficiency === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, equipmentReadinessPct)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400">
                  <span>{totalEquipmentDeficiency > 0 ? `${totalEquipmentDeficiency} machines deficient` : 'Full fleet mobilized'}</span>
                  <span>{totalEquipmentAvailable} / {totalEquipmentPlan}</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Key Personnel Deployment */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/80 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    Key Personnel Site Presence
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                    {personnelPresencePct}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-white">{totalPersonnelAvailable}</span>
                    <span className="text-xs text-slate-400 ml-1.5 font-medium">experts on site</span>
                  </div>
                  <span className="text-xs text-slate-400">Plan: {totalPersonnelPlan}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="w-full bg-slate-700/80 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, personnelPresencePct)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400">
                  <span>Resident engineers & specialists</span>
                  <span>{totalPersonnelAvailable} / {totalPersonnelPlan}</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Material Production Volume */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/80 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    Own Plant Production
                  </span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md ${getProgressStatus(productionPct).badgeBg}`}>
                    {productionPct}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-white">{totalProductionActual.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 ml-1.5 font-medium">produced</span>
                  </div>
                  <span className="text-xs text-slate-400">Target: {totalProductionTarget.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="w-full bg-slate-700/80 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressStatus(productionPct).barColor}`}
                    style={{ width: `${Math.min(100, Math.max(3, productionPct))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400">
                  <span>Crusher & batching stations</span>
                  <span>{productionItems.length} active stations</span>
                </div>
              </div>
            </div>

          </div>

          {/* Month Meta Info & Remarks */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-4 flex-wrap">
              <span><strong>Period:</strong> {activeRecord.monthName} ({activeRecord.month})</span>
              <span><strong>Status:</strong> <span className="text-teal-300 font-semibold">{activeRecord.status}</span></span>
              <span><strong>Previous Month Reference:</strong> {previousRecord ? `${previousRecord.monthName} (${previousRecord.month})` : 'Earliest Recorded Baseline'}</span>
              <span><strong>Logged by:</strong> {activeRecord.recordedBy || 'ERA Project Unit'}</span>
            </div>
            {activeRecord.notes && (
              <div className="italic text-slate-300 text-xs truncate max-w-lg">
                "{activeRecord.notes}"
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 2. NAVIGATION TABS FOR DETAILED SECTIONS                         */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
          
          <button
            onClick={() => setActiveTab('supplies')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'supplies'
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Material Supply Logistics</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-black">
              {supplyItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('production')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'production'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Own Material Production</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black">
              {productionItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('equipment')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'equipment'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Equipment Mobilization</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black">
              {equipmentItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('personnel')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'personnel'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Key Personnel</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black">
              {personnelItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Monthly Archives ({monthlyRecords.length})</span>
          </button>

        </div>

        {/* Action button for active record */}
        <div className="flex items-center gap-2">
          {!isReadonly && (
            <button
              onClick={handleCloneMonthForward}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-teal-500" />
              Duplicate to Next Month
            </button>
          )}

          {!isReadonly && monthlyRecords.length > 1 && (
            <button
              onClick={() => handleDeleteMonth(activeRecord.id)}
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Month
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 3. TAB CONTENT 1: MATERIAL SUPPLY WITH CATEGORY PROGRESS BARS    */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'supplies' && (
        <div className="space-y-6">

          {/* User Requirement Highlight: Visual Progress Bar for Each Material Supply Category */}
          <div className="bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  Material Supply Category Completion Against Monthly Targets
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visual progress bars measuring delivered quantities vs planned monthly procurement targets across each material category.
                </p>
              </div>

              {/* Category Quick Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Filter:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  <option value="All">All Categories ({categoryProgressSummaries.length})</option>
                  {categoryProgressSummaries.map(c => (
                    <option key={c.category} value={c.category}>{c.category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visual Progress Bar Cards Grid for Each Material Supply Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryProgressSummaries
                .filter(c => categoryFilter === 'All' || c.category === categoryFilter)
                .map((catSummary) => {
                  const status = getProgressStatus(catSummary.completionPct);
                  return (
                    <div 
                      key={catSummary.category}
                      className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:border-teal-500/50 transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header: Category Name & Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-teal-600 dark:text-teal-400 shadow-2xs">
                              {catSummary.category.includes('Fuel') ? (
                                <Fuel className="w-4 h-4" />
                              ) : catSummary.category.includes('Steel') ? (
                                <Hammer className="w-4 h-4" />
                              ) : catSummary.category.includes('Cement') ? (
                                <Boxes className="w-4 h-4" />
                              ) : (
                                <Package className="w-4 h-4" />
                              )}
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                {catSummary.category}
                              </h4>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {catSummary.itemCount} supply item{catSummary.itemCount > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${status.badgeBg}`}>
                            {catSummary.completionPct}%
                          </span>
                        </div>

                        {/* Numeric Deliveries vs Monthly Target */}
                        <div className="mt-4 flex items-baseline justify-between">
                          <div>
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                              {catSummary.totalActual.toLocaleString()}
                            </span>
                            <span className="text-2xs text-slate-500 dark:text-slate-400 ml-1">supplied</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                              Target: {catSummary.totalTarget.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* VISUAL PROGRESS BAR FOR THIS MATERIAL SUPPLY CATEGORY */}
                        <div className="mt-2.5">
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${status.barColor}`}
                              style={{ width: `${Math.min(100, Math.max(3, catSummary.completionPct))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer Info: Deficit / Status */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className={`font-semibold ${status.textColor}`}>
                          {status.label}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {catSummary.remainingDeficit > 0 
                            ? `${catSummary.remainingDeficit.toLocaleString()} deficit` 
                            : `+${(catSummary.totalActual - catSummary.totalTarget).toLocaleString()} surplus`}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Material Supply Detail Table with Target & Row-level Visual Progress Bar */}
          <div className="bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-teal-600" />
                  External Material Purchases & Monthly Supply Register ({activeRecord.monthName})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total Todate is autocalculated as: <span className="font-semibold text-teal-600 dark:text-teal-400 font-mono">Previous Month Total + Delivered This Month</span>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={supplySearch}
                  onChange={(e) => setSupplySearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs py-1.5 px-3 rounded-xl w-48 text-slate-800 dark:text-zinc-200"
                />
                {!isReadonly && (
                  <button
                    onClick={() => handleAddMaterialRow(false)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Supply Item
                  </button>
                )}
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl scroll-smooth">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 shadow-2xs">
                  <tr className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 font-bold">Material Description</th>
                    <th className="p-3 w-36 font-bold">Category</th>
                    <th className="p-3 w-28 font-bold">Scope</th>
                    <th className="p-3 text-right w-24 bg-teal-500/5 text-teal-700 dark:text-teal-300 font-bold">Monthly Target</th>
                    
                    {/* Previous Month Total Column */}
                    <th className="p-3 text-right w-28 bg-slate-200/50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold">
                      <div className="flex flex-col items-end">
                        <span>Prev. Month</span>
                        <span className="text-[9px] lowercase text-slate-400 font-normal">
                          {previousRecord ? `(${previousRecord.monthName.split(' ')[0]})` : '(baseline)'}
                        </span>
                      </div>
                    </th>

                    {/* This Month Delivered Column */}
                    <th className="p-3 text-right w-28 bg-teal-500/10 text-teal-800 dark:text-teal-200 font-bold">
                      <div className="flex flex-col items-end">
                        <span>This Month</span>
                        <span className="text-[9px] lowercase text-teal-600 dark:text-teal-400 font-normal">+ delivered</span>
                      </div>
                    </th>

                    {/* Total To Date Autocalculated Column */}
                    <th className="p-3 text-right w-32 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 font-black border-l border-r border-indigo-200 dark:border-indigo-900/60">
                      <div className="flex flex-col items-end">
                        <span className="flex items-center gap-1">
                          <Calculator className="w-3 h-3 text-indigo-500" />
                          Total Todate
                        </span>
                        <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-normal">∑ prev + this</span>
                      </div>
                    </th>

                    <th className="p-3 text-center w-40 font-bold">Target Completion</th>
                    <th className="p-3 text-right w-24 text-blue-600 dark:text-blue-400 font-bold">Used</th>
                    <th className="p-3 text-right w-24 text-emerald-600 dark:text-emerald-400 font-bold">In Stock</th>
                    <th className="p-3 text-right w-24 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-bold">Remaining Bal.</th>
                    {!isReadonly && <th className="p-3 text-center w-12 font-bold">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {supplyItems
                    .filter(item => {
                      const matchesSearch = item.desc.toLowerCase().includes(supplySearch.toLowerCase()) || (item.scope || '').toLowerCase().includes(supplySearch.toLowerCase());
                      const cat = detectSupplyCategory(item.desc, item.category);
                      const matchesCategory = categoryFilter === 'All' || cat === categoryFilter;
                      return matchesSearch && matchesCategory;
                    })
                    .map((item) => {
                      const prevTotal = item.previousMonthTotal || 0;
                      const actualThisMonth = item.thisMonth || 0;
                      // Core Formula Verification:
                      const totalToDate = prevTotal + actualThisMonth;
                      const target = item.monthlyTarget || 0;
                      const completionPct = target > 0 ? Math.round((actualThisMonth / target) * 100) : (actualThisMonth > 0 ? 100 : 0);
                      const status = getProgressStatus(completionPct);
                      const detectedCat = detectSupplyCategory(item.desc, item.category);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors">
                          
                          {/* 1. Description */}
                          <td className="p-2.5 font-medium">
                            <input
                              type="text"
                              value={item.desc}
                              disabled={isReadonly}
                              onChange={(e) => handleMaterialChange(item.id, 'desc', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1.5 py-0.5 text-slate-800 dark:text-zinc-100 font-bold"
                            />
                          </td>

                          {/* 2. Category Selector */}
                          <td className="p-2.5">
                            <select
                              value={detectedCat}
                              disabled={isReadonly}
                              onChange={(e) => handleMaterialChange(item.id, 'category', e.target.value)}
                              className="w-full text-[11px] bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 font-medium disabled:opacity-80"
                            >
                              {SUPPLY_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>

                          {/* 3. Contract Scope */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.scope}
                              disabled={isReadonly}
                              onChange={(e) => handleMaterialChange(item.id, 'scope', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1 font-mono font-medium text-slate-700 dark:text-slate-300"
                            />
                          </td>

                          {/* 4. Monthly Target */}
                          <td className="p-2.5 bg-teal-500/5">
                            <AccountingInput
                              value={item.monthlyTarget || 0}
                              disabled={isReadonly}
                              onChange={(val) => handleMaterialChange(item.id, 'monthlyTarget', val)}
                              focusColor="focus:ring-teal-500"
                              decimals={0}
                              className="text-teal-800 dark:text-teal-300 font-bold"
                            />
                          </td>

                          {/* 5. PREVIOUS MONTH TOTAL (Read-only if linked, or editable baseline for earliest month) */}
                          <td className="p-2.5 bg-slate-100/70 dark:bg-slate-800/60">
                            <AccountingInput
                              value={prevTotal}
                              disabled={previousRecord !== null || isReadonly}
                              onChange={(val) => handleMaterialChange(item.id, 'previousMonthTotal', val)}
                              focusColor="focus:ring-slate-400"
                              decimals={0}
                              className="text-slate-600 dark:text-slate-400 font-semibold"
                            />
                          </td>

                          {/* 6. THIS MONTH ACTUAL DELIVERED */}
                          <td className="p-2.5 bg-teal-500/10">
                            <AccountingInput
                              value={actualThisMonth}
                              disabled={isReadonly}
                              onChange={(val) => handleMaterialChange(item.id, 'thisMonth', val)}
                              focusColor="focus:ring-teal-500"
                              decimals={0}
                              className="text-teal-950 dark:text-teal-200 font-black"
                            />
                          </td>

                          {/* 7. TOTAL TODATE: SUM OF PREVIOUS MONTH TOTAL + THIS MONTH */}
                          <td className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-l border-r border-indigo-200/60 dark:border-indigo-900/40">
                            <div className="flex flex-col items-end">
                              <AccountingInput
                                value={totalToDate}
                                disabled
                                decimals={0}
                                className="text-indigo-950 dark:text-indigo-200 font-black text-sm"
                              />
                              <span className="text-[9px] font-mono text-indigo-500 dark:text-indigo-400 pr-2">
                                {prevTotal > 0 ? `${prevTotal.toLocaleString()} + ${actualThisMonth.toLocaleString()}` : `${actualThisMonth.toLocaleString()}`}
                              </span>
                            </div>
                          </td>

                          {/* 8. Visual Progress Bar for Item */}
                          <td className="p-2.5">
                            <div className="w-full space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={`font-bold ${status.textColor}`}>
                                  {completionPct}%
                                </span>
                                <span className="text-slate-400 font-mono text-[9px]">
                                  {actualThisMonth.toLocaleString()} / {target.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${status.barColor}`}
                                  style={{ width: `${Math.min(100, Math.max(3, completionPct))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 9. Used / Consumed */}
                          <td className="p-2.5">
                            <AccountingInput
                              value={item.used || 0}
                              disabled
                              decimals={0}
                              className="text-blue-600 dark:text-blue-400 font-bold"
                            />
                          </td>

                          {/* 10. Available In Stock */}
                          <td className="p-2.5">
                            <AccountingInput
                              value={item.availableStock || 0}
                              disabled={isReadonly}
                              onChange={(val) => handleMaterialChange(item.id, 'availableStock', val)}
                              focusColor="focus:ring-teal-500"
                              decimals={0}
                              className="text-emerald-600 dark:text-emerald-400 font-semibold"
                            />
                          </td>

                          {/* 11. Remaining Balance */}
                          <td className="p-2.5 bg-amber-500/5">
                            <AccountingInput
                              value={item.remainingBalance || 0}
                              disabled
                              decimals={0}
                              className="text-amber-700 dark:text-amber-400 font-bold"
                            />
                          </td>

                          {/* 12. Actions */}
                          {!isReadonly && (
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => handleDeleteMaterialRow(item.id)}
                                title="Delete row"
                                className="text-slate-400 hover:text-rose-600 transition p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}

                        </tr>
                      );
                    })}

                  {supplyItems.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400">
                        No material supply items recorded for {activeRecord.monthName}. Click "Add Supply Item" to create records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 4. TAB CONTENT 2: OWN MATERIAL PRODUCTION (CRUSHERS / PLANTS)    */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'production' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Own Plant Production Tracking (Crushers, Asphalt Batching & Concrete) — {activeRecord.monthName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total Todate is autocalculated as: <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">Previous Month Total + Produced This Month</span>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search production items..."
                  value={productionSearch}
                  onChange={(e) => setProductionSearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs py-1.5 px-3 rounded-xl w-48 text-slate-800 dark:text-zinc-200"
                />
                {!isReadonly && (
                  <button
                    onClick={() => handleAddMaterialRow(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Production Station
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl scroll-smooth">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 shadow-2xs">
                  <tr className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 font-bold">Production Material / Station</th>
                    <th className="p-3 w-36 font-bold">Contract Scope</th>
                    <th className="p-3 text-right w-24 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-bold">Monthly Target</th>
                    
                    {/* Previous Month Total Column */}
                    <th className="p-3 text-right w-28 bg-slate-200/50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold">
                      <div className="flex flex-col items-end">
                        <span>Prev. Month</span>
                        <span className="text-[9px] lowercase text-slate-400 font-normal">
                          {previousRecord ? `(${previousRecord.monthName.split(' ')[0]})` : '(baseline)'}
                        </span>
                      </div>
                    </th>

                    {/* This Month Produced Column */}
                    <th className="p-3 text-right w-28 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 font-bold">
                      <div className="flex flex-col items-end">
                        <span>This Month</span>
                        <span className="text-[9px] lowercase text-emerald-600 dark:text-emerald-400 font-normal">+ produced</span>
                      </div>
                    </th>

                    {/* Total To Date Autocalculated Column */}
                    <th className="p-3 text-right w-32 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 font-black border-l border-r border-indigo-200 dark:border-indigo-900/60">
                      <div className="flex flex-col items-end">
                        <span className="flex items-center gap-1">
                          <Calculator className="w-3 h-3 text-indigo-500" />
                          Total Todate
                        </span>
                        <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-normal">∑ prev + this</span>
                      </div>
                    </th>

                    <th className="p-3 text-center w-40 font-bold">Target Progress</th>
                    <th className="p-3 text-right w-24 text-blue-600 dark:text-blue-400 font-bold">Used</th>
                    <th className="p-3 text-right w-24 text-emerald-600 dark:text-emerald-400 font-bold">Available Stock</th>
                    <th className="p-3 text-right w-24 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-bold">Remaining Bal.</th>
                    {!isReadonly && <th className="p-3 text-center w-12 font-bold">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {productionItems
                    .filter(item => item.desc.toLowerCase().includes(productionSearch.toLowerCase()))
                    .map((item) => {
                      const prevTotal = item.previousMonthTotal || 0;
                      const actualThisMonth = item.thisMonth || 0;
                      // Core Formula Verification:
                      const totalToDate = prevTotal + actualThisMonth;
                      const target = item.monthlyTarget || 0;
                      const completionPct = target > 0 ? Math.round((actualThisMonth / target) * 100) : (actualThisMonth > 0 ? 100 : 0);
                      const status = getProgressStatus(completionPct);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-2.5 font-medium">
                            <input
                              type="text"
                              value={item.desc}
                              disabled={isReadonly}
                              onChange={(e) => handleMaterialChange(item.id, 'desc', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1.5 py-0.5 text-slate-800 dark:text-zinc-100 font-bold"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.scope}
                              disabled={isReadonly}
                              onChange={(e) => handleMaterialChange(item.id, 'scope', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1 font-mono font-medium text-slate-700 dark:text-slate-300"
                            />
                          </td>
                          <td className="p-2.5 bg-emerald-500/5">
                            <AccountingInput
                              value={item.monthlyTarget || 0}
                              disabled={isReadonly}
                              onChange={(val) => handleMaterialChange(item.id, 'monthlyTarget', val)}
                              focusColor="focus:ring-emerald-500"
                              decimals={0}
                              className="text-emerald-800 dark:text-emerald-300 font-bold"
                            />
                          </td>

                          {/* Previous Month Total */}
                          <td className="p-2.5 bg-slate-100/70 dark:bg-slate-800/60">
                            <AccountingInput
                              value={prevTotal}
                              disabled={previousRecord !== null || isReadonly}
                              onChange={(val) => handleMaterialChange(item.id, 'previousMonthTotal', val)}
                              focusColor="focus:ring-slate-400"
                              decimals={0}
                              className="text-slate-600 dark:text-slate-400 font-semibold"
                            />
                          </td>

                          {/* This Month Produced */}
                          <td className="p-2.5 bg-emerald-500/10">
                            <AccountingInput
                              value={actualThisMonth}
                              disabled={isReadonly}
                              onChange={(val) => handleMaterialChange(item.id, 'thisMonth', val)}
                              focusColor="focus:ring-emerald-500"
                              decimals={0}
                              className="text-emerald-950 dark:text-emerald-200 font-black"
                            />
                          </td>

                          {/* Total To Date Autocalculated */}
                          <td className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-l border-r border-indigo-200/60 dark:border-indigo-900/40">
                            <div className="flex flex-col items-end">
                              <AccountingInput
                                value={totalToDate}
                                disabled
                                decimals={0}
                                className="text-indigo-950 dark:text-indigo-200 font-black text-sm"
                              />
                              <span className="text-[9px] font-mono text-indigo-500 dark:text-indigo-400 pr-2">
                                {prevTotal > 0 ? `${prevTotal.toLocaleString()} + ${actualThisMonth.toLocaleString()}` : `${actualThisMonth.toLocaleString()}`}
                              </span>
                            </div>
                          </td>

                          {/* Monthly Target Progress */}
                          <td className="p-2.5">
                            <div className="w-full space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={`font-bold ${status.textColor}`}>
                                  {completionPct}%
                                </span>
                                <span className="text-slate-400 font-mono text-[9px]">
                                  {actualThisMonth.toLocaleString()} / {target.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${status.barColor}`}
                                  style={{ width: `${Math.min(100, Math.max(3, completionPct))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Used */}
                          <td className="p-2.5">
                            <AccountingInput
                              value={item.used || 0}
                              disabled
                              decimals={0}
                              className="text-blue-600 dark:text-blue-400 font-bold"
                            />
                          </td>

                          {/* Available In Stock */}
                          <td className="p-2.5">
                            <AccountingInput
                              value={item.availableStock || 0}
                              disabled={isReadonly}
                              onChange={(val) => handleMaterialChange(item.id, 'availableStock', val)}
                              focusColor="focus:ring-emerald-500"
                              decimals={0}
                              className="text-emerald-600 dark:text-emerald-400 font-semibold"
                            />
                          </td>

                          {/* Remaining Balance */}
                          <td className="p-2.5 bg-amber-500/5">
                            <AccountingInput
                              value={item.remainingBalance || 0}
                              disabled
                              decimals={0}
                              className="text-amber-700 dark:text-amber-400 font-bold"
                            />
                          </td>

                          {!isReadonly && (
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => handleDeleteMaterialRow(item.id)}
                                className="text-slate-400 hover:text-rose-600 transition p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                  {productionItems.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        No production plants recorded. Click "Add Production Station" to append records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 5. TAB CONTENT 3: EQUIPMENT MOBILIZATION                         */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Heavy Machinery & Vehicle Fleet Mobilization — {activeRecord.monthName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tracking contractually planned heavy machinery, site deployment and operational breakdown status.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search machinery..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs py-1.5 px-3 rounded-xl w-48 text-slate-800 dark:text-zinc-200"
                />
                {!isReadonly && (
                  <button
                    onClick={() => handleAddResourceRow(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Machinery Row
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl scroll-smooth">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 shadow-2xs">
                  <tr className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 font-bold">Resource / Machine Description</th>
                    <th className="p-3 text-center w-24 font-bold">Original Plan</th>
                    <th className="p-3 text-center w-24 font-bold">Revised Plan</th>
                    <th className="p-3 text-center w-24 bg-blue-500/5 text-blue-700 dark:text-blue-300 font-bold">Available On Site</th>
                    <th className="p-3 text-center w-24 bg-rose-500/5 text-rose-600 dark:text-rose-400 font-bold">Deficiency</th>
                    <th className="p-3 text-center w-36 font-bold">Readiness Gauge</th>
                    <th className="p-3 font-bold">Operational Status / Breakdown Details</th>
                    {!isReadonly && <th className="p-3 text-center w-14 font-bold">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {equipmentItems
                    .filter(item => item.desc.toLowerCase().includes(equipmentSearch.toLowerCase()))
                    .map((item) => {
                      const plan = item.revisedPlan > 0 ? item.revisedPlan : item.originalPlan;
                      const readiness = plan > 0 ? Math.min(100, Math.round((item.available / plan) * 100)) : 100;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-2.5 font-medium">
                            <input
                              type="text"
                              value={item.desc}
                              disabled={isReadonly}
                              onChange={(e) => handleResourceChange(item.id, 'desc', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1.5 py-0.5 text-slate-800 dark:text-zinc-100 font-bold"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              value={item.originalPlan}
                              disabled={isReadonly}
                              onChange={(e) => handleResourceChange(item.id, 'originalPlan', parseInt(e.target.value) || 0)}
                              className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold text-slate-700 dark:text-slate-300"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              value={item.revisedPlan}
                              disabled={isReadonly}
                              onChange={(e) => handleResourceChange(item.id, 'revisedPlan', parseInt(e.target.value) || 0)}
                              className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold text-slate-700 dark:text-slate-300"
                            />
                          </td>
                          <td className="p-2.5 text-center bg-blue-500/5">
                            <input
                              type="number"
                              value={item.available}
                              disabled={isReadonly}
                              onChange={(e) => handleResourceChange(item.id, 'available', parseInt(e.target.value) || 0)}
                              className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-black text-blue-600 dark:text-blue-400"
                            />
                          </td>
                          <td className="p-2.5 text-center bg-rose-500/5">
                            <span className={`font-mono font-black ${item.deficiency > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {item.deficiency}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="w-full space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={`font-bold ${readiness === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{readiness}%</span>
                                <span className="text-slate-400 font-mono text-[9px]">{item.available} / {plan}</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${readiness === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                  style={{ width: `${readiness}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.breakdown}
                              disabled={isReadonly}
                              onChange={(e) => handleResourceChange(item.id, 'breakdown', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-400 text-xs"
                            />
                          </td>
                          {!isReadonly && (
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => handleDeleteResourceRow(item.id)}
                                className="text-slate-400 hover:text-rose-600 transition p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                  {equipmentItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No equipment mobilization data recorded. Click "Add Machinery Row" to add.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 6. TAB CONTENT 4: KEY PERSONNEL MOBILIZATION                    */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'personnel' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Key Personnel & Site Engineering Experts — {activeRecord.monthName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tracking project manager, highway engineers, materials engineers and environmental specialists on site.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search personnel..."
                  value={personnelSearch}
                  onChange={(e) => setPersonnelSearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs py-1.5 px-3 rounded-xl w-48 text-slate-800 dark:text-zinc-200"
                />
                {!isReadonly && (
                  <button
                    onClick={() => handleAddResourceRow(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Personnel Row
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl scroll-smooth">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 shadow-2xs">
                  <tr className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 font-bold">Personnel Title / Designation</th>
                    <th className="p-3 text-center w-24 font-bold">Original Plan</th>
                    <th className="p-3 text-center w-24 font-bold">Revised Plan</th>
                    <th className="p-3 text-center w-24 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 font-bold">Available</th>
                    <th className="p-3 text-center w-24 bg-rose-500/5 text-rose-600 dark:text-rose-400 font-bold">Deficiency</th>
                    <th className="p-3 font-bold">Duty Station / Specific Task Assignment</th>
                    {!isReadonly && <th className="p-3 text-center w-14 font-bold">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {personnelItems
                    .filter(item => item.desc.toLowerCase().includes(personnelSearch.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-2.5 font-medium">
                          <input
                            type="text"
                            value={item.desc}
                            disabled={isReadonly}
                            onChange={(e) => handleResourceChange(item.id, 'desc', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1.5 py-0.5 text-slate-800 dark:text-zinc-100 font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            value={item.originalPlan}
                            disabled={isReadonly}
                            onChange={(e) => handleResourceChange(item.id, 'originalPlan', parseInt(e.target.value) || 0)}
                            className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            value={item.revisedPlan}
                            disabled={isReadonly}
                            onChange={(e) => handleResourceChange(item.id, 'revisedPlan', parseInt(e.target.value) || 0)}
                            className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold"
                          />
                        </td>
                        <td className="p-2.5 text-center bg-indigo-500/5">
                          <input
                            type="number"
                            value={item.available}
                            disabled={isReadonly}
                            onChange={(e) => handleResourceChange(item.id, 'available', parseInt(e.target.value) || 0)}
                            className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-black text-indigo-600 dark:text-indigo-400"
                          />
                        </td>
                        <td className="p-2.5 text-center bg-rose-500/5">
                          <span className={`font-mono font-black ${item.deficiency > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {item.deficiency}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.breakdown}
                            disabled={isReadonly}
                            onChange={(e) => handleResourceChange(item.id, 'breakdown', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-400 text-xs"
                          />
                        </td>
                        {!isReadonly && (
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleDeleteResourceRow(item.id)}
                              className="text-slate-400 hover:text-rose-600 transition p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                  {personnelItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No personnel records. Click "Add Personnel Row" to create staff records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 7. TAB CONTENT 5: MONTHLY ARCHIVES & REPOSITORY                  */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600" />
                  Monthly Historical Log Archive & Version Register
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chronological repository of all recorded months. Click "View & Edit" to load any past month's figures.
                </p>
              </div>

              {!isReadonly && (
                <button
                  onClick={() => setIsRecordModalOpen(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Record New Month
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyRecords.map((rec, index) => {
                const isSelected = rec.id === activeRecord.id;
                const mobCount = rec.resourceMobilization?.length || 0;
                const matCount = rec.materialProduction?.length || 0;

                return (
                  <div
                    key={rec.id}
                    className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                        : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {rec.monthName}
                            </h4>
                            {index === 0 && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                LATEST
                              </span>
                            )}
                          </div>
                          <span className="text-2xs text-slate-400 font-mono">
                            Month Key: {rec.month} • Recorded: {rec.recordedDate || 'N/A'}
                          </span>
                        </div>

                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {rec.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">Machinery & Staff</span>
                          <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{mobCount} rows</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-150 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">Materials Tracked</span>
                          <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{matCount} items</span>
                        </div>
                      </div>

                      {rec.notes && (
                        <p className="mt-3 text-2xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
                          "{rec.notes}"
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedMonthId(rec.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        {isSelected ? 'Currently Viewing' : 'Select This Month'}
                      </button>

                      {!isReadonly && monthlyRecords.length > 1 && (
                        <button
                          onClick={() => handleDeleteMonth(rec.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          title="Delete monthly record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 8. MODAL: RECORD NEW MONTH DIALOG                                */}
      {/* ---------------------------------------------------------------- */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Record New Monthly Logistics Period
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Creates a persistent monthly record in the Ethiopian Roads Administration register.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Month Key & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Month Period (YYYY-MM) *
                  </label>
                  <input
                    type="text"
                    value={newMonthStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewMonthStr(val);
                      const match = val.match(/^(\d{4})-(\d{2})$/);
                      if (match) {
                        const y = parseInt(match[1]);
                        const m = parseInt(match[2]);
                        if (m >= 1 && m <= 12) {
                          const d = new Date(y, m - 1, 1);
                          setNewMonthName(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
                        }
                      }
                    }}
                    placeholder="e.g. 2026-10"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Month Name *
                  </label>
                  <input
                    type="text"
                    value={newMonthName}
                    onChange={(e) => setNewMonthName(e.target.value)}
                    placeholder="e.g. October 2026"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 font-bold"
                  />
                </div>
              </div>

              {/* Prefill Mode */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Baseline Prefill Option
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="radio"
                      name="prefill"
                      checked={newMonthPrefill === 'copy_clear_actuals'}
                      onChange={() => setNewMonthPrefill('copy_clear_actuals')}
                      className="mt-0.5 text-teal-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-zinc-200 block">
                        Copy Catalog & Carry Forward Previous Totals (Reset this month to 0) — Recommended
                      </span>
                      <span className="text-2xs text-slate-400 block">
                        Prior month Total Todate is automatically set as the previous month baseline, ensuring seamless summation: Total Todate = Prev Total + This Month.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="radio"
                      name="prefill"
                      checked={newMonthPrefill === 'copy_all'}
                      onChange={() => setNewMonthPrefill('copy_all')}
                      className="mt-0.5 text-teal-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-zinc-200 block">
                        Full Duplicate (Copy all records and numbers as-is)
                      </span>
                      <span className="text-2xs text-slate-400 block">
                        Useful if the upcoming month is an incremental continuation of the previous month.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={newMonthStatus}
                  onChange={(e) => setNewMonthStatus(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 font-semibold"
                >
                  <option value="Approved">Approved / Active Live</option>
                  <option value="Draft">Draft / Site Field Review</option>
                  <option value="Submitted">Submitted to Supervision Consultant</option>
                </select>
              </div>

              {/* Log Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Highlights / Logistical Notes
                </label>
                <textarea
                  value={newMonthNotes}
                  onChange={(e) => setNewMonthNotes(e.target.value)}
                  placeholder="Record notable events, such as fuel price escalation, cement factory quotas, rainy season delays..."
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-zinc-100 text-xs"
                />
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-150 dark:border-slate-800">
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewMonth}
                className="px-5 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Initialize & Record Month
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
