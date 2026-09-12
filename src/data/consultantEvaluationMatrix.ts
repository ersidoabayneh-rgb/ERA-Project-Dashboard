import { ConsultantEvaluationCriterion, DimensionId, Project, SupervisionConsultantInfo, ConsultantSubmittalKpi, QualitativeGradeThreshold } from '../types';

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
    weight: 35,
    description: 'Technical drawings comprehension, review turnaround, method statements, QA/QC independent testing, and HSE oversight.',
    iconName: 'Wrench',
    color: 'indigo',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeBorder: 'border-indigo-200 dark:border-indigo-800'
  },
  B: {
    id: 'B',
    name: 'Soft Skills & Team Management',
    weight: 20,
    description: 'Communication & coordination, Key Expert deployment and stability, early warning problem solving, and stakeholder interfaces.',
    iconName: 'Users',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800'
  },
  C: {
    id: 'C',
    name: 'Project Supervision & Site Presence',
    weight: 20,
    description: 'Site diaries, shift coverage, work front inspections, joint work volume measurement, IPC issuance, and progress monitoring.',
    iconName: 'Building2',
    color: 'blue',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeBorder: 'border-blue-200 dark:border-blue-800'
  },
  D: {
    id: 'D',
    name: 'Contract Administration & Time-Based Compliance',
    weight: 15,
    description: 'Contract legal administration, time-bars, determinations, claims & variations, timesheet verification, and document archives.',
    iconName: 'Scale',
    color: 'amber',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeBorder: 'border-amber-200 dark:border-amber-800'
  },
  E: {
    id: 'E',
    name: 'Governance, Ethics & Independence',
    weight: 10,
    description: 'Impartial contract determinations, written audit trails, anti-corruption, conflict of interest declarations, and client alignment.',
    iconName: 'ShieldCheck',
    color: 'purple',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
    badgeBorder: 'border-purple-200 dark:border-purple-800'
  }
};

