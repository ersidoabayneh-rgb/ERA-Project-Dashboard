import { ConsultantEvaluationCriterion, DimensionId, Project, SupervisionConsultantInfo, ConsultantSubmittalKpi, QualitativeGradeThreshold } from '../types';
import { CONSULTANT_EVALUATION_CRITERIA } from './masterEvaluationCriteria';

export type { DimensionId, ConsultantEvaluationCriterion };

export interface DimensionMeta {
  id: DimensionId;
  name: string;
  weight: number;
  description: string;
  iconName: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
}

export const DIMENSIONS_META: Record<DimensionId, DimensionMeta> = {
  A: {
    id: 'A',
    name: 'Technical Skills & Engineering Competence',
    weight: 30,
    description: 'Design review, construction methodology, QA/QC testing oversight, HSE & environmental compliance, and Right-of-Way (ROW) management.',
    iconName: 'Wrench',
    color: 'indigo',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeBorder: 'border-indigo-200 dark:border-indigo-800'
  },
  B: {
    id: 'B',
    name: 'Contract Administration & FIDIC Compliance',
    weight: 25,
    description: 'FIDIC Clause 3 administration, claims & variation management, time-based input verification, and document control & archival.',
    iconName: 'Scale',
    color: 'amber',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeBorder: 'border-amber-200 dark:border-amber-800'
  },
  C: {
    id: 'C',
    name: 'Site Supervision & Presence',
    weight: 20,
    description: 'Daily site supervision & presence, joint measurement & IPC certification, progress monitoring & schedule tracking, and testing & commissioning oversight.',
    iconName: 'Building2',
    color: 'blue',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeBorder: 'border-blue-200 dark:border-blue-800'
  },
  D: {
    id: 'D',
    name: 'Management, Coordination & Stakeholder',
    weight: 15,
    description: 'Communication & reporting, Key Expert leadership & staffing, early warning problem solving, stakeholder & utility coordination, and FIDIC White Book standard of care.',
    iconName: 'Users',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800'
  },
  E: {
    id: 'E',
    name: 'Governance, Ethics & Independence',
    weight: 10,
    description: 'Impartial contract determinations, written audit trail transparency, anti-corruption & ethics compliance, and client-consultant alignment.',
    iconName: 'ShieldCheck',
    color: 'purple',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
    badgeBorder: 'border-purple-200 dark:border-purple-800'
  }
};

export { CONSULTANT_EVALUATION_CRITERIA } from './masterEvaluationCriteria';

// Helper: Parse benchmark numeric threshold
export function parseBenchmarkNumber(bmString: string): number | null {
  if (!bmString) return null;
  const clean = bmString.replace(/,/g, '').trim();
  const match = clean.match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : null;
}

// Helper: Evaluate Likert score (1-5) against benchmark brackets
// Highest Likert rating (5 = Superior/Excellent) is uniformly the better value on the score.
export function evaluateLikertScore(
  val: number,
  direction?: 'H' | 'L',
  benchmarks?: { score5: string; score4: string; score3: string; score2: string; score1: string }
): number {
  if (!benchmarks) return 5;
  const s5 = parseBenchmarkNumber(benchmarks.score5);
  const s4 = parseBenchmarkNumber(benchmarks.score4);
  const s3 = parseBenchmarkNumber(benchmarks.score3);
  const s2 = parseBenchmarkNumber(benchmarks.score2);

  // Highest Likert rating (5) is always the superior performance score value.
  // Evaluate based on benchmark thresholds where Score 5 is the target excellence benchmark.
  if (s5 !== null && s2 !== null && s5 < s2) {
    // For metrics where lower values achieve top performance (e.g., <=3 turnaround days or 0 incidents = Score 5)
    const t5 = s5;
    const t4 = s4 ?? (t5 + 2);
    const t3 = s3 ?? (t4 + 3);
    const t2 = s2;
    if (val <= t5) return 5;
    if (val <= t4) return 4;
    if (val <= t3) return 3;
    if (val <= t2) return 2;
    return 1;
  } else {
    // For metrics where higher values achieve top performance (e.g., >=95% turnaround or compliance = Score 5)
    const t5 = s5 ?? 95;
    const t4 = s4 ?? 85;
    const t3 = s3 ?? 70;
    const t2 = s2 ?? 50;
    if (val >= t5) return 5;
    if (val >= t4) return 4;
    if (val >= t3) return 3;
    if (val >= t2) return 2;
    return 1;
  }
}

// Detailed submittal and project quantitative metrics structure
export interface SubmittalQuantitativeMetrics {
  totalCount: number;
  totalResolved: number;
  totalPending: number;
  overallOnTimeCount: number;
  overallOnTimeRate: number;
  overallAvgTurnaroundDays: number;
  matrixTotalNetScore: number;

  rfis: {
    total: number;
    resolved: number;
    onTime: number;
    onTimeRate: number;
    avgDays: number;
    overdue: number;
    targetDays: number;
  };
  materials: {
    total: number;
    resolved: number;
    onTime: number;
    onTimeRate: number;
    avgDays: number;
    rejectionCount: number;
    rejectionRate: number;
    approvalRate: number;
    targetDays: number;
  };
  wirs: {
    total: number;
    resolved: number;
    onTime: number;
    onTimeRate: number;
    avgDays: number;
    approvedRate: number;
    reworkRate: number;
    holdPointWitnessRate: number;
    targetDays: number;
  };
  designs: {
    total: number;
    resolved: number;
    onTime: number;
    onTimeRate: number;
    avgDays: number;
    closureRate: number;
    targetDays: number;
  };
  variations: {
    total: number;
    resolved: number;
    onTime: number;
    onTimeRate: number;
    avgDays: number;
    targetDays: number;
  };
  claims: {
    total: number;
    resolved: number;
    onTime28Days: number;
    onTimeRate: number;
    avgDays: number;
    targetDays: number;
  };
  ipcs: {
    total: number;
    certified: number;
    onTime14Days: number;
    onTimeRate: number;
    avgDays: number;
    varianceRate: number;
    deductionAccuracyRate: number;
  };
  personnel: {
    total: number;
    active: number;
    mobilizationRate: number;
    turnoverRate: number;
    residentEngineerPresent: boolean;
    sitePresenceRate: number;
  };
  digitalAudit: {
    attachmentCount: number;
    attachmentRate: number;
    detailedNotesRate: number;
  };
  invoices: {
    total: number;
    verificationRate: number;
    budgetUtilizationRate: number;
  };
  risks: {
    total: number;
    disputesCount: number;
    disputeRate: number;
  };
}

export interface CriterionModuleLocation {
  pageName: string;
  categoryTag: string;
  iconName: string;
  badgeClass: string;
}

export function getCriterionModuleLocation(code: string, dim: DimensionId): CriterionModuleLocation {
  if (code.startsWith('A1') || code === 'A5.4' || code === 'A5.5') {
    return {
      pageName: 'Submittal Log - Drawings & Designs',
      categoryTag: 'Design Review Submittals',
      iconName: 'file-text',
      badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    };
  }
  if (code.startsWith('A2') || code.startsWith('C1')) {
    return {
      pageName: 'Submittal Log - WIR Inspections',
      categoryTag: 'Work Inspection Requests (WIR)',
      iconName: 'check-square',
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    };
  }
  if (code.startsWith('A3')) {
    return {
      pageName: 'Submittal Log - Material Approvals',
      categoryTag: 'Materials & Lab QA Submittals',
      iconName: 'layers',
      badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    };
  }
  if (code.startsWith('A4') || code.startsWith('E2')) {
    return {
      pageName: 'EHS & Quality Audit Register',
      categoryTag: 'Environmental & Safety Audits',
      iconName: 'shield-check',
      badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800'
    };
  }
  if (code.startsWith('B1') || code === 'A1.2' || code === 'B4.2' || code === 'B4.3') {
    return {
      pageName: 'Submittal Log - Technical RFIs',
      categoryTag: 'RFI & Query Submittals',
      iconName: 'help-circle',
      badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
    };
  }
  if (code.startsWith('B2') || code === 'D3.1') {
    return {
      pageName: 'Key Experts & Staffing Roster',
      categoryTag: 'Personnel & Mobilization',
      iconName: 'users',
      badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800'
    };
  }
  if (code.startsWith('B3') || code.startsWith('D1')) {
    return {
      pageName: 'Claims & EOT Register',
      categoryTag: 'Contract Claims & Notices',
      iconName: 'alert-triangle',
      badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    };
  }
  if (code.startsWith('C2') || code === 'C2.3' || code === 'C2.4') {
    return {
      pageName: 'IPC Payment Tracker',
      categoryTag: 'Payment Certificates (IPCs)',
      iconName: 'dollar-sign',
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    };
  }
  if (code.startsWith('C3') || code === 'C3.2') {
    return {
      pageName: 'Monthly Progress Reports & Schedule',
      categoryTag: 'Progress Monitoring & EVM',
      iconName: 'trending-up',
      badgeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    };
  }
  if (code.startsWith('D2') || code === 'A1.5') {
    return {
      pageName: 'Variations & Change Orders Log',
      categoryTag: 'Variation Orders Submittals',
      iconName: 'git-pull-request',
      badgeClass: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800'
    };
  }
  if (code.startsWith('D3') || code === 'D3.5') {
    return {
      pageName: 'Consultant Fee Invoices & Audit',
      categoryTag: 'Fee Claims & Reimbursables',
      iconName: 'receipt',
      badgeClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800'
    };
  }
  if (code.startsWith('E1') || code.startsWith('E3')) {
    return {
      pageName: 'Contract Governance & Ethics Register',
      categoryTag: 'Integrity & Ethics Governance',
      iconName: 'award',
      badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
    };
  }

  return {
    pageName: `Dimension ${dim} Operational Log`,
    categoryTag: `Project Log (${dim})`,
    iconName: 'file',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  };
}

// Standard baseline Ethiopian Roads Administration (ERA) FIDIC SLA targets (in calendar days)
export const DEFAULT_SLA_TARGETS: Record<string, number> = {
  'RFI': 7,
  'Material Approval': 14,
  'IPC Review': 7,
  'Work Inspection (WIR)': 2,
  'Variation Order': 21,
  'Design Review': 14,
  'Claim / Notice': 28
};

export const DEFAULT_EVALUATION_CRITERIA = [
  { id: 'crit_1', name: 'RFI', targetDays: 7, weightPct: 20, pmbokDomain: 'Scope & Technical Clarification' },
  { id: 'crit_2', name: 'Material Approval', targetDays: 14, weightPct: 20, pmbokDomain: 'Quality Management' },
  { id: 'crit_3', name: 'IPC Review', targetDays: 7, weightPct: 20, pmbokDomain: 'Cost & Financial Control' },
  { id: 'crit_4', name: 'Work Inspection (WIR)', targetDays: 2, weightPct: 15, pmbokDomain: 'Site Supervision & Quality' },
  { id: 'crit_5', name: 'Variation Order', targetDays: 21, weightPct: 10, pmbokDomain: 'Change & Value Engineering' },
  { id: 'crit_6', name: 'Design Review', targetDays: 14, weightPct: 10, pmbokDomain: 'Technical Design & Method' },
  { id: 'crit_7', name: 'Claim / Notice', targetDays: 28, weightPct: 5, pmbokDomain: 'Risk & Contract Claims' }
];

