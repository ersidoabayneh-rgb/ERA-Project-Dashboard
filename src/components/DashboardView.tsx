import React, { useState, useEffect, useRef } from 'react';
import { formatDateStr, getRevisedCompletionDateStr, parseLocalDate } from '../lib/dateUtils';

import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, 
  MapPin, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Activity,
  Layers,
  ChevronDown,
  AlertTriangle,
  FileText,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Calendar,
  ExternalLink,
  Info,
  PieChart as PieChartIcon,
  BarChart3,
  BarChart2,
  Bell,

  Timer,
  Settings,
  Plus
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  LabelList
} from 'recharts';
import { Project, KpiAllocatedItem, LinearData, formatAccounting, User, ProjectLifecycleStatus, isProjectClosed, isCpmOrMasterAdmin, isMasterAdminOnly, PdfReportConfig, DEFAULT_PDF_REPORT_CONFIG, ProgressPlanHistoryItem } from '../types';
import CircularGauge from './CircularGauge';
import BillSummaryPriceAdjChart from './BillSummaryPriceAdjChart';
import DlpDefectModal from './DlpDefectModal';
import { buildKpiHierarchy, getIntegratedKpiAllocated, parseStation } from '../data/defaultProject';
import { calculateProjectEvm } from '../lib/evmCalculations';
import { getProjectDlpInfo, calculateCappedElapsedTimePct } from '../lib/dlpUtils';
import { resolveCurrentMonthKey, getLastActualProgress, isSameMonth } from '../lib/monthlySync';
import { QtyItem } from '../types';

export const sortProgressPlanHistoryDescending = (items: ProgressPlanHistoryItem[]): ProgressPlanHistoryItem[] => {
  return [...(items || [])].sort((a, b) => {
    const parseM = (lbl?: string) => {
      if (!lbl) return 0;
      const parts = lbl.trim().split(' ');
      const monthStr = parts[0];
      const yearStr = parts[1] || '2026';
      const monthsMap: Record<string, number> = {
        Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
        Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
      };
      const m = monthsMap[monthStr] || 1;
      const y = parseInt(yearStr, 10) || 2026;
      return y * 12 + m;
    };
    return parseM(b.monthLabel) - parseM(a.monthLabel);
  });
};

interface CriticalQtyAnalysis {
  name: string;
  unit: string;
  designValue: number;
  plannedValue: number;
  actualValue: number;
  execRatio: number; // actual / design %
  planRatio: number; // plan / design %
  variance: number; // actual - plan
  criticalFinding: string;
}

function evaluateEngineeringQuantities(quantities: QtyItem[]): {
  items: CriticalQtyAnalysis[];
  summaryNarrative: string;
} {
  const analysisItems: CriticalQtyAnalysis[] = [];
  let totalsCount = 0;
  let behindCount = 0;
  let aheadCount = 0;
  let severeSlippageCount = 0;

  (quantities || []).forEach(q => {
    // Extract UoM (unit of measurement) from parentheses
    const match = q.name.match(/^(.*?)\s*\((.*?)\)$/);
    const displayName = match ? match[1].trim() : q.name;
    const unit = match ? match[2].trim() : 'Units';

    const design = q.design || 0;
    const plan = q.plan || 0;
    const actual = q.exec || 0;

    const execRatio = design > 0 ? (actual / design) * 100 : 0;
    const planRatio = design > 0 ? (plan / design) * 100 : 0;
    const variance = actual - plan;
    const varianceRatio = plan > 0 ? (variance / plan) * 100 : 0;

    let finding = '';
    if (plan === 0 && actual === 0) {
      finding = `No activity recorded for this ${unit}-measured scope.`;
    } else if (variance < 0) {
      behindCount++;
      if (varianceRatio < -20) {
        severeSlippageCount++;
        finding = `Severe deficit of ${Math.abs(variance).toFixed(2)} ${unit} (${Math.abs(varianceRatio).toFixed(2)}% slippage) vs work program plan. Urgent mobilization required.`;
      } else {
        finding = `Moderate lag of ${Math.abs(variance).toFixed(2)} ${unit} (${Math.abs(varianceRatio).toFixed(2)}% variance). Target for acceleration.`;
      }
    } else {
      aheadCount++;
      if (varianceRatio > 20) {
        finding = `Aggressive progress exceeding plan by ${variance.toFixed(2)} ${unit} (+${varianceRatio.toFixed(2)}%). Review quality control of quick output.`;
      } else {
        finding = `Healthy progress alignment. Executed ${actual.toFixed(2)} of ${plan.toFixed(2)} planned ${unit}.`;
      }
    }

    analysisItems.push({
      name: displayName,
      unit,
      designValue: design,
      plannedValue: plan,
      actualValue: actual,
      execRatio,
      planRatio,
      variance,
      criticalFinding: finding
    });
    totalsCount++;
  });

  // Synthesize a detailed diagnostic narrative
  let summaryNarrative = '';
  if (totalsCount === 0) {
    summaryNarrative = "No engineering quantities registry was found. Unit of measurement critical evaluation is inconclusive.";
  } else {
    summaryNarrative = `A comprehensive audit was performed across ${totalsCount} key physical deliverables. `;
    if (severeSlippageCount > 0) {
      summaryNarrative += `Critical concern: ${severeSlippageCount} scope items exhibit severe execution deficits exceeding 20% of their planned volumes. `;
    }
    summaryNarrative += `Analysis shows ${aheadCount} items are meeting or exceeding scheduled targets, while ${behindCount} items are lagging. `;
    
    // Check specific units
    const kmItems = analysisItems.filter(i => i.unit.toLowerCase() === 'km');
    const kmLagging = kmItems.filter(i => i.variance < 0);
    if (kmLagging.length > 0) {
      summaryNarrative += `Linear layer completion (measured in Km) shows a critical bottleneck. Out of ${kmItems.length} linear layers, ${kmLagging.length} are currently lagging behind plan, which indicates subgrade, basecourse, or asphalt paving speed constraints. `;
    }

    const m3Items = analysisItems.filter(i => i.unit.toLowerCase() === 'm3');
    const m3Lagging = m3Items.filter(i => i.variance < 0);
    if (m3Lagging.length > 0) {
      summaryNarrative += `Earthwork and bulk material processing (measured in M3) is lagging by a cumulative total of ${m3Lagging.reduce((sum, item) => sum + Math.abs(item.variance), 0).toFixed(0)} M3. This lag is indicative of equipment bottlenecks or suboptimal material extraction rates. `;
    } else if (m3Items.length > 0) {
      summaryNarrative += `Earthwork extraction and filling operations (measured in M3) show satisfactory volume execution rates. `;
    }
    
    summaryNarrative += `Auditorial recommendation: Re-align equipment rosters to mitigate the ${behindCount} lagging indicators and optimize site clearing (Ha) or structural culvert (No.) mobilization.`;
  }

  return {
    items: analysisItems,
    summaryNarrative
  };
}

interface DashboardViewProps {
  project: Project;
  currentUserObj?: User;
  onSetPhysical: (val: number) => void;
  onUploadImage: (fileData: string) => void;
  onRemoveImage: (idx: number) => void;
  onClearImages: () => void;
  onProjectUpdate?: (fields: Partial<Project>, sectionName: string) => void;
  onSwitchTab?: (tabId: string) => void;
  onDeleteProject?: (id: string) => void;
  onUpdateProjectStatus?: (id: string, status: ProjectLifecycleStatus) => void;
}

