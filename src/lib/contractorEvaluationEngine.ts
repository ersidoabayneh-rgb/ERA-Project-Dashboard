import { Project, KpiAllocatedItem, MonthlyResourceRecord } from '../types';
import { ProgressKpiCalculationResult } from './kpiProgressCalculator';
import { EvmMetrics } from './evmCalculations';
import { isRfiRecord, deduplicateSubmittals, isSubmittalApproved, isSubmittalRejected } from './submittalHelpers';

export type PerformanceGrade = 'Excellent' | 'Good' | 'Satisfactory' | 'Marginal' | 'Unsatisfactory';

export interface LinkedCriterionDetail {
  itemId: string;
  desc: string;
  goalId: string;
  goalName: string;
  sscId: string;
  sscName: string;
  type: string;
  unit: string;
  valueDisplay: string;
  scorePct: number;
  itemWt: number;
  sscWt: number;
  isAutoLinked: boolean;
  sourceLabel: string;
  naActive: boolean;
  isOverridden: boolean;
}

export interface LinearLayerMetric {
  key: string;
  label: string;
  planKm: number;
  execKm: number;
  varianceKm: number;
  ratioPct: number;
}

export interface ResourceMobSummary {
  monthsAveraged: number;
  monthLabels: string[];
  equipmentDeployed: number;
  equipmentPlanned: number;
  equipmentDeficit: number;
  equipmentRatioPct: number;
  personnelPresent: number;
  personnelPlanned: number;
  personnelRatioPct: number;
  productionActual: number;
  productionTarget: number;
  productionRatioPct: number;
  supplyActual: number;
  supplyTarget: number;
  supplyRatioPct: number;
}

export interface EvidenceMetric {
  label: string;
  value: string;
  status?: 'positive' | 'warning' | 'critical' | 'neutral';
}

export interface PerformanceAuditPillar {
  id: 'schedule' | 'evm' | 'quality' | 'linear' | 'resourceMob' | 'management' | 'financial' | 'hse';
  name: string;
  weight: number;
  scorePct: number;
  scaleValue: number;
  grade: PerformanceGrade;
  letter: 'A' | 'B' | 'C' | 'D' | 'F';
  pointsEarned: number;
  criteria: string;
  evaluationBasis: string;
  telemetrySummary: string;
  attribution: {
    contractor: string;
    employerOrExternal: string;
  };
  finding: string;
  statusColor: string;
  linkedGoalIds: string[];
  linkedGoalLabels: string[];
  linkedCriteria: LinkedCriterionDetail[];
  evidenceMetrics: EvidenceMetric[];
  linearLayers?: LinearLayerMetric[];
  resourceMobSummary?: ResourceMobSummary;
}

export interface ContractorEvaluationResult {
  pillars: PerformanceAuditPillar[];
  compositeScorePct: number;
  overallAuditGrade: ReturnType<typeof getPerformanceAuditGrade>;
  totalPointsEarned: number;
  totalLinkedCriteriaCount: number;
  totalActiveCriteriaCount: number;
  linkedGoalCoverageCount: number;
  totalGoalCount: number;
  determination: {
    strengthSummary: string;
    causalAnalysis: string;
    correctiveAction: string;
    riskLevel: 'Low' | 'Moderate' | 'Elevated' | 'Critical';
    contractClauseRef: string;
  };
}

export const AUTO_KPI_SOURCE_MAP: Record<string, string> = {
  'PP-1': 'EFY Physical Plan vs Daily Activities Monthly Km',
  'PP-3': 'EFY Pavement Schedule vs Daily Activities Monthly Cumulative',
  'PT-1': 'Physical Progress % / Elapsed Time %',
  'CM-1': 'Contract Sum vs Revised Variation Sum',
  'CM-2': 'Quarterly Variation & Cost Growth Tracker',
  'TM-1': 'Contract Duration vs Approved EOT Ledger',
  'TM-2': 'EVM Schedule Variance ((EV - PV) / PV)',
  'QL-2B': 'Work Inspection (WIR) & Daily Site QC Pass Rate',
  'QL-3A': 'NCR / DLP Defect Closure Register',
  'QL-4A': 'Deduplicated RFI Non-Rejection & Approval Log',
  'QL-4B': 'RFI SLA Response Time Conformance',
  'MQ-1': 'Material Approval Submittals Register',
  'RW-1': 'ROW Obstruction-Free vs Requested Km',
  'RW-2A': 'ROW Properties Identified & Measured Km',
  'RW-2B': 'ERA ROW Compensation Disbursed Km',
  'RW-2C': 'ROW Clearance & Handover Ratio',
  'RW-3': 'Utilities & Material Source Handover Ratio',
  'CC-1A': 'CPM Work Program Activities Schedule',
  'CC-1C': 'Monthly Progress Report (MPR) Submissions',
  'CC-1F': 'Daily Site Activities & Work Log',
  'CC-3A': 'Bonds Register (Performance Guarantee)',
  'CC-3B': 'Bonds Register (Advance Payment Guarantee)',
  'CC-3C': 'Bonds Register (Retention Guarantee)',
  'CC-3D': 'Insurance Register (CAR Policy)',
  'CC-3E': 'Insurance Register (Professional Indemnity)',
  'CC-3F': 'Insurance Register (Plant & Equipment)',
  'RK-1': 'Risk Register Active Status Check',
  'RK-2': 'Risk Register Mean Severity Index',
  'RK-3': 'Risk Register Mitigation & Control Rate',
  'RK-4': 'Composite Project Risk Exposure Index'
};

export function isAutoLinkedKpiId(itemId: string): boolean {
  return Boolean(AUTO_KPI_SOURCE_MAP[itemId]);
}

export function getPerformanceAuditGrade(scorePct: number): {
  grade: PerformanceGrade;
  letter: 'A' | 'B' | 'C' | 'D' | 'F';
  scaleValue: number;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  description: string;
} {
  const clamped = Math.max(0, Math.min(100, scorePct));
  const scaleValue = Number((1.0 + (clamped / 100) * 4.0).toFixed(2));

  if (clamped >= 90) {
    return {
      grade: 'Excellent',
      letter: 'A',
      scaleValue,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      borderClass: 'border-emerald-500/30',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40',
      description: 'Exceeds contract requirements; proactive project controls; zero uncorrected defects.'
    };
  } else if (clamped >= 75) {
    return {
      grade: 'Good',
      letter: 'B',
      scaleValue,
      colorClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      borderClass: 'border-blue-500/30',
      badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40',
      description: 'Consistently meets contractual standards; minor variances proactively managed.'
    };
  } else if (clamped >= 60) {
    return {
      grade: 'Satisfactory',
      letter: 'C',
      scaleValue,
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      borderClass: 'border-amber-500/30',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40',
      description: 'Meets minimum contract requirements; minor deficiencies promptly corrected after notice.'
    };
  } else if (clamped >= 45) {
    return {
      grade: 'Marginal',
      letter: 'D',
      scaleValue,
      colorClass: 'text-orange-600 dark:text-orange-400',
      bgClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
      borderClass: 'border-orange-500/30',
      badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border border-orange-300 dark:border-orange-500/40',
      description: 'Recurring deficiencies; corrected late or only after Engineer/Employer intervention.'
    };
  } else {
    return {
      grade: 'Unsatisfactory',
      letter: 'F',
      scaleValue,
      colorClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
      borderClass: 'border-rose-500/30',
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40',
      description: 'Major contractual failures, uncorrected delay, material financial risk to Employer.'
    };
  }
}

export interface KpiHierarchyGoal {
  id: string;
  name: string;
  wt: number;
  sscs: Array<{
    id: string;
    name: string;
    wt: number;
    items: Array<{
      id: string;
      desc: string;
      unit: string;
      wt: number;
      max: number;
      type: string;
    }>;
  }>;
}

export interface ContractorEvaluationInput {
  project: Project;
  kpis: KpiAllocatedItem[];
  hierarchy: KpiHierarchyGoal[];
  getGoalScore: (goalId: string) => number;
  getSscScore: (sscId: string) => number;
  progressKpiResult: ProgressKpiCalculationResult;
  evmMetrics: EvmMetrics;
  selectedMonth: string;
}

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Number(Math.min(100, Math.max(0, v)).toFixed(1));
}

function getKpiScorePct(k?: KpiAllocatedItem): number {
  if (!k || k.naActive) return -1;
  const max = k.max || 100;
  if (k.type === 'yn') {
    return k.alloc >= max ? 100 : 0;
  }
  return Math.min(100, Math.max(0, (k.alloc / max) * 100));
}