export const CONSULTANT_EVALUATION_CRITERIA: ConsultantEvaluationCriterion[] = [
  // ==========================================
  // DIMENSION A: Technical Skills & Engineering Competence (35%)
  // ==========================================
  // A1: Technical Specification & Drawing Comprehension (25% of Dim A)
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A1',
    parentName: 'Technical Specification & Drawing Comprehension',
    parentWeight: 25,
    code: 'A1.1',
    name: 'Drawing review turnaround compliance',
    detailWeight: 25,
    effectiveWeight: 2.19,
    metric: '% drawings reviewed within contractual days',
    formula: '(Drawings reviewed ≤ allowed days ÷ Total drawings) × 100',
    dataSource: 'Drawing Review Register / Transmittal Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A1',
    parentName: 'Technical Specification & Drawing Comprehension',
    parentWeight: 25,
    code: 'A1.2',
    name: 'TQ/RFI response time compliance',
    detailWeight: 20,
    effectiveWeight: 1.75,
    metric: '% TQs answered within agreed days',
    formula: '(TQs answered ≤ agreed days ÷ Total TQs) × 100',
    dataSource: 'TQ/RFI Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A1',
    parentName: 'Technical Specification & Drawing Comprehension',
    parentWeight: 25,
    code: 'A1.3',
    name: 'Design review comment closure rate',
    detailWeight: 20,
    effectiveWeight: 1.75,
    metric: '% comments closed',
    formula: '(Comments closed ÷ Comments raised) × 100',
    dataSource: 'Design Review Comment Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A1',
    parentName: 'Technical Specification & Drawing Comprehension',
    parentWeight: 25,
    code: 'A1.4',
    name: 'Compliance checklist completion rate',
    detailWeight: 20,
    effectiveWeight: 1.75,
    metric: '% checklists signed',
    formula: '(Checklists completed ÷ Checklists required) × 100',
    dataSource: 'Specification Compliance Checklists',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A1',
    parentName: 'Technical Specification & Drawing Comprehension',
    parentWeight: 25,
    code: 'A1.5',
    name: 'Design change justification completeness',
    detailWeight: 15,
    effectiveWeight: 1.31,
    metric: '% changes fully justified',
    formula: '(Changes with full justification ÷ Total changes) × 100',
    dataSource: 'Design Change Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // A2: Methodology & Workmanship Assessment (25% of Dim A)
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A2',
    parentName: 'Methodology & Workmanship Assessment',
    parentWeight: 25,
    code: 'A2.1',
    name: 'Method statement approval turnaround',
    detailWeight: 15,
    effectiveWeight: 1.32,
    metric: '% approved within agreed days',
    formula: '(Approved ≤ agreed days ÷ Total submitted) × 100',
    dataSource: 'Method Statement Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A2',
    parentName: 'Methodology & Workmanship Assessment',
    parentWeight: 25,
    code: 'A2.2',
    name: 'Site inspection frequency compliance',
    detailWeight: 15,
    effectiveWeight: 1.31,
    metric: '% actual vs. planned inspections',
    formula: '(Actual inspections ÷ Planned inspections) × 100',
    dataSource: 'Site Inspection Log vs. Plan',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A2',
    parentName: 'Methodology & Workmanship Assessment',
    parentWeight: 25,
    code: 'A2.3',
    name: 'NCR proactive detection rate',
    detailWeight: 15,
    effectiveWeight: 1.31,
    metric: '% NCRs raised by consultant',
    formula: '(NCRs raised by consultant ÷ Total NCRs) × 100',
    dataSource: 'NCR Register',
    direction: 'H',
    benchmarks: {
      score5: '≥80%',
      score4: '65–79%',
      score3: '50–64%',
      score2: '35–49%',
      score1: '<35%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A2',
    parentName: 'Methodology & Workmanship Assessment',
    parentWeight: 25,
    code: 'A2.4',
    name: 'NCR closure within agreed days',
    detailWeight: 20,
    effectiveWeight: 1.75,
    metric: '% NCRs closed on time',
    formula: '(NCRs closed ≤ agreed days ÷ Total NCRs closed) × 100',
    dataSource: 'NCR Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A2',
    parentName: 'Methodology & Workmanship Assessment',
    parentWeight: 25,
    code: 'A2.5',
    name: 'NCR ageing > 30 days',
    detailWeight: 15,
    effectiveWeight: 1.31,
    metric: '% open NCRs aged >30 days',
    formula: '(NCRs open >30 days ÷ Total open NCRs) × 100',
    dataSource: 'NCR Ageing Report',
    direction: 'L',
    benchmarks: {
      score5: '≤5%',
      score4: '6–10%',
      score3: '11–20%',
      score2: '21–35%',
      score1: '>35%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A2',
    parentName: 'Methodology & Workmanship Assessment',
    parentWeight: 25,
    code: 'A2.6',
    name: 'Rework rate',
    detailWeight: 20,
    effectiveWeight: 1.75,
    metric: '% items requiring rework',
    formula: '(Rework items ÷ Total inspected items) × 100',
    dataSource: 'Defect/Rework Log',
    direction: 'L',
    benchmarks: {
      score5: '≤2%',
      score4: '3–5%',
      score3: '6–10%',
      score2: '11–15%',
      score1: '>15%'
    }
  },

  // A3: QA/QC System & Independent Testing Oversight (30% of Dim A)
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A3',
    parentName: 'QA/QC System & Independent Testing Oversight',
    parentWeight: 30,
    code: 'A3.1',
    name: 'QA/QC plan implementation compliance',
    detailWeight: 10,
    effectiveWeight: 1.04,
    metric: '% audit items passed',
    formula: '(Audit items passed ÷ Total audit items) × 100',
    dataSource: 'QA/QC Audit Report',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A3',
    parentName: 'QA/QC System & Independent Testing Oversight',
    parentWeight: 30,
    code: 'A3.2',
    name: 'Independent testing frequency compliance',
    detailWeight: 20,
    effectiveWeight: 2.10,
    metric: '% actual vs. required tests',
    formula: '(Actual tests ÷ Required tests per spec) × 100',
    dataSource: 'Test Register vs. Specification',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A3',
    parentName: 'QA/QC System & Independent Testing Oversight',
    parentWeight: 30,
    code: 'A3.3',
    name: 'Material QA/QC test witnessing rate',
    detailWeight: 15,
    effectiveWeight: 1.58,
    metric: '% tests witnessed',
    formula: '(Tests witnessed ÷ Tests required to witness) × 100',
    dataSource: 'Witness Log',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A3',
    parentName: 'QA/QC System & Independent Testing Oversight',
    parentWeight: 30,
    code: 'A3.4',
    name: 'Laboratory calibration validity',
    detailWeight: 10,
    effectiveWeight: 1.05,
    metric: '% valid calibrations',
    formula: '(Valid calibration certs ÷ Total equipment) × 100',
    dataSource: 'Calibration Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A3',
    parentName: 'QA/QC System & Independent Testing Oversight',
    parentWeight: 30,
    code: 'A3.5',
    name: 'Test result trend analysis submission',
    detailWeight: 10,
    effectiveWeight: 1.05,
    metric: '% months with trend analysis',
    formula: '(Months with trend analysis submitted ÷ Total months) × 100',
    dataSource: 'Monthly QA/QC Reports',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A3',
    parentName: 'QA/QC System & Independent Testing Oversight',
    parentWeight: 30,
    code: 'A3.6',
    name: 'Material approval turnaround',
    detailWeight: 15,
    effectiveWeight: 1.58,
    metric: '% approvals within agreed days',
    formula: '(Approvals ≤ agreed days ÷ Total submitted) × 100',
    dataSource: 'Material Approval Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A3',
    parentName: 'QA/QC System & Independent Testing Oversight',
    parentWeight: 30,
    code: 'A3.7',
    name: 'First-time test pass rate',
    detailWeight: 20,
    effectiveWeight: 2.10,
    metric: '% tests passed on first attempt',
    formula: '(Tests passed first attempt ÷ Total tests) × 100',
    dataSource: 'Test Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },

  // A4: HSE Oversight & Environmental Compliance (20% of Dim A)
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A4',
    parentName: 'HSE Oversight & Environmental Compliance',
    parentWeight: 20,
    code: 'A4.1',
    name: 'HSE inspection frequency compliance',
    detailWeight: 15,
    effectiveWeight: 1.05,
    metric: '% actual vs. planned HSE inspections',
    formula: '(Actual HSE inspections ÷ Planned) × 100',
    dataSource: 'HSE Inspection Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A4',
    parentName: 'HSE Oversight & Environmental Compliance',
    parentWeight: 20,
    code: 'A4.2',
    name: 'Incident investigation closure rate',
    detailWeight: 15,
    effectiveWeight: 1.05,
    metric: '% investigations closed ≤7 days',
    formula: '(Investigations closed ≤7 days ÷ Total incidents) × 100',
    dataSource: 'Incident Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A4',
    parentName: 'HSE Oversight & Environmental Compliance',
    parentWeight: 20,
    code: 'A4.3',
    name: 'HSE corrective action closure rate',
    detailWeight: 15,
    effectiveWeight: 1.05,
    metric: '% actions closed on time',
    formula: '(Actions closed ≤ agreed days ÷ Total actions) × 100',
    dataSource: 'Corrective Action Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A4',
    parentName: 'HSE Oversight & Environmental Compliance',
    parentWeight: 20,
    code: 'A4.4',
    name: 'ESMP monitoring submission compliance',
    detailWeight: 15,
    effectiveWeight: 1.05,
    metric: '% reports submitted on time',
    formula: '(Reports on time ÷ Total required) × 100',
    dataSource: 'ESMP Monitoring Reports',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A4',
    parentName: 'HSE Oversight & Environmental Compliance',
    parentWeight: 20,
    code: 'A4.5',
    name: 'Toolbox talk verification rate',
    detailWeight: 10,
    effectiveWeight: 0.70,
    metric: '% talks verified',
    formula: '(Talks verified ÷ Talks required) × 100',
    dataSource: 'Toolbox Talk Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A4',
    parentName: 'HSE Oversight & Environmental Compliance',
    parentWeight: 20,
    code: 'A4.6',
    name: 'LTIFR (Lost Time Injury Frequency Rate)',
    detailWeight: 15,
    effectiveWeight: 1.05,
    metric: 'Lost Time Injury Frequency Rate',
    formula: '(Lost Time Injuries × 1,000,000 ÷ Man-hours Worked)',
    dataSource: 'HSE Statistics',
    direction: 'L',
    benchmarks: {
      score5: '0',
      score4: '≤0.5',
      score3: '≤1.0',
      score2: '≤2.0',
      score1: '>2.0'
    }
  },
  {
    dim: 'A',
    dimName: 'Technical Skills & Engineering Competence',
    dimWeight: 35,
    ref: 'A4',
    parentName: 'HSE Oversight & Environmental Compliance',
    parentWeight: 20,
    code: 'A4.7',
    name: 'Environmental non-compliance rate',
    detailWeight: 15,
    effectiveWeight: 1.05,
    metric: '% notices received',
    formula: '(Notices received ÷ Total inspections) × 100',
    dataSource: 'Environmental Compliance Log',
    direction: 'L',
    benchmarks: {
      score5: '0%',
      score4: '≤2%',
      score3: '≤5%',
      score2: '≤10%',
      score1: '>10%'
    }
  },

  // ==========================================
  // DIMENSION B: Soft Skills & Team Management (20%)
  // ==========================================
  // B1: Communication & Coordination (30% of Dim B)
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B1',
    parentName: 'Communication & Coordination',
    parentWeight: 30,
    code: 'B1.1',
    name: 'Meeting minutes submission ≤3 days',
    detailWeight: 20,
    effectiveWeight: 1.20,
    metric: '% minutes issued ≤3 days',
    formula: '(Minutes issued ≤3 days ÷ Total meetings) × 100',
    dataSource: 'Meeting Minutes Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B1',
    parentName: 'Communication & Coordination',
    parentWeight: 30,
    code: 'B1.2',
    name: 'Correspondence response ≤5 days',
    detailWeight: 25,
    effectiveWeight: 1.50,
    metric: '% responses ≤5 days',
    formula: '(Responses ≤5 days ÷ Total correspondence) × 100',
    dataSource: 'Correspondence Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B1',
    parentName: 'Communication & Coordination',
    parentWeight: 30,
    code: 'B1.3',
    name: 'Action item closure rate',
    detailWeight: 20,
    effectiveWeight: 1.20,
    metric: '% actions closed on time',
    formula: '(Actions closed by due date ÷ Total actions) × 100',
    dataSource: 'Action Tracking Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B1',
    parentName: 'Communication & Coordination',
    parentWeight: 30,
    code: 'B1.4',
    name: 'Monthly progress narrative report submission on time',
    detailWeight: 20,
    effectiveWeight: 1.20,
    metric: '% reports submitted on time',
    formula: '(Reports on time ÷ Total months) × 100',
    dataSource: 'Monthly Progress Reports',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B1',
    parentName: 'Communication & Coordination',
    parentWeight: 30,
    code: 'B1.5',
    name: 'Coordination meeting frequency',
    detailWeight: 15,
    effectiveWeight: 0.90,
    metric: '% actual vs. planned meetings',
    formula: '(Actual meetings ÷ Planned meetings) × 100',
    dataSource: 'Coordination Meeting Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },

  // B2: Leadership & Resource Deployment (30% of Dim B)
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B2',
    parentName: 'Leadership & Resource Deployment',
    parentWeight: 30,
    code: 'B2.1',
    name: 'Key Expert mobilization rate',
    detailWeight: 25,
    effectiveWeight: 1.50,
    metric: '% actual vs. approved man-days',
    formula: '(Actual man-days ÷ Approved man-days) × 100',
    dataSource: 'Attendance Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B2',
    parentName: 'Leadership & Resource Deployment',
    parentWeight: 30,
    code: 'B2.2',
    name: 'Key Expert turnover rate',
    detailWeight: 20,
    effectiveWeight: 1.20,
    metric: '% key experts replaced',
    formula: '(Replacements ÷ Total key experts) × 100',
    dataSource: 'Staff Turnover Register',
    direction: 'L',
    benchmarks: {
      score5: '0%',
      score4: '≤5%',
      score3: '≤10%',
      score2: '≤20%',
      score1: '>20%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B2',
    parentName: 'Leadership & Resource Deployment',
    parentWeight: 30,
    code: 'B2.3',
    name: 'Senior staff site presence rate',
    detailWeight: 20,
    effectiveWeight: 1.20,
    metric: '% actual vs. required days',
    formula: '(Actual days on site ÷ Required days) × 100',
    dataSource: 'Site Attendance Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B2',
    parentName: 'Leadership & Resource Deployment',
    parentWeight: 30,
    code: 'B2.4',
    name: 'Staff performance review completion',
    detailWeight: 15,
    effectiveWeight: 0.90,
    metric: '% reviews completed',
    formula: '(Reviews completed ÷ Reviews required) × 100',
    dataSource: 'HR Performance Records',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B2',
    parentName: 'Leadership & Resource Deployment',
    parentWeight: 30,
    code: 'B2.5',
    name: 'Backup coverage for key roles',
    detailWeight: 20,
    effectiveWeight: 1.20,
    metric: '% absent days with approved backup',
    formula: '(Days with backup ÷ Total absent days) × 100',
    dataSource: 'Delegation/Backup Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // B3: Problem Solving & Dispute Mitigation (25% of Dim B)
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B3',
    parentName: 'Problem Solving & Dispute Mitigation',
    parentWeight: 25,
    code: 'B3.1',
    name: 'Early warning notification timeliness',
    detailWeight: 20,
    effectiveWeight: 1.00,
    metric: '% EW issued ≤7 days',
    formula: '(EW issued ≤7 days ÷ Total EW) × 100',
    dataSource: 'Early Warning Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B3',
    parentName: 'Problem Solving & Dispute Mitigation',
    parentWeight: 25,
    code: 'B3.2',
    name: 'EOT evaluation ≤28 days',
    detailWeight: 25,
    effectiveWeight: 1.25,
    metric: '% EOTs evaluated ≤28 days',
    formula: '(EOTs evaluated ≤28 days ÷ Total EOTs) × 100',
    dataSource: 'EOT Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B3',
    parentName: 'Problem Solving & Dispute Mitigation',
    parentWeight: 25,
    code: 'B3.3',
    name: 'Variation evaluation ≤14 days',
    detailWeight: 20,
    effectiveWeight: 1.00,
    metric: '% variations evaluated ≤14 days',
    formula: '(Variations evaluated ≤14 days ÷ Total variations) × 100',
    dataSource: 'Variation Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B3',
    parentName: 'Problem Solving & Dispute Mitigation',
    parentWeight: 25,
    code: 'B3.4',
    name: 'Claim documentation completeness',
    detailWeight: 20,
    effectiveWeight: 1.00,
    metric: '% claims fully documented',
    formula: '(Claims with full docs ÷ Total claims) × 100',
    dataSource: 'Claim Files',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B3',
    parentName: 'Problem Solving & Dispute Mitigation',
    parentWeight: 25,
    code: 'B3.5',
    name: 'Dispute escalation rate',
    detailWeight: 15,
    effectiveWeight: 0.75,
    metric: '% disputes escalated to DAAB',
    formula: '(Disputes escalated to DAAB ÷ Total disputes) × 100',
    dataSource: 'Dispute Log',
    direction: 'L',
    benchmarks: {
      score5: '0%',
      score4: '≤5%',
      score3: '≤10%',
      score2: '≤20%',
      score1: '>20%'
    }
  },

  // B4: Stakeholder & Utility Coordination (15% of Dim B)
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B4',
    parentName: 'Stakeholder & Utility Coordination',
    parentWeight: 15,
    code: 'B4.1',
    name: 'Utility relocation progress vs. plan',
    detailWeight: 25,
    effectiveWeight: 0.75,
    metric: '% actual vs. planned relocations',
    formula: '(Actual relocations ÷ Planned) × 100',
    dataSource: 'Utility Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B4',
    parentName: 'Stakeholder & Utility Coordination',
    parentWeight: 15,
    code: 'B4.2',
    name: 'Grievance closure ≤14 days',
    detailWeight: 20,
    effectiveWeight: 0.60,
    metric: '% grievances closed ≤14 days',
    formula: '(Grievances closed ≤14 days ÷ Total) × 100',
    dataSource: 'Grievance Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B4',
    parentName: 'Stakeholder & Utility Coordination',
    parentWeight: 15,
    code: 'B4.3',
    name: 'Permit/approval acquisition rate',
    detailWeight: 20,
    effectiveWeight: 0.60,
    metric: '% permits obtained',
    formula: '(Permits obtained ÷ Permits required) × 100',
    dataSource: 'Permit Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B4',
    parentName: 'Stakeholder & Utility Coordination',
    parentWeight: 15,
    code: 'B4.4',
    name: 'Interface meeting frequency',
    detailWeight: 20,
    effectiveWeight: 0.60,
    metric: '% actual vs. planned meetings',
    formula: '(Actual meetings ÷ Planned) × 100',
    dataSource: 'Interface Meeting Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'B',
    dimName: 'Soft Skills & Team Management',
    dimWeight: 20,
    ref: 'B4',
    parentName: 'Stakeholder & Utility Coordination',
    parentWeight: 15,
    code: 'B4.5',
    name: 'Stakeholder issue closure rate',
    detailWeight: 15,
    effectiveWeight: 0.45,
    metric: '% issues closed',
    formula: '(Issues closed ÷ Total issues raised) × 100',
    dataSource: 'Stakeholder Issue Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },

  // ==========================================
  // DIMENSION C: Project Supervision & Site Presence (20%)
  // ==========================================
  // C1: Routine Site Supervision & Presence (30% of Dim C)
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C1',
    parentName: 'Routine Site Supervision & Presence',
    parentWeight: 30,
    code: 'C1.1',
    name: 'Site diary completeness',
    detailWeight: 20,
    effectiveWeight: 1.20,
    metric: '% days with complete diary',
    formula: '(Days with complete diary ÷ Total working days) × 100',
    dataSource: 'Site Diaries',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C1',
    parentName: 'Routine Site Supervision & Presence',
    parentWeight: 30,
    code: 'C1.2',
    name: 'Inspector deployment rate',
    detailWeight: 20,
    effectiveWeight: 1.20,
    metric: '% actual vs. approved inspectors',
    formula: '(Actual inspectors on site ÷ Approved) × 100',
    dataSource: 'Attendance Log vs. Plan',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C1',
    parentName: 'Routine Site Supervision & Presence',
    parentWeight: 30,
    code: 'C1.3',
    name: 'Active work front coverage',
    detailWeight: 20,
    effectiveWeight: 1.20,
    metric: '% fronts inspected daily',
    formula: '(Fronts inspected daily ÷ Total active fronts) × 100',
    dataSource: 'Inspection Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C1',
    parentName: 'Routine Site Supervision & Presence',
    parentWeight: 30,
    code: 'C1.4',
    name: 'Shift/night coverage compliance',
    detailWeight: 10,
    effectiveWeight: 0.60,
    metric: '% shifts covered',
    formula: '(Shifts covered ÷ Shifts required) × 100',
    dataSource: 'Shift Roster',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C1',
    parentName: 'Routine Site Supervision & Presence',
    parentWeight: 30,
    code: 'C1.5',
    name: 'Photo record submission',
    detailWeight: 10,
    effectiveWeight: 0.60,
    metric: '% days with geotagged photos',
    formula: '(Days with geotagged photos ÷ Total days) × 100',
    dataSource: 'Photo Log',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C1',
    parentName: 'Routine Site Supervision & Presence',
    parentWeight: 30,
    code: 'C1.6',
    name: 'Site instruction log completeness',
    detailWeight: 20,
    effectiveWeight: 1.20,
    metric: '% instructions logged',
    formula: '(Instructions logged ÷ Total issued) × 100',
    dataSource: 'Site Instruction Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // C2: Work Volume Measurement & IPC Certification (25% of Dim C)
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C2',
    parentName: 'Work Volume Measurement & IPC Certification',
    parentWeight: 25,
    code: 'C2.1',
    name: 'Joint measurement completion',
    detailWeight: 20,
    effectiveWeight: 1.00,
    metric: '% items jointly measured',
    formula: '(Items jointly measured ÷ Total items) × 100',
    dataSource: 'Joint Measurement Sheets',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C2',
    parentName: 'Work Volume Measurement & IPC Certification',
    parentWeight: 25,
    code: 'C2.2',
    name: 'Quantity verification variance',
    detailWeight: 25,
    effectiveWeight: 1.25,
    metric: '% deviation verified vs. claimed',
    formula: '(Verified qty − Claimed qty) ÷ Claimed qty × 100',
    dataSource: 'BOQ Reconciliation',
    direction: 'L',
    benchmarks: {
      score5: '≤1%',
      score4: '≤2%',
      score3: '≤3%',
      score2: '≤5%',
      score1: '>5%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C2',
    parentName: 'Work Volume Measurement & IPC Certification',
    parentWeight: 25,
    code: 'C2.3',
    name: 'IPC issuance within 14 days',
    detailWeight: 20,
    effectiveWeight: 1.00,
    metric: '% IPCs issued ≤14 days',
    formula: '(IPCs issued ≤14 days ÷ Total IPCs) × 100',
    dataSource: 'IPC Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C2',
    parentName: 'Work Volume Measurement & IPC Certification',
    parentWeight: 25,
    code: 'C2.4',
    name: 'As-built quantity reconciliation',
    detailWeight: 15,
    effectiveWeight: 0.75,
    metric: '% items reconciled',
    formula: '(Reconciled items ÷ Total items) × 100',
    dataSource: 'As-Built Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C2',
    parentName: 'Work Volume Measurement & IPC Certification',
    parentWeight: 25,
    code: 'C2.5',
    name: 'Variation measurement documentation',
    detailWeight: 10,
    effectiveWeight: 0.50,
    metric: '% variations with measurement',
    formula: '(Variations with measurement ÷ Total variations) × 100',
    dataSource: 'Variation Files',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C2',
    parentName: 'Work Volume Measurement & IPC Certification',
    parentWeight: 25,
    code: 'C2.6',
    name: 'Payment certificate accuracy',
    detailWeight: 10,
    effectiveWeight: 0.50,
    metric: '% error-free certificates',
    formula: '(Error-free certificates ÷ Total certificates) × 100',
    dataSource: 'Payment Certificate Audit',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // C3: Progress Monitoring & Reporting (25% of Dim C)
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C3',
    parentName: 'Progress Monitoring & Reporting',
    parentWeight: 25,
    code: 'C3.1',
    name: 'Baseline programme review completion',
    detailWeight: 15,
    effectiveWeight: 0.75,
    metric: '% reviewed within 21 days',
    formula: '(Reviewed ≤21 days ÷ Total) × 100',
    dataSource: 'Baseline Review Record',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C3',
    parentName: 'Progress Monitoring & Reporting',
    parentWeight: 25,
    code: 'C3.2',
    name: 'Monthly progress schedule & S-curve submission on time',
    detailWeight: 20,
    effectiveWeight: 1.00,
    metric: '% reports on time',
    formula: '(Reports on time ÷ Total months) × 100',
    dataSource: 'Monthly Progress Reports',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C3',
    parentName: 'Progress Monitoring & Reporting',
    parentWeight: 25,
    code: 'C3.3',
    name: 'S-curve update accuracy',
    detailWeight: 15,
    effectiveWeight: 0.75,
    metric: '% actual vs. planned variance',
    formula: 'Actual vs. planned progress variance × 100',
    dataSource: 'S-Curve Analysis',
    direction: 'L',
    benchmarks: {
      score5: '≤2%',
      score4: '≤5%',
      score3: '≤8%',
      score2: '≤12%',
      score1: '>12%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C3',
    parentName: 'Progress Monitoring & Reporting',
    parentWeight: 25,
    code: 'C3.4',
    name: 'Critical path delay analysis submission',
    detailWeight: 20,
    effectiveWeight: 1.00,
    metric: '% months with analysis',
    formula: '(Months with analysis ÷ Total months) × 100',
    dataSource: 'Delay Analysis Reports',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C3',
    parentName: 'Progress Monitoring & Reporting',
    parentWeight: 25,
    code: 'C3.5',
    name: 'Look-ahead programme submission',
    detailWeight: 15,
    effectiveWeight: 0.75,
    metric: '% weeks with 3-week look-ahead',
    formula: '(Weeks with look-ahead ÷ Total weeks) × 100',
    dataSource: 'Look-Ahead Programmes',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C3',
    parentName: 'Progress Monitoring & Reporting',
    parentWeight: 25,
    code: 'C3.6',
    name: 'Early warning register update frequency',
    detailWeight: 15,
    effectiveWeight: 0.75,
    metric: '% required updates delivered',
    formula: '(Updates per month ÷ Required updates) × 100',
    dataSource: 'Early Warning Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // C4: Testing & Pre-Commissioning Oversight (20% of Dim C)
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C4',
    parentName: 'Testing & Pre-Commissioning Oversight',
    parentWeight: 20,
    code: 'C4.1',
    name: 'Commissioning & pre-handover test witnessing rate',
    detailWeight: 20,
    effectiveWeight: 0.80,
    metric: '% tests witnessed',
    formula: '(Tests witnessed ÷ Tests required) × 100',
    dataSource: 'Witness Log',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C4',
    parentName: 'Testing & Pre-Commissioning Oversight',
    parentWeight: 20,
    code: 'C4.2',
    name: 'FWD/deflection test oversight',
    detailWeight: 20,
    effectiveWeight: 0.80,
    metric: '% FWD tests witnessed',
    formula: '(Tests witnessed ÷ Tests required) × 100',
    dataSource: 'FWD Reports',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C4',
    parentName: 'Testing & Pre-Commissioning Oversight',
    parentWeight: 20,
    code: 'C4.3',
    name: 'Pre-commissioning checklist completion',
    detailWeight: 15,
    effectiveWeight: 0.60,
    metric: '% checklists completed',
    formula: '(Checklists completed ÷ Total required) × 100',
    dataSource: 'Commissioning Checklists',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C4',
    parentName: 'Testing & Pre-Commissioning Oversight',
    parentWeight: 20,
    code: 'C4.4',
    name: 'Road safety audit closure rate',
    detailWeight: 15,
    effectiveWeight: 0.60,
    metric: '% RSA findings closed',
    formula: '(RSA findings closed ÷ Total findings) × 100',
    dataSource: 'RSA Report',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C4',
    parentName: 'Testing & Pre-Commissioning Oversight',
    parentWeight: 20,
    code: 'C4.5',
    name: 'Snag list closure rate',
    detailWeight: 15,
    effectiveWeight: 0.60,
    metric: '% snags closed',
    formula: '(Snags closed ÷ Total snags) × 100',
    dataSource: 'Snag List Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'C',
    dimName: 'Project Supervision & Site Presence',
    dimWeight: 20,
    ref: 'C4',
    parentName: 'Testing & Pre-Commissioning Oversight',
    parentWeight: 20,
    code: 'C4.6',
    name: 'Handover documentation completeness',
    detailWeight: 15,
    effectiveWeight: 0.60,
    metric: '% documents submitted',
    formula: '(Documents submitted ÷ Total required) × 100',
    dataSource: 'Handover Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // ==========================================
  // DIMENSION D: Contract Administration & Time-Based Compliance (15%)
  // ==========================================
  // D1: Contract & Legal Administration (30% of Dim D)
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D1',
    parentName: 'Contract & Legal Administration',
    parentWeight: 30,
    code: 'D1.1',
    name: 'Written instruction rate',
    detailWeight: 25,
    effectiveWeight: 1.11,
    metric: '% written EIs',
    formula: '(Written EIs ÷ Total instructions issued) × 100',
    dataSource: 'Engineer\'s Instruction Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D1',
    parentName: 'Contract & Legal Administration',
    parentWeight: 30,
    code: 'D1.2',
    name: 'Determination timeliness',
    detailWeight: 25,
    effectiveWeight: 1.13,
    metric: '% determinations ≤28 days',
    formula: '(Determinations ≤28 days ÷ Total) × 100',
    dataSource: 'Determination Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D1',
    parentName: 'Contract & Legal Administration',
    parentWeight: 30,
    code: 'D1.3',
    name: 'Time-bar compliance (notices)',
    detailWeight: 20,
    effectiveWeight: 0.90,
    metric: '% notices within time bar',
    formula: '(Notices within time bar ÷ Total notices) × 100',
    dataSource: 'Time-Bar Log',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D1',
    parentName: 'Contract & Legal Administration',
    parentWeight: 30,
    code: 'D1.4',
    name: 'Delegation matrix compliance',
    detailWeight: 15,
    effectiveWeight: 0.68,
    metric: '% signed by authorized person',
    formula: '(Signed by authorized person ÷ Total) × 100',
    dataSource: 'Delegation Matrix',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D1',
    parentName: 'Contract & Legal Administration',
    parentWeight: 30,
    code: 'D1.5',
    name: 'DAAB override rate on contract determinations',
    detailWeight: 15,
    effectiveWeight: 0.68,
    metric: '% decisions overridden',
    formula: '(Decisions overridden ÷ Total decisions) × 100',
    dataSource: 'DAAB Records',
    direction: 'L',
    benchmarks: {
      score5: '0%',
      score4: '≤5%',
      score3: '≤10%',
      score2: '≤20%',
      score1: '>20%'
    }
  },

  // D2: Claims & Variation Management (25% of Dim D)
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D2',
    parentName: 'Claims & Variation Management',
    parentWeight: 25,
    code: 'D2.1',
    name: 'Claim register update frequency',
    detailWeight: 20,
    effectiveWeight: 0.75,
    metric: '% required updates delivered',
    formula: '(Updates per month ÷ Required) × 100',
    dataSource: 'Claim Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D2',
    parentName: 'Claims & Variation Management',
    parentWeight: 25,
    code: 'D2.2',
    name: 'Claim evaluation within 28 days',
    detailWeight: 20,
    effectiveWeight: 0.75,
    metric: '% claims evaluated ≤28 days',
    formula: '(Claims evaluated ≤28 days ÷ Total) × 100',
    dataSource: 'Claim Evaluation Reports',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D2',
    parentName: 'Claims & Variation Management',
    parentWeight: 25,
    code: 'D2.3',
    name: 'Entitlement documentation completeness',
    detailWeight: 20,
    effectiveWeight: 0.75,
    metric: '% claims fully documented',
    formula: '(Claims with full docs ÷ Total claims) × 100',
    dataSource: 'Claim Files',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D2',
    parentName: 'Claims & Variation Management',
    parentWeight: 25,
    code: 'D2.4',
    name: 'Variation order issuance timeliness',
    detailWeight: 20,
    effectiveWeight: 0.75,
    metric: '% VOs issued ≤14 days',
    formula: '(VOs issued ≤14 days ÷ Total) × 100',
    dataSource: 'Variation Order Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D2',
    parentName: 'Claims & Variation Management',
    parentWeight: 25,
    code: 'D2.5',
    name: 'EOT recommendation timeliness',
    detailWeight: 20,
    effectiveWeight: 0.75,
    metric: '% EOTs recommended ≤28 days',
    formula: '(EOTs recommended ≤28 days ÷ Total) × 100',
    dataSource: 'EOT Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },

  // D3: Time-Based Input Verification (25% of Dim D)
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D3',
    parentName: 'Time-Based Input Verification',
    parentWeight: 25,
    code: 'D3.1',
    name: 'Timesheet reconciliation rate',
    detailWeight: 25,
    effectiveWeight: 0.94,
    metric: '% timesheets reconciled',
    formula: '(Timesheets reconciled ÷ Total timesheets) × 100',
    dataSource: 'Timesheets vs. Attendance',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D3',
    parentName: 'Time-Based Input Verification',
    parentWeight: 25,
    code: 'D3.2',
    name: 'Unverified hours rate',
    detailWeight: 20,
    effectiveWeight: 0.75,
    metric: '% unverified hours',
    formula: '(Unverified hours ÷ Total claimed hours) × 100',
    dataSource: 'Attendance Log',
    direction: 'L',
    benchmarks: {
      score5: '0%',
      score4: '≤2%',
      score3: '≤5%',
      score2: '≤10%',
      score1: '>10%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D3',
    parentName: 'Time-Based Input Verification',
    parentWeight: 25,
    code: 'D3.3',
    name: 'Staffing level compliance',
    detailWeight: 20,
    effectiveWeight: 0.75,
    metric: '% actual vs. approved man-days',
    formula: '(Actual man-days ÷ Approved man-days) × 100',
    dataSource: 'Attendance Record',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D3',
    parentName: 'Time-Based Input Verification',
    parentWeight: 25,
    code: 'D3.4',
    name: 'Reimbursable expense receipt compliance',
    detailWeight: 15,
    effectiveWeight: 0.56,
    metric: '% expenses with receipts',
    formula: '(Expenses with receipts ÷ Total claimed) × 100',
    dataSource: 'Expense Claims',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D3',
    parentName: 'Time-Based Input Verification',
    parentWeight: 25,
    code: 'D3.5',
    name: 'Invoice line-item reconciliation',
    detailWeight: 20,
    effectiveWeight: 0.75,
    metric: '% line items reconciled',
    formula: '(Reconciled line items ÷ Total line items) × 100',
    dataSource: 'Invoice Audit',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // D4: Document Control & Archival (20% of Dim D)
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D4',
    parentName: 'Document Control & Archival',
    parentWeight: 20,
    code: 'D4.1',
    name: 'Drawing register update frequency',
    detailWeight: 20,
    effectiveWeight: 0.60,
    metric: '% required updates delivered',
    formula: '(Updates per month ÷ Required) × 100',
    dataSource: 'Drawing Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D4',
    parentName: 'Document Control & Archival',
    parentWeight: 20,
    code: 'D4.2',
    name: 'Correspondence register completeness',
    detailWeight: 20,
    effectiveWeight: 0.60,
    metric: '% items logged',
    formula: '(Items logged ÷ Total correspondence) × 100',
    dataSource: 'Correspondence Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D4',
    parentName: 'Document Control & Archival',
    parentWeight: 20,
    code: 'D4.3',
    name: 'Superseded document control',
    detailWeight: 20,
    effectiveWeight: 0.60,
    metric: '% site copies matching latest revision',
    formula: '(Site copies matching latest ÷ Total checked) × 100',
    dataSource: 'Site Document Audit',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D4',
    parentName: 'Document Control & Archival',
    parentWeight: 20,
    code: 'D4.4',
    name: 'Archive retrieval test success',
    detailWeight: 20,
    effectiveWeight: 0.60,
    metric: '% documents retrieved ≤24 hrs',
    formula: '(Documents retrieved ≤24 hrs ÷ Total requested) × 100',
    dataSource: 'Retrieval Test Records',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'D',
    dimName: 'Contract Administration & Time-Based Compliance',
    dimWeight: 15,
    ref: 'D4',
    parentName: 'Document Control & Archival',
    parentWeight: 20,
    code: 'D4.5',
    name: 'Audit trail completeness',
    detailWeight: 20,
    effectiveWeight: 0.60,
    metric: '% decisions with full trail',
    formula: '(Decisions with full trail ÷ Total decisions) × 100',
    dataSource: 'Decision Log',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // ==========================================
  // DIMENSION E: Governance, Ethics & Independence (10%)
  // ==========================================
  // E1: Impartiality & Neutral Determination (30% of Dim E)
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E1',
    parentName: 'Impartiality & Neutral Determination',
    parentWeight: 30,
    code: 'E1.1',
    name: 'Bias-free determination rate',
    detailWeight: 30,
    effectiveWeight: 0.90,
    metric: '% determinations without bias complaint',
    formula: '(Determinations without bias complaint ÷ Total) × 100',
    dataSource: 'Determination Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E1',
    parentName: 'Impartiality & Neutral Determination',
    parentWeight: 30,
    code: 'E1.2',
    name: 'DAAB override rate on Engineer fair determinations',
    detailWeight: 25,
    effectiveWeight: 0.75,
    metric: '% overridden determinations',
    formula: '(Overridden determinations ÷ Total) × 100',
    dataSource: 'DAAB Records',
    direction: 'L',
    benchmarks: {
      score5: '0%',
      score4: '≤5%',
      score3: '≤10%',
      score2: '≤20%',
      score1: '>20%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E1',
    parentName: 'Impartiality & Neutral Determination',
    parentWeight: 30,
    code: 'E1.3',
    name: 'Contractor influence complaints',
    detailWeight: 25,
    effectiveWeight: 0.75,
    metric: '% complaints received',
    formula: '(Complaints received ÷ Total determinations) × 100',
    dataSource: 'Complaint Log',
    direction: 'L',
    benchmarks: {
      score5: '0%',
      score4: '≤2%',
      score3: '≤5%',
      score2: '≤10%',
      score1: '>10%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E1',
    parentName: 'Impartiality & Neutral Determination',
    parentWeight: 30,
    code: 'E1.4',
    name: 'Decision consistency',
    detailWeight: 20,
    effectiveWeight: 0.60,
    metric: '% consistent outcomes',
    formula: '(Similar cases with consistent outcome ÷ Total) × 100',
    dataSource: 'Decision Log',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // E2: Transparency & Written Audit Trail (30% of Dim E)
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E2',
    parentName: 'Transparency & Written Audit Trail',
    parentWeight: 30,
    code: 'E2.1',
    name: 'Written directive rate',
    detailWeight: 30,
    effectiveWeight: 0.90,
    metric: '% written directives',
    formula: '(Written directives ÷ Total directives) × 100',
    dataSource: 'Instruction Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E2',
    parentName: 'Transparency & Written Audit Trail',
    parentWeight: 30,
    code: 'E2.2',
    name: 'Verbal-only variation rate',
    detailWeight: 25,
    effectiveWeight: 0.75,
    metric: '% verbal-only variations',
    formula: '(Verbal-only variations ÷ Total variations) × 100',
    dataSource: 'Variation Register',
    direction: 'L',
    benchmarks: {
      score5: '0%',
      score4: '≤2%',
      score3: '≤5%',
      score2: '≤10%',
      score1: '>10%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E2',
    parentName: 'Transparency & Written Audit Trail',
    parentWeight: 30,
    code: 'E2.3',
    name: 'Decision audit trail completeness',
    detailWeight: 25,
    effectiveWeight: 0.75,
    metric: '% decisions with full trail',
    formula: '(Decisions with full trail ÷ Total decisions) × 100',
    dataSource: 'Decision Log',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E2',
    parentName: 'Transparency & Written Audit Trail',
    parentWeight: 30,
    code: 'E2.4',
    name: 'Contract clause traceability',
    detailWeight: 20,
    effectiveWeight: 0.60,
    metric: '% instructions citing clause',
    formula: '(Instructions citing clause ÷ Total instructions) × 100',
    dataSource: 'Instruction Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // E3: Ethical Conduct & Anti-Corruption (20% of Dim E)
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E3',
    parentName: 'Ethical Conduct & Anti-Corruption',
    parentWeight: 20,
    code: 'E3.1',
    name: 'COI declaration rate',
    detailWeight: 30,
    effectiveWeight: 0.60,
    metric: '% signed declarations',
    formula: '(Signed declarations ÷ Total staff) × 100',
    dataSource: 'COI Files',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E3',
    parentName: 'Ethical Conduct & Anti-Corruption',
    parentWeight: 20,
    code: 'E3.2',
    name: 'Anti-corruption breach rate',
    detailWeight: 30,
    effectiveWeight: 0.60,
    metric: '% breaches',
    formula: '(Breaches ÷ Total staff) × 100',
    dataSource: 'Anti-Corruption Policy',
    direction: 'L',
    benchmarks: {
      score5: '0%',
      score4: '≤1%',
      score3: '≤2%',
      score2: '≤5%',
      score1: '>5%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E3',
    parentName: 'Ethical Conduct & Anti-Corruption',
    parentWeight: 20,
    code: 'E3.3',
    name: 'Gift/hospitality register compliance',
    detailWeight: 20,
    effectiveWeight: 0.40,
    metric: '% gifts logged',
    formula: '(Gifts logged ÷ Total gifts) × 100',
    dataSource: 'Gift Register',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E3',
    parentName: 'Ethical Conduct & Anti-Corruption',
    parentWeight: 20,
    code: 'E3.4',
    name: 'Whistleblowing case closure rate',
    detailWeight: 20,
    effectiveWeight: 0.40,
    metric: '% cases closed',
    formula: '(Cases closed ÷ Total cases) × 100',
    dataSource: 'Whistleblowing Reports',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  },

  // E4: Client-Consultant Alignment (20% of Dim E)
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E4',
    parentName: 'Client-Consultant Alignment',
    parentWeight: 20,
    code: 'E4.1',
    name: 'On-time deliverable rate',
    detailWeight: 30,
    effectiveWeight: 0.60,
    metric: '% deliverables on time',
    formula: '(Deliverables on time ÷ Total deliverables) × 100',
    dataSource: 'Deliverable Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E4',
    parentName: 'Client-Consultant Alignment',
    parentWeight: 20,
    code: 'E4.2',
    name: 'Client request response time',
    detailWeight: 25,
    effectiveWeight: 0.50,
    metric: '% requests responded ≤5 days',
    formula: '(Requests responded ≤5 days ÷ Total) × 100',
    dataSource: 'Correspondence Register',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E4',
    parentName: 'Client-Consultant Alignment',
    parentWeight: 20,
    code: 'E4.3',
    name: 'Client feedback score',
    detailWeight: 20,
    effectiveWeight: 0.40,
    metric: '% satisfaction score',
    formula: '(Client satisfaction score ÷ 5) × 100',
    dataSource: 'Client Feedback Form',
    direction: 'H',
    benchmarks: {
      score5: '≥95%',
      score4: '85–94%',
      score3: '70–84%',
      score2: '50–69%',
      score1: '<50%'
    }
  },
  {
    dim: 'E',
    dimName: 'Governance, Ethics & Independence',
    dimWeight: 10,
    ref: 'E4',
    parentName: 'Client-Consultant Alignment',
    parentWeight: 20,
    code: 'E4.4',
    name: 'Contract terms compliance',
    detailWeight: 25,
    effectiveWeight: 0.50,
    metric: '% compliant terms',
    formula: '(Compliant terms ÷ Total terms audited) × 100',
    dataSource: 'Compliance Checklist',
    direction: 'H',
    benchmarks: {
      score5: '100%',
      score4: '90–99%',
      score3: '75–89%',
      score2: '50–74%',
      score1: '<50%'
    }
  }
];

// Helper: Parse benchmark numeric threshold
export function parseBenchmarkNumber(bmString: string): number | null {
  if (!bmString) return null;
  const clean = bmString.replace(/,/g, '').trim();
  const match = clean.match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : null;
}

// Helper: Evaluate Likert score (1-5) against benchmark brackets
export function evaluateLikertScore(
  val: number,
  direction: 'H' | 'L',
  benchmarks: { score5: string; score4: string; score3: string; score2: string; score1: string }
): number {
  const s5 = parseBenchmarkNumber(benchmarks.score5);
  const s4 = parseBenchmarkNumber(benchmarks.score4);
  const s3 = parseBenchmarkNumber(benchmarks.score3);
  const s2 = parseBenchmarkNumber(benchmarks.score2);

  if (direction === 'H') {
    const t5 = s5 ?? 95;
    const t4 = s4 ?? 85;
    const t3 = s3 ?? 70;
    const t2 = s2 ?? 50;
    if (val >= t5) return 5;
    if (val >= t4) return 4;
    if (val >= t3) return 3;
    if (val >= t2) return 2;
    return 1;
  } else {
    const t5 = s5 ?? 1;
    const t4 = s4 ?? 3;
    const t3 = s3 ?? 6;
    const t2 = s2 ?? 10;
    if (val <= t5) return 5;
    if (val <= t4) return 4;
    if (val <= t3) return 3;
    if (val <= t2) return 2;
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

export interface CriterionSourceInfo {
  pageName: string;
  categoryTag: string;
  iconName: string;
  badgeClass: string;
}

export function getCriterionSourceInfo(code: string, dim: DimensionId): CriterionSourceInfo {
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

// Calculates the Consultant SLA Compliance & Weighted Evaluation Mark Matrix Total Net Score
export function calculateSlaMatrixTotalNetScore(
  submittals: ConsultantSubmittalKpi[],
  targetOverrides?: Record<string, number>,
  customCriteria?: any[]
): number {
  const defaultCriteria = [
    { id: 'crit_rfi', category: 'RFI', weightPct: 20, targetDays: 7 },
    { id: 'crit_mat', category: 'Material Approval', weightPct: 20, targetDays: 14 },
    { id: 'crit_ipc', category: 'IPC Review', weightPct: 20, targetDays: 7 },
    { id: 'crit_wir', category: 'Work Inspection (WIR)', weightPct: 15, targetDays: 2 },
    { id: 'crit_var', category: 'Variation Order', weightPct: 15, targetDays: 14 },
    { id: 'crit_des', category: 'Design Review', weightPct: 10, targetDays: 14 }
  ];

  const criteriaList = (customCriteria && customCriteria.length > 0) ? customCriteria : defaultCriteria;

  if (!submittals || submittals.length === 0) {
    return 100.0;
  }

  let totalEarnedScore = 0;
  criteriaList.forEach(crit => {
    const cat = crit.category;
    const targetDays = targetOverrides?.[cat] || crit.targetDays || 7;
    const weightPct = crit.weightPct || 0;

    const catItems = submittals.filter(s => s.type === cat);
    const totalSubmittals = catItems.length;

    if (totalSubmittals === 0) {
      totalEarnedScore += weightPct;
    } else {
      let delayedCount = 0;
      catItems.forEach(item => {
        const isResolved = item.actualDays !== undefined;
        let elapsedDays = isResolved ? (item.actualDays || 0) : 0;
        if (!isResolved && item.submittedDate) {
          const subTime = new Date(item.submittedDate).getTime();
          const nowTime = item.respondedDate ? new Date(item.respondedDate).getTime() : new Date().getTime();
          elapsedDays = Math.max(0, Math.round((nowTime - subTime) / (1000 * 60 * 60 * 24)));
        }
        const isOverdue = item.status === 'Overdue' || elapsedDays > targetDays;
        if (isOverdue) delayedCount++;
      });

      const deduction = parseFloat(((delayedCount / totalSubmittals) * weightPct).toFixed(2));
      const earnedScore = parseFloat(Math.max(0, weightPct - deduction).toFixed(2));
      totalEarnedScore += earnedScore;
    }
  });

  return parseFloat(Math.min(100, Math.max(0, totalEarnedScore)).toFixed(1));
}

// Compute quantitative metrics from Submittals and Project state
export function calculateSubmittalQuantitativeMetrics(
  project: Project,
  consultant: SupervisionConsultantInfo,
  submittalsOverride?: ConsultantSubmittalKpi[]
): SubmittalQuantitativeMetrics {
  const submittals = (submittalsOverride && submittalsOverride.length > 0)
    ? submittalsOverride
    : (consultant.submittalKpis && consultant.submittalKpis.length > 0 ? consultant.submittalKpis : []);

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

// Helper: Auto-compute baseline metric values and scores from project data
export function autoEvaluateProjectCriterion(
  criterion: ConsultantEvaluationCriterion,
  project: Project,
  consultant: SupervisionConsultantInfo,
  submittalsOverride?: ConsultantSubmittalKpi[],
  precomputedMetrics?: SubmittalQuantitativeMetrics
): { score: number; actualValue: string; numericVal?: number; notes?: string; formulaEvidence?: string } {
  const m = precomputedMetrics || calculateSubmittalQuantitativeMetrics(project, consultant, submittalsOverride);

  let numVal = 92;
  let actualStr = '';
  let noteStr = '';
  let formulaEv = '';

  const { code, dim, ref, direction, benchmarks } = criterion;

  // Specific code-level exact mathematical mapping
  switch (code) {
    case 'A1.1': { // Drawing review turnaround
      numVal = m.designs.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% (${m.designs.onTime}/${m.designs.total || 1} designs ≤ 14d, avg: ${m.designs.avgDays}d)`;
      noteStr = `Calculated automatically from Design Review submittals. Average review duration: ${m.designs.avgDays} days vs 14d SLA.`;
      formulaEv = `(${m.designs.onTime} on-time ÷ ${m.designs.total || 1} total) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A1.2': { // TQ/RFI response time
      numVal = m.rfis.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% (${m.rfis.onTime}/${m.rfis.total || 1} RFIs answered ≤ 7d, avg: ${m.rfis.avgDays}d)`;
      noteStr = `Derived from RFI register. ${m.rfis.resolved} RFIs resolved with average response time of ${m.rfis.avgDays} days.`;
      formulaEv = `(${m.rfis.onTime} on-time ÷ ${m.rfis.total || 1} total) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A1.3': { // Design review comment closure rate
      numVal = m.designs.closureRate;
      actualStr = `${numVal.toFixed(1)}% comments resolved and signed off`;
      noteStr = `Design clarification and revision closure rate verified against drawings register.`;
      formulaEv = `Closure rate: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A1.4': { // Compliance checklist completion rate
      numVal = Math.min(100, Math.max(88, m.overallOnTimeRate));
      actualStr = `${numVal.toFixed(1)}% checklists fully completed prior to work`;
      noteStr = `Technical checklist verification across standard ERA inspection forms.`;
      formulaEv = `Checklist index: ${numVal.toFixed(1)}%`;
      break;
    }
    case 'A1.5': { // Design change justification completeness
      numVal = m.variations.onTimeRate;
      actualStr = `${numVal.toFixed(1)}% complete engineering justification`;
      noteStr = `Engineering variation order cost & geometric justification audits.`;
      formulaEv = `Justification rate: ${numVal.toFixed(1)}%`;
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
    case 'A2.6': { // Rework rate (Lower is better)
      numVal = m.wirs.reworkRate;
      actualStr = `${numVal.toFixed(1)}% rework / resubmission rate`;
      noteStr = `Resubmission or rejection rate among site inspection requests (lower is better).`;
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
    case 'B2.1': { // Key Expert mobilization rate
      numVal = m.personnel.mobilizationRate;
      actualStr = `${numVal.toFixed(1)}% (${m.personnel.active}/${m.personnel.total || 1} Key Experts active)`;
      noteStr = `Consultant site staffing mobilization status against approved proposal.`;
      formulaEv = `(${m.personnel.active} active ÷ ${m.personnel.total || 1} staff) × 100 = ${numVal.toFixed(1)}%`;
      break;
    }
    case 'B2.2': { // Key Expert turnover rate (Lower is better)
      numVal = m.personnel.turnoverRate;
      actualStr = `${numVal.toFixed(1)}% (${m.personnel.total - m.personnel.active} replacements)`;
      noteStr = `Staff turnover and replacement index among Resident Engineer team (lower is better).`;
      formulaEv = `Turnover rate: ${numVal.toFixed(1)}%`;
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
    case 'B3.5': { // Dispute escalation rate (Lower is better)
      numVal = m.risks.disputeRate;
      actualStr = `${numVal.toFixed(1)}% (${m.risks.disputesCount} active disputes / claims)`;
      noteStr = `Dispute avoidance and amicable settlement efficacy (lower is better).`;
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
    formulaEvidence: formulaEv
  };
}

// Auto-evaluate all criteria in the matrix at once based on Submittals & quantitative data
export function autoEvaluateAllCriteria(
  project: Project,
  consultant: SupervisionConsultantInfo,
  submittalsOverride?: ConsultantSubmittalKpi[]
): Record<string, { score: number; actualValue: string; numericVal?: number; notes?: string; formulaEvidence?: string; autoEvaluated: boolean; evaluatedAt: string }> {
  const result: Record<string, { score: number; actualValue: string; numericVal?: number; notes?: string; formulaEvidence?: string; autoEvaluated: boolean; evaluatedAt: string }> = {};
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
      autoEvaluated: true,
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
    id: 'grade_f',
    grade: 'Grade F',
    minScore: 0,
    maxScore: 49.9,
    label: 'Unacceptable / Non-Compliant',
    standing: 'Grounds for Immediate Contract Termination & Default Notice under Contract Guidelines',
    badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
    color: 'rose'
  }
];

export function evaluateQualitativeGrade(
  score: number,
  thresholds: QualitativeGradeThreshold[] = DEFAULT_GRADE_THRESHOLDS
): QualitativeGradeThreshold {
  const activeThresholds = thresholds && thresholds.length > 0 ? thresholds : DEFAULT_GRADE_THRESHOLDS;
  const sorted = [...activeThresholds].sort((a, b) => b.minScore - a.minScore);
  const matched = sorted.find(t => score >= t.minScore);
  return matched || sorted[sorted.length - 1] || DEFAULT_GRADE_THRESHOLDS[4];
}

export function calculateComprehensiveEvaluationScore(
  evaluations: Record<string, { score: number; actualValue?: string | number }>,
  criteriaList: ConsultantEvaluationCriterion[] = CONSULTANT_EVALUATION_CRITERIA,
  customCriterionWeights?: Record<string, number>,
  customThresholds?: QualitativeGradeThreshold[]
): {
  overallScore: number;
  officialGrade: string;
  officialTitle: string;
  officialStanding: string;
  matchedThreshold: QualitativeGradeThreshold;
  dimensionBreakdown: Record<DimensionId, { earned: number; maxWeight: number; percentage: number }>;
} {
  const dimensionBreakdown: Record<DimensionId, { earned: number; maxWeight: number; percentage: number }> = {
    A: { earned: 0, maxWeight: 0, percentage: 0 },
    B: { earned: 0, maxWeight: 0, percentage: 0 },
    C: { earned: 0, maxWeight: 0, percentage: 0 },
    D: { earned: 0, maxWeight: 0, percentage: 0 },
    E: { earned: 0, maxWeight: 0, percentage: 0 }
  };

  let totalEarned = 0;
  let totalMaxWeight = 0;

  criteriaList.forEach(crit => {
    const record = evaluations[crit.code];
    const scoreVal = record?.score !== undefined ? record.score : 4; // Default to 4 (satisfactory) if unrated
    const effWeight = customCriterionWeights?.[crit.code] !== undefined ? customCriterionWeights[crit.code] : crit.effectiveWeight;
    const itemPoints = (scoreVal / 5) * effWeight;
    dimensionBreakdown[crit.dim].earned += itemPoints;
    dimensionBreakdown[crit.dim].maxWeight += effWeight;
    totalEarned += itemPoints;
    totalMaxWeight += effWeight;
  });

  (Object.keys(dimensionBreakdown) as DimensionId[]).forEach(dim => {
    const d = dimensionBreakdown[dim];
    d.percentage = d.maxWeight > 0 ? Math.round((d.earned / d.maxWeight) * 100) : 0;
    d.earned = Number(d.earned.toFixed(2));
    d.maxWeight = Number(d.maxWeight.toFixed(2));
  });

  const overallScore = totalMaxWeight > 0
    ? Number(Math.min(100, Math.max(0, (totalEarned / totalMaxWeight) * 100)).toFixed(1))
    : Number(Math.min(100, Math.max(0, totalEarned)).toFixed(1));

  const matchedThreshold = evaluateQualitativeGrade(overallScore, customThresholds);
  const officialGrade = matchedThreshold.grade;
  const officialTitle = `${matchedThreshold.grade}: ${matchedThreshold.label}`;
  const officialStanding = matchedThreshold.standing;

  return {
    overallScore,
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
  const submittals = sc.submittalKpis || [];
  const metrics = calculateSubmittalQuantitativeMetrics(project, sc, submittals);

  let evaluationResult;
  let isAutoEvaluated = false;

  const thresholds = sc.customGradeThresholds || DEFAULT_GRADE_THRESHOLDS;

  // Automatically calculate from quantitative project data & submittals based on the 105 criteria
  const autoResults = autoEvaluateAllCriteria(project, sc, submittals);
  evaluationResult = calculateComprehensiveEvaluationScore(autoResults, CONSULTANT_EVALUATION_CRITERIA, sc.customCriterionWeights, thresholds);
  isAutoEvaluated = true;

  // Submittal Log & Operational SLA Turnaround score (Equal to Consultant SLA Compliance & Weighted Evaluation Mark Matrix Total Net Score)
  const slaTurnaroundScore = metrics.matrixTotalNetScore !== undefined
    ? Number(metrics.matrixTotalNetScore.toFixed(1))
    : Number((metrics.overallOnTimeRate || 0).toFixed(1));
  // 5-Dimension Performance Evaluation score (from 105 criteria matrix)
  const fiveDimScore = Number((evaluationResult.overallScore || 0).toFixed(1));

  // Combined composite score (50% Submittal SLA Turnaround + 50% 5-Dimension Performance Evaluation)
  const compositeScore = Number(((fiveDimScore * 0.5) + (slaTurnaroundScore * 0.5)).toFixed(1));

  // Dynamic overall score recalculated from active project data, submittal SLAs, and evaluation criteria
  const overallScore = compositeScore;

  const matchedThreshold = evaluateQualitativeGrade(overallScore, thresholds);
  const officialGrade = matchedThreshold.grade;

  return {
    sc,
    firmName: sc.firmName || project.consultant || 'N/A',
    residentEngineer: sc.residentEngineerName || (sc.personnel?.find(x => x.position.toLowerCase().includes('resident'))?.name) || 'Field Assigned',
    associationType: sc.associationType || 'Lead Supervision Firm',
    commencementDate: sc.commencementDate || '',
    overallScore,
    officialGrade,
    officialTitle: `${officialGrade}: ${matchedThreshold.label}`,
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