export default function DashboardView({
  project,
  currentUserObj,
  onSetPhysical,
  onUploadImage,
  onRemoveImage,
  onClearImages,
  onProjectUpdate,
  onSwitchTab,
  onDeleteProject,
  onUpdateProjectStatus
}: DashboardViewProps) {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [selectedRowMetric, setSelectedRowMetric] = useState(
    (project.rowMetrics && project.rowMetrics[4] ? project.rowMetrics[4].name : null) || project.rowMetrics?.[0]?.name || 'ROW Obstruction free Section'
  );
  const [selectedQtyItem, setSelectedQtyItem] = useState(
    (project.quantities && project.quantities[8] ? project.quantities[8].name : null) || project.quantities?.[0]?.name || 'Asphalt Concrete (Km)'
  );
  const [selectedMonthSource, setSelectedMonthSource] = useState<string>('current');
  const [selectedQuarterSource, setSelectedQuarterSource] = useState<string>('current');
  const [selectedEfySource, setSelectedEfySource] = useState<string>('current');
  const [selectedCumulativeSource, setSelectedCumulativeSource] = useState<string>('current');
  const [physicalInput, setPhysicalInput] = useState(project.physicalProgress.toString());
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressSuccess, setProgressSuccess] = useState<string | null>(null);
  const [isKpiHistoryOpen, setIsKpiHistoryOpen] = useState(false);
  const [dashboardRoadType, setDashboardRoadType] = useState<'combined' | 'main' | 'spur'>('combined');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Real-time automated countdown ticker (updates every second)
  const [currentTick, setCurrentTick] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTick(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // DLP Detail & Defect Logging Modal State
  const [isDlpDefectModalOpen, setIsDlpDefectModalOpen] = useState(false);

  const currentMonthKey = resolveCurrentMonthKey(project);
  const lastActualInfo = getLastActualProgress(project.monthly, currentMonthKey);

  // Synchronize local input state with project prop updates
  React.useEffect(() => {
    setPhysicalInput(project.physicalProgress.toString());
    setProgressError(null);
  }, [project.physicalProgress]);

  const handleApplyPhysical = () => {
    const val = parseFloat(physicalInput);
    if (isNaN(val)) return;

    if (lastActualInfo.lastValue !== null && val < lastActualInfo.lastValue) {
      const errMsg = `Project Progress (${val.toFixed(2)}%) must be greater than or equal to the last value in the Actual column (${lastActualInfo.lastValue.toFixed(2)}% for ${lastActualInfo.lastMonth || 'prior month'}) of the monthly cumulative table.`;
      setProgressError(errMsg);
      setProgressSuccess(null);
      return;
    }

    setProgressError(null);
    const monthExists = (project.monthly || []).some(m => isSameMonth(m.month, currentMonthKey));
    setProgressSuccess(
      monthExists
        ? `Updated ${currentMonthKey} Actual column to ${val.toFixed(2)}%`
        : `Added ${currentMonthKey} row with Actual = ${val.toFixed(2)}%`
    );
    setTimeout(() => setProgressSuccess(null), 4000);
    onSetPhysical(val);
  };

  // If the active project changes, reset other default selected dropdown states as well
  React.useEffect(() => {
    if (project.rowMetrics && project.rowMetrics.length > 4) {
      setSelectedRowMetric(project.rowMetrics[4]?.name || 'ROW Obstruction free Section');
    }
    if (project.quantities && project.quantities.length > 8) {
      setSelectedQtyItem(project.quantities[8]?.name || 'Asphalt Concrete (Km)');
    }

    setSelectedMonthSource('current');
    setSelectedQuarterSource('current');
    setSelectedEfySource('current');
    setSelectedCumulativeSource('current');
  }, [project.id]);

  const isClosed = isProjectClosed(project.status);

  // Calculates elapsed progress ratio (capped strictly at 100% when completed or duration reached)
  const getElapsedPercent = () => {
    return calculateCappedElapsedTimePct(project, currentTick);
  };

  const elapsed = getElapsedPercent();
  const ratio = isClosed ? 100 : (elapsed > 0 ? (project.physicalProgress / elapsed) * 100 : 0);

  // Integrated KPIs
  const integratedKpis = getIntegratedKpiAllocated(project);

  // Find bonds and guarantees that are expired or expiring in < 45 days (excluded for completed & closed projects)
  const criticalBonds = (!isClosed && project.bonds) ? project.bonds.filter(b => {
    if (b.status === 'Recovered' || b.status === 'N/A') return false;
    const exp = new Date(b.expireDate);
    const now = new Date();
    if (b.status === 'Expired' || isNaN(exp.getTime()) || exp < now) {
      return true;
    }
    const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
    if (exp.getTime() - now.getTime() < fortyFiveDays) {
      return true;
    }
    return false;
  }) : [];
  const hasCriticalBonds = !isClosed && criticalBonds.length > 0;

  const getKpiSubScore = (sscId: string): number => {
    let earned = 0;
    let max = 0;
    integratedKpis.forEach(k => {
      if (k.sscId === sscId && !k.naActive) {
        const val = k.type === 'yn' ? (k.alloc >= k.max ? k.max : 0) : k.alloc;
        earned += val * (k.itemWt / 100);
        max += k.max * (k.itemWt / 100);
      }
    });
    return max > 0 ? (earned / max) * 100 : -1;
  };

  const getKpiGoalScore = (goalId: string): number => {
    const hierarchy = buildKpiHierarchy(project.contractType || 'DBB', project);
    const goal = hierarchy.find(g => g.id === goalId);
    if (!goal) return 0;
    let earnedSum = 0;
    let maxSum = 0;
    goal.sscs.forEach(ssc => {
      const sscScore = getKpiSubScore(ssc.id);
      if (sscScore >= 0) {
        earnedSum += sscScore * (ssc.wt / 100);
        maxSum += 100 * (ssc.wt / 100);
      }
    });
    return maxSum > 0 ? (earnedSum / maxSum) * 100 : 0;
  };

  const kpiScores = {
    quality: getKpiGoalScore('G5'),
    design: getKpiGoalScore('G6'),
    claims: getKpiGoalScore('G7'),
    risk: getKpiGoalScore('G8'),
    esohs: getKpiGoalScore('G9'),
    row: getKpiGoalScore('G10'),
    stake: getKpiGoalScore('G11'),
    contract: getKpiGoalScore('G12')
  };

  // Cost Overrun % = ((Revised Contract amount - Original Contract amount) / (Original Contract amount)) * 100
  const origContractVal = project.contractAmountEtb || ((project.origAmount || 0) * 1_000_000) || (project.origAmount || 0);
  const revContractVal = project.revisedContractAmountEtb
    ? project.revisedContractAmountEtb
    : (origContractVal + ((project.variation || 0) > 10000 ? (project.variation || 0) : ((project.variation || 0) * 1_000_000)));

  const costOverrun = origContractVal > 0 
    ? ((revContractVal - origContractVal) / origContractVal) * 100 
    : 0;

  const timeOverrun = project.origDays > 0 ? (project.eotDays / project.origDays) * 100 : 0;

  // Project Risk Exposure index calculation
  const projectRisks = project.risks || [];
  const activeRisks = projectRisks.filter(r => r.status === 'Active');
  const activeRisksCount = activeRisks.length;
  const totalActiveExposure = activeRisks.reduce((sum, r) => sum + r.probability * r.impact, 0);
  const averageRiskExposure = projectRisks.length 
    ? (projectRisks.reduce((sum, r) => sum + r.probability * r.impact, 0) / projectRisks.length).toFixed(2) 
    : '0.00';

  // Immediate safe resolution of selected dropdowns (ensures zero delay/glitch on project switches or table edits)
  const availableRowMetrics = project.rowMetrics || [];
  const activeRowMetric = availableRowMetrics.some(m => m.name === selectedRowMetric)
    ? selectedRowMetric
    : ((availableRowMetrics[4]?.name) || availableRowMetrics[0]?.name || 'ROW Obstruction free Section');

  const availableQuantities = project.quantities || [];
  const activeQtyItem = availableQuantities.some(q => q.name === selectedQtyItem)
    ? selectedQtyItem
    : ((availableQuantities[8]?.name) || availableQuantities[0]?.name || 'Asphalt Concrete (Km)');

  // Charts mapping for Right-of-Way (ROW) Status
  const rowMetricObj = availableRowMetrics.find(m => m.name === activeRowMetric);
  const isMaterialMetric = activeRowMetric.toLowerCase().includes('material source');
  const isElectricPoleMetric = activeRowMetric.toLowerCase().includes('electric pole') || activeRowMetric.toLowerCase().includes('pole');
  const isNumericCompare = isMaterialMetric || isElectricPoleMetric || (rowMetricObj && (rowMetricObj.unit === 'No.' || rowMetricObj.unit === 'No' || rowMetricObj.unit === 'Poles' || rowMetricObj.unit === 'Units'));

  let rowChartData: any[];
  let rowBadgeSummary = '';
  let rowLegendSeries: { key: string; name: string; fill: string }[] = [];

  if (isMaterialMetric) {
    const matReq = availableRowMetrics.find(m => m.name === 'Material Source Requested (No)')?.value || 
                   availableRowMetrics.find(m => m.name.toLowerCase().includes('material') && m.name.toLowerCase().includes('request'))?.value || 0;
    const matHand = availableRowMetrics.find(m => m.name === 'Material Source Handedover (No)')?.value || 
                    availableRowMetrics.find(m => m.name.toLowerCase().includes('material') && (m.name.toLowerCase().includes('handed') || m.name.toLowerCase().includes('cleared')))?.value || 0;
    const matPending = Math.max(0, matReq - matHand);
    
    const reqKey = 'Material Source Requested (No)';
    const handKey = 'Material Source Handedover (No)';
    const pendKey = 'Material Source Pending (No)';

    rowChartData = [{
      name: '',
      [reqKey]: Number(matReq),
      [handKey]: Number(matHand),
      [pendKey]: Number(matPending)
    }];

    rowLegendSeries = [
      { key: reqKey, name: reqKey, fill: '#ef4444' },
      { key: handKey, name: handKey, fill: '#10b981' },
      { key: pendKey, name: pendKey, fill: '#f59e0b' }
    ];

    rowBadgeSummary = `Handed Over: ${matHand} / Requested: ${matReq} (${matReq > 0 ? ((matHand / matReq) * 100).toFixed(1) : 0}%)`;
  } else if (isElectricPoleMetric) {
    const poleReq = availableRowMetrics.find(m => m.name === 'Electric Pole Removal Requested (No)')?.value || 
                    availableRowMetrics.find(m => (m.name.toLowerCase().includes('pole') || m.name.toLowerCase().includes('electric')) && m.name.toLowerCase().includes('request'))?.value || 0;
    const poleHand = availableRowMetrics.find(m => m.name === 'Electric Pole Removal Handedover (No)')?.value || 
                     availableRowMetrics.find(m => (m.name.toLowerCase().includes('pole') || m.name.toLowerCase().includes('electric')) && (m.name.toLowerCase().includes('handed') || m.name.toLowerCase().includes('cleared')))?.value || 0;
    const polePending = Math.max(0, poleReq - poleHand);
    
    const reqKey = 'Electric Pole Removal Requested (No)';
    const handKey = 'Electric Pole Removal Handedover (No)';
    const pendKey = 'Electric Pole Removal Pending (No)';

    rowChartData = [{
      name: '',
      [reqKey]: Number(poleReq),
      [handKey]: Number(poleHand),
      [pendKey]: Number(polePending)
    }];

    rowLegendSeries = [
      { key: reqKey, name: reqKey, fill: '#ef4444' },
      { key: handKey, name: handKey, fill: '#10b981' },
      { key: pendKey, name: pendKey, fill: '#f59e0b' }
    ];

    rowBadgeSummary = `Removed: ${poleHand} / Requested: ${poleReq} (${poleReq > 0 ? ((poleHand / poleReq) * 100).toFixed(1) : 0}%)`;
  } else {
    const val = Number(rowMetricObj ? rowMetricObj.value : 0);
    const totalKm = Number(project.lengthKm || 65);
    const isTotalLengthMetric = activeRowMetric.toLowerCase().includes('project length');
    const isRowClearMetric = activeRowMetric === 'ROW Obstruction free Section';
    const rowReqMetric = availableRowMetrics.find(m => m.name === 'ROW Request By Contractor');
    const evaluationBenchmark = (isRowClearMetric && rowReqMetric && Number(rowReqMetric.value) > 0)
      ? Number(rowReqMetric.value)
      : totalKm;

    const remainingKm = isTotalLengthMetric ? 0 : Math.max(0, evaluationBenchmark - val);
    const pct = evaluationBenchmark > 0 ? ((val / evaluationBenchmark) * 100).toFixed(1) : '0';

    const unitStr = rowMetricObj?.unit || 'Km';
    const mainKey = `${activeRowMetric} (${unitStr})`;
    const remKey = isRowClearMetric ? `Pending Contractor Request (${unitStr})` : `Remaining Section (${unitStr})`;

    rowChartData = [{
      name: '',
      [mainKey]: Number(val.toFixed(2)),
      [remKey]: Number(remainingKm.toFixed(2))
    }];

    rowLegendSeries = [
      { key: mainKey, name: mainKey, fill: isRowClearMetric ? '#10b981' : '#3b82f6' },
      ...(remainingKm > 0 ? [{ key: remKey, name: remKey, fill: isRowClearMetric ? '#f59e0b' : '#94a3b8' }] : [])
    ];

    rowBadgeSummary = isTotalLengthMetric 
      ? `Total Project Length: ${val.toFixed(2)} Km`
      : isRowClearMetric
        ? `Cleared: ${val.toFixed(2)} Km / Requested by Contractor: ${evaluationBenchmark.toFixed(2)} Km (${pct}%)`
        : `Achieved: ${val.toFixed(2)} Km / ${totalKm.toFixed(2)} Km (${pct}%)`;
  }

  // Charts mapping for Quantities: Plan vs Completed
  const qtyObj = availableQuantities.find(q => q.name === activeQtyItem) || availableQuantities[0];
  const designVal = Number(qtyObj?.design || 0);
  const planVal = Number(qtyObj?.plan || 0);
  const execVal = Number(qtyObj?.exec || 0);
  const varianceVal = Math.max(0, planVal - execVal);

  const uomMatch = (qtyObj?.name || '').match(/\(([^)]+)\)/);
  const qtyUnit = uomMatch ? uomMatch[1] : '';

  const qtyChartData = [
    { name: 'Design / Contract', 'Value': Number(designVal.toFixed(2)), fill: '#3b82f6', unit: qtyUnit },
    { name: 'Target Plan', 'Value': Number(planVal.toFixed(2)), fill: '#f59e0b', unit: qtyUnit },
    { name: 'To-Date Completed', 'Value': Number(execVal.toFixed(2)), fill: '#10b981', unit: qtyUnit },
    { name: 'Remaining to Plan', 'Value': Number(varianceVal.toFixed(2)), fill: '#ef4444', unit: qtyUnit }
  ];

  const qtyPlanPct = planVal > 0 ? ((execVal / planVal) * 100).toFixed(1) : '0';
  const qtyDesignPct = designVal > 0 ? ((execVal / designVal) * 100).toFixed(1) : '0';
  const qtyBadgeSummary = `Executed: ${execVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${qtyUnit} (${qtyPlanPct}% of Plan, ${qtyDesignPct}% of Design)`;

  const seriesBarData = (project.series || []).map(s => ({
    name: s.desc,
    'Progress %': Number((s.progress || 0).toFixed(2)),
  }));

  const hasHighValueRisk = (project.risks || []).some(
    r => r.status === 'Active' && (r.probability * r.impact) >= 15
  );

  const topCriticalRisks = React.useMemo(() => {
    const list = project.risks || [];
    return [...list]
      .filter(r => r.status !== 'Retired')
      .sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact))
      .slice(0, 3);
  }, [project.risks]);

  // Building progress plan data dynamically
  const progressPlanChartData: any[] = [];
  const historyList = React.useMemo(() => {
    return sortProgressPlanHistoryDescending(project.progressPlanHistory || []);
  }, [project.progressPlanHistory]);

  // 1. Month
  if (selectedMonthSource !== 'hide') {
    if (selectedMonthSource === 'current') {
      const cVal = Number((project.progressPlan?.contractor?.month ?? 0).toFixed(2));
      const eVal = Number((project.progressPlan?.era?.month ?? 0).toFixed(2));
      const aVal = Number((project.progressPlan?.actual?.month ?? 0).toFixed(2));
      const mLabel = project.progressPlanLabels?.monthLabel || 'Month';
      progressPlanChartData.push({
        category: 'Month',
        name: mLabel,
        subLabel: 'Current Month Target',
        periodLabel: mLabel,
        Contractor: cVal,
        ERA: eVal,
        Actual: aVal,
        unit: 'Km',
      });
    } else {
      const histItem = historyList.find(h => h.id === selectedMonthSource);
      if (histItem) {
        const cVal = Number((histItem.contractorMonth ?? 0).toFixed(2));
        const eVal = Number((histItem.eraMonth ?? 0).toFixed(2));
        const aVal = Number((histItem.actualMonth ?? 0).toFixed(2));
        progressPlanChartData.push({
          category: 'Month',
          name: histItem.monthLabel,
          subLabel: `Archived Month (EFY ${histItem.efyLabel})`,
          periodLabel: histItem.monthLabel,
          Contractor: cVal,
          ERA: eVal,
          Actual: aVal,
          unit: 'Km',
        });
      }
    }
  }

  // 2. Quarter
  if (selectedQuarterSource !== 'hide') {
    if (selectedQuarterSource === 'current') {
      const cVal = Number((project.progressPlan?.contractor?.quarter ?? 0).toFixed(2));
      const eVal = Number((project.progressPlan?.era?.quarter ?? 0).toFixed(2));
      const aVal = Number((project.progressPlan?.actual?.quarter ?? 0).toFixed(2));
      const qLabel = project.progressPlanLabels?.quarterLabel || 'Quarter';
      progressPlanChartData.push({
        category: 'Quarter',
        name: qLabel,
        subLabel: 'Current Quarterly Target',
        periodLabel: qLabel,
        Contractor: cVal,
        ERA: eVal,
        Actual: aVal,
        unit: 'Km',
      });
    } else {
      const histItem = historyList.find(h => h.id === selectedQuarterSource);
      if (histItem) {
        const cVal = Number((histItem.contractorQuarter ?? 0).toFixed(2));
        const eVal = Number((histItem.eraQuarter ?? 0).toFixed(2));
        const aVal = Number((histItem.actualQuarter ?? 0).toFixed(2));
        const qLabel = histItem.quarterLabel || `Qtr (${histItem.monthLabel})`;
        progressPlanChartData.push({
          category: 'Quarter',
          name: qLabel,
          subLabel: `Archived Quarter (${histItem.monthLabel})`,
          periodLabel: qLabel,
          Contractor: cVal,
          ERA: eVal,
          Actual: aVal,
          unit: 'Km',
        });
      }
    }
  }

  // 3. EFY
  if (selectedEfySource !== 'hide') {
    if (selectedEfySource === 'current') {
      const cVal = Number((project.progressPlan?.contractor?.efy ?? 0).toFixed(2));
      const eVal = Number((project.progressPlan?.era?.efy ?? 0).toFixed(2));
      const aVal = Number((project.progressPlan?.actual?.efy ?? 0).toFixed(2));
      const efyName = project.progressPlanLabels?.efyLabel ? `EFY ${project.progressPlanLabels.efyLabel}` : 'EFY Plan';
      progressPlanChartData.push({
        category: 'EFY',
        name: efyName,
        subLabel: 'Current Fiscal Year Target',
        periodLabel: efyName,
        Contractor: cVal,
        ERA: eVal,
        Actual: aVal,
        unit: 'Km',
      });
    } else {
      const histItem = historyList.find(h => h.id === selectedEfySource);
      if (histItem) {
        const cVal = Number((histItem.contractorEfy ?? 0).toFixed(2));
        const eVal = Number((histItem.eraEfy ?? 0).toFixed(2));
        const aVal = Number((histItem.actualEfy ?? 0).toFixed(2));
        progressPlanChartData.push({
          category: 'EFY',
          name: `EFY ${histItem.efyLabel}`,
          subLabel: `Archived EFY at ${histItem.monthLabel}`,
          periodLabel: `EFY ${histItem.efyLabel} (${histItem.monthLabel})`,
          Contractor: cVal,
          ERA: eVal,
          Actual: aVal,
          unit: 'Km',
        });
      }
    }
  }

  // 4. Cumulative
  if (selectedCumulativeSource !== 'hide') {
    if (selectedCumulativeSource === 'current') {
      const cVal = Number((project.progressPlan?.contractor?.todate ?? 0).toFixed(2));
      const eVal = Number((project.progressPlan?.era?.todate ?? 0).toFixed(2));
      const aVal = Number((project.progressPlan?.actual?.todate ?? 0).toFixed(2));
      progressPlanChartData.push({
        category: 'Cumulative',
        name: 'Cumulative To-Date',
        subLabel: 'Current Live Cumulative',
        periodLabel: 'To-Date',
        Contractor: cVal,
        ERA: eVal,
        Actual: aVal,
        unit: 'Km',
      });
    } else {
      const histItem = historyList.find(h => h.id === selectedCumulativeSource);
      if (histItem) {
        const cVal = Number((histItem.contractorTodate ?? 0).toFixed(2));
        const eVal = Number((histItem.eraTodate ?? 0).toFixed(2));
        const aVal = Number((histItem.actualTodate ?? 0).toFixed(2));
        progressPlanChartData.push({
          category: 'Cumulative',
          name: `Cum (${histItem.monthLabel})`,
          subLabel: `Archived To-Date at ${histItem.monthLabel}`,
          periodLabel: `Cum To-Date at ${histItem.monthLabel}`,
          Contractor: cVal,
          ERA: eVal,
          Actual: aVal,
          unit: 'Km',
        });
      }
    }
  }

  let origStop = false;
  let revStop = false;
  let actStop = false;

  const sCurveChartData = (project.monthly && project.monthly.length > 0)
    ? project.monthly.map((m, idx) => {
        let orig: number | null = null;
        if (!origStop) {
          const raw = m.originalPlan;
          if (raw !== '' && raw !== null && raw !== undefined && !isNaN(Number(raw))) {
            const num = Number(raw);
            if (num >= 100) {
              orig = 100;
              origStop = true;
            } else if (num >= 0) {
              orig = num;
            }
          }
        }

        let rev: number | null = null;
        if (!revStop) {
          const raw = m.revisedPlan;
          if (raw !== '' && raw !== null && raw !== undefined && !isNaN(Number(raw))) {
            const num = Number(raw);
            if (num >= 100) {
              rev = 100;
              revStop = true;
            } else if (num >= 0) {
              rev = num;
            }
          }
        }

        let act: number | null = null;
        if (!actStop) {
          const raw = m.actual;
          if (raw !== '' && raw !== null && raw !== undefined && !isNaN(Number(raw))) {
            const num = Number(raw);
            if (num >= 100) {
              act = 100;
              actStop = true;
            } else if (num > 0 || (idx === 0 && num === 0)) {
              act = num;
            }
          }
        }

        return {
          name: m.month,
          'Original Plan (%)': orig,
          'Revised Plan (%)': rev,
          'To-Date Actual (%)': act
        };
      })
    : [];

  const exchangeRate = project.usdExchangeRate !== undefined ? project.usdExchangeRate : 57.50;

  const getCalculatedPercent = (itemDesc: string, amount: number, rate: number = exchangeRate) => {
    const isDB = project.contractType === 'DB';
    const totalSeriesSum = (project.series || []).reduce((sum, s) => sum + (s.contractAmt || 0), 0);
    const provisionalSum = project.provisionalSum || 0;
    
    // Find dayworks
    const dayworksItem = (project.series || []).find(s => 
      s.code === '11000' || 
      s.desc.toLowerCase().includes('day work') || 
      s.desc.toLowerCase().includes('dayworks')
    );
    const dayworksAmt = dayworksItem ? (dayworksItem.contractAmt || 0) : 0;

    const lowerDesc = itemDesc.toLowerCase();
    
    if (lowerDesc.trim() === 'total todate bill summary' || lowerDesc.includes('bill summary')) {
      const orig = (project.origAmount || 0) * 1_000_000 || totalSeriesSum;
      return orig > 0 ? (amount / orig) * 100 : 0;
    }

    if (lowerDesc.trim() === 'remaining') {
      const orig = (project.origAmount || 0) * 1_000_000 || totalSeriesSum;
      return orig > 0 ? (amount / orig) * 100 : 0;
    }

    const isAdvancePay = lowerDesc.includes('advance payment');
    const isAdvanceRepay = lowerDesc.includes('repayment') || lowerDesc.includes('repay') || lowerDesc.includes('amortization');

    if (isAdvancePay || isAdvanceRepay) {
      if (!isDB) {
        // =(Advance Payment/(Total SeriesItem Sum -Provisional Sum-dayworks))
        const denominator = totalSeriesSum - provisionalSum - dayworksAmt;
        if (denominator > 0) {
          return (amount / denominator) * 100;
        }
      } else {
        // DB: =(Advance Payment/E-original Contract base of Contract Sum (Birr))
        const baseAmount = ((project.origAmount || 1) * 1_000_000) / 1.15;
        if (baseAmount > 0) {
          return (amount / baseAmount) * 100;
        }
      }
    }

    // CHECK FOR RETENTION MONEY OR A NEW ROW
    const isRetention = lowerDesc.includes('retention');

    const defaultKeys = [
      'advance payment',
      'advance repayment',
      'repayment of advance',
      'amortization of advance',
      'bill summary',
      'subtotal',
      'sub total',
      'sub-total',
      'remaining',
      'price adjustment',
      'certified ipc',
      'certified todate'
    ];
    const isNewRow = !defaultKeys.some(key => lowerDesc.includes(key));

    if (isRetention || isNewRow) {
      const origVal = (project.origAmount || 1) * 1_000_000;
      const originalMinusVat = origVal / 1.15; // Net amount (Original contract amount excluding 15% VAT)
      if (originalMinusVat > 0) {
        return (amount / originalMinusVat) * 100;
      }
    }

    // Default percentage fallback representation
    const orig = (project.origAmount || 1) * 1_000_000;
    return orig > 0 ? (amount / orig) * 100 : 0;
  };

  const paymentListRaw = project.payment || [];

  const paymentChartData = paymentListRaw.map(p => ({
    name: p.item,
    'Paid (%)': getCalculatedPercent(p.item, p.amount, exchangeRate),
    'Amount (Birr)': p.amount
  }));

  const totalProjectKmForAnnual = project.lengthKm || 65;
  const annualChartData = (project.annual || []).map(a => {
    const kmVal = a.km !== undefined ? a.km : (a.amount <= (totalProjectKmForAnnual * 2) ? a.amount : Number(((a.percent / 100) * totalProjectKmForAnnual).toFixed(2)));
    const pctVal = totalProjectKmForAnnual > 0 ? (kmVal / totalProjectKmForAnnual) * 100 : (a.percent || 0);
    return {
      name: a.year.toString(),
      'Progress (%)': Number(pctVal.toFixed(2)),
      'Accomplished (Km)': Number(kmVal.toFixed(2))
    };
  });

  const hasSpurRoad = Boolean(
    (project.name && project.name.toLowerCase().includes('spur')) ||
    (project.spurRoadLengthKm !== undefined && project.spurRoadLengthKm > 0)
  );

  const activeRoadType = hasSpurRoad ? dashboardRoadType : 'main';

  const totalProjectKm = project.lengthKm || 65;
  const spurRoadTargetKm = hasSpurRoad ? (project.spurRoadLengthKm ?? 8.8) : 0;
  const mainRoadTargetKm = hasSpurRoad ? Math.max(0, Number((totalProjectKm - spurRoadTargetKm).toFixed(2))) : totalProjectKm;

  let maxLinearRoadKm = totalProjectKm;
  if (activeRoadType === 'main') {
    maxLinearRoadKm = mainRoadTargetKm;
  } else if (activeRoadType === 'spur') {
    maxLinearRoadKm = spurRoadTargetKm;
  }

  const linearSections: { id: keyof LinearData; name: string; color: string; hex: string; hover: string }[] = [
    { id: 'subgrade', name: 'Sub-Grade', color: 'bg-amber-800', hex: '#92400e', hover: 'hover:bg-amber-700' },
    ...(project.hasCappingLayer !== false ? [{ id: 'capping' as keyof LinearData, name: 'Capping Layers', color: 'bg-yellow-700', hex: '#a16207', hover: 'hover:bg-yellow-600' }] : []),
    { id: 'subbase', name: 'Sub-Base', color: 'bg-zinc-500', hex: '#71717a', hover: 'hover:bg-zinc-400' },
    { id: 'basecourse', name: 'Base-Course', color: 'bg-slate-500', hex: '#64748b', hover: 'hover:bg-slate-400' },
    { id: 'asphalt', name: 'Asphalt Concrete (AC)', color: 'bg-indigo-950', hex: '#1e1b4b', hover: 'hover:bg-slate-900' }
  ];

  const mainLinear = project.linear || { subgrade: [], capping: [], subbase: [], basecourse: [], asphalt: [] };
  const spurLinear = project.linearSpur || { subgrade: [], capping: [], subbase: [], basecourse: [], asphalt: [] };

  const getRowExec = (r: any) => {
    if (typeof r.exec === 'number' && !isNaN(r.exec) && r.exec > 0) return r.exec;
    if (r.from && r.to) return Math.max(0, parseStation(r.to) - parseStation(r.from));
    return 0;
  };

  const dashboardProgressChartData = linearSections.map((sec) => {
    const mainList = mainLinear[sec.id] || [];
    const spurList = spurLinear[sec.id] || [];

    const mainExec = mainList.reduce((sum, r) => sum + getRowExec(r), 0);
    const spurExec = spurList.reduce((sum, r) => sum + getRowExec(r), 0);
    const combinedExec = mainExec + spurExec;

    let displayTarget = totalProjectKm;
    let displayExec = combinedExec;

    if (activeRoadType === 'main') {
      displayTarget = mainRoadTargetKm;
      displayExec = mainExec;
    } else if (activeRoadType === 'spur') {
      displayTarget = spurRoadTargetKm;
      displayExec = spurExec;
    }

    const fillPct = Math.min(100, (displayExec / (displayTarget || 1)) * 100);
    const remainingKm = Math.max(0, displayTarget - displayExec);

    return {
      id: sec.id,
      name: sec.name,
      color: sec.color,
      hex: sec.hex,
      mainKm: Number(mainExec.toFixed(2)),
      spurKm: Number(spurExec.toFixed(2)),
      combinedKm: Number(combinedExec.toFixed(2)),
      displayExec: Number(displayExec.toFixed(2)),
      remainingKm: Number(remainingKm.toFixed(2)),
      displayTarget: Number(displayTarget.toFixed(2)),
      fillPct: Number(fillPct.toFixed(2)),
      mainSegments: mainList.length,
      spurSegments: spurList.length
    };
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            onUploadImage(ev.target.result as string);
          }
        };
        reader.readAsDataURL(files[i]);
      }
    }
  };

  const formattedMoney = (v: number) => 
    formatAccounting(v, '');

  // Integrated Performance calculations for Alerts and Reports via unified EVM engine
  const evm = calculateProjectEvm(project);
  const { BAC, AC, EV, PV, plannedPct, CPI, SPI, EAC, TCPI } = evm;

  const seriesList = project.series || [];
  const te = seriesList.reduce((sum, item) => sum + (item.execAmt || 0), 0);
  const totalOrigExec = te * 1.15;
  const paymentList = project.payment || [];
  const pa = (paymentList.find(x => x.item === 'Price Adjustment') || { amount: 0 }).amount;
  const advPay = (paymentList.find(x => x.item === 'Advance Payment') || { amount: 0 }).amount;
  const advRepay = (paymentList.find(x => x.item === 'Advance Repayment') || { amount: 0 }).amount;
  const ipc = (paymentList.find(x => x.item.trim().toLowerCase().includes('total todate certified ipc')) || { amount: 0 }).amount;

  const rateIpc = project.usdExchangeRate || 57.50;
  const trackerIpcs = project.ipcTracker || [];

  const CV_Mil = (EV - AC) / 1_000_000;
  const SV_Mil = (EV - PV) / 1_000_000;
  const CV_pct = AC > 0 ? ((EV - AC) / AC) * 100 : 0;
  const SV_pct = PV > 0 ? ((EV - PV) / PV) * 100 : 0;

  // Generate last 5 CPI/SPI records based on actual progress comparison milestones and EVM metrics
  const kpiHistoryRecords = React.useMemo(() => {
    const currentActualKm = project.progressPlan?.actual?.todate || 0;
    const currentPhysical = (typeof project.physicalProgress === 'number' && project.physicalProgress > 0)
      ? project.physicalProgress
      : (project.lengthKm > 0 && currentActualKm > 0 ? (currentActualKm / project.lengthKm) * 100 : (project.physicalProgress || 0));

    const currentRecord = {
      period: project.progressPlanLabels?.monthLabel || 'Current Month',
      isCurrent: true,
      physical: currentPhysical,
      elapsed: elapsed,
      ratio: ratio,
      cpi: CPI,
      spi: SPI,
      ev: EV / 1_000_000,
      pv: PV / 1_000_000,
      ac: AC / 1_000_000,
    };

    const historyList = project.progressPlanHistory || [];
    let pastRecords: any[] = [];

    if (historyList.length > 0) {
      pastRecords = historyList.map((histItem) => {
        const monthLabel = histItem.monthLabel;
        
        let histPhysical: number;
        if (typeof histItem.physicalProgress === 'number' && histItem.physicalProgress > 0) {
          histPhysical = histItem.physicalProgress;
        } else if (typeof histItem.actualTodate === 'number' && histItem.actualTodate > 0 && project.lengthKm > 0) {
          histPhysical = Number(((histItem.actualTodate / project.lengthKm) * 100).toFixed(2));
        } else {
          const matchMonth = (project.monthly || []).find(m => {
            const cleanM = (m.month || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanLabel = monthLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanLabel.includes(cleanM) || cleanM.includes(cleanLabel);
          });
          if (matchMonth && typeof matchMonth.actual === 'number') {
            histPhysical = matchMonth.actual;
          } else if (typeof histItem.actualEfy === 'number' && histItem.actualEfy > 0 && project.lengthKm > 0) {
            histPhysical = Number(((histItem.actualEfy / project.lengthKm) * 100).toFixed(2));
          } else {
            histPhysical = currentPhysical;
          }
        }

        const pastEv = (BAC * (histPhysical / 100)) / 1_000_000;
        
        const matchMonth = (project.monthly || []).find(m => {
          const cleanM = (m.month || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanLabel = monthLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanLabel.includes(cleanM) || cleanM.includes(cleanLabel);
        });
        const matchPlanned = matchMonth && typeof matchMonth.originalPlan === 'number' ? matchMonth.originalPlan : null;
        
        const pastPv = matchPlanned !== null 
          ? (BAC * (matchPlanned / 100)) / 1_000_000
          : (PV / 1_000_000) * (currentPhysical > 0 ? histPhysical / currentPhysical : 1);
          
        const pastSpi = pastPv > 0 ? Number((pastEv / pastPv).toFixed(3)) : SPI;
        const pastCpi = CPI;
        const pastAc = pastCpi > 0 ? Number((pastEv / pastCpi).toFixed(2)) : pastEv;
        const pastElapsed = Math.max(0, currentPhysical > 0 ? elapsed * (histPhysical / currentPhysical) : elapsed);
        const pastRatio = pastElapsed > 0 ? (histPhysical / pastElapsed) * 100 : 0;

        return {
          period: monthLabel,
          isCurrent: false,
          physical: histPhysical,
          elapsed: pastElapsed,
          ratio: pastRatio,
          cpi: pastCpi,
          spi: pastSpi,
          ev: pastEv,
          pv: pastPv,
          ac: pastAc,
        };
      });
    } else if (project.monthly && project.monthly.length > 1) {
      const pastMonths = project.monthly
        .filter(m => typeof m.actual === 'number' && m.actual > 0)
        .slice(-5, -1)
        .reverse();

      pastRecords = pastMonths.map(m => {
        const histPhysical = typeof m.actual === 'number' ? m.actual : 0;
        const histPlanned = typeof m.originalPlan === 'number' ? m.originalPlan : (typeof m.revisedPlan === 'number' ? m.revisedPlan : histPhysical);
        const pastEv = (BAC * (histPhysical / 100)) / 1_000_000;
        const pastPv = (BAC * (histPlanned / 100)) / 1_000_000;
        const pastSpi = pastPv > 0 ? Number((pastEv / pastPv).toFixed(3)) : 1.0;
        const pastCpi = CPI;
        const pastAc = pastCpi > 0 ? Number((pastEv / pastCpi).toFixed(2)) : pastEv;
        const pastElapsed = Math.max(0, currentPhysical > 0 ? elapsed * (histPhysical / currentPhysical) : elapsed);
        const pastRatio = pastElapsed > 0 ? (histPhysical / pastElapsed) * 100 : 0;

        return {
          period: m.month,
          isCurrent: false,
          physical: histPhysical,
          elapsed: pastElapsed,
          ratio: pastRatio,
          cpi: pastCpi,
          spi: pastSpi,
          ev: pastEv,
          pv: pastPv,
          ac: pastAc,
        };
      });
    }

    return [currentRecord, ...pastRecords];
  }, [project.progressPlanLabels, project.physicalProgress, project.progressPlanHistory, project.progressPlan, project.monthly, project.lengthKm, elapsed, ratio, CPI, SPI, EV, PV, AC, BAC]);

  // Comprehensive Payment Maturity Audit Calculations (FIDIC 56-Day Window)
  const todayDate = new Date();
  
  let totalCertifiedEtbSum = 0;
  let totalCertifiedUsdSum = 0;
  
  let totalPaidEtbSum = 0;
  let totalPaidUsdSum = 0;

  let totalUnpaidEtbSum = 0;
  let totalUnpaidUsdSum = 0;

  let maturedUnpaidEtbSum = 0;
  let maturedUnpaidUsdSum = 0;
  
  let withinMaturityUnpaidEtbSum = 0;
  let withinMaturityUnpaidUsdSum = 0;

  let totalIpcCount = trackerIpcs.length;
  let paidIpcCount = 0;
  let unpaidIpcCount = 0;
  let maturedIpcCount = 0;
  let withinMaturityIpcCount = 0;

  const ipcDetails = trackerIpcs.map(item => {
    const etbAmt = item.certifiedEtb || 0;
    const usdAmt = item.certifiedUsd || 0;
    const combinedEtb = etbAmt + (usdAmt * rateIpc);

    totalCertifiedEtbSum += etbAmt;
    totalCertifiedUsdSum += usdAmt;

    const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
    const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
    const isFullyPaid = !isEtbUnpaid && !isUsdUnpaid;

    let daysElapsed: number | null = null;
    if (item.submissionDate) {
      const d = new Date(item.submissionDate);
      if (!isNaN(d.getTime())) {
        daysElapsed = Math.floor((todayDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    const isMatured = !isClosed && (isEtbUnpaid || isUsdUnpaid) && daysElapsed !== null && daysElapsed > 56;
    const isWithinMaturity = !isClosed && (isEtbUnpaid || isUsdUnpaid) && (!isMatured);

    if (isFullyPaid || isClosed) {
      paidIpcCount++;
      totalPaidEtbSum += etbAmt;
      totalPaidUsdSum += usdAmt;
    } else {
      unpaidIpcCount++;
      if (isEtbUnpaid) totalUnpaidEtbSum += etbAmt; else totalPaidEtbSum += etbAmt;
      if (isUsdUnpaid) totalUnpaidUsdSum += usdAmt; else totalPaidUsdSum += usdAmt;

      if (isMatured && !isClosed) {
        maturedIpcCount++;
        if (isEtbUnpaid) maturedUnpaidEtbSum += etbAmt;
        if (isUsdUnpaid) maturedUnpaidUsdSum += usdAmt;
      } else if (isWithinMaturity && !isClosed) {
        withinMaturityIpcCount++;
        if (isEtbUnpaid) withinMaturityUnpaidEtbSum += etbAmt;
        if (isUsdUnpaid) withinMaturityUnpaidUsdSum += usdAmt;
      }
    }

    return {
      ...item,
      etbAmt,
      usdAmt,
      combinedEtb,
      isEtbUnpaid,
      isUsdUnpaid,
      isFullyPaid,
      daysElapsed,
      isMatured,
      isWithinMaturity
    };
  });

  const totalCertifiedCombined = totalCertifiedEtbSum + (totalCertifiedUsdSum * rateIpc);
  const totalPaidCombined = totalPaidEtbSum + (totalPaidUsdSum * rateIpc);
  const totalUnpaidCombined = totalUnpaidEtbSum + (totalUnpaidUsdSum * rateIpc);
  const maturedUnpaidCombined = maturedUnpaidEtbSum + (maturedUnpaidUsdSum * rateIpc);
  const withinMaturityUnpaidCombined = withinMaturityUnpaidEtbSum + (withinMaturityUnpaidUsdSum * rateIpc);

  const rowClearMetric = (project.rowMetrics || []).find(m => m.name === 'ROW Obstruction free Section')?.value || 0;
  const rowRequestedMetric = (project.rowMetrics || []).find(m => m.name === 'ROW Request By Contractor')?.value || 0;
  // Official comparison for any ROW evaluation is between ROW Request By Contractor and ROW Obstruction free Section
  const rowEvaluationDenominator = rowRequestedMetric > 0 ? rowRequestedMetric : project.lengthKm;
  const rowImpediment = Math.max(0, rowEvaluationDenominator - rowClearMetric);

  // Compile active warning alerts list
  const healthAlerts: { type: 'critical' | 'warning' | 'info'; title: string; desc: string; field: string }[] = [];

  if (CPI < 0.9) {
    healthAlerts.push({
      type: 'critical',
      field: 'CPI Index',
      title: 'Cost Control Overrun (CPI Alert Limit Exceeded)',
      desc: `Cost Performance Index of ${CPI.toFixed(3)} is under the standard 0.9 approval threshold, indicating cumulative certified outlays exceed actual physical output value.`
    });
  }
  if (SV_pct < -10) {
    healthAlerts.push({
      type: 'critical',
      field: 'Schedule Variance %',
      title: 'Critical Path Schedule Variance (SV Alert Limit)',
      desc: `The calculated schedule variance has slipped behind schedule by ${Math.abs(SV_pct).toFixed(2)}% (Limit: 10%), signifying significant physical timeline delay.`
    });
  }
  if (SPI < 0.9) {
    healthAlerts.push({
      type: 'warning',
      field: 'Timeline Velocity Index',
      title: 'Construction Velocity Retardation (SPI Alert)',
      desc: `Timeline Velocity Index of ${SPI.toFixed(3)} is under 0.90, which demands immediate contractor equipment mobilization acceleration.`
    });
  }
  if (plannedPct - project.physicalProgress > 10) {
    healthAlerts.push({
      type: 'warning',
      field: 'Progress Deviation Map',
      title: 'Major Physical S-Curve Lag',
      desc: `Project physical progress of ${project.physicalProgress.toFixed(2)}% is lagging the ${evm.planLabel || 'planned'} milestone of ${plannedPct.toFixed(2)}% by a gap of ${(plannedPct - project.physicalProgress).toFixed(2)}%.`
    });
  }
  if (criticalBonds.length > 0) {
    healthAlerts.push({
      type: 'critical',
      field: 'Bonds Guarantee',
      title: 'Unsecured Contractor Security Escrows (Bond Alert)',
      desc: `There are ${criticalBonds.length} performance or advance mobilization bank guarantees that are expired or expiring within the critical 45-day liability fence.`
    });
  }
  if (rowImpediment > 5) {
    healthAlerts.push({
      type: 'warning',
      field: 'ROW Impediments',
      title: 'Right-Of-Way Property Dispute Redzone',
      desc: `Pending utilities/disputed property length of ${rowImpediment.toFixed(2)} Km is over the 5 Km risk limit, blocking earthworks mobilization.`
    });
  }

  if (totalUnpaidCombined > 0) {
    healthAlerts.push({
      type: 'critical',
      field: 'Unpaid Certified Balances',
      title: 'Overdue Certified IPC Balances (FIDIC Clausal Default)',
      desc: `Total outstanding certified amount remains unpaid: Br. ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUnpaidCombined)}. ${maturedIpcCount > 0 ? `Includes ${maturedIpcCount} matured IPC(s) exceeding the 56-day threshold.` : ''}`
    });
  }




  return (
    <div className="space-y-0">

      {/* Page Header - One Single Row with Title, Status, Export, and Delete */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-1 mb-0 text-[12px]">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
            Project Executive Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
          {/* Status selector / badge */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-[12px]">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Lifecycle Status:
            </span>
            {(() => {
              const isClosed = isProjectClosed(project.status);
              const isMaster = isMasterAdminOnly(currentUserObj);
              const isDirAuth = currentUserObj?.role === 'directorate_admin' && (
                !currentUserObj.assignedDirectorate || 
                (project.programDirectorate || 'Southern') === currentUserObj.assignedDirectorate
              );
              
              // Rule 1: Once changed to closed status, ONLY Master Admin can change it back
              // Rule 2: Active project lifecycle status can ONLY be changed by Directorate Admin (or Master Admin)
              const canManage = isClosed ? isMaster : (isDirAuth || isMaster);

              return canManage ? (
                <select
                  value={project.status || 'In Progress'}
                  onChange={(e) => {
                    const newStatus = e.target.value as ProjectLifecycleStatus;
                    if (onUpdateProjectStatus) {
                      onUpdateProjectStatus(project.id, newStatus);
                    }
                  }}
                  className="bg-transparent text-[12px] font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                  title={isClosed ? "Project is in Archive (Closed). Only Master Admin has privilege to reopen or change its lifecycle." : "Change project lifecycle status (Directorate Admin only)"}
                >
                  <optgroup label="Active Portfolio">
                    <option value="In Progress">🟢 In Progress</option>
                    <option value="Completed">✅ Completed</option>
                    <option value="Suspended">⏸️ Suspended</option>
                    <option value="Terminated">🛑 Terminated</option>
                  </optgroup>
                  <optgroup label="Archive Repository (Closed)">
                    <option value="Completed and Closed">🔒 Completed and Closed (Archive)</option>
                    <option value="Terminated and Closed">🔒 Terminated and Closed (Archive)</option>
                    <option value="Archived">📦 Archived</option>
                  </optgroup>
                </select>
              ) : (
                <span 
                  className="text-[12px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"
                  title={isClosed ? "Project lifecycle is closed. Once changed to closed status, it can only be changed back by Master Admin only." : "Project lifecycle status can only be changed by Directorate Admin."}
                >
                  <span>{project.status || 'In Progress'}</span>
                  {isClosed ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      🔒 Closed (Master Admin only)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Directorate Admin only
                    </span>
                  )}
                </span>
              );
            })()}
          </div>



          {/* Delete project option for CPM Admins and Master Admins only */}
          {(() => {
            const isAuthorizedAdmin = currentUserObj && (
              currentUserObj.role === 'admin' || 
              currentUserObj.role === 'master_admin' || 
              currentUserObj.role === 'cpm_admin' || 
              currentUserObj.username === 'proj_1781786415663' ||
              (currentUserObj.username && currentUserObj.username.toLowerCase().includes('ersido'))
            );
            const canDelete = Boolean(isAuthorizedAdmin && onDeleteProject);

            return canDelete && (
              <button
                onClick={() => {
                  if (onDeleteProject) onDeleteProject(project.id);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl text-[12px] font-bold transition cursor-pointer"
                title="Permanently Delete Project (CPM Admins & Master Admin only)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete Project</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Printable / Capturable Visual Dashboard Content */}
      <div id="dashboard-view-content" className="space-y-0">

      {/* Unified Compact Cascade Alerts View (Single Row Layout) */}
      {(() => {
        const dlpInfo = getProjectDlpInfo(project, currentTick);
        const evmMetrics = calculateProjectEvm(project);
        const startDateObj = new Date(project.startDate);
        const totalDurationDays = project.origDays + (project.eotDays || 0) + (project.interimEotDays || 0);
        const estimatedCompletionDate = new Date(startDateObj.getTime() + totalDurationDays * 86400000);
        const daysToCompletion = Math.ceil((estimatedCompletionDate.getTime() - currentTick.getTime()) / (1000 * 60 * 60 * 24));
        
        const isCompletedLifecycle = project.status === 'Completed' || project.status === 'Completed and Closed' || isClosed;
        const isNearingCompletionAlert = !isCompletedLifecycle && daysToCompletion <= 60 && daysToCompletion >= -180;
        const physicalSlippageVal = evmMetrics.plannedPct - evmMetrics.actualPct;
        const hasSignificantPhysicalSlippage = !isCompletedLifecycle && physicalSlippageVal > 15;

        // Show DLP Alert Card ONLY when project lifecycle is Completed or Completed and Closed
        const showDlpAlert = isCompletedLifecycle;

        const totalActiveAlerts = (hasCriticalBonds ? 1 : 0) + (isNearingCompletionAlert ? 1 : 0) + (hasSignificantPhysicalSlippage ? 1 : 0) + (showDlpAlert ? 1 : 0);
        if (totalActiveAlerts === 0) return null;

        const pad = (n: number) => String(n).padStart(2, '0');
        const defectsCount = (project.dlpDefects || []).length;

        return (
          <div className="mb-2.5">
            <div className={`grid grid-cols-1 ${
              totalActiveAlerts >= 3 ? 'md:grid-cols-3' : totalActiveAlerts === 2 ? 'md:grid-cols-2' : 'grid-cols-1'
            } gap-2 items-stretch`}>
              
              {/* Alert Card: Defect Liability Period (DLP) Countdown */}
              {showDlpAlert && (
                <div 
                  onClick={() => setIsDlpDefectModalOpen(true)}
                  className={`border-l-3 rounded-lg p-2 shadow-2xs flex flex-col justify-between cursor-pointer transition hover:scale-[1.01] hover:shadow-md ${
                    dlpInfo.isExpired
                      ? 'bg-gradient-to-r from-slate-50 to-blue-50/70 dark:from-slate-900/60 dark:to-blue-950/40 border-blue-500'
                      : dlpInfo.isNearExpiry
                        ? 'bg-gradient-to-r from-amber-50 to-rose-50/80 dark:from-amber-950/40 dark:to-rose-950/30 border-amber-500'
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50/80 dark:from-emerald-950/40 dark:to-teal-950/30 border-emerald-500'
                  }`}
                  title="Click to view full DLP details, real-time countdown clock, and report/flag defects"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${
                        dlpInfo.isExpired ? 'text-blue-600 dark:text-blue-400' : dlpInfo.isNearExpiry ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`} />
                      <span className={`text-[10px] font-black uppercase truncate ${
                        dlpInfo.isExpired ? 'text-blue-950 dark:text-blue-200' : dlpInfo.isNearExpiry ? 'text-amber-950 dark:text-amber-200' : 'text-emerald-950 dark:text-emerald-200'
                      }`}>
                        Defect Liability Period (DLP)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {defectsCount > 0 && (
                        <span className="text-[7.5px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-1 py-0.2 rounded border border-rose-200 dark:border-rose-900">
                          {defectsCount} Defect{defectsCount > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${
                        dlpInfo.isExpired
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200'
                          : dlpInfo.isNearExpiry
                            ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200'
                      }`}>
                        {dlpInfo.statusLabel}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] font-extrabold text-slate-850 dark:text-slate-100 leading-tight mb-1">
                    {dlpInfo.isExpired ? (
                      `DLP Ended (${dlpInfo.dlpDays} days passed). Eligible for Final Acceptance Certificate (FAC).`
                    ) : (
                      <span>
                        Countdown: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{dlpInfo.daysRemaining}d {pad(dlpInfo.hoursRemaining)}h {pad(dlpInfo.minutesRemaining)}m {pad(dlpInfo.secondsRemaining)}s</strong> (Ends: {dlpInfo.endDateStr})
                      </span>
                    )}
                  </p>

                  <div className="space-y-1 mt-auto pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-[8.5px]">
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-mono">
                      <span>DLP Duration: {dlpInfo.dlpDays} Days</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold underline">
                        Click for Details & Defect Log →
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          dlpInfo.isExpired ? 'bg-blue-500' : dlpInfo.isNearExpiry ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${dlpInfo.elapsedPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Alert Card 1: Bank Guarantees */}
              {hasCriticalBonds && (
                <div className="bg-gradient-to-r from-rose-50 to-amber-50/80 dark:from-rose-950/30 dark:to-amber-950/30 border-l-3 border-rose-500 rounded-lg p-2 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
                      <span className="text-[10px] font-black uppercase text-rose-900 dark:text-rose-300 truncate">
                        Bank Guarantees Warning
                      </span>
                    </div>
                    <span className="text-[8px] font-black uppercase bg-rose-200/80 dark:bg-rose-900 text-rose-900 dark:text-rose-200 px-1.5 py-0.2 rounded shrink-0">
                      URGENT ({criticalBonds.length})
                    </span>
                  </div>
                  <p className="text-[9.5px] text-rose-700 dark:text-rose-300 leading-tight mb-1">
                    {criticalBonds.length} guarantee(s) expired or expiring &lt; 45 days. Action required!
                  </p>
                  <div className="flex flex-wrap gap-1 mt-auto pt-0.5 border-t border-rose-200/50 dark:border-rose-900/40 text-[9px]">
                    {criticalBonds.slice(0, 2).map((b, bIdx) => (
                      <span key={bIdx} className="bg-white/90 dark:bg-slate-900/80 px-1 py-0.1 rounded text-[8.5px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-full">
                        {b.type}: ETB {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(b.amount)}
                      </span>
                    ))}
                    {criticalBonds.length > 2 && (
                      <span className="text-[8.5px] font-extrabold text-rose-600 dark:text-rose-400 self-center">
                        +{criticalBonds.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Alert Card 2: Timeline / Milestone */}
              {isNearingCompletionAlert && (
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-900/30 border-l-3 border-amber-500 rounded-lg p-2 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-300 truncate">
                        Milestone / Timeline Warning
                      </span>
                    </div>
                    <span className="text-[8px] font-black uppercase bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded shrink-0">
                      SCHEDULE
                    </span>
                  </div>
                  <p className="text-[10.5px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                    {daysToCompletion <= 0 ? `Overdue by ${Math.abs(daysToCompletion)} days!` : `Completion in ${daysToCompletion} days`}
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-auto pt-0.5 border-t border-amber-200/50 dark:border-amber-900/40">
                    Scheduled End Date: <strong className="text-slate-700 dark:text-slate-200">{estimatedCompletionDate.toLocaleDateString()}</strong>
                  </p>
                </div>
              )}

              {/* Alert Card 3: Critical Slippage */}
              {hasSignificantPhysicalSlippage && (
                <div className="bg-gradient-to-r from-orange-50 to-rose-50 dark:from-orange-950/30 dark:to-rose-950/30 border-l-3 border-orange-500 rounded-lg p-2 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <TrendingDown className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                      <span className="text-[10px] font-black uppercase text-orange-900 dark:text-orange-300 truncate">
                        Critical Physical Slippage &gt; 15%
                      </span>
                    </div>
                    <span className="text-[8.5px] font-black text-rose-600 dark:text-rose-400 shrink-0">
                      -{physicalSlippageVal.toFixed(1)}% Gap
                    </span>
                  </div>
                  <p className="text-[10px] font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                    Lagging by {physicalSlippageVal.toFixed(1)}% vs {evmMetrics.planLabel || 'Plan'}
                  </p>
                  <div className="flex items-center justify-between text-[9px] text-slate-600 dark:text-slate-300 mt-auto pt-0.5 border-t border-orange-200/50 dark:border-orange-900/40">
                    <span>Actual: <strong className="font-bold text-slate-900 dark:text-white">{project.physicalProgress.toFixed(1)}%</strong></span>
                    <span>Plan: <strong className="font-bold text-orange-600 dark:text-orange-400">{evmMetrics.plannedPct.toFixed(1)}%</strong></span>
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* Defect Liability Period (DLP) Automated Countdown Timer Component - ONLY rendered when project lifecycle is Completed or Completed and Closed */}
      {(project.status === 'Completed' || project.status === 'Completed and Closed' || isClosed) && (() => {
        const dlpInfo = getProjectDlpInfo(project, currentTick);
        const pad = (n: number) => String(n).padStart(2, '0');
        const defectsList = project.dlpDefects || [];
        const openDefects = defectsList.filter(d => d.status === 'Open' || d.status === 'Under Rectification').length;

        return (
          <div className="mb-3">
            <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs transition-all ${
              dlpInfo.isExpired
                ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border-blue-500/40 text-white'
                : dlpInfo.isNearExpiry
                  ? 'bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 border-amber-500/50 text-white'
                  : 'bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/40 text-white'
            }`}>
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    dlpInfo.isExpired 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                      : dlpInfo.isNearExpiry 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' 
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    <Timer className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                        Defect Liability Period (DLP) Countdown Timer
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                        dlpInfo.isExpired
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : dlpInfo.isNearExpiry
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          dlpInfo.isExpired ? 'bg-blue-400' : dlpInfo.isNearExpiry ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                        }`} />
                        {dlpInfo.isCountingDown ? (dlpInfo.isExpired ? 'DLP Concluded' : dlpInfo.isNearExpiry ? 'Expiring in < 30 Days' : 'Live Countdown Ticking') : 'Standby / Configured'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 font-medium mt-0.5 truncate">
                      Start Date: <strong className="text-white font-mono">{dlpInfo.startDateStr}</strong> • Expiry Target: <strong className="text-white font-mono">{dlpInfo.endDateStr}</strong> • Duration: <strong className="text-white font-mono">{dlpInfo.dlpDays} Days</strong>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => setIsDlpDefectModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Report / View Defects ({defectsList.length})</span>
                  </button>
                </div>
              </div>

              {/* Ticker Grid - Clicking anywhere on ticker opens modal */}
              <div 
                onClick={() => setIsDlpDefectModalOpen(true)}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 my-3 cursor-pointer group"
                title="Click to view full DLP details, countdown status, and log defects"
              >
                {/* Days */}
                <div className="bg-black/40 group-hover:bg-black/60 p-2.5 sm:p-3 rounded-xl border border-white/10 flex flex-col items-center justify-center transition">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white group-hover:scale-105 transition">
                    {dlpInfo.daysRemaining}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                    Days Remaining
                  </span>
                </div>

                {/* Hours */}
                <div className="bg-black/40 group-hover:bg-black/60 p-2.5 sm:p-3 rounded-xl border border-white/10 flex flex-col items-center justify-center transition">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white group-hover:scale-105 transition">
                    {pad(dlpInfo.hoursRemaining)}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                    Hours Remaining
                  </span>
                </div>

                {/* Minutes */}
                <div className="bg-black/40 group-hover:bg-black/60 p-2.5 sm:p-3 rounded-xl border border-white/10 flex flex-col items-center justify-center transition">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white group-hover:scale-105 transition">
                    {pad(dlpInfo.minutesRemaining)}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                    Minutes Remaining
                  </span>
                </div>

                {/* Seconds */}
                <div className="bg-black/40 group-hover:bg-black/60 p-2.5 sm:p-3 rounded-xl border border-white/10 flex flex-col items-center justify-center transition">
                  <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight group-hover:scale-105 transition ${
                    dlpInfo.isExpired ? 'text-blue-400' : dlpInfo.isNearExpiry ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {pad(dlpInfo.secondsRemaining)}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                    Seconds (Live)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-300">
                    Elapsed: <strong className="text-white font-bold">{dlpInfo.daysElapsed} Days</strong> ({dlpInfo.elapsedPct.toFixed(1)}%)
                  </span>
                  <span className="text-slate-300">
                    Defects Logged: <strong className={openDefects > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{defectsList.length} ({openDefects} Open)</strong>
                  </span>
                </div>
                <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      dlpInfo.isExpired 
                        ? 'bg-blue-500' 
                        : dlpInfo.isNearExpiry 
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    }`}
                    style={{ width: `${dlpInfo.elapsedPct}%` }}
                  />
                </div>
              </div>

              {/* Banner text & trigger */}
              <div 
                onClick={() => setIsDlpDefectModalOpen(true)}
                className={`mt-2.5 p-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition ${
                  dlpInfo.isExpired
                    ? 'bg-blue-950/60 border-blue-500/40 text-blue-200 hover:bg-blue-900/60'
                    : dlpInfo.isNearExpiry
                      ? 'bg-amber-950/60 border-amber-500/40 text-amber-200 hover:bg-amber-900/60'
                      : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/60'
                }`}
              >
                <div className="flex items-center gap-2 text-[10.5px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{dlpInfo.alertMessage}</span>
                </div>
                <span className="text-[9.5px] font-extrabold underline text-white hover:text-emerald-300 shrink-0 font-mono">
                  Open DLP Countdown & Defect Modal →
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Three prominent Master Gauges */}
      <section className="grid grid-cols-3 gap-3 sm:gap-5 max-w-5xl mx-auto w-full my-3 sm:my-4">
        {/* Physical progress gauge */}
        <div className="relative group w-full">
          <CircularGauge 
            value={project.physicalProgress} 
            label="Project Progress" 
            kpiCode="G1"
            kpiScore={getKpiGoalScore('G1')}
            onKpiClick={() => onSwitchTab && onSwitchTab('seriesEditor')}
            variant="master"
          />
          {/* Inline Editor (Disabled when project is closed) */}
          {!isClosed && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 flex flex-col items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-2xl shadow-xl transition-all duration-200 z-20 gap-1 text-[10px] min-w-[180px]">
              <div className="flex items-center justify-center gap-1.5 w-full">
                <input 
                  type="number"
                  step="0.01"
                  min={lastActualInfo.lastValue !== null ? lastActualInfo.lastValue : 0}
                  max={100}
                  value={physicalInput}
                  onChange={(e) => {
                    setPhysicalInput(e.target.value);
                    if (progressError) setProgressError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyPhysical();
                  }}
                  className="w-16 border rounded-lg text-center px-1.5 py-0.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-[12px]"
                  placeholder="0.00"
                />
                <span className="font-bold text-slate-400 text-[12px]">%</span>
                <button 
                  onClick={handleApplyPhysical}
                  className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 text-white font-bold px-2.5 py-0.5 rounded-lg transition shadow-xs cursor-pointer active:scale-95 text-[12px]"
                >
                  Set
                </button>
              </div>
              <div className="flex items-center justify-between w-full px-1 text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Month: <strong className="text-slate-700 dark:text-slate-200">{currentMonthKey}</strong></span>
                {lastActualInfo.lastValue !== null && (
                  <span>Min: <strong className="text-slate-700 dark:text-slate-200">{lastActualInfo.lastValue.toFixed(2)}%</strong></span>
                )}
              </div>
              {progressError && (
                <div className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold text-center leading-tight bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-1 rounded-md mt-0.5 max-w-[220px]">
                  {progressError}
                </div>
              )}
              {progressSuccess && (
                <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold text-center leading-tight bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-1 rounded-md mt-0.5 max-w-[220px]">
                  {progressSuccess}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Elapsed Time gauge */}
        <CircularGauge 
          value={elapsed} 
          label="Elapsed Time" 
          isElapsed
          kpiCode="G4"
          kpiScore={getKpiGoalScore('G4')}
          onKpiClick={() => onSwitchTab && onSwitchTab('progressPlanEditor')}
          variant="master"
        />

        {/* Progress vs Elapsed Gauge */}
        <CircularGauge 
          value={ratio} 
          label="Progress Vs Elapsed Time" 
          kpiCode="G2"
          kpiScore={getKpiGoalScore('G2')}
          onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          variant="master"
        />
      </section>

      {/* SECTION A: EXECUTIVE PERFORMANCE INDICATORS (CPI & SPI CONTROL ENGINE) */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 text-white p-2.5 sm:p-3 rounded-lg shadow-sm border border-slate-800 text-[12px]">
        {/* CPI & SPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* 1. CPI Card */}
          <div className={`p-2.5 sm:p-3 rounded-lg border flex flex-col justify-between transition-all ${
            CPI >= 1.0 
              ? 'bg-emerald-950/40 border-emerald-500/40 shadow-emerald-950/20' 
              : CPI >= 0.90 
                ? 'bg-amber-950/40 border-amber-500/40' 
                : 'bg-rose-950/40 border-rose-500/50 shadow-rose-950/30'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">CPI (Cost Performance Index)</span>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                CPI >= 1.0 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : CPI >= 0.90 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              }`}>
                {CPI >= 1.0 ? 'Under Budget' : CPI >= 0.90 ? 'Borderline' : 'Over Budget Risk'}
              </span>
            </div>

            <div className="my-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">{CPI.toFixed(3)}</span>
              <div className="flex items-center text-[11px] font-bold">
                {CPI >= 1.0 ? (
                  <span className="text-emerald-400 flex items-center"><TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Efficient</span>
                ) : (
                  <span className="text-rose-400 flex items-center"><TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {((1 - CPI) * 100).toFixed(2)}% Deficit</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. SPI Card */}
          <div className={`p-2.5 sm:p-3 rounded-lg border flex flex-col justify-between transition-all ${
            SPI >= 1.0 
              ? 'bg-emerald-950/40 border-emerald-500/40 shadow-emerald-950/20' 
              : SPI >= 0.90 
                ? 'bg-amber-950/40 border-amber-500/40' 
                : 'bg-rose-950/40 border-rose-500/50 shadow-rose-950/30'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">SPI (Schedule Performance Index)</span>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                SPI >= 1.0 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : SPI >= 0.90 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              }`}>
                {SPI >= 1.0 ? 'Ahead of Schedule' : SPI >= 0.90 ? 'Minor Time Lag' : 'Critical Delay'}
              </span>
            </div>

            <div className="my-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">{SPI.toFixed(3)}</span>
              <div className="flex items-center text-[11px] font-bold">
                {SPI >= 1.0 ? (
                  <span className="text-emerald-400 flex items-center"><TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Ahead</span>
                ) : (
                  <span className="text-rose-400 flex items-center"><TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {Math.abs(SV_pct).toFixed(2)}% Lag</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B: CONTRACTUAL PAYMENT MATURITY & UNPAID CLAIMS SUMMARY */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 rounded-lg shadow-2xs">
        {/* Maturity Summary Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
          {/* 1. Matured Overdue Unpaid Claims (> 56 Days) - CRITICAL CARD */}
          <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
            maturedIpcCount > 0 
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60 shadow-2xs' 
              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/60'
          }`}>
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10.5px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  Matured Overdue Payments
                </span>
                <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                  maturedIpcCount > 0 
                    ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse' 
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {maturedIpcCount > 0 ? `${maturedIpcCount} IPC Overdue` : 'Zero Overdue'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5"></span>

              <div className="mt-1">
                <span className="text-base sm:text-lg font-black font-mono text-rose-700 dark:text-rose-400 block">
                  {formatAccounting(maturedUnpaidCombined, 'Br.')}
                </span>
                <div className="flex gap-2 text-[10px] font-mono font-semibold text-rose-600/90 dark:text-rose-300/80 mt-0.5">
                  <span>ETB: {formatAccounting(maturedUnpaidEtbSum, '')}</span>
                  {maturedUnpaidUsdSum > 0 ? (
                    <span>• USD: ${maturedUnpaidUsdSum.toLocaleString()}</span>
                  ) : (
                    <span>• 100% ETB Only</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-1.5 pt-0.5 border-t border-rose-200/60 dark:border-rose-900/40 text-[9px] text-rose-700 dark:text-rose-400 font-medium">
            </div>
          </div>

          {/* 2. Unpaid Claims Within Maturity Window (<= 56 Days) */}
          <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10.5px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Within Maturity Window
                </span>
                <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {withinMaturityIpcCount} IPC Pending
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5"></span>

              <div className="mt-1">
                <span className="text-base sm:text-lg font-black font-mono text-amber-700 dark:text-amber-300 block">
                  {formatAccounting(withinMaturityUnpaidCombined, 'Br.')}
                </span>
                <div className="flex gap-2 text-[10px] font-mono font-semibold text-amber-600/90 dark:text-amber-300/80 mt-0.5">
                  <span>ETB: {formatAccounting(withinMaturityUnpaidEtbSum, '')}</span>
                  {withinMaturityUnpaidUsdSum > 0 ? (
                    <span>• USD: ${withinMaturityUnpaidUsdSum.toLocaleString()}</span>
                  ) : (
                    <span>• 100% ETB Only</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-1.5 pt-0.5 border-t border-amber-200/60 dark:border-amber-900/40 text-[9px] text-amber-700 dark:text-amber-400 font-medium">
            </div>
          </div>

          {/* 3. Total Unpaid Certified Balance */}
          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                  Total Outstanding Balance
                </span>
                <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  {unpaidIpcCount} / {totalIpcCount} Unpaid
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5"></span>

              <div className="mt-1">
                <span className="text-base sm:text-lg font-black font-mono text-slate-800 dark:text-white block">
                  {formatAccounting(totalUnpaidCombined, 'Br.')}
                </span>
                <div className="flex gap-2 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                  <span>ETB: {formatAccounting(totalUnpaidEtbSum, '')}</span>
                  {totalUnpaidUsdSum > 0 ? (
                    <span>• USD: ${totalUnpaidUsdSum.toLocaleString()}</span>
                  ) : (
                    <span>• 100% ETB Only</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-1.5 pt-0.5 border-t border-slate-200 dark:border-slate-800 text-[9.5px] text-slate-500 dark:text-slate-400 font-medium">
              Representing {totalCertifiedCombined > 0 ? ((totalUnpaidCombined / totalCertifiedCombined) * 100).toFixed(2) : '0.00'}% of certified claims.
            </div>
          </div>

          {/* 4. Total Paid Certified Claims */}
          <div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Paid Certified Claims
                </span>
                <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {paidIpcCount} IPC Paid
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5"></span>

              <div className="mt-1">
                <span className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 block">
                  {formatAccounting(totalPaidCombined, 'Br.')}
                </span>
                <div className="flex gap-2 text-[10px] font-mono font-semibold text-emerald-600/90 dark:text-emerald-300/80 mt-0.5">
                  <span>ETB: {formatAccounting(totalPaidEtbSum, '')}</span>
                  <span>• USD: ${totalPaidUsdSum.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-1.5 pt-0.5 border-t border-emerald-200/60 dark:border-emerald-900/40 text-[9.5px] text-emerald-700 dark:text-emerald-400 font-medium">
              Settled {totalCertifiedCombined > 0 ? ((totalPaidCombined / totalCertifiedCombined) * 100).toFixed(2) : '0.00'}% of certified claims.
            </div>
          </div>
        </div>
      </section>

      {/* Linked Linear Progress Charts Card (Interconnected with Segment Mapping) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-2.5 sm:p-3 rounded-lg shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100">
              Linear Progress
            </h3>
          </div>

          {/* Chart View Mode Selector */}
          {hasSpurRoad ? (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setDashboardRoadType('combined')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  activeRoadType === 'combined'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Combined (Main + Spur)
              </button>
              <button
                type="button"
                onClick={() => setDashboardRoadType('main')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  activeRoadType === 'main'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Main Road Only
              </button>
              <button
                type="button"
                onClick={() => setDashboardRoadType('spur')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  activeRoadType === 'spur'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Spur Road Only
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              Main Road
            </div>
          )}
        </div>

        {/* Linear Layer Progress Bars */}
        <div className="space-y-1.5">
          {dashboardProgressChartData.map((item) => (
            <div key={item.id} className="space-y-0.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300 flex-wrap gap-1">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                  {item.name}
                  {activeRoadType === 'combined' ? (
                    <span className="text-[10px] font-normal text-slate-400 font-mono ml-1">
                      (Main: {item.mainKm} Km | Spur: {item.spurKm} Km)
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-slate-400 font-mono ml-1">
                      ({activeRoadType === 'main' ? item.mainSegments : item.spurSegments} segments)
                    </span>
                  )}
                </span>
                <span className="font-mono">
                  {item.displayExec.toFixed(2)} / {item.displayTarget.toFixed(2)} Km ({item.fillPct.toFixed(2)}%)
                </span>
              </div>

              {/* Progress track */}
              <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-900 rounded-md overflow-hidden border border-slate-200/30 dark:border-slate-700 relative flex">
                {activeRoadType === 'combined' ? (
                  <>
                    {/* Main road portion */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (item.mainKm / item.displayTarget) * 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full ${item.color} transition-all duration-300 opacity-90`}
                      title={`Main Road: ${item.mainKm} Km`}
                    />
                    {/* Spur road portion */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100 - (item.mainKm / item.displayTarget) * 100, (item.spurKm / item.displayTarget) * 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                      className="h-full bg-emerald-500 transition-all duration-300 border-l border-white/20"
                      title={`Spur Road: ${item.spurKm} Km`}
                    />
                  </>
                ) : (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.fillPct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full ${item.color} transition-all duration-300`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-0">
        
        {/* ROW Clearance chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3 sm:p-3.5 rounded-xl shadow-xs space-y-2 min-w-0">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-150">Right-of-Way (ROW) status</span>
              {rowBadgeSummary && (
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-700/30 truncate max-w-[200px]" title={rowBadgeSummary}>
                  {rowBadgeSummary}
                </span>
              )}
            </div>
            <div className="relative">
              <select
                value={activeRowMetric}
                onChange={(e) => setSelectedRowMetric(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold py-1 px-3 border border-slate-250 dark:border-slate-705 pr-8 rounded-lg appearance-none cursor-pointer text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableRowMetrics.map((m, idx) => (
                  <option key={idx} value={m.name}>
                    {m.name} ({Number(m.value || 0).toFixed(2)} {m.unit})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="h-48 sm:h-52 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rowChartData} layout="vertical" margin={{ top: 10, right: 35, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" hide={true} />
                <Tooltip 
                  formatter={(v: any, name: any) => [
                    v !== null && v !== undefined && !isNaN(Number(v)) ? Number(v).toFixed(2) : '0.00', 
                    name
                  ]} 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} 
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                {isNumericCompare ? (
                  <>
                    {rowLegendSeries[0] && (
                      <Bar dataKey={rowLegendSeries[0].key} name={rowLegendSeries[0].name} fill={rowLegendSeries[0].fill} radius={[0, 6, 6, 0]} isAnimationActive={false}>
                        <LabelList dataKey={rowLegendSeries[0].key} position="right" formatter={(v: any) => v !== null && v !== undefined && Number(v) > 0 ? Number(v).toFixed(0) : ''} style={{ fontSize: '8.5px', fill: '#ef4444', fontWeight: 'bold' }} />
                      </Bar>
                    )}
                    {rowLegendSeries[1] && (
                      <Bar dataKey={rowLegendSeries[1].key} name={rowLegendSeries[1].name} fill={rowLegendSeries[1].fill} radius={[0, 6, 6, 0]} isAnimationActive={false}>
                        <LabelList dataKey={rowLegendSeries[1].key} position="right" formatter={(v: any) => v !== null && v !== undefined && Number(v) > 0 ? Number(v).toFixed(0) : ''} style={{ fontSize: '8.5px', fill: '#10b981', fontWeight: 'bold' }} />
                      </Bar>
                    )}
                    {rowLegendSeries[2] && (
                      <Bar dataKey={rowLegendSeries[2].key} name={rowLegendSeries[2].name} fill={rowLegendSeries[2].fill} radius={[0, 6, 6, 0]} isAnimationActive={false}>
                        <LabelList dataKey={rowLegendSeries[2].key} position="right" formatter={(v: any) => v !== null && v !== undefined && Number(v) > 0 ? Number(v).toFixed(0) : ''} style={{ fontSize: '8.5px', fill: '#f59e0b', fontWeight: 'bold' }} />
                      </Bar>
                    )}
                  </>
                ) : (
                  <>
                    {rowLegendSeries[0] && (
                      <Bar dataKey={rowLegendSeries[0].key} name={rowLegendSeries[0].name} stackId="a" fill={rowLegendSeries[0].fill} radius={rowLegendSeries.length > 1 ? [6, 0, 0, 6] : [6, 6, 6, 6]} isAnimationActive={false}>
                        <LabelList dataKey={rowLegendSeries[0].key} position="center" formatter={(v: any) => v !== null && v !== undefined && Number(v) > 0 ? `${Number(v).toFixed(2)} ${rowMetricObj?.unit || 'Km'}` : ''} style={{ fontSize: '8.5px', fill: '#ffffff', fontWeight: 'bold' }} />
                      </Bar>
                    )}
                    {rowLegendSeries[1] && (
                      <Bar dataKey={rowLegendSeries[1].key} name={rowLegendSeries[1].name} stackId="a" fill={rowLegendSeries[1].fill} radius={[0, 6, 6, 0]} isAnimationActive={false}>
                        <LabelList dataKey={rowLegendSeries[1].key} position="center" formatter={(v: any) => v !== null && v !== undefined && Number(v) > 0 ? `${Number(v).toFixed(2)} ${rowMetricObj?.unit || 'Km'}` : ''} style={{ fontSize: '8.5px', fill: '#ffffff', fontWeight: 'bold' }} />
                      </Bar>
                    )}
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quantities design vs actual */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3 sm:p-3.5 rounded-xl shadow-xs space-y-2 min-w-0">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-150">Quantities: Plan vs Completed</span>
              {qtyBadgeSummary && (
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-700/30 truncate max-w-[220px]" title={qtyBadgeSummary}>
                  {qtyBadgeSummary}
                </span>
              )}
            </div>
            <div className="relative">
              <select
                value={activeQtyItem}
                onChange={(e) => setSelectedQtyItem(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold py-1 px-3 border border-slate-250 dark:border-slate-705 pr-8 rounded-lg appearance-none cursor-pointer text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableQuantities.map((q, idx) => (
                  <option key={idx} value={q.name}>{q.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="h-48 sm:h-52 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qtyChartData} margin={{ top: 15, right: 15, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100/50 dark:stroke-slate-700/30" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" width={55} tick={{ fontSize: 9 }} />
                <Tooltip 
                  formatter={(v, name, item) => [
                    `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${item?.payload?.unit || ''}`, 
                    name
                  ]} 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} 
                />
                <Bar dataKey="Value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {qtyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList 
                    dataKey="Value" 
                    position="top" 
                    formatter={(v: any) => v !== null && v !== undefined && Number(v) > 0 ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '0'} 
                    style={{ fontSize: '8.5px', fill: '#64748b', fontWeight: 'bold' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Series Bar Chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3 sm:p-3.5 rounded-xl shadow-xs space-y-2 min-w-0">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-150">Bill Series Progress</span>
            <span className="text-[10px] text-slate-400 font-medium">To-Date Progress %</span>
          </div>

          <div className="h-64 sm:h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={seriesBarData} 
                layout="vertical" 
                margin={{ top: 10, right: 45, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 9 }} tickFormatter={(v) => `${Number(v).toFixed(2)}%`} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 8 }} 
                  width={130}
                />
                <Tooltip 
                  formatter={(v) => [`${parseFloat(v.toString()).toFixed(2)}%`]} 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} 
                />
                <Bar dataKey="Progress %" radius={[0, 4, 4, 0]}>
                  {seriesBarData.map((entry, index) => {
                    const colors = [
                      '#4f46e5', // Indigo
                      '#0ea5e9', // Sky
                      '#10b981', // Emerald
                      '#14b8a6', // Teal
                      '#f59e0b', // Amber
                      '#f97316', // Orange
                      '#ef4444', // Red
                      '#8b5cf6', // Purple
                      '#6366f1', // Slate-Indigo
                      '#ec4899', // Pink
                    ];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                  <LabelList 
                    dataKey="Progress %" 
                    position="right" 
                    dx={4}
                    formatter={(v: any) => `${Number(v).toFixed(2)}%`} 
                    style={{ fontSize: '9px', fill: '#64748b', fontWeight: 'bold' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progress target column chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3 sm:p-3.5 rounded-xl shadow-xs space-y-2 min-w-0">
          <div className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-2">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-150">Progress Comparison</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold">
                  Unit: Km
                </span>
              </div>

              {/* Quick Sync All to Milestone Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">Sync Period:</span>
                <div className="relative min-w-[140px]">
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      setSelectedMonthSource(val);
                      setSelectedQuarterSource(val);
                      setSelectedEfySource(val);
                      setSelectedCumulativeSource(val);
                    }}
                    value={
                      (selectedMonthSource === selectedQuarterSource &&
                       selectedMonthSource === selectedEfySource &&
                       selectedMonthSource === selectedCumulativeSource)
                        ? selectedMonthSource
                        : ''
                    }
                    className="w-full bg-blue-50/80 dark:bg-slate-900 text-[10px] font-bold border border-blue-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 rounded-lg px-2 py-1 pr-6 cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="" disabled>⚡ Sync All Pillars...</option>
                    <option value="current">Current / Live Active</option>
                    {historyList.map((hist, hIdx) => (
                      <option key={`sync-${hist.id || hIdx}-${hIdx}`} value={hist.id}>
                        {hist.monthLabel} (EFY {hist.efyLabel})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-blue-500">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* 1. Month Source Dropdown */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Month</label>
                  <span className="text-[8.5px] font-mono text-slate-400">
                    {selectedMonthSource === 'current' ? 'Live' : (historyList.find(h => h.id === selectedMonthSource)?.monthLabel || 'Archived')}
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={selectedMonthSource}
                    onChange={(e) => setSelectedMonthSource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 cursor-pointer appearance-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="current">Current ({project.progressPlanLabels?.monthLabel || 'Active'})</option>
                    {historyList.map((hist, hIdx) => (
                      <option key={`m-src-${hist.id || hIdx}-${hIdx}`} value={hist.id}>Archived: {hist.monthLabel}</option>
                    ))}
                    <option value="hide">🚫 Hide Month</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              </div>

              {/* 2. Quarter Source Dropdown */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Quarter</label>
                  <span className="text-[8.5px] font-mono text-slate-400">
                    {selectedQuarterSource === 'current' ? 'Live' : (historyList.find(h => h.id === selectedQuarterSource)?.quarterLabel || 'Archived')}
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={selectedQuarterSource}
                    onChange={(e) => setSelectedQuarterSource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 cursor-pointer appearance-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="current">Current ({project.progressPlanLabels?.quarterLabel || 'Active'})</option>
                    {historyList.map((hist, hIdx) => (
                      <option key={`q-src-${hist.id || hIdx}-${hIdx}`} value={hist.id}>Archived: {hist.quarterLabel || `Qtr (${hist.monthLabel})`}</option>
                    ))}
                    <option value="hide">🚫 Hide Quarter</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              </div>

              {/* 3. EFY Source Dropdown */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">EFY</label>
                  <span className="text-[8.5px] font-mono text-slate-400">
                    {selectedEfySource === 'current' ? `EFY ${project.progressPlanLabels?.efyLabel || 'Live'}` : `EFY ${historyList.find(h => h.id === selectedEfySource)?.efyLabel || ''}`}
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={selectedEfySource}
                    onChange={(e) => setSelectedEfySource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 cursor-pointer appearance-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="current">Current (EFY {project.progressPlanLabels?.efyLabel || 'Active'})</option>
                    {historyList.map((hist, hIdx) => (
                      <option key={`efy-src-${hist.id || hIdx}-${hIdx}`} value={hist.id}>Archived EFY: {hist.efyLabel} ({hist.monthLabel})</option>
                    ))}
                    <option value="hide">🚫 Hide EFY</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              </div>

              {/* 4. Cumulative Source Dropdown */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Cumulative</label>
                  <span className="text-[8.5px] font-mono text-slate-400">
                    {selectedCumulativeSource === 'current' ? 'To-Date' : (historyList.find(h => h.id === selectedCumulativeSource)?.monthLabel || 'Archived')}
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={selectedCumulativeSource}
                    onChange={(e) => setSelectedCumulativeSource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 cursor-pointer appearance-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="current">Current Cumulative</option>
                    {historyList.map((hist, hIdx) => (
                      <option key={`cum-src-${hist.id || hIdx}-${hIdx}`} value={hist.id}>Archived Cum: {hist.monthLabel} ({hist.contractorTodate !== undefined ? hist.contractorTodate.toFixed(1) : ''} Km)</option>
                    ))}
                    <option value="hide">🚫 Hide Cumulative</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressPlanChartData} margin={{ top: 18, right: 15, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100/60 dark:stroke-slate-700/30" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis stroke="#94a3b8" width={45} tick={{ fontSize: 9, fill: '#64748b' }} unit=" Km" />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const pData = payload[0]?.payload;
                    const cVal = Number(pData?.Contractor ?? 0);
                    const eVal = Number(pData?.ERA ?? 0);
                    const aVal = Number(pData?.Actual ?? 0);
                    const diffEra = aVal - eVal;
                    const diffContractor = aVal - cVal;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/60 text-xs min-w-[220px] space-y-2">
                        <div className="border-b border-slate-700 pb-1.5">
                          <div className="font-extrabold text-blue-400 text-xs">{pData?.name || label}</div>
                          {pData?.subLabel && <div className="text-[10px] text-slate-400">{pData.subLabel}</div>}
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center text-blue-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                              Contractor Plan:
                            </span>
                            <span className="font-mono font-bold">{cVal.toFixed(2)} Km</span>
                          </div>
                          <div className="flex justify-between items-center text-orange-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                              ERA Milestone:
                            </span>
                            <span className="font-mono font-bold">{eVal.toFixed(2)} Km</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-300 font-extrabold">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                              Actual Completed:
                            </span>
                            <span className="font-mono">{aVal.toFixed(2)} Km</span>
                          </div>
                        </div>
                        {project.lengthKm > 0 && (
                          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                            <span>Actual / Total ({project.lengthKm} Km):</span>
                            <span className="font-bold text-emerald-400 font-mono">
                              {((aVal / project.lengthKm) * 100).toFixed(2)}%
                            </span>
                          </div>
                        )}
                        <div className="pt-1 border-t border-slate-800 flex justify-between text-[10px]">
                          <span className="text-slate-400">Actual vs ERA:</span>
                          <span className={`font-mono font-bold ${diffEra >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {diffEra >= 0 ? `+${diffEra.toFixed(2)}` : diffEra.toFixed(2)} Km
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Contractor" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Contractor" position="top" formatter={(v: any) => v !== null && v !== undefined && Number(v) > 0 ? `${Number(v).toFixed(2)}` : ''} style={{ fontSize: '8px', fill: '#3b82f6', fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="ERA" fill="#f97316" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="ERA" position="top" formatter={(v: any) => v !== null && v !== undefined && Number(v) > 0 ? `${Number(v).toFixed(2)}` : ''} style={{ fontSize: '8px', fill: '#ea580c', fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Actual" position="top" formatter={(v: any) => v !== null && v !== undefined && Number(v) > 0 ? `${Number(v).toFixed(2)}` : ''} style={{ fontSize: '8px', fill: '#059669', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Row for Annual Progress Accomplishment */}
      <div className="grid grid-cols-1 gap-0">
        
        {/* Annual Physical Progress Chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-2.5 sm:p-3 rounded-lg shadow-2xs space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-150 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-emerald-500" />
              Annual Progress Accomplishment (EFY)
            </span>
            <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-600">
              Total Project Length: {totalProjectKmForAnnual} Km
            </span>
          </div>

          <div className="h-48 sm:h-52 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualChartData} margin={{ top: 15, right: 15, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" width={45} tick={{ fontSize: 9 }} unit="%" domain={[0, 'auto']} />
                <Tooltip 
                  formatter={(v: any, name: any, item: any) => {
                    const kmVal = item?.payload?.['Accomplished (Km)'];
                    const pctVal = parseFloat(v);
                    return [`${kmVal} Km (${isNaN(pctVal) ? '0.00' : pctVal.toFixed(2)}%)`, 'Accomplishment'];
                  }} 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                />
                <Bar dataKey="Progress (%)" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {annualChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#3b82f6'} />
                  ))}
                  <LabelList 
                    dataKey="Progress (%)" 
                    content={(props: any) => {
                      const { x, y, width, index, value } = props;
                      const item = props.payload || (index !== undefined ? annualChartData[index] : null);
                      if (!item) return null;
                      
                      const kmVal = item['Accomplished (Km)'];
                      const pctVal = item['Progress (%)'] !== undefined ? item['Progress (%)'] : value;
                      const parsedPct = parseFloat(String(pctVal));
                      const labelStr = `${kmVal !== undefined ? kmVal : '0'} Km (${isNaN(parsedPct) ? '0.00' : parsedPct.toFixed(2)}%)`;
                      
                      return (
                        <text 
                          x={x + width / 2} 
                          y={y - 6} 
                          textAnchor="middle" 
                          className="fill-slate-600 dark:fill-slate-300 font-sans font-extrabold"
                          style={{ fontSize: '8px' }}
                        >
                          {labelStr}
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Expanded Performance Charts & Core Physical S-Curves */}
      <section className="space-y-0 font-sans text-xs">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          Core S-Curve & Financial Disbursement Baselines
        </h3>

        {/* Bill Summary & Price Adjustment Cumulative Graph Chart */}
        <BillSummaryPriceAdjChart 
          ipcTracker={project.ipcTracker || []} 
          usdExchangeRate={project.usdExchangeRate} 
        />

        {/* Payment Road-Profile-Style Chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-2.5 sm:p-3 rounded-lg shadow-2xs space-y-2 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-150 block">Payment Chart</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg self-start sm:self-auto border border-emerald-100 dark:border-emerald-900/30 font-sans">
              Financial Elevation Map
            </span>
          </div>

          <div className="space-y-2 pt-0.5">
            {paymentChartData.map((entry, index) => {
              const bgColors = [
                'bg-blue-600 dark:bg-blue-500',
                'bg-emerald-600 dark:bg-emerald-500',
                'bg-amber-500 dark:bg-amber-500',
                'bg-rose-500 dark:bg-rose-550',
                'bg-indigo-600 dark:bg-indigo-500',
                'bg-cyan-600 dark:bg-cyan-500',
                'bg-teal-600 dark:bg-teal-500'
              ];
              const progressColor = bgColors[index % bgColors.length];
              const paidPercent = entry['Paid (%)'];
              const amountBirr = entry['Amount (Birr)'];

              return (
                <div key={`ipc-legend-${entry.name || 'e'}-${index}`} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-sans">
                      <span className={`w-2.5 h-2.5 rounded-sm ${progressColor}`} />
                      <span className="text-slate-700 dark:text-zinc-250 truncate max-w-xs">{entry.name}</span>
                    </span>
                    <span className="font-mono text-[10px] flex items-center gap-1.5">
                      <span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatAccounting(amountBirr, 'Br.')}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        {((paidPercent !== undefined && paidPercent !== null && !isNaN(Number(paidPercent))) ? Number(paidPercent) : 0).toFixed(2)}%
                      </span>
                    </span>
                  </div>

                  {/* Horizontal Linear progression bar - Road Profile Style */}
                  <div className="w-full h-4 bg-slate-100 dark:bg-slate-900/80 rounded-lg overflow-hidden border border-slate-200/40 dark:border-slate-800 relative shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (paidPercent !== undefined && paidPercent !== null && !isNaN(Number(paidPercent))) ? Number(paidPercent) : 0)}%` }}
                      transition={{ duration: 1 }}
                      className={`h-full ${progressColor} opacity-95 relative rounded-l-md transition-all duration-300`}
                    />

                    {/* Milestone / Ticks Overlay */}
                    <div className="absolute inset-0 flex justify-between px-3 pointer-events-none select-none text-[8px] font-bold text-slate-400 dark:text-slate-500/80 items-center">
                      <span className="mix-blend-difference">0%</span>
                      <span className="mix-blend-difference border-l border-dotted border-slate-300 dark:border-slate-700/40 h-full flex items-center pl-1">25%</span>
                      <span className="mix-blend-difference border-l border-dotted border-slate-300 dark:border-slate-700/40 h-full flex items-center pl-1">50%</span>
                      <span className="mix-blend-difference border-l border-dotted border-slate-300 dark:border-slate-700/40 h-full flex items-center pl-1">75%</span>
                      <span className="mix-blend-difference border-l border-dotted border-slate-300 dark:border-slate-700/40 h-full flex items-center pl-1">100%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* S-Curve Chart (Now beautifully placed as the bottom-most full-width chart option) */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-2.5 sm:p-3 rounded-lg shadow-2xs space-y-2 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-150 block">Cumulative S-Curve Performance</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg self-start sm:self-auto border border-emerald-105 dark:border-emerald-900/30">
              Live S-Curve Map
            </span>
          </div>

          <div className="h-72 sm:h-80 w-full min-w-0">
            {sCurveChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center p-4 space-y-1.5">
                <Activity className="w-7 h-7 text-emerald-500 opacity-60" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Monthly Baseline Curve Points Defined</p>
                <p className="text-[10.5px] text-slate-500 max-w-sm">Monthly physical progress targets will populate here automatically once configured.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sCurveChartData} margin={{ top: 15, right: 25, left: 15, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" width={45} domain={[0, 100]} unit="%" />
                  <Tooltip 
                    formatter={(val: any) => [val !== null && val !== undefined ? `${Number(val).toFixed(2)}%` : 'N/A']}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '12px', 
                      border: 'none', 
                      color: '#fff',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  <Line 
                    name="Original Plan (%)"
                    type="monotone" 
                    dataKey="Original Plan (%)" 
                    stroke="#f59e0b" 
                    strokeDasharray="5 5"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                    activeDot={{ r: 5, fill: '#f59e0b' }}
                  />
                  <Line 
                    name="Revised Plan (%)"
                    type="monotone" 
                    dataKey="Revised Plan (%)" 
                    stroke="#2563eb" 
                    strokeDasharray="3 3"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                    activeDot={{ r: 5, fill: '#2563eb' }}
                  />
                  <Line 
                    name="To-Date Actual (%)"
                    type="monotone" 
                    dataKey="To-Date Actual (%)" 
                    stroke="#10b981" 
                    strokeWidth={3.5} 
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                    activeDot={{ r: 5, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ERA Key Performance Indicators Gauges (Placed directly below Cumulative S-Curve Performance chart) */}
      <section className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-2.5 sm:p-3 rounded-lg shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-500" />
          ERA Key Performance Indicators
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5">
          {/* Cost Gauge */}
          <CircularGauge 
            value={costOverrun} 
            label="Cost Overrun" 
            max={100} 
            isCost 
            kpiCode="G3"
            kpiScore={getKpiGoalScore('G3')}
            onKpiClick={() => onSwitchTab && onSwitchTab('seriesEditor')}
          />

          {/* Time Gauge */}
          <CircularGauge 
            value={timeOverrun} 
            label="Time Overrun" 
            max={100} 
            isCost 
            kpiCode="G4"
            kpiScore={getKpiGoalScore('G4')}
            onKpiClick={() => onSwitchTab && onSwitchTab('workProgram')}
          />

          {/* Quality Gauge */}
          <CircularGauge 
            value={kpiScores.quality} 
            label="Quality Management" 
            kpiCode="G5"
            kpiScore={getKpiGoalScore('G5')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />

          {/* Design Gauge */}
          <CircularGauge 
            value={kpiScores.design} 
            label="Design Management" 
            kpiCode="G6"
            kpiScore={getKpiGoalScore('G6')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />

          {/* Claims Gauge */}
          <CircularGauge 
            value={kpiScores.claims} 
            label="Claim & Dispute" 
            kpiCode="G7"
            kpiScore={getKpiGoalScore('G7')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />

          {/* Risk (G8) Custom Gauge Card */}
          <div 
            onClick={() => onSwitchTab && onSwitchTab('risks')}
            className={`col-span-2 sm:col-span-2 md:col-span-2 flex flex-col justify-between bg-white dark:bg-slate-800 p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-2xs hover:shadow-xs transition-all duration-300 w-full cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 relative overflow-hidden group min-h-[160px] sm:min-h-[185px] ${
              hasHighValueRisk 
                ? 'animate-[pulse_1.8s_infinite] shadow-[0_0_12px_rgba(239,68,68,0.2)] border-rose-300 dark:border-rose-900/50 bg-rose-500/[0.02]' 
                : ''
            }`}
            title="Click to view & manage full Risk Register"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent dark:from-slate-700/10 dark:to-transparent pointer-events-none" />
            
            <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1 mb-0.5">
              <span className="text-[9.5px] sm:text-[10.5px] font-black uppercase text-slate-800 dark:text-slate-100 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Risk Management (G8)</span>
              </span>
              <span className="text-[8.5px] font-extrabold text-rose-600 dark:text-rose-400 uppercase bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/40">
                Top 3 Critical Risks
              </span>
            </div>

            {/* Vertical Layout: Top 3 Critical Risks AT THE TOP of the Gauge */}
            <div className="flex flex-col gap-2 flex-1 w-full justify-between my-0.5">
              {/* 1. TOP SECTION: Top 3 Critical Risks List */}
              <div className="flex flex-col gap-1 text-left w-full">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={topCriticalRisks.map(r => `${r.id}-${r.probability * r.impact}`).join('_')}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="flex flex-col gap-1 w-full"
                  >
                    {topCriticalRisks.length > 0 ? (
                      topCriticalRisks.map((risk, index) => {
                        const score = risk.probability * risk.impact;
                        const isHigh = score >= 15;
                        const isMedium = score >= 9;
                        return (
                          <div 
                            key={risk.id || index}
                            className="flex items-center justify-between gap-1 bg-slate-50/80 dark:bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700/40 w-full transition-all duration-300"
                          >
                            <div className="min-w-0 flex-1 flex items-center gap-1">
                              <span className="text-[8.5px] font-black text-slate-400 shrink-0">#{index + 1}</span>
                              <div className="min-w-0 flex-1 text-[9px] leading-snug truncate">
                                <strong className="text-slate-900 dark:text-slate-100 font-extrabold">{risk.category}:</strong>{' '}
                                <span className="text-slate-600 dark:text-slate-300 font-medium">{risk.description}</span>
                              </div>
                            </div>
                            <span className={`text-[8px] font-black px-1 py-0.1 rounded shrink-0 leading-none ${
                              isHigh 
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-400/30' 
                                : isMedium 
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30'
                            }`}>
                              Score: {score}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[9px] text-slate-400 italic py-1 text-center bg-slate-50 dark:bg-slate-900/40 rounded">
                        No active critical risks registered
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 2. BOTTOM SECTION: Circular Gauge visual (located underneath the top 3 risks) */}
              <div className="flex flex-col items-center justify-center w-full pt-1">
                <motion.div 
                  key={`risk-gauge-${kpiScores.risk}`}
                  initial={{ scale: 0.95, opacity: 0.85 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                  className="w-full max-w-[108px] sm:max-w-[128px] aspect-square relative flex items-center justify-center mx-auto"
                >
                  <CircularGauge 
                    value={kpiScores.risk} 
                    label="" 
                    kpiCode="G8"
                    kpiScore={getKpiGoalScore('G8')}
                    variant="compact"
                  />
                </motion.div>
              </div>
            </div>

            <div className="w-full text-right text-[8px] font-bold text-slate-400 group-hover:text-blue-500 transition-colors pt-0.5 border-t border-slate-100 dark:border-slate-700/40">
              Click to view & manage Risk Register ➔
            </div>
          </div>

          {/* ESOHS Gauge */}
          <CircularGauge 
            value={kpiScores.esohs} 
            label="ESOHS Management" 
            kpiCode="G9"
            kpiScore={getKpiGoalScore('G9')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />

          {/* ROW Gauge */}
          <CircularGauge 
            value={kpiScores.row} 
            label="ROW Management" 
            kpiCode="G10"
            kpiScore={getKpiGoalScore('G10')}
            onKpiClick={() => onSwitchTab && onSwitchTab('rowEditor')}
          />

          {/* Stakeholder Gauge */}
          <CircularGauge 
            value={kpiScores.stake} 
            label="Stakeholder Management" 
            kpiCode="G11"
            kpiScore={getKpiGoalScore('G11')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />

          {/* Contract Gauge */}
          <CircularGauge 
            value={kpiScores.contract} 
            label="Contract Compliance" 
            kpiCode="G12"
            kpiScore={getKpiGoalScore('G12')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />
        </div>
      </section>



      {/* Drag & Drop Upload gallery */}
      <section className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-2.5 sm:p-3 rounded-lg shadow-2xs space-y-1.5">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-1">
          <span className="font-bold text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            <ImageIcon className="w-4 h-4 text-emerald-500 animate-pulse" />
            Field Engineering Image Gallery
          </span>
          <button
            onClick={onClearImages}
            disabled={project.images.length === 0}
            className="flex items-center gap-1 text-2xs bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455 px-2 py-0.5 rounded-lg font-extrabold transition disabled:opacity-50"
          >
            Clear Gallery
          </button>
        </div>

        {/* Drag Drop Input Section */}
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-2.5 sm:p-3 text-center hover:border-blue-500 transition duration-150 relative">
          <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <span className="font-semibold block text-xs">Drag and drop site photos here or click below</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Supports PNG, JPG, WebP formats</span>
          <input 
            type="file" 
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Grid Lists of Images */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-0">
          <AnimatePresence>
            {project.images.map((img, idx) => (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative group aspect-square rounded-lg overflow-hidden border border-slate-150 dark:border-slate-700 shadow-2xs cursor-pointer"
                onClick={() => setSelectedImageIndex(idx)}
              >
                <img 
                  src={img} 
                  alt={`road-site-${idx}`}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  title="Click to view full-screen"
                />
                
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(idx);
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition z-10"
                  title="Remove image"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {project.images.length === 0 && (
          <p className="text-center text-xs text-slate-400 font-medium py-1.5">
            No site photos uploaded. Upload photos to document physical construction developments.
          </p>
        )}
      </section>

      {/* Full-Screen Image Lightbox Modal */}
      <AnimatePresence>
        {selectedImageIndex !== null && project.images[selectedImageIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4 md:p-8"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer z-50"
              title="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation Left */}
            {selectedImageIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(selectedImageIndex - 1);
                }}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer z-50"
                title="Previous Image"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Navigation Right */}
            {selectedImageIndex < project.images.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(selectedImageIndex + 1);
                }}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer z-50"
                title="Next Image"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Image Container with Title / Meta info */}
            <div className="relative flex flex-col items-center max-w-5xl max-h-[85vh] gap-3">
              <motion.img
                key={selectedImageIndex}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                src={project.images[selectedImageIndex]}
                alt={`road-site-full-${selectedImageIndex}`}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl border border-white/10"
              />
              
              <div className="text-center text-white/90">
                <p className="text-xs font-semibold tracking-wider uppercase opacity-60">
                  Field Site Photo {selectedImageIndex + 1} of {project.images.length}
                </p>
                <p className="text-sm font-bold text-slate-300 mt-1">
                  {project.name} · Contract #{project.id}
                </p>
              </div>
            </div>

            {/* Thumbnail Navigation Row */}
            <div className="absolute bottom-6 flex items-center justify-center gap-2 overflow-x-auto max-w-full px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
              {project.images.map((img, idx) => (
                <button
                  key={`thumb-${idx}`}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition ${
                    idx === selectedImageIndex
                      ? 'border-blue-500 scale-105 shadow-md'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedicated DLP Detail & Defect Logging Modal */}
      <DlpDefectModal
        isOpen={isDlpDefectModalOpen}
        onClose={() => setIsDlpDefectModalOpen(false)}
        project={project}
        currentUserObj={currentUserObj}
        onUpdateProject={onProjectUpdate}
        onUpdateProjectStatus={onUpdateProjectStatus}
      />

      </div>
    </div>
  );
}