function mapKpiToLinkedDetail(k: KpiAllocatedItem): LinkedCriterionDetail {
  const max = k.max || 100;
  const scorePct = k.naActive ? -1 : (k.type === 'yn' ? (k.alloc >= max ? 100 : 0) : Math.min(100, Math.max(0, (k.alloc / max) * 100)));
  let valueDisplay = 'N/A';
  if (!k.naActive) {
    if (k.type === 'yn') {
      if (k.itemId === 'RK-1') {
        valueDisplay = k.alloc === 0 ? 'Active Risks (0.0)' : 'Clear (1.0)';
      } else {
        valueDisplay = k.alloc >= max ? 'Yes (1.0)' : 'No (0.0)';
      }
    } else {
      valueDisplay = `${Number(k.alloc || 0).toFixed(1)}%`;
    }
  }
  const sourceLabel = AUTO_KPI_SOURCE_MAP[k.itemId] || 'Evaluator Assessment';
  return {
    itemId: k.itemId,
    desc: k.desc,
    goalId: k.goalId,
    goalName: k.goalName,
    sscId: k.sscId,
    sscName: k.sscName,
    type: k.type,
    unit: k.unit,
    valueDisplay,
    scorePct: scorePct >= 0 ? Number(scorePct.toFixed(1)) : 0,
    itemWt: k.itemWt,
    sscWt: k.sscWt,
    isAutoLinked: Boolean(AUTO_KPI_SOURCE_MAP[k.itemId]),
    sourceLabel,
    naActive: Boolean(k.naActive),
    isOverridden: Boolean(k.isOverridden)
  };
}

function computeResourceMobSummary(project: Project): ResourceMobSummary {
  const records: MonthlyResourceRecord[] = [...(project.monthlyResourceRecords || [])].sort((a, b) =>
    (b.month || b.recordedDate || '').localeCompare(a.month || a.recordedDate || '')
  );
  const recentRecords = records.slice(0, 6);

  if (recentRecords.length > 0) {
    let equipPlanSum = 0;
    let equipAvailSum = 0;
    let persPlanSum = 0;
    let persAvailSum = 0;
    let prodTargetSum = 0;
    let prodActualSum = 0;
    let supTargetSum = 0;
    let supActualSum = 0;

    recentRecords.forEach(rec => {
      (rec.resourceMobilization || []).forEach(item => {
        const plan = item.revisedPlan || item.originalPlan || 0;
        const avail = item.available || 0;
        if (item.category === 'personnel') {
          persPlanSum += plan;
          persAvailSum += avail;
        } else {
          equipPlanSum += plan;
          equipAvailSum += avail;
        }
      });
      (rec.materialProduction || []).forEach(mat => {
        const tgt = mat.monthlyTarget || 0;
        const act = mat.thisMonth || 0;
        if (tgt > 0 || act > 0) {
          if (mat.category === 'Production') {
            prodTargetSum += tgt;
            prodActualSum += act;
          } else {
            supTargetSum += tgt;
            supActualSum += act;
          }
        }
      });
    });

    // Fallback personnel to live project.resourceMobilization if older months omitted personnel rows
    if (persPlanSum === 0 && project.resourceMobilization) {
      project.resourceMobilization
        .filter(r => r.category === 'personnel')
        .forEach(r => {
          persPlanSum += r.revisedPlan || r.originalPlan || 0;
          persAvailSum += r.available || 0;
        });
    }

    const eqRatio = equipPlanSum > 0 ? Math.min(100, (equipAvailSum / equipPlanSum) * 100) : 0;
    const psRatio = persPlanSum > 0 ? Math.min(100, (persAvailSum / persPlanSum) * 100) : (equipPlanSum > 0 ? eqRatio : 0);
    const prRatio = prodTargetSum > 0 ? Math.min(100, (prodActualSum / prodTargetSum) * 100) : 0;
    const spRatio = supTargetSum > 0 ? Math.min(100, (supActualSum / supTargetSum) * 100) : 0;

    return {
      monthsAveraged: recentRecords.length,
      monthLabels: recentRecords.map(r => r.monthName || r.month),
      equipmentDeployed: Math.round(equipAvailSum / recentRecords.length),
      equipmentPlanned: Math.round(equipPlanSum / recentRecords.length),
      equipmentDeficit: Math.max(0, Math.round((equipPlanSum - equipAvailSum) / recentRecords.length)),
      equipmentRatioPct: clampPct(eqRatio),
      personnelPresent: Math.round(persAvailSum),
      personnelPlanned: Math.round(persPlanSum),
      personnelRatioPct: clampPct(psRatio),
      productionActual: Math.round(prodActualSum / recentRecords.length),
      productionTarget: Math.round(prodTargetSum / recentRecords.length),
      productionRatioPct: clampPct(prRatio),
      supplyActual: Math.round(supActualSum / recentRecords.length),
      supplyTarget: Math.round(supTargetSum / recentRecords.length),
      supplyRatioPct: clampPct(spRatio)
    };
  }

  // Fallback to current snapshot arrays
  const resList = project.resourceMobilization || [];
  const matList = project.materialProduction || [];
  let equipPlan = 0;
  let equipAvail = 0;
  let persPlan = 0;
  let persAvail = 0;
  resList.forEach(r => {
    const p = r.revisedPlan || r.originalPlan || 0;
    const a = r.available || 0;
    if (r.category === 'personnel') {
      persPlan += p;
      persAvail += a;
    } else {
      equipPlan += p;
      equipAvail += a;
    }
  });

  let prodTarget = 0;
  let prodActual = 0;
  let supTarget = 0;
  let supActual = 0;
  matList.forEach(m => {
    const t = m.monthlyTarget || 0;
    const a = m.thisMonth || 0;
    if (m.category === 'Production') {
      prodTarget += t;
      prodActual += a;
    } else {
      supTarget += t;
      supActual += a;
    }
  });

  const eqRatio = equipPlan > 0 ? Math.min(100, (equipAvail / equipPlan) * 100) : 0;
  const psRatio = persPlan > 0 ? Math.min(100, (persAvail / persPlan) * 100) : 0;
  const prRatio = prodTarget > 0 ? Math.min(100, (prodActual / prodTarget) * 100) : 0;
  const spRatio = supTarget > 0 ? Math.min(100, (supActual / supTarget) * 100) : 0;

  return {
    monthsAveraged: (resList.length > 0 || matList.length > 0) ? 1 : 0,
    monthLabels: (resList.length > 0 || matList.length > 0) ? ['Current Snapshot'] : [],
    equipmentDeployed: equipAvail,
    equipmentPlanned: equipPlan,
    equipmentDeficit: Math.max(0, equipPlan - equipAvail),
    equipmentRatioPct: clampPct(eqRatio),
    personnelPresent: persAvail,
    personnelPlanned: persPlan,
    personnelRatioPct: clampPct(psRatio),
    productionActual: prodActual,
    productionTarget: prodTarget,
    productionRatioPct: clampPct(prRatio),
    supplyActual: supActual,
    supplyTarget: supTarget,
    supplyRatioPct: clampPct(spRatio)
  };
}