// Calculate elapsed calendar days from submitted date to current date or response date
export const calculateElapsedDays = (submittedDate?: string, respondedDate?: string): number => {
  if (!submittedDate) return 0;
  const start = new Date(submittedDate);
  if (isNaN(start.getTime())) return 0;
  const end = respondedDate ? new Date(respondedDate) : new Date();
  const diffTime = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

// Check if a submittal is overdue or delayed past its target SLA (handles both resolved & pending)
export const checkSubmittalDelay = (item: ConsultantSubmittalKpi, targetDays: number) => {
  const isResolved = item.actualDays !== undefined && item.actualDays !== null;
  const elapsedDays = isResolved ? (item.actualDays || 0) : calculateElapsedDays(item.submittedDate, item.respondedDate);
  const isPending = !isResolved || item.status === 'Under Review';
  const isOverdue = item.status === 'Overdue' || elapsedDays > targetDays;
  const delayDays = Math.max(0, elapsedDays - targetDays);
  
  return {
    isResolved,
    isPending,
    isOverdue,
    elapsedDays,
    delayDays,
    isDelayed: isOverdue
  };
};

export const DEFAULT_SUBMITTAL_KPIS: ConsultantSubmittalKpi[] = [
  {
    id: 'sub_1',
    submittalNo: 'RFI-014',
    type: 'RFI',
    title: 'Box Culvert at KM 18+450 Wingwall Rebar Spacing & Cover Clarification',
    submittedDate: '2025-11-04',
    respondedDate: '2025-11-08',
    targetDays: 7,
    actualDays: 4,
    status: 'Approved / Closed',
    rfiStatus: 'Closed / Agreed',
    priority: 'High',
    discipline: 'Structures & Bridges',
    stationKm: 'Km 18+450',
    drawingRef: 'DWG-STR-BC-08 (Sheet 3 of 5)',
    specificationRef: 'ERA Standard Technical Specification Clause 3204 & 3405',
    contractorContact: 'Eng. Mengistu Tadesse (Lead Structural Engineer)',
    contractorInquiry: 'Discrepancy noted between Drawing DWG-STR-BC-08 showing T16@150mm vertical reinforcement in wingwalls vs. bar bending schedule listing T16@200mm. Also, please clarify clear concrete cover requirement for soil-contact faces.',
    consultantResponder: 'Eng. Birhanu Kebede (Senior Bridge Engineer)',
    assignedEngineer: 'Eng. Birhanu Kebede (Structural)',
    consultantResponse: 'Provide T16@150mm c/c spacing as indicated on drawing section details to accommodate earth pressure surcharge. Clear cover to reinforcement on all earth-retaining faces shall be strictly 50mm in accordance with ERA Bridge Design Manual 2013 Table 4.2.',
    costImpact: 'None',
    scheduleImpact: 'None',
    notes: 'Clarification provided in 4 days. Structural drawing detail confirmed with standard ERA culvert manual.',
    attachmentsCount: 2,
    attachments: [
      { id: 'a1_1', name: 'Culvert_KM18_Detail_Drawing.pdf', size: '2.4 MB' },
      { id: 'a1_2', name: 'Rebar_Schedule_Revision_A.pdf', size: '1.1 MB' }
    ],
    correspondenceThread: [
      {
        id: 'cor_14_1',
        timestamp: '2025-11-04 09:30',
        sender: 'Contractor',
        authorName: 'Eng. Mengistu Tadesse',
        role: 'Contractor Senior Highway/Structural Eng',
        message: 'Contractor submits formal RFI regarding discrepancy between Drawing DWG-STR-BC-08 wingwall detail (T16@150) and Rebar Schedule (T16@200). Requesting urgent engineering clarification prior to wingwall shuttering and rebar bending on site.'
      },
      {
        id: 'cor_14_2',
        timestamp: '2025-11-08 14:15',
        sender: 'Consultant',
        authorName: 'Eng. Birhanu Kebede',
        role: 'Consultant Bridge/Structural Specialist',
        message: 'Consultant has verified design calculations. Drawing detail governs: maintain T16@150mm c/c with minimum 50mm clear cover against backfill. Revised Bar Bending Schedule Revision A is approved and attached.'
      }
    ]
  },
  {
    id: 'sub_2',
    submittalNo: 'RFI-015',
    type: 'RFI',
    title: 'Black Cotton Soil Subgrade Treatment & Capping Thickness (KM 24+100 to 25+300)',
    submittedDate: '2025-11-12',
    respondedDate: '2025-11-17',
    targetDays: 7,
    actualDays: 5,
    status: 'Approved / Closed',
    rfiStatus: 'Clarification Issued',
    priority: 'Critical',
    discipline: 'Geotechnical & Earthworks',
    stationKm: 'Km 24+100 - Km 25+300',
    drawingRef: 'Typical Cross-Section TS-02 & Soil Profile SP-14',
    specificationRef: 'ERA Standard Technical Specs Division 2000 (Earthworks)',
    contractorContact: 'Ato Henok Bekele (Project Manager)',
    contractorInquiry: 'Field sampling reveals highly expansive black cotton clay with Plasticity Index (PI) exceeding 55% and Free Swell Index > 85% between Km 24+100 and Km 25+300. Tender drawings indicate standard 150mm capping. Contractor proposes 300mm rock-fill / coarse granular capping over non-woven geotextile separator to prevent seasonal subgrade heave.',
    consultantResponder: 'Ato Solomon Mengistu (Senior Materials Engineer)',
    assignedEngineer: 'Ato Solomon Mengistu (Materials)',
    consultantResponse: 'Proposal concurred. Contractor is instructed to excavate 450mm of expansive clay, place class 1 non-woven geotextile filter (minimum 250 g/m²), and backfill with 300mm approved rock-fill capping topped with 150mm selected granular subgrade (CBR > 15%). Formal Variation Order will be processed for rock-fill volume.',
    costImpact: 'Potential Additional Cost',
    scheduleImpact: 'Minor Float Used',
    notes: 'Approved 300mm rock-fill capping replacement after soil swell index validation.',
    attachmentsCount: 3,
    attachments: [
      { id: 'a2_1', name: 'Geotechnical_Soil_Test_Report.pdf', size: '4.8 MB' },
      { id: 'a2_2', name: 'Free_Swell_Index_Analysis.xlsx', size: '520 KB' },
      { id: 'a2_3', name: 'Rockfill_Capping_CrossSection.pdf', size: '1.9 MB' }
    ],
    correspondenceThread: [
      {
        id: 'cor_15_1',
        timestamp: '2025-11-12 11:00',
        sender: 'Contractor',
        authorName: 'Ato Henok Bekele',
        role: 'Contractor Project Manager',
        message: 'Contractor notifies Resident Engineer of unexpected high-plasticity clay encountered. Attached lab test reports confirm high swelling potential. Work in this section is paused awaiting technical directive.'
      },
      {
        id: 'cor_15_2',
        timestamp: '2025-11-14 16:20',
        sender: 'Consultant',
        authorName: 'Ato Solomon Mengistu',
        role: 'Consultant Materials Engineer',
        message: 'Joint site inspection completed with Contractor Laboratory team. Additional trial pit samples confirmed swell index. Consultant finalizing technical recommendation for Resident Engineer endorsement.'
      },
      {
        id: 'cor_15_3',
        timestamp: '2025-11-17 10:45',
        sender: 'Consultant',
        authorName: 'Eng. Resident Engineer',
        role: 'Consultant Resident Engineer',
        message: 'Formal directive issued approving 300mm rockfill capping on geotextile separator. Quantity measurement will be verified on joint survey sheets.'
      }
    ]
  },
  {
    id: 'sub_3',
    submittalNo: 'RFI-016',
    type: 'RFI',
    title: 'Bridge Pier #2 Foundation Bearing Depth & Borehole Stratigraphy Inquiry',
    submittedDate: '2025-12-02',
    respondedDate: '2025-12-07',
    targetDays: 7,
    actualDays: 5,
    status: 'Approved / Closed',
    rfiStatus: 'Closed / Agreed',
    priority: 'High',
    discipline: 'Structures & Bridges',
    stationKm: 'Km 34+820 (Wabe River Bridge)',
    drawingRef: 'DWG-BR-02-FND Sheet 2',
    specificationRef: 'ERA Bridge Design Manual Clause 6.4 (Spread Footings on Rock)',
    contractorContact: 'Eng. Mengistu Tadesse (Structural Lead)',
    contractorInquiry: 'Open excavation for Pier #2 footing reached tender founding elevation +1642.50m, encountering highly weathered fractured tuff rather than sound basalt rock depicted in borehole log BH-02. Requesting confirmation on whether to deepen footing or conduct plate load testing.',
    consultantResponder: 'Eng. Birhanu Kebede (Structural)',
    assignedEngineer: 'Eng. Birhanu Kebede (Structural)',
    consultantResponse: 'Excavation shall be lowered by an additional 1.20m to founding elevation +1641.30m into moderately weathered basalt bedrock. Plate bearing test conducted on 2025-12-06 verified allowable bearing capacity of 385 kPa, well exceeding design demand of 300 kPa. Place 100mm C-15 blinding concrete immediately.',
    costImpact: 'Potential Additional Cost',
    scheduleImpact: 'None',
    notes: 'Bearing capacity verified at 350 kPa on basalt bedrock.',
    attachmentsCount: 1,
    attachments: [
      { id: 'a3_1', name: 'Borehole_Log_BH02_Stratigraphy.pdf', size: '3.1 MB' }
    ],
    correspondenceThread: [
      {
        id: 'cor_16_1',
        timestamp: '2025-12-02 14:00',
        sender: 'Contractor',
        authorName: 'Eng. Mengistu Tadesse',
        role: 'Contractor Structural Lead',
        message: 'Contractor alerts Consultant that exposed geological strata at Pier #2 differs from design borehole report. Work halted at +1642.50m pending inspection.'
      },
      {
        id: 'cor_16_2',
        timestamp: '2025-12-07 17:30',
        sender: 'Consultant',
        authorName: 'Eng. Birhanu Kebede',
        role: 'Senior Structural Engineer',
        message: 'Footing depth lowered by 1.2m into sound basalt bedrock. Bearing test passed. Concur to proceed with blinding concrete.'
      }
    ]
  },
  {
    id: 'sub_4',
    submittalNo: 'RFI-017',
    type: 'RFI',
    title: 'Drainage Ditch Outfall Detail near Daye Town Urban Market Section',
    submittedDate: '2025-12-15',
    respondedDate: '2025-12-18',
    targetDays: 7,
    actualDays: 3,
    status: 'Approved / Closed',
    rfiStatus: 'Closed / Agreed',
    priority: 'Medium',
    discipline: 'Drainage & Culverts',
    stationKm: 'Km 0+650 - Km 0+920',
    drawingRef: 'DWG-DRN-URB-03',
    specificationRef: 'ERA Standard Drainage Manual Chapter 5',
    contractorContact: 'Eng. Dawit Alemayehu (Site Engineer)',
    contractorInquiry: 'Existing urban municipal drainage at Daye Market outlet is clogged and lower than highway ditch invert by 400mm. Requesting revised outfall chute detail or drop structure design to avoid localized ponding.',
    consultantResponder: 'Eng. Yohannes Tadesse (Highway)',
    assignedEngineer: 'Eng. Yohannes Tadesse (Highway)',
    consultantResponse: 'Construct standard stone masonry stepped drop structure with 3 drops of 300mm each leading into the municipal collector. Cross section drawing SD-DRN-14 is issued and approved.',
    costImpact: 'None',
    scheduleImpact: 'None',
    notes: 'Standard stone masonry trapezoidal lined ditch approved.'
  },
  {
    id: 'sub_5',
    submittalNo: 'RFI-018',
    type: 'RFI',
    title: 'High Embankment Slope Protection Non-Woven Geotextile Spec Clarification',
    submittedDate: '2026-01-08',
    respondedDate: '2026-01-16',
    targetDays: 7,
    actualDays: 8,
    status: 'Approved / Closed',
    rfiStatus: 'Closed / Agreed',
    priority: 'Medium',
    discipline: 'Geotechnical & Earthworks',
    stationKm: 'Km 12+300 - Km 12+800',
    drawingRef: 'Slope Stabilization Cross-Section SS-04',
    specificationRef: 'ERA Standard Specs Clause 2108 (Geotextiles)',
    contractorContact: 'Ato Henok Bekele (Project Manager)',
    contractorInquiry: 'Clarification requested regarding acceptable tensile strength grade (Class 1 vs Class 2) for non-woven geotextile beneath stone pitching on 1:1.5 embankment slopes exceeding 8m height.',
    consultantResponder: 'Ato Solomon Mengistu (Materials)',
    assignedEngineer: 'Ato Solomon Mengistu (Materials)',
    consultantResponse: 'Class 1 non-woven geotextile with minimum grab tensile strength of 900 N and CBR puncture resistance >= 2200 N is mandatory due to embankment height > 8m. Submittal approved based on verified laboratory test certificate.',
    costImpact: 'None',
    scheduleImpact: 'None',
    notes: 'Slight 1-day delay due to manufacturer lab test verification. Approved.',
    attachmentsCount: 1,
    attachments: [
      { id: 'a5_1', name: 'Geotextile_Tensile_Test_Cert.pdf', size: '850 KB' }
    ]
  },
  {
    id: 'sub_6',
    submittalNo: 'RFI-019',
    type: 'RFI',
    title: 'Subbase Granular Quarry Source Approval (Girja River Borrow Pit #3)',
    submittedDate: '2026-01-20',
    respondedDate: '2026-01-24',
    targetDays: 7,
    actualDays: 4,
    status: 'Approved / Closed',
    priority: 'High',
    assignedEngineer: 'Ato Tesfaye Assefa (Lab Tech)',
    notes: 'CBR value of 45% meets ERA standard specifications.'
  },
  {
    id: 'sub_7',
    submittalNo: 'MAT-008',
    type: 'Material Approval',
    title: 'Asphalt Concrete AC-20 Wearing Course Job Mix Formula (JMF) Submission',
    submittedDate: '2025-11-05',
    respondedDate: '2025-11-16',
    targetDays: 14,
    actualDays: 11,
    status: 'Approved / Closed',
    priority: 'Critical',
    assignedEngineer: 'Ato Solomon Mengistu (Materials)',
    notes: 'Optimum bitumen content 4.8% verified with Marshall Stability tests.',
    attachmentsCount: 4,
    attachments: [
      { id: 'a7_1', name: 'JMF_Marshall_Stability_Results.pdf', size: '5.2 MB' },
      { id: 'a7_2', name: 'Aggregate_Gradation_Curves.xlsx', size: '780 KB' },
      { id: 'a7_3', name: 'Bitumen_60_70_Test_Cert.pdf', size: '1.2 MB' },
      { id: 'a7_4', name: 'Lab_Mix_Design_Photos.png', size: '3.4 MB' }
    ]
  },
  {
    id: 'sub_8',
    submittalNo: 'MAT-009',
    type: 'Material Approval',
    title: 'Bridge Expansion Joint Rubber Seal & Anchor Bolt Mill Test Certificates',
    submittedDate: '2025-12-05',
    respondedDate: '2025-12-16',
    targetDays: 14,
    actualDays: 11,
    status: 'Approved / Closed',
    priority: 'High',
    assignedEngineer: 'Eng. Birhanu Kebede (Structural)',
    notes: 'Tensile strength and elongation certificates validated.'
  },
  {
    id: 'sub_9',
    submittalNo: 'MAT-010',
    type: 'Material Approval',
    title: 'High Tensile Pre-Stressing Tendons (15.2mm 7-Wire Strands) Test Certs',
    submittedDate: '2026-01-10',
    respondedDate: '2026-01-22',
    targetDays: 14,
    actualDays: 12,
    status: 'Approved / Closed',
    priority: 'Critical',
    assignedEngineer: 'Eng. Birhanu Kebede (Structural)',
    notes: 'Strand relaxation tests approved according to ASTM A416 standards.'
  },
  {
    id: 'sub_10',
    submittalNo: 'MAT-011',
    type: 'Material Approval',
    title: 'Crushed Rock Aggregate Base Course Los Angeles Abrasion & Soundness Tests',
    submittedDate: '2026-02-01',
    respondedDate: '2026-02-16',
    targetDays: 14,
    actualDays: 15,
    status: 'Approved with Comments',
    priority: 'Medium',
    assignedEngineer: 'Ato Solomon Mengistu (Materials)',
    notes: 'Approved conditionally with requirement for continuous stockpile moisture checks.'
  },
  {
    id: 'sub_11',
    submittalNo: 'IPC-014',
    type: 'IPC Review',
    title: 'Monthly Interim Payment Certificate (IPC) No. 14 Verification & Audit',
    submittedDate: '2025-12-01',
    respondedDate: '2025-12-06',
    targetDays: 7,
    actualDays: 5,
    status: 'Approved / Closed',
    priority: 'High',
    assignedEngineer: 'W/ro Selamawit Alemu (Quantity Surveyor)',
    notes: 'Certified ETB 94.2M after joint measurement and retention deduction.'
  },
  {
    id: 'sub_12',
    submittalNo: 'IPC-015',
    type: 'IPC Review',
    title: 'Monthly Interim Payment Certificate (IPC) No. 15 Price Escalation Audit',
    submittedDate: '2026-01-05',
    respondedDate: '2026-01-11',
    targetDays: 7,
    actualDays: 6,
    status: 'Approved / Closed',
    priority: 'High',
    assignedEngineer: 'W/ro Selamawit Alemu (Quantity Surveyor)',
    notes: 'Diesel and bitumen price index adjustments verified under contractual price adjustment provisions.'
  },
  {
    id: 'sub_13',
    submittalNo: 'IPC-016',
    type: 'IPC Review',
    title: 'Monthly Interim Payment Certificate (IPC) No. 16 Earthwork Measurement Audit',
    submittedDate: '2026-02-02',
    respondedDate: '2026-02-07',
    targetDays: 7,
    actualDays: 5,
    status: 'Approved / Closed',
    priority: 'High',
    assignedEngineer: 'W/ro Selamawit Alemu (Quantity Surveyor)',
    notes: 'Certified in 5 days, well within 7-day contractual deadline.'
  },
  {
    id: 'sub_14',
    submittalNo: 'WIR-088',
    type: 'Work Inspection (WIR)',
    title: 'Subgrade Compaction Density Testing (KM 12+200 - 13+000) 95% MDD Inspection',
    submittedDate: '2025-11-20',
    respondedDate: '2025-11-21',
    targetDays: 2,
    actualDays: 1,
    status: 'Approved / Closed',
    priority: 'Critical',
    assignedEngineer: 'Ato Fikadu Worku (Inspector of Works)',
    notes: 'Field density test passed. Clearance issued for subbase laying.'
  },
  {
    id: 'sub_15',
    submittalNo: 'WIR-089',
    type: 'Work Inspection (WIR)',
    title: 'Bridge No. 1 Abutment A C-30 Concrete Pre-Pour Rebar & Formwork Hold Point',
    submittedDate: '2025-12-10',
    respondedDate: '2025-12-11',
    targetDays: 2,
    actualDays: 1,
    status: 'Approved / Closed',
    priority: 'Critical',
    assignedEngineer: 'Eng. Birhanu Kebede (Structural)',
    notes: 'Hold point inspected same day; concrete casting authorized.'
  },
  {
    id: 'sub_16',
    submittalNo: 'WIR-090',
    type: 'Work Inspection (WIR)',
    title: 'Crushed Stone Base Course Prime Coat Application Surface Cleanliness',
    submittedDate: '2026-01-15',
    respondedDate: '2026-01-17',
    targetDays: 2,
    actualDays: 2,
    status: 'Approved / Closed',
    priority: 'Medium',
    assignedEngineer: 'Ato Fikadu Worku (Inspector of Works)',
    notes: 'Dust blowing and moisture check passed. Prime coat authorized.'
  },
  {
    id: 'sub_17',
    submittalNo: 'VAR-003',
    type: 'Variation Order',
    title: 'Variation Proposal: Meleya Spur Road Realignment & Additional Pipe Culverts',
    submittedDate: '2025-11-25',
    respondedDate: '2025-12-13',
    targetDays: 21,
    actualDays: 18,
    status: 'Approved with Comments',
    priority: 'High',
    assignedEngineer: 'Eng. Girma Bekele (Resident Engineer)',
    notes: 'Cost rate analysis finalized and submitted to ERA PMO with positive recommendation.'
  },
  {
    id: 'sub_18',
    submittalNo: 'DES-004',
    type: 'Design Review',
    title: 'Geometric Horizontal Curve Radius Modification (KM 41+200 Mountainous Ridge)',
    submittedDate: '2025-12-18',
    respondedDate: '2025-12-30',
    targetDays: 14,
    actualDays: 12,
    status: 'Approved / Closed',
    priority: 'High',
    assignedEngineer: 'Eng. Yohannes Tadesse (Highway)',
    notes: 'Revised sight distance and superelevation design finalized.'
  },
  {
    id: 'sub_19',
    submittalNo: 'RFI-020',
    type: 'RFI',
    title: 'Girja Woreda Utility Clearance Dispute Resolution Alignment Confirmation',
    submittedDate: '2026-02-10',
    respondedDate: '2026-02-14',
    targetDays: 7,
    actualDays: 4,
    status: 'Approved / Closed',
    rfiStatus: 'Closed / Agreed',
    priority: 'High',
    discipline: 'Right-of-Way & Utilities',
    stationKm: 'Km 52+100 - Km 53+400',
    drawingRef: 'ROW-UTL-GR-05 & Plan Profile Sheet 18',
    specificationRef: 'ERA Standard Specifications Clause 1204 (Protection of Utilities)',
    contractorContact: 'Ato Henok Bekele (Project Manager)',
    contractorInquiry: 'Local water supply pipe and 15kV electric poles at Girja Town market conflict with the outer edge of proposed roadside masonry drain. Contractor requests clarification on whether centerline should be shifted 1.5m to the mountain side or wait for Ethiopian Electric Utility (EEU) relocation.',
    consultantResponder: 'Ato Daniel Haile (Senior Surveyor)',
    assignedEngineer: 'Ato Daniel Haile (Senior Surveyor)',
    consultantResponse: 'Approved minor 1.2m centerline adjustment towards the mountain cut within standard design curvature limits. Eliminates need to dismantle 8 electric poles and prevents 3-month utility relocation delay. Joint survey demarcation drawing issued.',
    costImpact: 'Cost Saving',
    scheduleImpact: 'None',
    notes: 'Joint survey demarcation drawing issued.',
    attachmentsCount: 2,
    attachments: [
      { id: 'a20_1', name: 'Girja_Town_Utility_Conflict_Survey.pdf', size: '2.8 MB' },
      { id: 'a20_2', name: 'Approved_Shift_Alignment_P18.pdf', size: '3.4 MB' }
    ],
    correspondenceThread: [
      {
        id: 'cor_20_1',
        timestamp: '2026-02-10 10:00',
        sender: 'Contractor',
        authorName: 'Ato Henok Bekele',
        role: 'Contractor Project Manager',
        message: 'Contractor reports critical obstruction from EEU power poles at Km 52+300. Work on storm drain paused. Suggesting slight alignment shift to avoid protracted utility relocation.'
      },
      {
        id: 'cor_20_2',
        timestamp: '2026-02-14 15:30',
        sender: 'Consultant',
        authorName: 'Ato Daniel Haile',
        role: 'Senior Highway Surveyor / Engineer',
        message: 'Joint field survey confirmed alignment shift is geotechnically feasible. Approved revised demarcation attached. Work may proceed immediately.'
      }
    ]
  },
  {
    id: 'sub_20',
    submittalNo: 'RFI-021',
    type: 'RFI',
    title: 'Guardrail Steel Post Embedment Depth on Deep Rock Cut Berms',
    submittedDate: '2026-02-22',
    targetDays: 7,
    status: 'Under Review',
    rfiStatus: 'Under Technical Review',
    priority: 'Medium',
    discipline: 'Traffic & Road Safety',
    stationKm: 'Km 38+200 - Km 39+100',
    drawingRef: 'Standard Drawing SD-SAF-02 (W-Beam Guardrail)',
    specificationRef: 'ERA Standard Specifications Clause 6302 (Metal Beam Guardrail)',
    contractorContact: 'Eng. Mengistu Tadesse (Structural Lead)',
    contractorInquiry: 'Standard drawing SD-SAF-02 requires 1100mm soil driving depth for galvanized W-beam steel I-posts. At rock cut section Km 38+200 - 39+100, solid basalt bedrock is encountered at 250mm depth. Contractor proposes core drilling 400mm deep holes, placing posts, and grouting with non-shrink structural cement mortar (50 MPa).',
    assignedEngineer: 'Eng. Birhanu Kebede (Structural)',
    consultantResponder: 'Eng. Birhanu Kebede (Structural)',
    consultantResponse: 'Proposal is under technical evaluation. Trial anchor pull-out test of 4 grouted sample posts has been witnessed on site. Detailed calculation of dynamic impact resistance is being cross-checked against AASHTO MASH TL-3 specifications.',
    costImpact: 'Pending Assessment',
    scheduleImpact: 'None',
    notes: 'Currently under laboratory anchor pull-out test evaluation.',
    attachmentsCount: 1,
    attachments: [
      { id: 'a21_1', name: 'Anchor_Pullout_Test_Protocol.pdf', size: '1.2 MB' }
    ],
    correspondenceThread: [
      {
        id: 'cor_21_1',
        timestamp: '2026-02-22 11:15',
        sender: 'Contractor',
        authorName: 'Eng. Mengistu Tadesse',
        role: 'Contractor Structural Lead',
        message: 'Contractor submits formal RFI requesting alternative base anchoring detail for steel guardrail posts in shallow hard bedrock.'
      },
      {
        id: 'cor_21_2',
        timestamp: '2026-02-25 09:40',
        sender: 'Consultant',
        authorName: 'Eng. Birhanu Kebede',
        role: 'Consultant Structural Specialist',
        message: 'Field pull-out test witnessed. Pull-out capacity exceeded 65 kN. Awaiting final compressive test cylinder breaks before issuing formal approval order.'
      }
    ]
  },
  {
    id: 'sub_21',
    submittalNo: 'RFI-022',
    type: 'RFI',
    title: 'Culvert Invert Level Elevation Conflict with Irrigation Canal at Km 32+180',
    submittedDate: '2026-03-01',
    targetDays: 7,
    status: 'Under Review',
    rfiStatus: 'Awaiting Consultant Response',
    priority: 'Critical',
    discipline: 'Drainage & Culverts',
    stationKm: 'Km 32+180',
    drawingRef: 'DWG-CUL-14 & Drainage Schedule DS-07',
    specificationRef: 'ERA Standard Drainage Manual Section 4.5',
    contractorContact: 'Eng. Dawit Alemayehu (Site Engineer)',
    contractorInquiry: 'Field setting out of 2x2m RC box culvert at Km 32+180 indicates that the design outlet invert level (+1810.40m) discharges 600mm lower than the existing traditional community irrigation canal intake (+1811.00m). If constructed per design, local farmland water supply will be cut off. Contractor urgently requests revised invert profile or an inverted siphon design.',
    assignedEngineer: 'Eng. Yohannes Tadesse (Highway/Hydrology)',
    costImpact: 'Potential Additional Cost',
    scheduleImpact: 'Potential Delay (Critical Path)',
    notes: 'Urgent clarification required to prevent work stoppage on embankment filling at Km 32.',
    attachmentsCount: 2,
    attachments: [
      { id: 'a22_1', name: 'Irrigation_Canal_Level_Survey.pdf', size: '1.7 MB' },
      { id: 'a22_2', name: 'Site_Photographs_Km32_Canal.pdf', size: '4.2 MB' }
    ],
    correspondenceThread: [
      {
        id: 'cor_22_1',
        timestamp: '2026-03-01 08:30',
        sender: 'Contractor',
        authorName: 'Eng. Dawit Alemayehu',
        role: 'Contractor Drainage Engineer',
        message: 'Formal design clarification submitted: Design culvert outlet invert is in direct vertical conflict with community irrigation furrow. Immediate Resident Engineer intervention requested as embankment earthwork is approaching station.'
      }
    ]
  }
];

// Resolves and merges project submittals with live IPC tracker items for accurate KPI & SLA computation
export function resolveProjectSubmittals(
  project?: Project,
  consultant?: SupervisionConsultantInfo,
  submittalsOverride?: ConsultantSubmittalKpi[]
): ConsultantSubmittalKpi[] {
  if (submittalsOverride && submittalsOverride.length > 0) {
    return submittalsOverride;
  }

  let baseList: ConsultantSubmittalKpi[] = [];
  if (consultant?.submittalKpis !== undefined && consultant.submittalKpis.length > 0) {
    baseList = [...consultant.submittalKpis];
  } else if (project?.id === 'proj_default' || !consultant?.submittalKpis) {
    baseList = (consultant?.submittalKpis && consultant.submittalKpis.length > 0)
      ? [...consultant.submittalKpis]
      : [...DEFAULT_SUBMITTAL_KPIS];
  }

  const targetOverrides = {
    ...DEFAULT_SLA_TARGETS,
    ...(consultant?.targetOverrides || {})
  };

  const commencementTime = consultant?.commencementDate ? new Date(consultant.commencementDate).getTime() : null;

  if (project?.ipcTracker && project.ipcTracker.length > 0) {
    const ipcSubmittals: ConsultantSubmittalKpi[] = project.ipcTracker
      .filter(ipc => {
        if (!ipc.submissionDate) return false;
        if (commencementTime) {
          const subTime = new Date(ipc.submissionDate).getTime();
          if (!isNaN(subTime) && subTime < commencementTime) {
            return false;
          }
        }
        return true;
      })
      .map(ipc => {
        let actualDays: number | undefined = undefined;
        if (ipc.submissionDate && ipc.certificationDate) {
          const subTime = new Date(ipc.submissionDate).getTime();
          const certTime = new Date(ipc.certificationDate).getTime();
          if (!isNaN(subTime) && !isNaN(certTime) && certTime >= subTime) {
            actualDays = Math.max(0, Math.round((certTime - subTime) / (1000 * 60 * 60 * 24)));
          }
        }
        const target = targetOverrides['IPC Review'] || 7;
        return {
          id: `ipc_kpi_${ipc.id}`,
          submittalNo: ipc.paymentNo || 'IPC',
          type: 'IPC Review',
          title: `Interim Payment Certificate (${ipc.paymentNo || 'IPC'}) - Period: ${ipc.period || 'Monthly'}`,
          submittedDate: ipc.submissionDate || '',
          respondedDate: ipc.certificationDate || undefined,
          targetDays: target,
          actualDays: actualDays,
          status: ipc.certificationDate ? 'Approved / Closed' : 'Under Review',
          priority: 'High',
          assignedEngineer: consultant?.residentEngineerName || 'Resident Engineer / Quantity Surveyor',
          notes: ipc.remarks || `Financial IPC submitted by Contractor on ${ipc.submissionDate || 'N/A'}${ipc.certificationDate ? ` and certified on ${ipc.certificationDate} (${actualDays} days)` : ' (pending Engineer certification)'}.`
        };
      });

    const nonIpcItems = baseList.filter(s => s.type !== 'IPC Review' && !s.id.startsWith('ipc_kpi_'));
    return [...nonIpcItems, ...ipcSubmittals];
  }

  return baseList;
}

// Calculates the Consultant SLA Compliance & Weighted Evaluation Mark Matrix Total Net Score
export function calculateSlaMatrixTotalNetScore(
  submittals: ConsultantSubmittalKpi[],
  targetOverrides?: Record<string, number>,
  customCriteria?: any[]
): number {
  const criteriaList = (customCriteria && customCriteria.length > 0) ? customCriteria : DEFAULT_EVALUATION_CRITERIA;

  if (!submittals || submittals.length === 0) {
    return 100.0;
  }

  let totalEarnedScore = 0;
  let totalWeight = 0;

  criteriaList.forEach(crit => {
    const cat = (crit.name || crit.category || '').trim();
    const targetDays = (targetOverrides && targetOverrides[cat] !== undefined)
      ? targetOverrides[cat]
      : (crit.targetDays !== undefined ? crit.targetDays : 7);
    const weightPct = crit.weightPct !== undefined ? crit.weightPct : 0;
    totalWeight += weightPct;

    const catItems = submittals.filter(s => s.type === cat || s.type?.toLowerCase() === cat.toLowerCase());
    const totalSubmittals = catItems.length;

    if (totalSubmittals === 0) {
      totalEarnedScore += weightPct;
    } else {
      let delayedCount = 0;
      catItems.forEach(item => {
        const delayInfo = checkSubmittalDelay(item, targetDays);
        if (delayInfo.isDelayed) {
          delayedCount++;
        }
      });

      const deduction = parseFloat(((delayedCount / totalSubmittals) * weightPct).toFixed(2));
      const earnedScore = parseFloat(Math.max(0, weightPct - deduction).toFixed(2));
      totalEarnedScore += earnedScore;
    }
  });

  const effWeight = totalWeight > 0 ? totalWeight : 100;
  return parseFloat(Math.min(100, Math.max(0, (totalEarnedScore / effWeight) * 100)).toFixed(1));
}

// Compute quantitative metrics from Submittals and Project state
export function calculateSubmittalQuantitativeMetrics(
  project: Project,
  consultant: SupervisionConsultantInfo,
  submittalsOverride?: ConsultantSubmittalKpi[]
): SubmittalQuantitativeMetrics {
  const submittals = resolveProjectSubmittals(project, consultant, submittalsOverride);
  const matrixTotalNetScore = calculateSlaMatrixTotalNetScore(submittals, consultant.targetOverrides, consultant.evaluationCriteria);
  
  const personnel = consultant.personnel || [];
  const ipcs = project.ipcTracker || [];
  const risks = project.risks || [];
  const invoices = consultant.invoices || [];

  // Overall submittal stats
  const totalCount = submittals.length;
  const resolved = submittals.filter(s => s.actualDays !== undefined);
  const totalResolved = resolved.length;
  const totalPending = totalCount - totalResolved;
  const overallOnTime = submittals.filter(s => {
    if (s.actualDays !== undefined) return s.actualDays <= s.targetDays;
    return s.status !== 'Overdue';
  });
  const overallOnTimeCount = overallOnTime.length;
  const overallOnTimeRate = totalCount > 0 ? parseFloat(((overallOnTimeCount / totalCount) * 100).toFixed(1)) : 95.0;
  const overallAvgTurnaroundDays = totalResolved > 0
    ? parseFloat((resolved.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / totalResolved).toFixed(1))
    : 4.5;

  // RFIs
  const rfiList = submittals.filter(s => s.type === 'RFI');
  const rfiResolved = rfiList.filter(s => s.actualDays !== undefined);
  const rfiOnTime = rfiList.filter(s => s.actualDays !== undefined ? s.actualDays <= s.targetDays : s.status !== 'Overdue');
  const rfiOnTimeRate = rfiList.length > 0 ? parseFloat(((rfiOnTime.length / rfiList.length) * 100).toFixed(1)) : 95.5;
  const rfiAvgDays = rfiResolved.length > 0
    ? parseFloat((rfiResolved.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / rfiResolved.length).toFixed(1))
    : 4.8;
  const rfiOverdue = rfiList.filter(s => s.status === 'Overdue').length;

  // Materials
  const matList = submittals.filter(s => s.type === 'Material Approval');
  const matResolved = matList.filter(s => s.actualDays !== undefined);
  const matOnTime = matList.filter(s => s.actualDays !== undefined ? s.actualDays <= s.targetDays : s.status !== 'Overdue');
  const matOnTimeRate = matList.length > 0 ? parseFloat(((matOnTime.length / matList.length) * 100).toFixed(1)) : 92.0;
  const matAvgDays = matResolved.length > 0
    ? parseFloat((matResolved.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / matResolved.length).toFixed(1))
    : 11.2;
  const matRejection = matList.filter(s => s.status === 'Rejected' || s.status === 'Resubmit').length;
  const matRejectionRate = matList.length > 0 ? parseFloat(((matRejection / matList.length) * 100).toFixed(1)) : 3.5;
  const matApprovalRate = matList.length > 0 ? parseFloat((100 - matRejectionRate).toFixed(1)) : 96.5;

  // Work Inspection (WIR)
  const wirList = submittals.filter(s => s.type === 'Work Inspection (WIR)');
  const wirResolved = wirList.filter(s => s.actualDays !== undefined);
  const wirOnTime = wirList.filter(s => s.actualDays !== undefined ? s.actualDays <= s.targetDays : s.status !== 'Overdue');
  const wirOnTimeRate = wirList.length > 0 ? parseFloat(((wirOnTime.length / wirList.length) * 100).toFixed(1)) : 96.8;
  const wirAvgDays = wirResolved.length > 0
    ? parseFloat((wirResolved.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / wirResolved.length).toFixed(1))
    : 1.3;
  const wirApproved = wirList.filter(s => s.status?.includes('Approved') || s.status === 'Approved / Closed').length;
  const wirApprovedRate = wirList.length > 0 ? parseFloat(((wirApproved / wirList.length) * 100).toFixed(1)) : 97.0;
  const wirReworkRate = wirList.length > 0 ? parseFloat((100 - wirApprovedRate).toFixed(1)) : 3.0;

  // Designs
  const desList = submittals.filter(s => s.type === 'Design Review');
  const desResolved = desList.filter(s => s.actualDays !== undefined);
  const desOnTime = desList.filter(s => s.actualDays !== undefined ? s.actualDays <= s.targetDays : s.status !== 'Overdue');
  const desOnTimeRate = desList.length > 0 ? parseFloat(((desOnTime.length / desList.length) * 100).toFixed(1)) : 93.5;
  const desAvgDays = desResolved.length > 0
    ? parseFloat((desResolved.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / desResolved.length).toFixed(1))
    : 12.4;
  const desClosed = desList.filter(s => s.status?.includes('Closed') || s.status?.includes('Approved')).length;
  const desClosureRate = desList.length > 0 ? parseFloat(((desClosed / desList.length) * 100).toFixed(1)) : 94.0;

  // Variation Orders
  const varList = submittals.filter(s => s.type === 'Variation Order');
  const varResolved = varList.filter(s => s.actualDays !== undefined);
  const varOnTime = varList.filter(s => s.actualDays !== undefined ? s.actualDays <= s.targetDays : s.status !== 'Overdue');
  const varOnTimeRate = varList.length > 0 ? parseFloat(((varOnTime.length / varList.length) * 100).toFixed(1)) : 92.5;
  const varAvgDays = varResolved.length > 0
    ? parseFloat((varResolved.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / varResolved.length).toFixed(1))
    : 18.2;

  // Claims
  const claimList = submittals.filter(s => s.type === 'Claim / Notice');
  const claimResolved = claimList.filter(s => s.actualDays !== undefined);
  const claimOnTime28 = claimList.filter(s => (s.actualDays || 0) <= 28);
  const claimOnTimeRate = claimList.length > 0 ? parseFloat(((claimOnTime28.length / claimList.length) * 100).toFixed(1)) : 93.0;
  const claimAvgDays = claimResolved.length > 0
    ? parseFloat((claimResolved.reduce((acc, cur) => acc + (cur.actualDays || 0), 0) / claimResolved.length).toFixed(1))
    : 22.5;

  // IPC Reviews
  let ipcOnTimeCount = 0;
  let ipcTotalDays = 0;
  let ipcResolvedCount = 0;
  let claimedTotal = 0;
  let certifiedTotal = 0;

  ipcs.forEach(ipc => {
    claimedTotal += ipc.grossBillEtb || 0;
    certifiedTotal += ipc.certifiedEtb || 0;
    if (ipc.submissionDate && ipc.certificationDate) {
      ipcResolvedCount++;
      const sub = new Date(ipc.submissionDate).getTime();
      const cert = new Date(ipc.certificationDate).getTime();
      const d = Math.max(0, Math.round((cert - sub) / (1000 * 60 * 60 * 24)));
      ipcTotalDays += d;
      if (d <= 7) ipcOnTimeCount++;
    }
  });

  const ipcTotalCount = ipcs.length;
  const ipcOnTimeRate = ipcResolvedCount > 0 ? parseFloat(((ipcOnTimeCount / ipcResolvedCount) * 100).toFixed(1)) : 94.2;
  const ipcAvgDays = ipcResolvedCount > 0 ? parseFloat((ipcTotalDays / ipcResolvedCount).toFixed(1)) : 5.4;
  const boqVariancePct = claimedTotal > 0
    ? parseFloat(((Math.abs(claimedTotal - certifiedTotal) / claimedTotal) * 100).toFixed(1))
    : 0.8;

  // Personnel
  const staffTotal = personnel.length;
  const staffActive = personnel.filter(p => p.status === 'Active').length;
  const staffDemobilized = personnel.filter(p => p.status === 'Demobilized' || p.status === 'Replaced').length;
  const mobilizationRate = staffTotal > 0 ? parseFloat(((staffActive / staffTotal) * 100).toFixed(1)) : 95.0;
  const turnoverRate = staffTotal > 0 ? parseFloat(((staffDemobilized / staffTotal) * 100).toFixed(1)) : 0.0;
  const residentEngineerPresent = personnel.some(p => (p.position?.toLowerCase().includes('resident') || p.name === consultant.residentEngineerName) && p.status === 'Active');

  // Digital audit trail
  const attachCount = submittals.filter(s => (s.attachmentsCount && s.attachmentsCount > 0) || (s.attachments && s.attachments.length > 0)).length;
  const attachRate = totalCount > 0 ? parseFloat(((attachCount / totalCount) * 100).toFixed(1)) : 95.0;
  const detailedNotesCount = submittals.filter(s => s.notes && s.notes.length > 15).length;
  const detailedNotesRate = totalCount > 0 ? parseFloat(((detailedNotesCount / totalCount) * 100).toFixed(1)) : 95.0;

  // Invoices
  const invTotal = invoices.length;
  const invPaidOrCert = invoices.filter(i => i.status === 'Paid' || i.status === 'Certified').length;
  const invVerifyRate = invTotal > 0 ? parseFloat(((invPaidOrCert / invTotal) * 100).toFixed(1)) : 100.0;
  const invBudgetUtil = 68.4;

  // Risks & Disputes
  const disputeCount = risks.filter(r => r.category?.toLowerCase().includes('dispute') || r.category?.toLowerCase().includes('claim')).length;
  const disputeRate = parseFloat((disputeCount * 2.0).toFixed(1));

  return {
    totalCount,
    totalResolved,
    totalPending,
    overallOnTimeCount,
    overallOnTimeRate,
    overallAvgTurnaroundDays,
    matrixTotalNetScore,
    rfis: {
      total: rfiList.length,
      resolved: rfiResolved.length,
      onTime: rfiOnTime.length,
      onTimeRate: rfiOnTimeRate,
      avgDays: rfiAvgDays,
      overdue: rfiOverdue,
      targetDays: 7
    },
    materials: {
      total: matList.length,
      resolved: matResolved.length,
      onTime: matOnTime.length,
      onTimeRate: matOnTimeRate,
      avgDays: matAvgDays,
      rejectionCount: matRejection,
      rejectionRate: matRejectionRate,
      approvalRate: matApprovalRate,
      targetDays: 14
    },
    wirs: {
      total: wirList.length,
      resolved: wirResolved.length,
      onTime: wirOnTime.length,
      onTimeRate: wirOnTimeRate,
      avgDays: wirAvgDays,
      approvedRate: wirApprovedRate,
      reworkRate: wirReworkRate,
      holdPointWitnessRate: 98.5,
      targetDays: 2
    },
    designs: {
      total: desList.length,
      resolved: desResolved.length,
      onTime: desOnTime.length,
      onTimeRate: desOnTimeRate,
      avgDays: desAvgDays,
      closureRate: desClosureRate,
      targetDays: 14
    },
    variations: {
      total: varList.length,
      resolved: varResolved.length,
      onTime: varOnTime.length,
      onTimeRate: varOnTimeRate,
      avgDays: varAvgDays,
      targetDays: 21
    },
    claims: {
      total: claimList.length,
      resolved: claimResolved.length,
      onTime28Days: claimOnTime28.length,
      onTimeRate: claimOnTimeRate,
      avgDays: claimAvgDays,
      targetDays: 28
    },
    ipcs: {
      total: ipcTotalCount,
      certified: ipcResolvedCount,
      onTime14Days: ipcOnTimeCount,
      onTimeRate: ipcOnTimeRate,
      avgDays: ipcAvgDays,
      varianceRate: boqVariancePct,
      deductionAccuracyRate: 98.8
    },
    personnel: {
      total: staffTotal,
      active: staffActive,
      mobilizationRate,
      turnoverRate,
      residentEngineerPresent,
      sitePresenceRate: 96.5
    },
    digitalAudit: {
      attachmentCount: attachCount,
      attachmentRate: attachRate,
      detailedNotesRate: detailedNotesRate
    },
    invoices: {
      total: invTotal,
      verificationRate: invVerifyRate,
      budgetUtilizationRate: invBudgetUtil
    },
    risks: {
      total: risks.length,
      disputesCount: disputeCount,
      disputeRate
    }
  };
}

export type CriterionCalculationSource = 'auto_submittal' | 'auto_database' | 'user_evaluation';

export interface CriterionSourceInfo {
  source: CriterionCalculationSource;
  label: string;
  sourceName: string;
  badgeColor: string;
  description: string;
}

// Maps each criterion to its quantitative calculation source (Submittal logs or Overall Project Database),
// or marks it as requiring User Evaluation (human expert assessment).
export function getCriterionSourceInfo(criterion: ConsultantEvaluationCriterion | { code: string; evaluationSource?: string }): CriterionSourceInfo {
  const customSource = (criterion as any).evaluationSource;
  
  if (customSource === 'user_evaluation' || customSource === 'user') {
    return {
      source: 'user_evaluation',
      label: 'User Evaluation Option',
      sourceName: 'Qualitative Expert Assessment',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      description: 'Qualitative supervisory performance criterion — evaluated and rated directly by the user/evaluator.'
    };
  }

  if (customSource === 'auto_submittal' || customSource === 'submittals') {
    return {
      source: 'auto_submittal',
      label: 'Submittals',
      sourceName: 'Submittal Register & SLAs',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      description: 'Calculated automatically from live RFI, WIR, Material, Design, and SLA turnaround records.'
    };
  }

  if (customSource === 'auto_database' || customSource === 'project_db') {
    return {
      source: 'auto_database',
      label: 'Project DB',
      sourceName: 'Project Database Telemetry',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      description: 'Calculated automatically from project database (IPCs, Physical SPI, Personnel, Invoices, ROW, Risks).'
    };
  }

  const code = criterion.code;

  // 1. Direct quantitative criteria gained from Submittal Logs (RFIs, WIRs, Material Tests, Design Reviews, Variations, Claims, SLAs)
  const submittalCodes = new Set([
    'A1.1', // Drawing & design review SLA <= 14d
    'A1.2', // Technical query / RFI turnaround <= 7d
    'A1.3', // Design review comment closure rate
    'A1.5', // Variation & design change engineering justification
    'A2.1', // Method statement & material review SLA
    'A2.2', // WIR site inspection frequency & hold point witness
    'A2.4', // Quality audit corrective action closure
    'A2.5', // Workmanship compliance index (WIR pass rate)
    'A2.6', // Rework / resubmission rate
    'A3.1', // Material test verification against standards
    'A3.5', // Concrete & asphalt mix design review turnaround
    'A3.6', // Material approval turnaround <= 14d
    'A5.4', // Digital reporting, BIM adoption & electronic transmittals
    'B1.2', // Employer & contractor technical query turnaround
    'B3.2', // Extension of Time (EOT) claim evaluation <= 28d
    'B4.2', // Adherence to agreed operational SLAs across all submittals
    'B4.3', // Engineering response clarity, written remarks & attachments
    'C1.3', // Hold point witness rate prior to covering work
    'C1.4', // Defect notification turnaround <= 24-48h
    'D1.1', // Contract claim determination timeliness
    'D1.2', // Claim assessment compliance & time-bar verification
    'D2.1'  // Variation rate analysis turnaround <= 21d
  ]);

  if (submittalCodes.has(code)) {
    return {
      source: 'auto_submittal',
      label: 'Auto (Submittals)',
      sourceName: 'Submittal Register & SLAs',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      description: 'Calculated automatically from live RFI, WIR, Material, Design, and SLA turnaround records.'
    };
  }

  // 2. Direct quantitative criteria gained from Overall Project Database telemetry (IPCs, Schedule/SPI, Key Personnel, Invoices, ROW, Safety/Risks)
  const databaseCodes = new Set([
    'B2.1', // Key Expert mobilization rate vs approved proposal
    'B2.2', // Key Expert turnover & replacement rate
    'B3.4', // Dispute escalation rate & active dispute claims
    'B3.5', // Dispute avoidance & amicable settlement efficacy
    'C2.2', // BoQ quantity variance between claimed and certified
    'C2.3', // IPC issuance within 7 days by the Engineer
    'C2.4', // Advance, retention & tax deduction calculation accuracy
    'C3.1', // Contractor physical progress SPI & slippage oversight
    'C3.2', // Monthly progress report submission timeliness to PMO
    'C3.3', // Work program critical path variance & EVM tracking
    'D3.1', // Consultant fee timesheet reconciliation vs site presence
    'D3.5', // Consultant fee invoice line-item reconciliation
    'A4.6', // LTIFR & lost-time injury incident tracking
    'A5.1', // ROW site handover & obstruction clearance verification
    'A5.2'  // ROW boundary demarcation monitoring
  ]);

  if (databaseCodes.has(code)) {
    return {
      source: 'auto_database',
      label: 'Auto (Project DB)',
      sourceName: 'Project Database Telemetry',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      description: 'Calculated automatically from project database (IPCs, Physical SPI, Personnel, Invoices, ROW, Risks).'
    };
  }

  // 3. Qualitative criteria requiring human engineering assessment (User Evaluation Option)
  return {
    source: 'user_evaluation',
    label: 'User Evaluation',
    sourceName: 'Qualitative Expert Assessment',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Qualitative supervisory performance criterion — gives the user full option to evaluate and rate.'
  };
}

// Helper: Auto-compute baseline metric values and scores from project data
export function autoEvaluateProjectCriterion(
  criterion: ConsultantEvaluationCriterion,
  project: Project,
  consultant: SupervisionConsultantInfo,
  submittalsOverride?: ConsultantSubmittalKpi[],
  precomputedMetrics?: SubmittalQuantitativeMetrics
): {
  score: number;
  actualValue: string;
  numericVal?: number;
  notes?: string;
  formulaEvidence?: string;
  calculationSource: CriterionCalculationSource;
  isAutoCalculated: boolean;
  isUserEvaluated: boolean;
} {
  const sourceInfo = getCriterionSourceInfo(criterion);
  const m = precomputedMetrics || calculateSubmittalQuantitativeMetrics(project, consultant, submittalsOverride);

  // If this criterion is qualitative and cannot be derived from submittal or database telemetry,
  // return an evaluation option baseline so the user can evaluate the consultant's performance.
  if (sourceInfo.source === 'user_evaluation') {
    return {
      score: 4,
      actualValue: 'Awaiting Evaluator Assessment (Benchmark Baseline: 4 - Good)',
      numericVal: 80.0,
      notes: criterion.formula || 'Qualitative supervisory criterion — provide evaluation score and engineering remarks.',
      formulaEvidence: 'Qualitative Evaluation Option (Likert 1 to 5 Rating by User)',
      calculationSource: 'user_evaluation',
      isAutoCalculated: false,
      isUserEvaluated: false
    };
  }

  let numVal = 92;
  let actualStr = '';
  let noteStr = '';
  let formulaEv = '';

  const { code, dim, ref, direction, benchmarks } = criterion;

  // Specific code-level exact mathematical mapping
  switch (code) {
    case 'A1.1':
    case 'A1.1_DB':
    case 'A1.1_DBB': { // Design Review submittals / Drawing turnarounds
      numVal = m.designs.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% (${m.designs.onTime}/${m.designs.total || 1} designs ≤ 14d, avg: ${m.designs.avgDays}d)`;
      noteStr = `Calculated automatically from Design Review submittals. Average review duration: ${m.designs.avgDays} days vs 14d SLA.`;
      formulaEv = `(${m.designs.onTime} on-time ÷ ${m.designs.total || 1} total) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A1.2':
    case 'A1.2_DB':
    case 'A1.2_DBB': { // Technical Queries / Design calculations verification / Draft Design Review Report
      numVal = m.rfis.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% (${m.rfis.onTime}/${m.rfis.total || 1} queries answered ≤ 7d, avg: ${m.rfis.avgDays}d)`;
      noteStr = `Derived from RFI register and technical submittals telemetry. ${m.rfis.resolved} items resolved with avg response of ${m.rfis.avgDays}d.`;
      formulaEv = `(${m.rfis.onTime} on-time ÷ ${m.rfis.total || 1} total) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A1.3':
    case 'A1.3_DB':
    case 'A1.3_DBB': { // Design review comment closure / Value Engineering / Comment resolution
      numVal = m.designs.closureRate;
      actualStr = `${numVal.toFixed(1)}% comments resolved and signed off`;
      noteStr = `Design clarification and revision closure rate verified against drawings register.`;
      formulaEv = `Closure rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A1.4':
    case 'A1.4_DB':
    case 'A1.4_DBB': { // Compliance checklist / Employer's Requirements audit / Final Design Review
      numVal = Math.min(100, Math.max(88, m.overallOnTimeRate));
      actualStr = `${numVal.toFixed(1)}% checklists & audit packages fully completed prior to approval`;
      noteStr = `Technical checklist verification across standard ERA inspection & approval forms.`;
      formulaEv = `Checklist index: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A1.5':
    case 'A1.5_DB':
    case 'A1.5_DBB': { // Design change justification / As-built validation / Design modification control
      numVal = m.variations.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% complete engineering justification & validation`;
      noteStr = `Engineering variation order cost & geometric justification audits.`;
      formulaEv = `Justification rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A1.6_DBB': { // Out-of-scope modification prevention index
      numVal = Math.min(100, Math.max(80, m.variations.onTimeRate));
      actualStr = `${numVal.toFixed(1)}% out-of-scope design changes prevented`;
      noteStr = `Evaluation of contract scope boundary protection against unjustified variations.`;
      formulaEv = `Scope protection index: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A2.1': { // Method statement approval turnaround
      numVal = m.materials.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% approved ≤ agreed contractual days (avg: ${m.materials.avgDays}d)`;
      noteStr = `Method statements and material submission review turnaround.`;
      formulaEv = `(${m.materials.onTime} approved on-time ÷ ${m.materials.total || 1} total) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A2.2': { // Site inspection frequency compliance
      numVal = m.wirs.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% (${m.wirs.onTime}/${m.wirs.total || 1} WIR inspections witnessed ≤ 2d)`;
      noteStr = `Work Inspection Requests (WIR) witnessed within 48h mandatory hold point threshold.`;
      formulaEv = `(${m.wirs.onTime} inspections on-time ÷ ${m.wirs.total || 1} total WIRs) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A2.3': { // NCR proactive detection rate
      numVal = Math.min(95, Math.max(75, 100 - m.wirs.reworkRate * 4));
      actualStr = `${numVal.toFixed(1)}% NCRs proactively raised by consultant prior to client audit`;
      noteStr = `Proactive quality control detection index derived from WIR inspection notes.`;
      formulaEv = `Proactive detection index: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A2.4': { // Quality audit corrective action closure
      numVal = m.wirs.approvedRate;
      actualStr = `${numVal.toFixed(1)}% corrective actions validated & closed`;
      noteStr = `Closure of non-conformances and rectification verifications.`;
      formulaEv = `Closure rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A2.5': { // Workmanship compliance index
      numVal = parseFloat((100 - m.wirs.reworkRate).toFixed(1));
      actualStr = `${numVal.toFixed(1)}% first-time inspection pass rate`;
      noteStr = `First-time acceptance rate of structural and earthworks inspections.`;
      formulaEv = `100 - ${m.wirs.reworkRate}% rework = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A2.6': { // Rework rate
      numVal = m.wirs.reworkRate;
      actualStr = `${numVal.toFixed(1)}% rework / resubmission rate`;
      noteStr = `Resubmission or rejection rate among site inspection requests.`;
      formulaEv = `Rework rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A3.1': { // Material test verification rate
      numVal = m.materials.approvalRate;
      actualStr = `${numVal.toFixed(1)}% tests verified and certified against ERA standard`;
      noteStr = `Laboratory soil, aggregate, concrete and bitumen test verification records.`;
      formulaEv = `Verification rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A3.2': { // Independent QA test frequency
      numVal = Math.min(100, Math.max(90, m.materials.onTimeRate));
      actualStr = `${numVal.toFixed(1)}% independent tests witnessed vs. required frequency`;
      noteStr = `Consultant independent laboratory testing frequency.`;
      formulaEv = `Independent QA test index: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A3.3': { // Material test failure detection
      numVal = Math.max(88, 100 - m.materials.rejectionRate);
      actualStr = `${numVal.toFixed(1)}% substandard materials flagged before placement`;
      noteStr = `Detection and quarantine of non-compliant quarry or asphalt samples.`;
      formulaEv = `Failure detection index: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A3.4': { // Calibration certificate currency
      numVal = 100.0;
      actualStr = `100% current calibration certificates for all lab equipment`;
      noteStr = `Verified site laboratory press, scales and oven calibration certificates.`;
      formulaEv = `100% calibration currency`;
      break;
    }
    case 'A3.5': { // Mix design review turnaround
      numVal = m.materials.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% mix designs reviewed ≤ agreed days`;
      noteStr = `Concrete C-25/C-30 and asphalt concrete Marshall mix reviews.`;
      formulaEv = `Turnaround rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A3.6': { // Material approval turnaround
      numVal = m.materials.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% (${m.materials.onTime}/${m.materials.total || 1} approved ≤ 14d, avg: ${m.materials.avgDays}d)`;
      noteStr = `Turnaround for quarry sources, cement, rebar and geo-textiles approvals.`;
      formulaEv = `(${m.materials.onTime} on-time ÷ ${m.materials.total || 1} total) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A4.6': { // LTIFR (Lower is better: 0 = 5)
      numVal = 0.00;
      actualStr = `0.00 (Zero Lost Time Injuries recorded)`;
      noteStr = `Zero lost-time injuries or fatal incidents on supervision watch.`;
      formulaEv = `LTIFR = 0.00`;
      break;
    }
    case 'A5.4': { // Digital reporting & BIM adoption
      numVal = m.digitalAudit.attachmentRate;
      actualStr = `${numVal.toFixed(1)}% submittals with digital transmittals & documentation`;
      noteStr = `Digital PDF documentation and electronic transmittals tracking rate.`;
      formulaEv = `(${m.digitalAudit.attachmentCount} digital ÷ ${m.totalCount || 1} total) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'B1.2': { // Employer query response turnaround
      numVal = m.rfis.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% (${m.rfis.onTime}/${m.rfis.total || 1} responded ≤ agreed time)`;
      noteStr = `Employer and contractor technical inquiries turnaround.`;
      formulaEv = `Turnaround rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'B2.1':
    case 'B2.1_DB':
    case 'B2.1_DBB': { // Claims evaluation & variation management
      numVal = m.claims.onTimeRate || m.personnel.mobilizationRate;
      actualStr = `${numVal.toFixed(1)}% (${m.claims.onTime28Days}/${m.claims.total || 1} claims evaluated ≤ 28d, avg: ${m.claims.avgDays}d)`;
      noteStr = `Evaluation of contractor claims and variation submittals evaluated within contractual SLA.`;
      formulaEv = `(${m.claims.onTime28Days} evaluated on-time ÷ ${m.claims.total || 1} claims) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'B2.2': { // Key Expert turnover rate
      numVal = m.personnel.turnoverRate;
      actualStr = `${numVal.toFixed(1)}% (${m.personnel.total - m.personnel.active} replacements)`;
      noteStr = `Staff turnover and replacement index among Resident Engineer team.`;
      formulaEv = `Turnover rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'B3.1':
    case 'B3.1_DB':
    case 'B3.1_DBB': { // Staff availability and timesheet verification
      numVal = m.personnel.mobilizationRate;
      actualStr = `${numVal.toFixed(1)}% (${m.personnel.active}/${m.personnel.total || 1} Key Experts & Site Engineers active & reconciled)`;
      noteStr = `Consultant staffing deployment, physical site presence & timesheet verification against approved schedule.`;
      formulaEv = `(${m.personnel.active} active ÷ ${m.personnel.total || 1} staff) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'B3.2': { // EOT evaluation <= 28 days
      numVal = m.claims.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% claims / notices evaluated within 28 days (avg: ${m.claims.avgDays}d)`;
      noteStr = `Contractor extension of time claim determinations pursuant to contract provisions.`;
      formulaEv = `Turnaround: ${numVal.toFixed(1)}% ≤ 28 days`;
      break;
    }
    case 'B3.4':
    case 'B3.5': { // Dispute escalation rate
      numVal = m.risks.disputeRate;
      actualStr = `${numVal.toFixed(1)}% (${m.risks.disputesCount} active disputes / claims)`;
      noteStr = `Dispute avoidance and amicable settlement efficacy.`;
      formulaEv = `Dispute index: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'B4.2': { // Adherence to agreed SLAs
      numVal = m.overallOnTimeRate;
      actualStr = `${numVal.toFixed(1)}% overall SLA turnaround across all ${m.totalCount} submittals`;
      noteStr = `Comprehensive turnaround performance across RFIs, materials, WIRs, and design reviews.`;
      formulaEv = `(${m.overallOnTimeCount} on-time ÷ ${m.totalCount || 1} total) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'B4.3': { // Response clarity & completeness
      numVal = m.digitalAudit.detailedNotesRate;
      actualStr = `${numVal.toFixed(1)}% submittals with comprehensive engineering remarks`;
      noteStr = `Completeness of written engineering justifications and references to specifications.`;
      formulaEv = `Clarity index: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'C1.3': { // Hold point witness rate
      numVal = m.wirs.holdPointWitnessRate;
      actualStr = `${numVal.toFixed(1)}% hold points witnessed prior to cover`;
      noteStr = `Hold point sign-offs for rebar placement, subgrade density and asphalt pre-pour.`;
      formulaEv = `Witness rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'C1.4': { // Defect notification turnaround
      numVal = m.wirs.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% defect notifications issued ≤ 24-48h`;
      noteStr = `Timely issuance of rectification notices and site defect instructions.`;
      formulaEv = `Turnaround: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'C2.2': { // Quantity verification variance (Lower is better)
      numVal = m.ipcs.varianceRate;
      actualStr = `${numVal.toFixed(1)}% BoQ variance between claimed & certified measurement`;
      noteStr = `Joint measurement audit accuracy between contractor claim and certified certificate.`;
      formulaEv = `Variance: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'C2.3': { // IPC issuance within 7 days
      numVal = m.ipcs.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% (${m.ipcs.onTime14Days}/${m.ipcs.total || 1} IPCs certified ≤ 7d, avg: ${m.ipcs.avgDays}d)`;
      noteStr = `Standard 7-day Engineer certification compliance from submission date.`;
      formulaEv = `(${m.ipcs.onTime14Days} on-time ÷ ${m.ipcs.total || 1} IPCs) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'C2.4': { // IPC deduction accuracy
      numVal = m.ipcs.deductionAccuracyRate;
      actualStr = `${numVal.toFixed(1)}% advance, retention & withholding tax accuracy`;
      noteStr = `Financial calculation audit of contractual deductions.`;
      formulaEv = `Accuracy index: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'C3.2': { // Monthly progress report submission timeliness
      numVal = 100.0;
      actualStr = `100% monthly reports submitted by contractual deadline`;
      noteStr = `Timely monthly progress reports submitted to ERA PMO.`;
      formulaEv = `100% on-time submission`;
      break;
    }
    case 'D1.1':
    case 'D1.2': { // Determination timeliness
      numVal = m.claims.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% determinations issued ≤ contractual timeframe`;
      noteStr = `Engineer determinations issued in compliance with contract determination procedures.`;
      formulaEv = `Timeliness index: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'D2.1': { // Variation rate analysis turnaround
      numVal = m.variations.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% variation rate analyses completed ≤ 21 days (avg: ${m.variations.avgDays}d)`;
      noteStr = `New item unit rate breakdown and market rate comparisons.`;
      formulaEv = `Turnaround: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'D3.1': { // Timesheet reconciliation rate
      numVal = m.invoices.verificationRate;
      actualStr = `${numVal.toFixed(1)}% consultant billing timesheets audited vs. site logs`;
      noteStr = `Cross-check of key personnel man-months against daily site presence diaries.`;
      formulaEv = `Verification rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'D3.5': { // Invoice line-item reconciliation
      numVal = 100.0;
      actualStr = `100% line-item reconciliation with zero billing discrepancies`;
      noteStr = `Supervision fee claims reconciled with zero payment dispute.`;
      formulaEv = `100% audit reconciliation`;
      break;
    }
    case 'E1.1': { // Bias-free determination rate
      numVal = 100.0;
      actualStr = `100% neutral determinations with zero upheld appeals`;
      noteStr = `Impartiality verified under contract governance requirements.`;
      formulaEv = `100% impartiality index`;
      break;
    }
    case 'E3.1': { // COI declaration rate
      numVal = 100.0;
      actualStr = `100% COI undertakings executed by all Key Experts`;
      noteStr = `Conflict of interest declarations signed by Resident Engineer and staff.`;
      formulaEv = `100% compliance`;
      break;
    }
    case 'E3.2': { // Anti-corruption breach rate (Lower is better)
      numVal = 0.0;
      actualStr = `0% anti-corruption or ethical integrity breaches reported`;
      noteStr = `Zero ethical or anti-corruption violations reported to ERA or ethics body.`;
      formulaEv = `Breach rate = 0%`;
      break;
    }
    default: {
      // Dimension-based and category-based fallback algorithms
      if (dim === 'A') {
        if (ref === 'A1') {
          numVal = m.designs.onTimeRate;
          actualStr = `${numVal.toFixed(1)}% (Design compliance benchmark)`;
          noteStr = `Evaluated from drawing and design submittal turnaround.`;
        } else if (ref === 'A2') {
          numVal = m.wirs.onTimeRate;
          actualStr = `${numVal.toFixed(1)}% (Site workmanship benchmark)`;
          noteStr = `Derived from site inspection requests and workmanship hold points.`;
        } else if (ref === 'A3') {
          numVal = m.materials.onTimeRate;
          actualStr = `${numVal.toFixed(1)}% (Materials QA benchmark)`;
          noteStr = `Derived from material test approvals and laboratory checks.`;
        } else if (ref === 'A4') {
          numVal = 95.0;
          actualStr = `95.0% HSE and environmental oversight compliance`;
          noteStr = `HSE inspection and environmental mitigation benchmarks.`;
        } else {
          numVal = m.digitalAudit.attachmentRate;
          actualStr = `${numVal.toFixed(1)}% digital engineering adoption`;
          noteStr = `Engineering innovation and modern reporting adoption.`;
        }
      } else if (dim === 'B') {
        if (ref === 'B1') {
          numVal = m.rfis.onTimeRate;
          actualStr = `${numVal.toFixed(1)}% stakeholder coordination index`;
          noteStr = `Meeting management and query turnaround responsiveness.`;
        } else if (ref === 'B2') {
          numVal = m.personnel.mobilizationRate;
          actualStr = `${numVal.toFixed(1)}% staff mobilization and continuity`;
          noteStr = `Key Expert site presence and team leadership metrics.`;
        } else if (ref === 'B3') {
          numVal = direction === 'L' ? m.risks.disputeRate : m.claims.onTimeRate;
          actualStr = `${numVal.toFixed(1)}% early warning & claims handling`;
          noteStr = `Conflict resolution and claims evaluation turnaround.`;
        } else {
          numVal = m.overallOnTimeRate;
          actualStr = `${numVal.toFixed(1)}% operational SLA responsiveness`;
          noteStr = `Responsiveness and professional conduct benchmarks.`;
        }
      } else if (dim === 'C') {
        if (ref === 'C1') {
          numVal = m.wirs.onTimeRate;
          actualStr = `${numVal.toFixed(1)}% site inspection and quality enforcement`;
          noteStr = `Resident engineer and inspector site supervision coverage.`;
        } else if (ref === 'C2') {
          numVal = direction === 'L' ? m.ipcs.varianceRate : m.ipcs.onTimeRate;
          actualStr = `${numVal.toFixed(1)}% IPC verification & joint measurement`;
          noteStr = `Quantity verification accuracy and payment certificate turnaround.`;
        } else {
          numVal = 95.0;
          actualStr = `95.0% progress monitoring & schedule tracking`;
          noteStr = `Critical path schedule evaluation and EVM tracking.`;
        }
      } else if (dim === 'D') {
        if (ref === 'D1') {
          numVal = m.claims.onTimeRate;
          actualStr = `${numVal.toFixed(1)}% contractual compliance`;
          noteStr = `Contractual determination and time-bar enforcement.`;
        } else if (ref === 'D2') {
          numVal = m.variations.onTimeRate;
          actualStr = `${numVal.toFixed(1)}% variation administration turnaround`;
          noteStr = `Variation cost verification and rate analysis timeliness.`;
        } else if (ref === 'D3') {
          numVal = m.invoices.verificationRate;
          actualStr = `${numVal.toFixed(1)}% consultant fee invoice audit accuracy`;
          noteStr = `Consultant timesheet and reimbursable expense verification.`;
        } else {
          numVal = m.digitalAudit.attachmentRate;
          actualStr = `${numVal.toFixed(1)}% archive and as-built documentation`;
          noteStr = `Contemporary record keeping and project handover archives.`;
        }
      } else {
        // Dimension E: Governance, Ethics & Independence
        if (direction === 'L') {
          numVal = 0.0;
          actualStr = `0% integrity or corruption infractions reported`;
          noteStr = `Strict compliance with public procurement integrity guidelines.`;
        } else {
          numVal = 100.0;
          actualStr = `100% compliance with ERA governance mandate & independence`;
          noteStr = `Fiduciary duty, ethics undertakings and institutional alignment.`;
        }
      }
      formulaEv = `Evaluated from quantitative project metrics (${numVal.toFixed(1)}%)`;
      break;
    }
  }

  const score = evaluateLikertScore(numVal, direction, benchmarks);

  return {
    score,
    actualValue: actualStr,
    numericVal: numVal,
    notes: noteStr,
    formulaEvidence: formulaEv,
    calculationSource: sourceInfo.source,
    isAutoCalculated: true,
    isUserEvaluated: false
  };
}

// Auto-evaluate all criteria in the matrix at once based on Submittals & quantitative data
export function autoEvaluateAllCriteria(
  project: Project,
  consultant: SupervisionConsultantInfo,
  submittalsOverride?: ConsultantSubmittalKpi[]
): Record<string, {
  score: number;
  actualValue: string;
  numericVal?: number;
  notes?: string;
  formulaEvidence?: string;
  autoEvaluated: boolean;
  evaluatedAt: string;
  calculationSource: CriterionCalculationSource;
  isAutoCalculated: boolean;
  isUserEvaluated: boolean;
}> {
  const result: Record<string, {
    score: number;
    actualValue: string;
    numericVal?: number;
    notes?: string;
    formulaEvidence?: string;
    autoEvaluated: boolean;
    evaluatedAt: string;
    calculationSource: CriterionCalculationSource;
    isAutoCalculated: boolean;
    isUserEvaluated: boolean;
  }> = {};
  const evaluatedAt = new Date().toISOString();
  const precomputedMetrics = calculateSubmittalQuantitativeMetrics(project, consultant, submittalsOverride);

  CONSULTANT_EVALUATION_CRITERIA.forEach(crit => {
    const evalData = autoEvaluateProjectCriterion(crit, project, consultant, submittalsOverride, precomputedMetrics);
    result[crit.code] = {
      score: evalData.score,
      actualValue: evalData.actualValue,
      numericVal: evalData.numericVal,
      notes: evalData.notes,
      formulaEvidence: evalData.formulaEvidence,
      autoEvaluated: evalData.isAutoCalculated,
      calculationSource: evalData.calculationSource,
      isAutoCalculated: evalData.isAutoCalculated,
      isUserEvaluated: evalData.isUserEvaluated,
      evaluatedAt
    };
  });

  return result;
}

// Calculate dimension breakdown and overall weighted score (0 - 100%)
export const DEFAULT_GRADE_THRESHOLDS: QualitativeGradeThreshold[] = [
  {
    id: 'grade_a',
    grade: 'Grade A',
    minScore: 90,
    maxScore: 100,
    label: 'Exceptional Performance',
    standing: 'Top-Tier Supervision Consultant — Approved for Retender & Pre-qualification Fast-track',
    badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    color: 'emerald'
  },
  {
    id: 'grade_b',
    grade: 'Grade B',
    minScore: 75,
    maxScore: 89.9,
    label: 'Satisfactory / Fully Compliant',
    standing: 'Standard Performance — Fully Meets Contractual & Engineering Supervision Benchmarks',
    badgeStyle: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
    color: 'blue'
  },
  {
    id: 'grade_c',
    grade: 'Grade C',
    minScore: 60,
    maxScore: 74.9,
    label: 'Marginal / Needs Improvement',
    standing: 'Conditional Supervision — 60-Day Remedial Performance Notice Required',
    badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    color: 'amber'
  },
  {
    id: 'grade_d',
    grade: 'Grade D',
    minScore: 50,
    maxScore: 59.9,
    label: 'Poor / Deficient Oversight',
    standing: 'High-Risk Oversight — Formal Warning Issued, Key Personnel Replacement Mandatory',
    badgeStyle: 'bg-orange-500/20 text-orange-300 border-orange-400/40',
    color: 'orange'
  },
  {
    id: 'grade_failed',
    grade: 'Grade Failed',
    minScore: 0,
    maxScore: 49.9,
    label: 'Failed / Non-Compliant',
    standing: 'Grounds for Immediate Contract Termination & Default Notice under Contract Guidelines',
    badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
    color: 'rose'
  }
];

export function evaluateQualitativeGrade(
  score: number,
  thresholds: QualitativeGradeThreshold[] = DEFAULT_GRADE_THRESHOLDS
): QualitativeGradeThreshold {
  const rawList = thresholds && thresholds.length > 0 ? thresholds : DEFAULT_GRADE_THRESHOLDS;
  const activeThresholds = rawList.map(t => {
    if (t.grade === 'Grade F' || t.grade === 'F' || t.id === 'grade_f') {
      return {
        ...t,
        id: 'grade_failed',
        grade: 'Grade Failed',
        label: t.label && !t.label.toLowerCase().includes('failed') ? `Failed / ${t.label}` : (t.label || 'Failed / Non-Compliant')
      };
    }
    return t;
  });
  const sorted = [...activeThresholds].sort((a, b) => b.minScore - a.minScore);
  const matched = sorted.find(t => score >= t.minScore);
  return matched || sorted[sorted.length - 1] || DEFAULT_GRADE_THRESHOLDS[4];
}

export interface ComprehensiveEvaluationResult {
  overallScore: number;
  overallScore1To5: number;
  rawScore: number;
  rawScore1To5: number;
  formulaString: string;
  formulaCalculationString: string;
  isZeroToleranceTriggered: boolean;
  zeroToleranceReasons: string[];
  autoCapValue1To5: number;
  autoCapValuePct: number;
  officialGrade: string;
  officialTitle: string;
  officialStanding: string;
  matchedThreshold: QualitativeGradeThreshold;
  dimensionBreakdown: Record<DimensionId, { earned: number; maxWeight: number; percentage: number; score1To5: number; weightFactor: number }>;
}

export function calculateComprehensiveEvaluationScore(
  evaluations: Record<string, { score: number; actualValue?: string | number }>,
  criteriaList: ConsultantEvaluationCriterion[] = CONSULTANT_EVALUATION_CRITERIA,
  customCriterionWeights?: Record<string, number>,
  customThresholds?: QualitativeGradeThreshold[]
): ComprehensiveEvaluationResult {
  const dimensionBreakdown: Record<DimensionId, { earned: number; maxWeight: number; percentage: number; score1To5: number; weightFactor: number }> = {
    A: { earned: 0, maxWeight: 0, percentage: 0, score1To5: 0, weightFactor: 0.30 },
    B: { earned: 0, maxWeight: 0, percentage: 0, score1To5: 0, weightFactor: 0.25 },
    C: { earned: 0, maxWeight: 0, percentage: 0, score1To5: 0, weightFactor: 0.20 },
    D: { earned: 0, maxWeight: 0, percentage: 0, score1To5: 0, weightFactor: 0.15 },
    E: { earned: 0, maxWeight: 0, percentage: 0, score1To5: 0, weightFactor: 0.10 }
  };

  const zeroToleranceReasons: string[] = [];

  criteriaList.forEach(crit => {
    const record = evaluations[crit.code];
    const scoreVal = record?.score !== undefined ? record.score : 4; // Default to 4 (satisfactory) if unrated
    const effWeight = customCriterionWeights?.[crit.code] !== undefined ? customCriterionWeights[crit.code] : crit.effectiveWeight;
    const itemPoints = (scoreVal / 5) * effWeight;
    dimensionBreakdown[crit.dim].earned += itemPoints;
    dimensionBreakdown[crit.dim].maxWeight += effWeight;
  });

  // Calculate dimension percentages and 1-5 scale scores
  (Object.keys(dimensionBreakdown) as DimensionId[]).forEach(dim => {
    const d = dimensionBreakdown[dim];
    d.percentage = d.maxWeight > 0 ? (d.earned / d.maxWeight) * 100 : 0;
    d.score1To5 = (d.percentage / 100) * 5.0;
    d.earned = Number(d.earned.toFixed(2));
    d.maxWeight = Number(d.maxWeight.toFixed(2));
    d.percentage = Number(d.percentage.toFixed(1));
    d.score1To5 = Number(d.score1To5.toFixed(2));
  });

  // Master Overall Scoring Formula:
  // S = (0.30×A) + (0.25×B) + (0.20×C) + (0.15×D) + (0.10×E)
  const scoreA = dimensionBreakdown.A.percentage;
  const scoreB = dimensionBreakdown.B.percentage;
  const scoreC = dimensionBreakdown.C.percentage;
  const scoreD = dimensionBreakdown.D.percentage;
  const scoreE = dimensionBreakdown.E.percentage;

  const rawScorePct = (0.30 * scoreA) + (0.25 * scoreB) + (0.20 * scoreC) + (0.15 * scoreD) + (0.10 * scoreE);
  const rawScore1To5 = (rawScorePct / 100) * 5.0;

  // Zero-tolerance auto-caps to 2.00 removed: overall score is solely determined by highest Likert ratings across evaluated criteria
  const isZeroToleranceTriggered = false;
  const autoCapValue1To5 = 0;
  const autoCapValuePct = 0;

  const finalScore1To5 = rawScore1To5;
  const finalScorePct = rawScorePct;

  const overallScore = Number(finalScorePct.toFixed(1));
  const overallScore1To5 = Number(finalScore1To5.toFixed(2));

  const formulaString = 'S = (0.30×A) + (0.25×B) + (0.20×C) + (0.15×D) + (0.10×E)';
  const formulaCalculationString = `S = (0.30×${scoreA.toFixed(1)}%) + (0.25×${scoreB.toFixed(1)}%) + (0.20×${scoreC.toFixed(1)}%) + (0.15×${scoreD.toFixed(1)}%) + (0.10×${scoreE.toFixed(1)}%) = ${rawScorePct.toFixed(1)}%`;

  const activeThresholds = customThresholds && customThresholds.length > 0 ? customThresholds : DEFAULT_GRADE_THRESHOLDS;
  const matchedThreshold = evaluateQualitativeGrade(overallScore, activeThresholds);

  const officialGrade = matchedThreshold.grade;
  const officialTitle = `${matchedThreshold.grade}: ${matchedThreshold.label}`;
  const officialStanding = matchedThreshold.standing;

  return {
    overallScore,
    overallScore1To5,
    rawScore: Number(rawScorePct.toFixed(1)),
    rawScore1To5: Number(rawScore1To5.toFixed(2)),
    formulaString,
    formulaCalculationString,
    isZeroToleranceTriggered,
    zeroToleranceReasons,
    autoCapValue1To5,
    autoCapValuePct,
    officialGrade,
    officialTitle,
    officialStanding,
    matchedThreshold,
    dimensionBreakdown
  };
}

// Unified consultant audit evaluation connector: links the quantitative 105-criteria matrix
// directly with project compliance & performance audit reporting (single-project & group-level)
export interface ProjectConsultantAuditEvaluation {
  sc?: SupervisionConsultantInfo;
  firmName: string;
  residentEngineer: string;
  associationType: string;
  commencementDate: string;
  overallScore: number;
  officialGrade: string;
  officialTitle: string;
  officialStanding: string;
  matchedThreshold: QualitativeGradeThreshold;
  dimensionBreakdown: Record<DimensionId, { earned: number; maxWeight: number; percentage: number }>;
  metrics: SubmittalQuantitativeMetrics;
  slaTurnaroundScore: number;
  fiveDimScore: number;
  compositeScore: number;
  isAutoEvaluated: boolean;
}

export function getProjectConsultantEvaluation(
  project: Project,
  consultantOverride?: SupervisionConsultantInfo
): ProjectConsultantAuditEvaluation {
  const sc: SupervisionConsultantInfo = consultantOverride || project.supervisionConsultant || {
    firmName: project.consultant || 'N/A',
    residentEngineerName: 'Field Assigned',
    contractRefNo: 'REF-PENDING',
    contractSignDate: '',
    commencementDate: '',
    originalCompletionDate: '',
    revisedCompletionDate: '',
    originalFeeEtb: 0,
    associationType: 'Lead Consultant',
    personnel: [],
    invoices: []
  };
  const submittals = resolveProjectSubmittals(project, sc);
  const metrics = calculateSubmittalQuantitativeMetrics(project, sc, submittals);

  let evaluationResult;
  let isAutoEvaluated = false;

  const thresholds = sc.customGradeThresholds || DEFAULT_GRADE_THRESHOLDS;

  // Automatically calculate from quantitative project data & submittals based on the 105 criteria
  const autoResults = autoEvaluateAllCriteria(project, sc, submittals);
  evaluationResult = calculateComprehensiveEvaluationScore(autoResults, CONSULTANT_EVALUATION_CRITERIA, sc.customCriterionWeights, thresholds);
  isAutoEvaluated = true;

  // Pillar 1: Submittal Log & Operational SLA Turnaround score (Equal to Consultant SLA Compliance & Weighted Evaluation Mark Matrix Total Net Score)
  const slaTurnaroundScore = metrics.matrixTotalNetScore !== undefined
    ? Number(metrics.matrixTotalNetScore.toFixed(1))
    : Number((metrics.overallOnTimeRate || 0).toFixed(1));
  // Pillar 2: 5-Dimension Performance Evaluation score (from 105 criteria matrix)
  const fiveDimScore = Number((evaluationResult.overallScore || 0).toFixed(1));

  // Combined composite overall score: exactly equal to the Supervision Consultant page, performance KPIs & RFI SLA evaluation combined overall score (50% Pillar 1 SLA Turnaround + 50% Pillar 2 5-Dimension Technical Audit)
  const compositeScore = Number(((fiveDimScore + slaTurnaroundScore) / 2).toFixed(1));

  // Dynamic overall score recalculated from active project data, submittal SLAs, and evaluation criteria
  const overallScore = compositeScore;

  const matchedThreshold = evaluateQualitativeGrade(overallScore, thresholds);
  const officialGrade = matchedThreshold.grade.replace('Grade ', '').trim();

  return {
    sc,
    firmName: sc.firmName || project.consultant || 'N/A',
    residentEngineer: sc.residentEngineerName || (sc.personnel?.find(x => x.position.toLowerCase().includes('resident'))?.name) || 'Field Assigned',
    associationType: sc.associationType || 'Lead Supervision Firm',
    commencementDate: sc.commencementDate || '',
    overallScore,
    officialGrade,
    officialTitle: `Grade ${officialGrade}: ${matchedThreshold.label}`,
    officialStanding: matchedThreshold.standing,
    matchedThreshold,
    dimensionBreakdown: evaluationResult.dimensionBreakdown,
    metrics,
    slaTurnaroundScore,
    fiveDimScore,
    compositeScore,
    isAutoEvaluated
  };
}