export function evaluateContractorPerformance(input: ContractorEvaluationInput): ContractorEvaluationResult {
  const {
    project,
    kpis,
    hierarchy,
    getGoalScore,
    getSscScore,
    progressKpiResult,
    evmMetrics,
    selectedMonth
  } = input;

  const findKpisByGoalOrItem = (goalIds: string[], extraItemIds: string[] = []): LinkedCriterionDetail[] => {
    const goalSet = new Set(goalIds);
    const extraSet = new Set(extraItemIds);
    const matched = kpis.filter(k => goalSet.has(k.goalId) || extraSet.has(k.itemId));
    const seen = new Set<string>();
    const out: LinkedCriterionDetail[] = [];
    matched.forEach(k => {
      if (!seen.has(k.itemId)) {
        seen.add(k.itemId);
        out.push(mapKpiToLinkedDetail(k));
      }
    });
    return out;
  };

  const goalNameMap: Record<string, string> = {};
  hierarchy.forEach(g => {
    goalNameMap[g.id] = `${g.id}: ${g.name}`;
  });

  // Shared financial & contract context
  const origContractVal =
    project.contractAmountEtb ||
    ((project.origAmount || 0) * 1_000_000) ||
    (project.origAmount || 0);
  const netVariationVal =
    (project.variation || 0) > 10000
      ? (project.variation || 0)
      : ((project.variation || 0) * 1_000_000);
  const revContractVal = project.revisedContractAmountEtb || (origContractVal + netVariationVal);
  const variationPct = origContractVal > 0 ? ((revContractVal - origContractVal) / origContractVal) * 100 : 0;

  const priceAdjItem = (project.payment || []).find(p => p.item.toLowerCase().includes('price adjustment'));
  const advPayItem = (project.payment || []).find(p => p.item.toLowerCase().includes('advance payment') && !p.item.toLowerCase().includes('repayment'));
  const advRepayItem = (project.payment || []).find(p => p.item.toLowerCase().includes('advance repayment'));
  const advRecoveryPct = advPayItem && advPayItem.amount > 0 && advRepayItem
    ? Math.min(100, (advRepayItem.amount / advPayItem.amount) * 100)
    : 0;

  const ipcList = project.ipcTracker || [];
  const ipcCertifiedSum = ipcList.reduce((s, x) => s + (x.certifiedEtb || 0), 0);
  const ipcPriceAdjSum = ipcList.reduce((s, x) => s + (x.priceAdjustmentEtb || 0), 0);
  const livePriceAdjEtb = priceAdjItem?.amount && priceAdjItem.amount > 0 ? priceAdjItem.amount : ipcPriceAdjSum;
  const paidIpcCount = ipcList.filter(x => x.status === 'Paid').length;

  // Shared submittal & site records telemetry
  const dedupSubs = deduplicateSubmittals(project.supervisionConsultant?.submittalKpis || []);
  const rfiList = dedupSubs.filter(isRfiRecord);
  const techSubs = dedupSubs.filter(s => !isRfiRecord(s));
  const wirList = techSubs.filter(s => {
    const t = String(s.type || '').toLowerCase();
    return t.includes('wir') || t.includes('work inspection');
  });
  const matList = techSubs.filter(s => String(s.type || '').toLowerCase().includes('material'));

  const rfiApprovedCount = rfiList.filter(r => isSubmittalApproved(r.status)).length;
  const rfiRejectedCount = rfiList.filter(r => isSubmittalRejected(r.status) || isSubmittalRejected(r.rfiStatus)).length;
  const rfiAvgDays = rfiList.length > 0
    ? rfiList.reduce((s, r) => s + (typeof r.actualDays === 'number' ? r.actualDays : (r.targetDays || 7)), 0) / rfiList.length
    : 0;

  const wirApprovedCount = wirList.filter(w => isSubmittalApproved(w.status)).length;
  const matApprovedCount = matList.filter(m => isSubmittalApproved(m.status)).length;

  const dailyActs = project.dailyActivities || [];
  const dailyQcEval = dailyActs.filter(d => Boolean(d.qcStatus && d.qcStatus.trim().length > 0));
  const dailyQcPass = dailyQcEval.filter(d => {
    const st = String(d.qcStatus || '').toLowerCase();
    return st.includes('approved') || st.includes('passed') || st.includes('pass');
  });

  const dlpList = project.dlpDefects || [];
  const dlpClosed = dlpList.filter(d => d.status === 'Closed' || d.status === 'Rectified').length;

  // ROW metrics
  const rowMetricsList = project.rowMetrics || [];
  const rowRequestedKm = rowMetricsList.find(m => m.name === 'ROW Request By Contractor')?.value || 0;
  const rowClearedKm = rowMetricsList.find(m => m.name === 'ROW Obstruction free Section')?.value || 0;
  const rowDenomKm = rowRequestedKm > 0 ? rowRequestedKm : (project.lengthKm || 0);
  const rowClearPct = rowDenomKm > 0 ? Math.min(100, (rowClearedKm / rowDenomKm) * 100) : 0;

  // =========================================================================
  // PILLAR 1: Progress vs. Original Contractor Plan (25%)
  // Linked KPIs: G1 (SC1.1 PP-1, SC1.2 Milestones MS-1..MS-21), G2 (PT-1), G4 (SC4.1 TM-1)
  // =========================================================================
  const origPlanPct = (evmMetrics.originalPlannedPct && evmMetrics.originalPlannedPct > 0)
    ? evmMetrics.originalPlannedPct
    : 100.0;
  const actualProgressVal = Number(project.physicalProgress || 0);
  const progressRatioToOrigPlan = origPlanPct > 0
    ? Math.min(100, Math.max(0, (actualProgressVal / origPlanPct) * 100))
    : (actualProgressVal > 0 ? 100 : 0);

  const sc11Score = Math.max(0, getSscScore('SC1.1'));
  const sc12Score = Math.max(0, getSscScore('SC1.2'));
  const g2Score = getGoalScore('G2');
  const sc41Score = Math.max(0, getSscScore('SC4.1'));

  const msItems = kpis.filter(k => k.sscId === 'SC1.2' && !k.naActive);
  const msAchieved = msItems.filter(k => k.alloc >= (k.max || 1)).length;
  const eotOverrunPct = project.origDays > 0 ? ((project.eotDays || 0) / project.origDays) * 100 : 0;

  const scheduleCriteriaBlend = (sc11Score * 0.35) + (sc12Score * 0.30) + (g2Score * 0.20) + (sc41Score * 0.15);
  const scheduleScore = clampPct((progressRatioToOrigPlan * 0.65) + (scheduleCriteriaBlend * 0.35));
  const scheduleGradeInfo = getPerformanceAuditGrade(scheduleScore);
  const schedulePoints = Number(((scheduleScore * 25) / 100).toFixed(2));
  const scheduleLinkedCriteria = findKpisByGoalOrItem(['G2'], ['PP-1', ...msItems.map(m => m.itemId), 'TM-1']);

  // =========================================================================
  // PILLAR 2: Earned Value & Cost Controls (15%)
  // Linked KPIs: G3 (CM-1, CM-2), G4 (SC4.2 TM-2 Schedule Variance)
  // =========================================================================
  const getCpiSpiScore = (val: number): number => {
    if (val >= 1.0) return 100;
    if (val > 0) return Math.max(0, val * 100);
    return 0;
  };
  const spiScore = getCpiSpiScore(evmMetrics.SPI);
  const cpiScore = getCpiSpiScore(evmMetrics.CPI);
  const g3Score = getGoalScore('G3');
  const sc42Score = Math.max(0, getSscScore('SC4.2'));
  const evmKpiBlend = (g3Score * 0.55) + (sc42Score * 0.45);
  const evmScore = clampPct((spiScore * 0.38) + (cpiScore * 0.38) + (evmKpiBlend * 0.24));
  const evmGradeInfo = getPerformanceAuditGrade(evmScore);
  const evmPoints = Number(((evmScore * 15) / 100).toFixed(2));
  const evmLinkedCriteria = findKpisByGoalOrItem(['G3'], ['TM-2']);

  // =========================================================================
  // PILLAR 3: Technical Quality, QA/QC & Inspection Compliance (25%)
  // Linked KPIs: G5 (SC5.1..SC5.8)
  // =========================================================================
  const g5Score = getGoalScore('G5');
  const qualitySiteRates: number[] = [];
  if (wirList.length > 0) qualitySiteRates.push((wirApprovedCount / wirList.length) * 100);
  if (dailyQcEval.length > 0) qualitySiteRates.push((dailyQcPass.length / dailyQcEval.length) * 100);
  if (matList.length > 0) qualitySiteRates.push((matApprovedCount / matList.length) * 100);
  if (dlpList.length > 0) qualitySiteRates.push((dlpClosed / dlpList.length) * 100);
  const liveSiteQualityAvg = qualitySiteRates.length > 0
    ? qualitySiteRates.reduce((a, b) => a + b, 0) / qualitySiteRates.length
    : g5Score;

  const qualityScore = clampPct(
    g5Score > 0
      ? (qualitySiteRates.length > 0 ? (g5Score * 0.75 + liveSiteQualityAvg * 0.25) : g5Score)
      : liveSiteQualityAvg
  );
  const qualityGradeInfo = getPerformanceAuditGrade(qualityScore);
  const qualityPoints = Number(((qualityScore * 25) / 100).toFixed(2));
  const qualityLinkedCriteria = findKpisByGoalOrItem(['G5']);

  // =========================================================================
  // PILLAR 4: Linear Pavement Layer Execution vs Baseline Plan (10%)
  // Linked KPIs: G1/SC1.3 (PP-3 Asphalt Progress), G6 (Design Management)
  // =========================================================================
  const hasCapping = project.hasCappingLayer !== false;
  const mainTargetKm = Math.max(0, (project.lengthKm || 0) - (project.spurRoadLengthKm || 0));
  const spurTargetKm = project.hasSpurRoad ? (project.spurRoadLengthKm || 0) : 0;
  const fallbackTotalKm = mainTargetKm + spurTargetKm;

  const layerDefs: Array<{ key: keyof NonNullable<Project['linear']>; label: string }> = [
    { key: 'subgrade', label: 'Subgrade' },
    ...(hasCapping ? [{ key: 'capping' as const, label: 'Capping' }] : []),
    { key: 'subbase', label: 'Subbase' },
    { key: 'basecourse', label: 'Basecourse' },
    { key: 'asphalt', label: 'Asphalt Concrete' }
  ];

  const pavementMap = {
    subbase: progressKpiResult.pavement.subbase,
    basecourse: progressKpiResult.pavement.basecourse,
    asphalt: progressKpiResult.pavement.asphalt
  };
  const usesEfyPavementSchedule = progressKpiResult.pavement.usesEfyPlan;
  const isMonthlyBasis = progressKpiResult.calculationBasis === 'monthly';

  const linearLayers: LinearLayerMetric[] = layerDefs.map(({ key, label }) => {
    const efyLayer =
      key === 'subbase' || key === 'basecourse' || key === 'asphalt'
        ? pavementMap[key]
        : undefined;

    if (efyLayer && (efyLayer.hasMonthPlan || efyLayer.hasTodatePlan || efyLayer.dailyEntryCount > 0)) {
      const useMonthly = isMonthlyBasis && efyLayer.monthPlanKm > 0;
      const planKm = Number((useMonthly ? efyLayer.monthPlanKm : efyLayer.todatePlanKm).toFixed(3));
      const execKm = Number((useMonthly ? efyLayer.monthActualKm : (efyLayer.hasTodatePlan ? efyLayer.todateActualKm : efyLayer.monthActualKm)).toFixed(3));
      const ratioPct = planKm > 0 ? clampPct((execKm / planKm) * 100) : (execKm > 0 ? 100 : 0);
      const varianceKm = Number((execKm - planKm).toFixed(3));
      return { key, label, planKm, execKm, varianceKm, ratioPct };
    }

    const mainExec = (project.linear?.[key] || []).reduce((s, r) => s + (Number(r.exec) || 0), 0);
    const spurExec = (project.linearSpur?.[key] || []).reduce((s, r) => s + (Number(r.exec) || 0), 0);
    const execKm = Number((mainExec + spurExec).toFixed(2));

    const mainPlan = project.linearPlan?.[key]?.plannedKm || 0;
    const spurPlan = project.linearPlanSpur?.[key]?.plannedKm || 0;
    let planKm = Number((mainPlan + spurPlan).toFixed(2));

    if (planKm <= 0 && fallbackTotalKm > 0 && (execKm > 0 || project.physicalProgress > 0)) {
      planKm = Number(fallbackTotalKm.toFixed(2));
    }

    const ratioPct = planKm > 0 ? clampPct((execKm / planKm) * 100) : 0;
    const varianceKm = Number((execKm - planKm).toFixed(2));
    return { key, label, planKm, execKm, varianceKm, ratioPct };
  });

  const activeLayers = linearLayers.filter(l => l.planKm > 0 || l.execKm > 0);
  const meanLinearLayerPct = activeLayers.length > 0
    ? linearLayers.reduce((s, l) => s + l.ratioPct, 0) / linearLayers.length
    : 0;

  const sc13Score = Math.max(0, getSscScore('SC1.3'));
  const g6Score = getGoalScore('G6');
  const linearKpiBlend = (sc13Score * 0.55) + (g6Score * 0.45);
  const linearScore = clampPct((meanLinearLayerPct * 0.70) + (linearKpiBlend * 0.30));
  const linearGradeInfo = getPerformanceAuditGrade(linearScore);
  const linearPoints = Number(((linearScore * 10) / 100).toFixed(2));
  const linearLinkedCriteria = findKpisByGoalOrItem(['G6'], ['PP-3']);

  // =========================================================================
  // PILLAR 5: Resource Mobilization, Plant Production & Supply (5%)
  // Linked KPIs: MS-1, MS-2, MS-4, MS-12, MS-13, MS-14, CC-4
  // =========================================================================
  const resSummary = computeResourceMobSummary(project);
  const resScoreComponents: Array<{ pct: number; wt: number }> = [];
  if (resSummary.equipmentPlanned > 0) resScoreComponents.push({ pct: resSummary.equipmentRatioPct, wt: 0.35 });
  if (resSummary.productionTarget > 0) resScoreComponents.push({ pct: resSummary.productionRatioPct, wt: 0.35 });
  if (resSummary.supplyTarget > 0) resScoreComponents.push({ pct: resSummary.supplyRatioPct, wt: 0.30 });

  const totalResWt = resScoreComponents.reduce((s, c) => s + c.wt, 0);
  const liveResourceRatio = totalResWt > 0
    ? resScoreComponents.reduce((s, c) => s + (c.pct * c.wt), 0) / totalResWt
    : 0;

  const resourceKpiIds = ['MS-1', 'MS-2', 'MS-4', 'MS-12', 'MS-13', 'MS-14', 'CC-4'];
  const resourceLinkedCriteria = findKpisByGoalOrItem([], resourceKpiIds);
  const validResKpiScores = resourceLinkedCriteria.filter(c => !c.naActive).map(c => c.scorePct);
  const resKpiAvg = validResKpiScores.length > 0
    ? validResKpiScores.reduce((a, b) => a + b, 0) / validResKpiScores.length
    : liveResourceRatio;

  const resourceMobScore = clampPct(
    totalResWt > 0
      ? (liveResourceRatio * 0.75) + (resKpiAvg * 0.25)
      : (validResKpiScores.length > 0 ? resKpiAvg * 0.5 : 0)
  );
  const resourceMobGradeInfo = getPerformanceAuditGrade(resourceMobScore);
  const resourceMobPoints = Number(((resourceMobScore * 5) / 100).toFixed(2));

  // =========================================================================
  // PILLAR 6: Contract Admin, Design, Claims, ROW & Risk (10%)
  // Linked KPIs: G12 (SC12.1, SC12.2, SC12.4), G6, G7, G8, G10
  // =========================================================================
  const g12Score = getGoalScore('G12');
  const g7Score = getGoalScore('G7');
  const g8Score = getGoalScore('G8');
  const g10Score = getGoalScore('G10');

  const mgmtScore = clampPct(
    (g12Score * 0.35) +
    (g8Score * 0.20) +
    (g10Score * 0.20) +
    (g7Score * 0.15) +
    (g6Score * 0.10)
  );
  const mgmtGradeInfo = getPerformanceAuditGrade(mgmtScore);
  const mgmtPoints = Number(((mgmtScore * 10) / 100).toFixed(2));
  const mgmtLinkedCriteria = findKpisByGoalOrItem(['G7', 'G8', 'G10'], [
    ...kpis.filter(k => k.goalId === 'G12' && k.sscId !== 'SC12.3').map(k => k.itemId)
  ]);

  const risksList = project.risks || [];
  const activeRisks = risksList.filter(r => r.status === 'Active');
  const criticalRisksCount = activeRisks.filter(r => r.probability * r.impact >= 12).length;
  const issuesList = project.issues || [];
  const openIssuesCount = issuesList.filter(i => i.currentStatus !== 'Resolved / Approved' && i.currentStatus !== 'Rejected / Closed').length;

  // =========================================================================
  // PILLAR 7: Financial Control, Variations & Securities (5%)
  // Linked KPIs: G3 (CM-1, CM-2), G7 (CL-4), G12/SC12.3 (CC-3A..CC-3F)
  // =========================================================================
  const bondsList = (project.bonds || []).filter(b => b.status !== 'N/A');
  const expiredBonds = bondsList.filter(b => b.status === 'Expired').length;
  const validBonds = bondsList.length - expiredBonds;

  const sc123RawScore = getSscScore('SC12.3');
  const sc123Score = Math.max(0, sc123RawScore);
  const cl4Item = kpis.find(k => k.itemId === 'CL-4');
  const cl4Score = Math.max(0, getKpiScorePct(cl4Item));
  const bondRatioFallback = bondsList.length > 0 ? (validBonds / bondsList.length) * 100 : sc123Score;
  const effectiveSecurityScore = bondsList.length > 0
    ? (sc123RawScore >= 0 ? ((sc123Score * 0.6) + (bondRatioFallback * 0.4)) : bondRatioFallback)
    : sc123Score;

  const financialScore = clampPct((effectiveSecurityScore * 0.45) + (g3Score * 0.40) + (cl4Score * 0.15));
  const financialGradeInfo = getPerformanceAuditGrade(financialScore);
  const financialPoints = Number(((financialScore * 5) / 100).toFixed(2));
  const financialLinkedCriteria = findKpisByGoalOrItem(['G3'], [
    'CL-4',
    ...kpis.filter(k => k.sscId === 'SC12.3').map(k => k.itemId)
  ]);

  // =========================================================================
  // PILLAR 8: HSE, Environment & Social Safeguards (5%)
  // Linked KPIs: G9 (SC9.1 Environmental, SC9.2 OHS, SC9.3 Traffic), G11 (Stakeholder)
  // =========================================================================
  const g9Score = getGoalScore('G9');
  const g11Score = getGoalScore('G11');
  const hseIssues = issuesList.filter(i => {
    const cat = String(i.category || '').toLowerCase();
    return cat.includes('safety') || cat.includes('environmental') || cat.includes('ehs') || cat.includes('esosh');
  });
  const openHseIssues = hseIssues.filter(i => i.currentStatus !== 'Resolved / Approved' && i.currentStatus !== 'Rejected / Closed');

  const hseScore = clampPct((g9Score * 0.70) + (g11Score * 0.30));
  const hseGradeInfo = getPerformanceAuditGrade(hseScore);
  const hsePoints = Number(((hseScore * 5) / 100).toFixed(2));
  const hseLinkedCriteria = findKpisByGoalOrItem(['G9', 'G11']);

  // =========================================================================
  // Assemble Pillars with Live Provenance & Dynamic Causal Attribution
  // =========================================================================
  const totalPointsEarned = Number((
    schedulePoints +
    evmPoints +
    qualityPoints +
    linearPoints +
    resourceMobPoints +
    mgmtPoints +
    financialPoints +
    hsePoints
  ).toFixed(2));

  const compositeScorePct = totalPointsEarned;
  const overallAuditGrade = getPerformanceAuditGrade(compositeScorePct);

  const pillars: PerformanceAuditPillar[] = [
    {
      id: 'schedule',
      name: 'Progress vs. Original Contractor Plan',
      weight: 25,
      scorePct: scheduleScore,
      scaleValue: scheduleGradeInfo.scaleValue,
      grade: scheduleGradeInfo.grade,
      letter: scheduleGradeInfo.letter,
      pointsEarned: schedulePoints,
      criteria: 'Actual physical accomplishment vs original baseline plan, Monthly Status Report (PP-1), milestone achievement (MS-1..MS-21), elapsed-time efficiency (PT-1), and EOT control (TM-1).',
      evaluationBasis: `Original Baseline Plan (${origPlanPct.toFixed(1)}%) & KPI G1/G2/G4`,
      telemetrySummary: `Actual: ${actualProgressVal.toFixed(2)}% vs Orig Plan: ${origPlanPct.toFixed(1)}% (${progressRatioToOrigPlan.toFixed(1)}% ratio) · PP-1: ${progressKpiResult.pp1Score.toFixed(1)}% · Milestones: ${msAchieved}/${msItems.length} · EOT: ${project.eotDays || 0}d (${eotOverrunPct.toFixed(1)}%)`,
      attribution: {
        contractor: scheduleScore >= 75
          ? `Schedule delivery (${actualProgressVal.toFixed(1)}% actual) tracks baseline targets with ${msAchieved}/${msItems.length} milestones achieved.`
          : `Schedule slippage of ${(actualProgressVal - origPlanPct).toFixed(1)}% against original baseline plan; ${msItems.length - msAchieved} milestone(s) pending completion.`,
        employerOrExternal: rowDenomKm > 0 && rowClearPct < 90
          ? `ROW obstruction-free corridor at ${rowClearPct.toFixed(1)}% (${rowClearedKm.toFixed(1)}/${rowDenomKm.toFixed(1)} km); ${project.eotDays || 0} EOT days granted.`
          : `${project.eotDays || 0} EOT days approved against ${project.origDays || 0}d original contract duration.`
      },
      finding: scheduleScore >= 85
        ? 'Physical progress and milestone completion conform well to baseline targets.'
        : scheduleScore >= 60
          ? `Moderate schedule variance (${(actualProgressVal - origPlanPct).toFixed(1)}% vs baseline); recovery monitoring required.`
          : `Significant schedule lag against original plan (${progressRatioToOrigPlan.toFixed(1)}% accomplishment ratio); Clause 8.6 acceleration warranted.`,
      statusColor: scheduleGradeInfo.badgeClass,
      linkedGoalIds: ['G1', 'G2', 'G4'],
      linkedGoalLabels: [goalNameMap['G1'] || 'G1: Physical Progress', goalNameMap['G2'] || 'G2: Progress vs Elapsed Time', goalNameMap['G4'] || 'G4: Time Management'],
      linkedCriteria: scheduleLinkedCriteria,
      evidenceMetrics: [
        { label: 'Actual Physical Progress', value: `${actualProgressVal.toFixed(2)}%`, status: actualProgressVal >= origPlanPct * 0.9 ? 'positive' : 'warning' },
        { label: 'Original Baseline Target', value: `${origPlanPct.toFixed(1)}%`, status: 'neutral' },
        { label: 'PP-1 Status Report Score', value: `${progressKpiResult.pp1Score.toFixed(1)}%`, status: progressKpiResult.pp1Score >= 85 ? 'positive' : 'warning' },
        { label: 'Milestones (SC1.2)', value: `${msAchieved} / ${msItems.length}`, status: sc12Score >= 80 ? 'positive' : 'warning' },
        { label: 'PT-1 Time Efficiency', value: `${g2Score.toFixed(1)}%`, status: g2Score >= 75 ? 'positive' : 'warning' },
        { label: 'Approved EOT / Orig Days', value: `${project.eotDays || 0}d / ${project.origDays || 0}d`, status: eotOverrunPct > 25 ? 'critical' : 'neutral' }
      ]
    },
    {
      id: 'evm',
      name: 'Earned Value & Project Controls (EVM)',
      weight: 15,
      scorePct: evmScore,
      scaleValue: evmGradeInfo.scaleValue,
      grade: evmGradeInfo.grade,
      letter: evmGradeInfo.letter,
      pointsEarned: evmPoints,
      criteria: 'Integrated EVM metrics (PV, EV, AC, SPI, CPI, SV, CV), Cost Overrun Control (G3: CM-1, CM-2), and Earned Schedule Variance (G4: TM-2).',
      evaluationBasis: 'EVM S-Curve Indices (SPI, CPI) & KPI G3/SC4.2',
      telemetrySummary: `PV: ETB ${(evmMetrics.PV / 1e6).toFixed(1)}M · EV: ETB ${(evmMetrics.EV / 1e6).toFixed(1)}M · AC: ETB ${(evmMetrics.AC / 1e6).toFixed(1)}M · SPI: ${evmMetrics.SPI.toFixed(3)} · CPI: ${evmMetrics.CPI.toFixed(3)} · G3 Cost: ${g3Score.toFixed(1)}%`,
      attribution: {
        contractor: evmMetrics.CPI >= 0.95
          ? `Earned value efficiency balanced at CPI ${evmMetrics.CPI.toFixed(3)} with cost variance CV = ETB ${(evmMetrics.CV / 1e6).toFixed(1)}M.`
          : `Certified outlays outpace earned physical value (CPI ${evmMetrics.CPI.toFixed(3)}); schedule index SPI = ${evmMetrics.SPI.toFixed(3)}.`,
        employerOrExternal: livePriceAdjEtb > 0
          ? `Price escalation adjustments totaling ETB ${(livePriceAdjEtb / 1e6).toFixed(2)}M certified under contract price formula.`
          : `Standard unit-rate certification across ${ipcList.length} tracked IPC record(s).`
      },
      finding: `CPI ${evmMetrics.CPI.toFixed(3)} (${evmMetrics.cpiStatus.label}) and SPI ${evmMetrics.SPI.toFixed(3)} (${evmMetrics.spiStatus.label}) yielding ${evmScore.toFixed(1)}% combined control rating.`,
      statusColor: evmGradeInfo.badgeClass,
      linkedGoalIds: ['G3', 'G4'],
      linkedGoalLabels: [goalNameMap['G3'] || 'G3: Cost Management', goalNameMap['G4'] || 'G4: Time Management (SC4.2)'],
      linkedCriteria: evmLinkedCriteria,
      evidenceMetrics: [
        { label: 'Planned Value (PV)', value: `ETB ${(evmMetrics.PV / 1e6).toFixed(2)}M`, status: 'neutral' },
        { label: 'Earned Value (EV)', value: `ETB ${(evmMetrics.EV / 1e6).toFixed(2)}M`, status: 'neutral' },
        { label: 'Actual Cost (AC)', value: `ETB ${(evmMetrics.AC / 1e6).toFixed(2)}M`, status: 'neutral' },
        { label: 'SPI / CPI', value: `${evmMetrics.SPI.toFixed(3)} / ${evmMetrics.CPI.toFixed(3)}`, status: evmMetrics.SPI >= 0.9 && evmMetrics.CPI >= 0.95 ? 'positive' : 'warning' },
        { label: 'G3 Cost Management', value: `${g3Score.toFixed(1)}%`, status: g3Score >= 85 ? 'positive' : 'warning' },
        { label: 'Price Adjustment', value: `ETB ${(livePriceAdjEtb / 1e6).toFixed(2)}M`, status: 'neutral' }
      ]
    },
    {
      id: 'quality',
      name: 'Technical Quality, QA/QC & Testing Compliance',
      weight: 25,
      scorePct: qualityScore,
      scaleValue: qualityGradeInfo.scaleValue,
      grade: qualityGradeInfo.grade,
      letter: qualityGradeInfo.letter,
      pointsEarned: qualityPoints,
      criteria: 'Full ERA G5 Quality Management matrix (SC5.1–SC5.8) linked with live WIR inspections, Daily QC logs, RFI resolution/SLA, Material Approvals, and NCR/Defect closure.',
      evaluationBasis: 'KPI G5 (8 Subgroups) + Live Submittal/WIR/Daily QC Logs',
      telemetrySummary: `G5 Quality Score: ${g5Score.toFixed(1)}% · WIRs Approved: ${wirApprovedCount}/${wirList.length} · Materials Approved: ${matApprovedCount}/${matList.length} · RFIs Non-Rejected: ${rfiList.length - rfiRejectedCount}/${rfiList.length} (Avg ${rfiAvgDays.toFixed(1)}d) · Daily QC Passed: ${dailyQcPass.length}/${dailyQcEval.length}`,
      attribution: {
        contractor: `QA/QC compliance across ${qualityLinkedCriteria.length} quality indicators averages ${g5Score.toFixed(1)}% with ${wirApprovedCount}/${wirList.length} WIRs and ${matApprovedCount}/${matList.length} material submittals approved.`,
        employerOrExternal: rfiList.length > 0
          ? `Supervision Engineer processed ${rfiList.length} RFIs (avg ${rfiAvgDays.toFixed(1)}d response); ${dlpList.length > 0 ? `${dlpClosed}/${dlpList.length} defects closed` : 'no open DLP defects logged'}.`
          : `Supervision laboratory and site inspection auditing active across permanent work packages.`
      },
      finding: qualityScore >= 80
        ? `Strong technical QA/QC conformance (${qualityScore.toFixed(1)}%) supported by verified WIR, material approval, and lab compliance metrics.`
        : `Technical quality indicators require targeted QA corrective action (${qualityScore.toFixed(1)}% composite across G5 & live inspection logs).`,
      statusColor: qualityGradeInfo.badgeClass,
      linkedGoalIds: ['G5'],
      linkedGoalLabels: [goalNameMap['G5'] || 'G5: Quality Management'],
      linkedCriteria: qualityLinkedCriteria,
      evidenceMetrics: [
        { label: 'G5 Matrix Score', value: `${g5Score.toFixed(1)}%`, status: g5Score >= 80 ? 'positive' : 'warning' },
        { label: 'WIR Pass Rate', value: wirList.length > 0 ? `${wirApprovedCount}/${wirList.length} (${((wirApprovedCount / wirList.length) * 100).toFixed(0)}%)` : 'No WIRs logged', status: 'neutral' },
        { label: 'Daily Site QC Pass', value: dailyQcEval.length > 0 ? `${dailyQcPass.length}/${dailyQcEval.length}` : 'No QC logs', status: 'neutral' },
        { label: 'Material Approvals', value: matList.length > 0 ? `${matApprovedCount}/${matList.length}` : 'No submittals', status: 'neutral' },
        { label: 'RFI Clearance & Avg Days', value: rfiList.length > 0 ? `${rfiApprovedCount}/${rfiList.length} (${rfiAvgDays.toFixed(1)}d)` : 'No RFIs logged', status: 'neutral' },
        { label: 'Defects / NCRs Closed', value: dlpList.length > 0 ? `${dlpClosed}/${dlpList.length}` : '0 open defects', status: 'neutral' }
      ]
    },
    {
      id: 'linear',
      name: 'Linear Layer Execution vs Baseline Plan',
      weight: 10,
      scorePct: linearScore,
      scaleValue: linearGradeInfo.scaleValue,
      grade: linearGradeInfo.grade,
      letter: linearGradeInfo.letter,
      pointsEarned: linearPoints,
      criteria: usesEfyPavementSchedule
        ? `EFY Pavement Progress Schedule (${selectedMonth}) vs Daily Activities monthly cumulative (${layerDefs.map(l => l.label).join(', ')}), linked to G1/SC1.3 Asphalt Progress (PP-3) and G6 Design Management.`
        : `Live Main + Spur pavement layers execution vs baseline linear plan (${layerDefs.map(l => l.label).join(', ')}), linked to G1/SC1.3 Asphalt Progress (PP-3) and G6 Design Management.`,
      evaluationBasis: usesEfyPavementSchedule
        ? `EFY Pavement Schedule (${selectedMonth}) vs Daily Activities + KPI PP-3/G6`
        : `Linear Elevation & Plan (${(project.lengthKm || 0).toFixed(1)} km corridor) + KPI PP-3/G6`,
      telemetrySummary: activeLayers.length > 0
        ? linearLayers.map(l => `${l.label}: ${l.execKm}/${l.planKm}km (${l.ratioPct.toFixed(0)}%)`).join(' · ')
        : 'No linear layer baseline or execution chainage data recorded yet.',
      attribution: {
        contractor: activeLayers.length > 0
          ? `Mean layer execution across ${linearLayers.length} pavement layers is ${meanLinearLayerPct.toFixed(1)}%; asphalt wearing course stands at ${linearLayers[linearLayers.length - 1]?.ratioPct.toFixed(1) || '0.0'}% (${usesEfyPavementSchedule ? 'EFY Schedule vs Daily Activities' : 'corridor linear plan'}).`
          : 'Awaiting chainage segment logs in Linear Elevation Diagram to quantify pavement layer progress.',
        employerOrExternal: `Design management alignment (G6) rated at ${g6Score.toFixed(1)}% with ${rowClearPct.toFixed(1)}% corridor ROW clearance.`
      },
      finding: activeLayers.length === 0
        ? 'Linear baseline or chainage data not yet populated for this project.'
        : meanLinearLayerPct >= 80
          ? `Pavement layer progression (${meanLinearLayerPct.toFixed(1)}% mean) closely matches corridor linear baseline.`
          : `Upper pavement layers require synchronized aggregate/asphalt pacing behind subgrade progress (${meanLinearLayerPct.toFixed(1)}% mean execution).`,
      statusColor: linearGradeInfo.badgeClass,
      linkedGoalIds: ['G1', 'G6'],
      linkedGoalLabels: [`${goalNameMap['G1'] || 'G1'} (SC1.3 PP-3)`, goalNameMap['G6'] || 'G6: Design Management'],
      linkedCriteria: linearLinkedCriteria,
      linearLayers,
      evidenceMetrics: [
        ...linearLayers.map(l => ({
          label: `${l.label} Layer`,
          value: `${l.execKm.toFixed(1)} / ${l.planKm.toFixed(1)} km (${l.ratioPct.toFixed(1)}%)`,
          status: (l.ratioPct >= 85 ? 'positive' : l.ratioPct >= 60 ? 'warning' : 'critical') as EvidenceMetric['status']
        })),
        { label: 'G6 Design Management', value: `${g6Score.toFixed(1)}%`, status: g6Score >= 80 ? 'positive' : 'warning' }
      ]
    },
    {
      id: 'resourceMob',
      name: 'Resource Mobilization & Plant Supply (Multi-Month Avg)',
      weight: 5,
      scorePct: resourceMobScore,
      scaleValue: resourceMobGradeInfo.scaleValue,
      grade: resourceMobGradeInfo.grade,
      letter: resourceMobGradeInfo.letter,
      pointsEarned: resourceMobPoints,
      criteria: 'Rolling up-to-6-month average of Heavy Equipment deployment, Key Personnel site presence, Crusher/Plant production vs targets, Material supply logistics, plus linked milestones (MS-1, MS-2, MS-4, MS-12..14) & CC-4.',
      evaluationBasis: resSummary.monthsAveraged > 0
        ? `${resSummary.monthsAveraged}-Month Resource Average + KPI MS/CC-4`
        : 'Logistics & Mobilization Register + KPI MS/CC-4',
      telemetrySummary: resSummary.monthsAveraged > 0
        ? `Fleet: ${resSummary.equipmentDeployed}/${resSummary.equipmentPlanned} units (${resSummary.equipmentRatioPct.toFixed(1)}%) · Personnel: ${resSummary.personnelPresent}/${resSummary.personnelPlanned} (${resSummary.personnelRatioPct.toFixed(1)}%) · Plant Prod: ${resSummary.productionRatioPct.toFixed(1)}% · Material Supply: ${resSummary.supplyRatioPct.toFixed(1)}%`
        : 'No monthly resource mobilization or material production records logged yet.',
      attribution: {
        contractor: resSummary.equipmentPlanned > 0
          ? `${resSummary.equipmentDeployed}/${resSummary.equipmentPlanned} major equipment units mobilized (${resSummary.equipmentDeficit} unit deficit); key personnel presence at ${resSummary.personnelRatioPct.toFixed(1)}%.`
          : 'No active fleet deployment rows logged in Resource Mobilization.',
        employerOrExternal: resSummary.supplyTarget > 0
          ? `Supply chain logistics averaging ${resSummary.supplyRatioPct.toFixed(1)}% of monthly procurement targets across ${resSummary.monthsAveraged} logged cycle(s).`
          : 'Procurement and quarry/plant production tracking awaiting monthly logs.'
      },
      finding: resSummary.monthsAveraged === 0
        ? 'No monthly logistics/resource mobilization logs recorded yet.'
        : resourceMobScore >= 85
          ? `Sustained fleet mobilization (${resSummary.equipmentRatioPct.toFixed(1)}%) and plant/material output (${resSummary.productionRatioPct.toFixed(1)}% / ${resSummary.supplyRatioPct.toFixed(1)}%).`
          : `Resource deficit of ${resSummary.equipmentDeficit} fleet units or production shortfall impacting output capacity.`,
      statusColor: resourceMobGradeInfo.badgeClass,
      linkedGoalIds: ['G1', 'G12'],
      linkedGoalLabels: ['G1 (SC1.2 Mobilization & Plant Milestones)', 'G12 (SC12.4 Engineer Facilities)'],
      linkedCriteria: resourceLinkedCriteria,
      resourceMobSummary: resSummary,
      evidenceMetrics: [
        { label: 'Cycles Averaged', value: resSummary.monthsAveraged > 0 ? `${resSummary.monthsAveraged} mo (${resSummary.monthLabels[0] || ''})` : 'None', status: 'neutral' },
        { label: 'Heavy Equipment', value: `${resSummary.equipmentDeployed} / ${resSummary.equipmentPlanned} (${resSummary.equipmentRatioPct.toFixed(1)}%)`, status: resSummary.equipmentRatioPct >= 85 ? 'positive' : 'warning' },
        { label: 'Key Personnel', value: `${resSummary.personnelPresent} / ${resSummary.personnelPlanned} (${resSummary.personnelRatioPct.toFixed(1)}%)`, status: resSummary.personnelRatioPct >= 90 ? 'positive' : 'warning' },
        { label: 'Plant Production', value: `${resSummary.productionRatioPct.toFixed(1)}% of target`, status: resSummary.productionRatioPct >= 85 ? 'positive' : 'warning' },
        { label: 'Material Supply', value: `${resSummary.supplyRatioPct.toFixed(1)}% of target`, status: resSummary.supplyRatioPct >= 85 ? 'positive' : 'warning' }
      ]
    },
    {
      id: 'management',
      name: 'Contract Admin, Design, Claims, ROW & Risk',
      weight: 10,
      scorePct: mgmtScore,
      scaleValue: mgmtGradeInfo.scaleValue,
      grade: mgmtGradeInfo.grade,
      letter: mgmtGradeInfo.letter,
      pointsEarned: mgmtPoints,
      criteria: 'Integrated governance score spanning Contract Compliance (G12), Risk Management (G8), ROW Management (G10), Claim & Dispute Control (G7), and Design Management (G6).',
      evaluationBasis: 'KPI Goals G12 (35%) + G8 (20%) + G10 (20%) + G7 (15%) + G6 (10%)',
      telemetrySummary: `G12 Compliance: ${g12Score.toFixed(1)}% · G8 Risk: ${g8Score.toFixed(1)}% (${criticalRisksCount} critical risks) · G10 ROW: ${g10Score.toFixed(1)}% (${rowClearedKm.toFixed(1)}/${rowDenomKm.toFixed(1)} km clear) · G7 Claims: ${g7Score.toFixed(1)}% · G6 Design: ${g6Score.toFixed(1)}% · Open Issues: ${openIssuesCount}`,
      attribution: {
        contractor: `CPM work program tracks ${project.workProgram.length} activities; claim substantiation (G7: ${g7Score.toFixed(1)}%) and site documentation (G12: ${g12Score.toFixed(1)}%) actively maintained.`,
        employerOrExternal: `${activeRisks.length} active risks (${criticalRisksCount} high/critical exposure), ${openIssuesCount} open contractual/site issues, and ROW clearance at ${rowClearPct.toFixed(1)}%.`
      },
      finding: mgmtScore >= 75
        ? `Effective contract administration and multi-domain coordination across G6, G7, G8, G10, and G12 (${mgmtScore.toFixed(1)}%).`
        : `Administrative and risk/ROW constraints (G8: ${g8Score.toFixed(1)}%, G10: ${g10Score.toFixed(1)}%) depressing overall governance score.`,
      statusColor: mgmtGradeInfo.badgeClass,
      linkedGoalIds: ['G12', 'G8', 'G10', 'G7', 'G6'],
      linkedGoalLabels: [
        goalNameMap['G12'] || 'G12: Contract Compliance',
        goalNameMap['G8'] || 'G8: Risk Management',
        goalNameMap['G10'] || 'G10: ROW Management',
        goalNameMap['G7'] || 'G7: Claim & Dispute',
        goalNameMap['G6'] || 'G6: Design Management'
      ],
      linkedCriteria: mgmtLinkedCriteria,
      evidenceMetrics: [
        { label: 'G12 Contract Compliance', value: `${g12Score.toFixed(1)}%`, status: g12Score >= 80 ? 'positive' : 'warning' },
        { label: 'G8 Risk Management', value: `${g8Score.toFixed(1)}% (${criticalRisksCount} crit)`, status: g8Score >= 65 ? 'positive' : 'critical' },
        { label: 'G10 ROW Clearance', value: `${g10Score.toFixed(1)}% (${rowClearPct.toFixed(1)}%)`, status: g10Score >= 75 ? 'positive' : 'warning' },
        { label: 'G7 Claim & Dispute', value: `${g7Score.toFixed(1)}%`, status: g7Score >= 75 ? 'positive' : 'warning' },
        { label: 'Work Program / Issues', value: `${project.workProgram.length} acts / ${openIssuesCount} open`, status: 'neutral' }
      ]
    },
    {
      id: 'financial',
      name: 'Financial Control, Variations & Securities',
      weight: 5,
      scorePct: financialScore,
      scaleValue: financialGradeInfo.scaleValue,
      grade: financialGradeInfo.grade,
      letter: financialGradeInfo.letter,
      pointsEarned: financialPoints,
      criteria: 'Validity of Contract Guarantees & Insurances (SC12.3: CC-3A..CC-3F), Variation Cost Overrun & Trend (G3: CM-1, CM-2), IPC certification flow, and Claim Assessment (CL-4).',
      evaluationBasis: 'Financial Ledger + Bonds Register + KPI G3/SC12.3/CL-4',
      telemetrySummary: `Orig BAC: ETB ${(origContractVal / 1e6).toFixed(2)}M · Net VO: ETB ${(netVariationVal / 1e6).toFixed(2)}M (+${variationPct.toFixed(2)}%) · Valid Securities: ${validBonds}/${bondsList.length} (${expiredBonds} expired) · IPCs: ${paidIpcCount}/${ipcList.length} Paid (ETB ${(ipcCertifiedSum / 1e6).toFixed(1)}M)`,
      attribution: {
        contractor: `IPC billing across ${ipcList.length} tracked certificates totals ETB ${(ipcCertifiedSum / 1e6).toFixed(2)}M; advance repayment stands at ${advRecoveryPct.toFixed(1)}%.`,
        employerOrExternal: `${expiredBonds > 0 ? `ALERT: ${expiredBonds} expired bond/insurance instrument(s) require immediate renewal.` : `All ${validBonds}/${bondsList.length} active guarantees & insurances verified valid/recovered.`} Net VO growth is +${variationPct.toFixed(2)}%.`
      },
      finding: expiredBonds > 0
        ? `${expiredBonds} expired guarantee/insurance policy detected—immediate contractual renewal required under FIDIC Clause 4.2/18.`
        : `Variation growth (+${variationPct.toFixed(2)}% of BAC) and active security instruments remain compliant (${financialScore.toFixed(1)}%).`,
      statusColor: financialGradeInfo.badgeClass,
      linkedGoalIds: ['G3', 'G7', 'G12'],
      linkedGoalLabels: [`${goalNameMap['G3'] || 'G3: Cost Management'}`, `G7 (CL-4 Substantiation)`, `G12 (SC12.3 Guarantees & Insurances)`],
      linkedCriteria: financialLinkedCriteria,
      evidenceMetrics: [
        { label: 'Original Contract (BAC)', value: `ETB ${(origContractVal / 1e6).toFixed(2)}M`, status: 'neutral' },
        { label: 'Net Variation vs BAC', value: `+${variationPct.toFixed(2)}% (ETB ${(netVariationVal / 1e6).toFixed(2)}M)`, status: variationPct <= 15 ? 'positive' : 'critical' },
        { label: 'Bonds & Insurances', value: `${validBonds} Valid / ${expiredBonds} Expired`, status: expiredBonds === 0 ? 'positive' : 'critical' },
        { label: 'IPCs Paid / Certified', value: `${paidIpcCount}/${ipcList.length} (ETB ${(ipcCertifiedSum / 1e6).toFixed(1)}M)`, status: 'neutral' },
        {
          label: 'SC12.3 Securities Score',
          value: sc123RawScore < 0 ? 'N/A' : `${sc123Score.toFixed(1)}%`,
          status: sc123RawScore < 0 ? 'neutral' : sc123Score >= 80 ? 'positive' : 'warning'
        }
      ]
    },
    {
      id: 'hse',
      name: 'HSE, Environment & Social Safeguards',
      weight: 5,
      scorePct: hseScore,
      scaleValue: hseGradeInfo.scaleValue,
      grade: hseGradeInfo.grade,
      letter: hseGradeInfo.letter,
      pointsEarned: hsePoints,
      criteria: 'ESOSH Environmental, OHS & Traffic Management compliance (G9: HS-1A..3C) integrated with Stakeholder Grievance Redress & Local Content (G11: SH-1A..3B).',
      evaluationBasis: 'KPI G9 ESOSH (70%) + KPI G11 Stakeholder (30%) + Site Issues Log',
      telemetrySummary: `G9 ESOSH: ${g9Score.toFixed(1)}% (Env: ${Math.max(0, getSscScore('SC9.1')).toFixed(0)}%, OHS: ${Math.max(0, getSscScore('SC9.2')).toFixed(0)}%, TMP: ${Math.max(0, getSscScore('SC9.3')).toFixed(0)}%) · G11 Stakeholder: ${g11Score.toFixed(1)}% · HSE Issues Logged: ${hseIssues.length} (${openHseIssues.length} open)`,
      attribution: {
        contractor: `ESOSH management scores ${g9Score.toFixed(1)}% across EMP/SSEMP, OHS site clinics & PPE, and Traffic Management Plan execution.`,
        employerOrExternal: `Stakeholder grievance & local subcontractor engagement (G11) stands at ${g11Score.toFixed(1)}% (${openHseIssues.length} open HSE issue(s)).`
      },
      finding: hseScore >= 80
        ? `HSE safeguards and stakeholder engagement standards consistently maintained (${hseScore.toFixed(1)}%).`
        : `Safety, environmental, or grievance mitigation indicators (${hseScore.toFixed(1)}%) require intensified site supervision.`,
      statusColor: hseGradeInfo.badgeClass,
      linkedGoalIds: ['G9', 'G11'],
      linkedGoalLabels: [goalNameMap['G9'] || 'G9: ESOSH Management', goalNameMap['G11'] || 'G11: Stakeholder Management'],
      linkedCriteria: hseLinkedCriteria,
      evidenceMetrics: [
        { label: 'G9 ESOSH Composite', value: `${g9Score.toFixed(1)}%`, status: g9Score >= 80 ? 'positive' : 'warning' },
        { label: 'SC9.1 Environmental', value: `${Math.max(0, getSscScore('SC9.1')).toFixed(1)}%`, status: 'neutral' },
        { label: 'SC9.2 OHS & Clinics', value: `${Math.max(0, getSscScore('SC9.2')).toFixed(1)}%`, status: 'neutral' },
        { label: 'SC9.3 Traffic Mgmt', value: `${Math.max(0, getSscScore('SC9.3')).toFixed(1)}%`, status: 'neutral' },
        { label: 'G11 Stakeholder / Local', value: `${g11Score.toFixed(1)}%`, status: g11Score >= 75 ? 'positive' : 'warning' }
      ]
    }
  ];

  // Coverage stats across full hierarchy
  const linkedGoalIdSet = new Set<string>();
  const linkedItemIdSet = new Set<string>();
  pillars.forEach(p => {
    p.linkedGoalIds.forEach(gid => linkedGoalIdSet.add(gid));
    p.linkedCriteria.forEach(c => linkedItemIdSet.add(c.itemId));
  });

  // Dynamic determination generated purely from live evaluation metrics
  const sortedByScoreDesc = [...pillars].sort((a, b) => b.scorePct - a.scorePct);
  const topPillars = sortedByScoreDesc.slice(0, 2);
  const laggingPillars = [...pillars].filter(p => p.scorePct < 70).sort((a, b) => a.scorePct - b.scorePct);

  const contractorLabel = project.contractor || 'Assigned Contractor';
  const projectLabel = project.name || 'Road Construction Project';

  const strengthSummary = `${contractorLabel} records strongest performance in ${topPillars[0].name} (${topPillars[0].scorePct.toFixed(1)}%) and ${topPillars[1].name} (${topPillars[1].scorePct.toFixed(1)}%) for ${selectedMonth}.`;

  const causalAnalysis = laggingPillars.length > 0
    ? `Primary performance constraints on ${projectLabel} stem from ${laggingPillars.slice(0, 2).map(p => `${p.name} (${p.scorePct.toFixed(1)}%)`).join(' and ')}. Physical accomplishment (${actualProgressVal.toFixed(2)}%) vs original baseline (${origPlanPct.toFixed(1)}%) yields SPI ${evmMetrics.SPI.toFixed(3)}, while ${criticalRisksCount} critical risks and ROW clearance (${rowClearPct.toFixed(1)}%) shape external/site conditions.`
    : `All eight evaluation pillars meet or exceed the 70% operational threshold on ${projectLabel}, with balanced execution across schedule (SPI ${evmMetrics.SPI.toFixed(3)}), technical QA/QC (${qualityScore.toFixed(1)}%), and financial/security controls (${financialScore.toFixed(1)}%).`;

  let riskLevel: 'Low' | 'Moderate' | 'Elevated' | 'Critical' = 'Low';
  let contractClauseRef = 'FIDIC Red Book Sub-Clause 4.1 & 8.3';
  let correctiveAction = `Continue monthly KPI progress tracking and sustain QA/QC, HSE, and financial certification cadence for ${selectedMonth} (${totalPointsEarned.toFixed(2)} pts · ${overallAuditGrade.grade} / Grade ${overallAuditGrade.letter}).`;

  if (compositeScorePct < 45 || expiredBonds > 0) {
    riskLevel = 'Critical';
    contractClauseRef = expiredBonds > 0 ? 'FIDIC Sub-Clause 4.2, 15.1 & 18.1' : 'FIDIC Sub-Clause 8.6 & 15.1';
    correctiveAction = `Issue formal Notice to Correct under ${contractClauseRef}. Mandate immediate recovery staffing/fleet mobilization plan within 14 days${expiredBonds > 0 ? ' and immediate renewal of expired guarantees/insurances prior to next IPC release' : ''}. Weighted score: ${totalPointsEarned.toFixed(2)} pts (${overallAuditGrade.grade}).`;
  } else if (compositeScorePct < 60) {
    riskLevel = 'Elevated';
    contractClauseRef = 'FIDIC Sub-Clause 8.3 & 8.6 [Rate of Progress]';
    correctiveAction = `Require a revised Clause 8.3/8.6 recovery programme targeting lagging deliverables (${laggingPillars.map(p => p.name).join(', ') || 'schedule recovery'}) with weekly production milestones enforced before retention reduction.`;
  } else if (compositeScorePct < 75) {
    riskLevel = 'Moderate';
    contractClauseRef = 'FIDIC Sub-Clause 4.21 & 8.6';
    correctiveAction = `Maintain heightened Resident Engineer monitoring on ${laggingPillars[0]?.name || 'schedule & layer pacing'} and close open submittals/risk mitigations to elevate composite standing into Grade B (>=75%).`;
  }

  return {
    pillars,
    compositeScorePct,
    overallAuditGrade,
    totalPointsEarned,
    totalLinkedCriteriaCount: linkedItemIdSet.size,
    totalActiveCriteriaCount: kpis.length,
    linkedGoalCoverageCount: linkedGoalIdSet.size,
    totalGoalCount: hierarchy.length,
    determination: {
      strengthSummary,
      causalAnalysis,
      correctiveAction,
      riskLevel,
      contractClauseRef
    }
  };
}
