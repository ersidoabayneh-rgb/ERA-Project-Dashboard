/**
 * FIDIC Contract Clause & Delivery Method Analysis Engine
 * 
 * Provides domain-specific FIDIC sub-clause mappings, legal risk analysis,
 * claim evaluation guidelines, and executive recommendations for Ethiopian Roads
 * Administration (ERA) highway construction projects.
 * 
 * Supports:
 * - FIDIC Red Book (1999 / 2017) - Employer Design (DBB)
 * - FIDIC Yellow Book (1999 / 2017) - Plant & Design-Build (DB)
 * - FIDIC Pink Book (MDB Harmonised Edition) - Multilateral Bank Civil Works
 * - FIDIC Silver Book (1999 / 2017) - EPC / Turnkey
 * - FIDIC White Book - Supervision Consultant Model Services Agreement
 */

import { Project } from '../types';
import { calculateProjectEvm } from './evmCalculations';

export interface FidicClauseMapping {
  eot: string;
  progressRate: string;
  delayDamages: string;
  claims: string;
  engineerDetermination: string;
  ipcPayment: string;
  priceAdjustment: string;
  variations: string;
  boqEvaluation: string;
  designReview: string;
  performanceSecurity: string;
  noticeToCorrect: string;
  disputeBoard: string;
  corruptPractices?: string;
}

export interface FidicContractInfo {
  contractType: 'DB' | 'DBB' | string;
  fidicName: string;
  editionYear: '1987' | '1999' | '2017' | '2010' | '1998' | string;
  edition: string;
  deliveryMethodName: string;
  designResponsibility: string;
  governingLaw: string;
  engineerRole: string;
  clauses: FidicClauseMapping;
}

export interface FidicClauseRef {
  subClause: string;
  title: string;
  summary: string;
  applicability: string;
}

export interface FidicAnalysisCategory {
  category: string;
  responsibleParty: 'Contractor' | 'Supervision Consultant' | 'Employer (Client)' | 'Multiple Parties';
  status: 'Compliant' | 'Caution' | 'Critical Risk' | 'Action Required';
  fidicSubClause: string;
  findings: string;
  contractualImpact: string;
  recommendedAction: string;
}

export interface FidicExecutiveRecommendation {
  priority: 'Immediate' | 'High' | 'Medium';
  subClause: string;
  title: string;
  stakeholder: 'Employer / ERA PMO' | 'Supervision Consultant / Engineer' | 'Contractor' | 'All Parties';
  finding: string;
  clauseMandate: string;
  actionableStep: string;
}

/**
 * Normalizes and extracts standard FIDIC Contract Type and Delivery Method metadata,
 * providing exact sub-clause numbers and titles mapped strictly to the specific FIDIC form and edition.
 */
export function getFidicContractInfo(project: Project): FidicContractInfo {
  const delivery = project.contractType || 'DBB';
  const fidicRaw = (project.fidicContractType || '').trim();
  const lowerRaw = fidicRaw.toLowerCase();

  const is1987 = lowerRaw.includes('1987') || lowerRaw.includes('1992') || lowerRaw.includes('4th') || lowerRaw.includes('3rd') || lowerRaw.includes('reprinted');
  const is2017 = lowerRaw.includes('2017');
  const isPink = lowerRaw.includes('pink') || lowerRaw.includes('mdb');
  const isSilver = lowerRaw.includes('silver') || lowerRaw.includes('epc') || lowerRaw.includes('turnkey');
  const isYellow = delivery === 'DB' || lowerRaw.includes('yellow') || lowerRaw.includes('design-build');

  let fidicName = 'FIDIC Red Book (1987 Edition, Reprinted 1992)';
  let editionYear: '1987' | '1999' | '2017' | '2010' | '1998' = '1987';
  let edition = 'Conditions of Contract for Works of Civil Engineering Construction (4th Edition 1987, Reprinted 1992)';
  let deliveryMethodName = 'Design-Bid-Build (DBB)';
  let designResponsibility = 'Employer / ERA (Design Directorate & Supervision Consultant under Clause 6)';
  let engineerRole = 'Supervision Consultant as Engineer (Clause 2.1 & 2.6 Impartiality)';

  if (isYellow) {
    if (is2017) {
      fidicName = fidicRaw || 'FIDIC Yellow Book (2017 Edition)';
      editionYear = '2017';
      edition = 'Conditions of Contract for Plant and Design-Build (2017 Edition)';
      deliveryMethodName = 'Design-Build (DB)';
      designResponsibility = 'Contractor (Single-Point Design Liability under Clause 5)';
      engineerRole = 'Engineer supervising Design & Construction (Sub-Clause 3.1 & 3.7)';
    } else if (lowerRaw.includes('1999')) {
      fidicName = fidicRaw || 'FIDIC Yellow Book (1999 Edition)';
      editionYear = '1999';
      edition = 'Conditions of Contract for Plant and Design-Build (1999 Edition)';
      deliveryMethodName = 'Design-Build (DB)';
      designResponsibility = 'Contractor (General Design Obligations under Clause 5)';
      engineerRole = 'Supervision Consultant / Engineer supervising Design & Construction (Sub-Clause 3.1 & 3.5)';
    } else {
      fidicName = fidicRaw || 'FIDIC Yellow Book (1987 Edition, Reprinted 1992)';
      editionYear = '1987';
      edition = 'Conditions of Contract for Electrical & Mechanical Works including Erection on Site (3rd Edition 1987, Reprinted 1992)';
      deliveryMethodName = 'Design-Build / Plant Erection (DB)';
      designResponsibility = 'Contractor (Design & Engineering Responsibility under Clause 7)';
      engineerRole = 'Supervision Consultant / Engineer supervising Design & Erection (Clause 2.1)';
    }
  } else if (isPink) {
    fidicName = fidicRaw || 'FIDIC Pink Book (2010 MDB Harmonised Edition)';
    editionYear = '2010';
    edition = 'Multilateral Development Bank Harmonised Edition for Construction (2010)';
    deliveryMethodName = 'Design-Bid-Build (DBB - MDB Funded)';
    designResponsibility = 'Employer / ERA (with Consultant Design Verification)';
    engineerRole = 'Engineer appointed by Employer with MDB oversight (Sub-Clause 3.1)';
  } else if (isSilver) {
    if (is2017) {
      fidicName = fidicRaw || 'FIDIC Silver Book (2017 Edition)';
      editionYear = '2017';
      edition = 'Conditions of Contract for EPC / Turnkey Projects (2017 Edition)';
    } else {
      fidicName = fidicRaw || 'FIDIC Silver Book (1999 Edition)';
      editionYear = '1999';
      edition = 'Conditions of Contract for EPC / Turnkey Projects (1999 Edition)';
    }
    deliveryMethodName = 'EPC / Turnkey';
    designResponsibility = 'Contractor (Full Design, Execution & Turnkey Risk)';
    engineerRole = 'Employer\'s Representative (no independent Engineer)';
  } else {
    if (is2017) {
      fidicName = fidicRaw || 'FIDIC Red Book (2017 Edition)';
      editionYear = '2017';
      edition = 'Conditions of Contract for Construction (2017 Edition)';
      deliveryMethodName = 'Design-Bid-Build (DBB)';
      designResponsibility = 'Employer / ERA (Design Directorate & Supervision Consultant)';
      engineerRole = 'Supervision Consultant as Engineer (Sub-Clause 3.1 & 3.7)';
    } else if (lowerRaw.includes('1999')) {
      fidicName = fidicRaw || 'FIDIC Red Book (1999 Edition)';
      editionYear = '1999';
      edition = 'Conditions of Contract for Construction (1999 Edition)';
      deliveryMethodName = 'Design-Bid-Build (DBB)';
      designResponsibility = 'Employer / ERA (Design Directorate & Supervision Consultant)';
      engineerRole = 'Supervision Consultant as Engineer (Sub-Clause 3.1 & 3.5)';
    } else {
      fidicName = fidicRaw || 'FIDIC Red Book (1987 Edition, Reprinted 1992)';
      editionYear = '1987';
      edition = 'Conditions of Contract for Works of Civil Engineering Construction (4th Edition 1987, Reprinted 1992)';
      deliveryMethodName = 'Design-Bid-Build (DBB)';
      designResponsibility = 'Employer / ERA (Design Directorate & Supervision Consultant under Clause 6)';
      engineerRole = 'Supervision Consultant as Engineer (Clause 2.1 & 2.6 Impartiality Mandate)';
    }
  }

  // Exact edition-specific sub-clause mapping
  let clauses: FidicClauseMapping;

  if (editionYear === '1987' || is1987) {
    clauses = {
      eot: isYellow ? 'Clause 31.1 & 31.2 [Extension of Time for Completion]' : 'Clause 44.1 & 44.2 [Extension of Time for Completion & 28-Day Particulars]',
      progressRate: isYellow ? 'Clause 30.1 [Rate of Progress & Program Catch-up]' : 'Clause 46.1 [Rate of Progress & Acceleration Instruction]',
      delayDamages: isYellow ? 'Clause 31.2 [Liquidated Damages]' : 'Clause 47.1 [Liquidated Damages for Delay]',
      claims: 'Clause 53.1 - 53.3 [Procedure for Claims - Mandatory 28-Day Notice Requirement]',
      engineerDetermination: 'Clause 2.1 & 2.6 [Engineer\'s Authority & Impartial Decision]',
      ipcPayment: isYellow ? 'Clause 33.1 & 33.3 [Certificates and Payments]' : 'Clause 60.1, 60.2 & 60.10 [Monthly Statements, Payments & Interest for Delay]',
      priceAdjustment: isYellow ? 'Clause 47.1 [Price Variation / Adjustments]' : 'Clause 70.1 [Increase or Decrease of Cost / Price Escalation Formula]',
      variations: isYellow ? 'Clause 27.1 & 27.2 [Variations & Valuation]' : 'Clause 51.1 & 52.1 [Variations & Valuation of Variations]',
      boqEvaluation: isYellow ? 'Clause 33.1 [Lump Sum Contract Price & Schedule of Prices]' : 'Clause 52.2 [Power of Engineer to Fix Rates (15% Quantity Variance Threshold)]',
      designReview: isYellow ? 'Clause 7.1 & 7.2 [Contractor\'s Drawings & Engineer Approval]' : 'Clause 6.1 & 6.2 [Customary Drawings & Instructions from Engineer]',
      performanceSecurity: 'Clause 10.1 & 10.2 [Performance Security & Period of Validity]',
      noticeToCorrect: isYellow ? 'Clause 45.1 [Notice to Correct & Remediation]' : 'Clause 63.1 [Default of Contractor & Termination Notice]',
      disputeBoard: isYellow ? 'Clause 50.1 [Settlement of Disputes]' : 'Clause 67.1 - 67.3 [Settlement of Disputes - Engineer\'s Decision & ICC Arbitration]',
    };
  } else if (editionYear === '2017') {
    clauses = {
      eot: 'Sub-Clause 8.5 [Extension of Time for Completion]',
      progressRate: 'Sub-Clause 8.8 [Rate of Progress & Program Revision]',
      delayDamages: 'Sub-Clause 8.10 [Delay Damages]',
      claims: 'Sub-Clause 20.2 [Claims for Payment and/or EOT - Reciprocal 28-Day Notice]',
      engineerDetermination: 'Sub-Clause 3.7 [Agreement or Determination]',
      ipcPayment: 'Sub-Clause 14.7 [Payment Certification & Disbursement]',
      priceAdjustment: 'Sub-Clause 13.7 [Adjustments for Changes in Cost]',
      variations: 'Sub-Clause 13.1 & 13.3 [Right to Vary & Variation Procedure]',
      boqEvaluation: isYellow ? 'Sub-Clause 14.1 [Contract Price & Schedule of Payments]' : 'Sub-Clause 12.3 [Valuation of the Works]',
      designReview: isYellow ? 'Sub-Clause 5.1 & 5.2 [Contractor\'s General Obligations & Review of Documents]' : 'Clause 3 [Engineer\'s Instructions]',
      performanceSecurity: 'Sub-Clause 4.2 [Performance Security]',
      noticeToCorrect: 'Sub-Clause 15.1 [Notice to Correct]',
      disputeBoard: 'Clause 21 [Dispute Avoidance/Adjudication Board - DAAB]',
    };
  } else if (editionYear === '2010') { // Pink Book
    clauses = {
      eot: 'Sub-Clause 8.4 [Extension of Time for Completion]',
      progressRate: 'Sub-Clause 8.6 [Rate of Progress]',
      delayDamages: 'Sub-Clause 8.7 [Delay Damages]',
      claims: 'Sub-Clause 20.1 [Contractor\'s Claims - 28-Day Mandatory Notice Bar]',
      engineerDetermination: 'Sub-Clause 3.5 [Engineer\'s Determination]',
      ipcPayment: 'Sub-Clause 14.7 [Payment Cycle]',
      priceAdjustment: 'Sub-Clause 13.8 [Adjustments for Changes in Cost]',
      variations: 'Sub-Clause 13.1 & 13.3 [Right to Vary & Variation Procedure]',
      boqEvaluation: 'Sub-Clause 12.3 [Evaluation]',
      designReview: 'Clause 3 [Engineer\'s Authority with MDB Oversight]',
      performanceSecurity: 'Sub-Clause 4.2 [Performance Security]',
      noticeToCorrect: 'Sub-Clause 15.1 [Notice to Correct]',
      disputeBoard: 'Sub-Clause 20.2 - 20.8 [Dispute Board - DB]',
      corruptPractices: 'Sub-Clause 15.6 [Corrupt or Fraudulent Practices - MDB Sanctions]',
    };
  } else { // 1999 Edition
    clauses = {
      eot: 'Sub-Clause 8.4 [Extension of Time for Completion]',
      progressRate: 'Sub-Clause 8.6 [Rate of Progress & Program Recovery Instruction]',
      delayDamages: 'Sub-Clause 8.7 [Delay Damages]',
      claims: 'Sub-Clause 20.1 [Contractor\'s Claims - Mandatory 28-Day Notice Bar]',
      engineerDetermination: 'Sub-Clause 3.5 [Engineer\'s Determination]',
      ipcPayment: 'Sub-Clause 14.7 [Payment Certification & Disbursement - 56 Days]',
      priceAdjustment: 'Sub-Clause 13.8 [Adjustments for Changes in Cost]',
      variations: isYellow ? 'Sub-Clause 13.1 & 13.2 [Right to Vary & Value Engineering]' : 'Sub-Clause 13.1 & 13.3 [Right to Vary & Variation Procedure]',
      boqEvaluation: isYellow ? 'Sub-Clause 14.1 [Lump Sum Contract Price & Schedule of Payments]' : 'Sub-Clause 12.3 [Evaluation of Quantities - 10% / 0.01% Re-Rating]',
      designReview: isYellow ? 'Sub-Clause 5.1 & 5.2 [General Design Obligations & Review of Contractor\'s Documents]' : 'Clause 3 [Engineer\'s Instructions & Drawings]',
      performanceSecurity: 'Sub-Clause 4.2 [Performance Security]',
      noticeToCorrect: 'Sub-Clause 15.1 [Notice to Correct]',
      disputeBoard: 'Sub-Clause 20.2 - 20.8 [Dispute Adjudication Board - DAB]',
    };
  }

  return {
    contractType: delivery,
    fidicName,
    editionYear,
    edition,
    deliveryMethodName,
    designResponsibility,
    governingLaw: 'Laws of the Federal Democratic Republic of Ethiopia (Civil Code & ERA Manuals)',
    engineerRole,
    clauses,
  };
}

/**
 * Retrieves essential FIDIC Sub-Clause reference tables according to the selected contract type.
 */
export function getFidicSubClauseReferences(project: Project): FidicClauseRef[] {
  const info = getFidicContractInfo(project);
  const isDb = info.contractType === 'DB';
  const is1987 = info.editionYear === '1987';

  if (is1987) {
    if (isDb) {
      return [
        {
          subClause: 'Clause 2.1',
          title: "Engineer's Duties and Authority & Impartiality",
          summary: "Engineer exercises duties assigned in contract. Clause 2.6 mandates impartial decisions on claims and evaluations.",
          applicability: 'Design-Build (FIDIC Yellow Book 1987)',
        },
        {
          subClause: 'Clause 7.1 & 7.2',
          title: "Contractor's Drawings & Engineer Approval",
          summary: "Contractor submits design calculations and working drawings for Engineer review prior to fabrication or site erection.",
          applicability: 'Yellow Book Design-Build Obligations',
        },
        {
          subClause: 'Clause 10.1',
          title: 'Performance Security & Period of Validity',
          summary: 'Contractor delivers Performance Guarantee to Employer valid until completion and maintenance period end.',
          applicability: 'Securities & Guarantees',
        },
        {
          subClause: 'Clause 27.1 & 27.2',
          title: 'Variations & Valuation of Variations',
          summary: 'Engineer authority to order variations. Valuation based on Contract price or negotiated rates.',
          applicability: 'Variations & Scope Revisions',
        },
        {
          subClause: 'Clause 30.1',
          title: 'Rate of Progress & Catch-up Acceleration',
          summary: 'If progress is too slow to ensure completion on time, Engineer instructs steps to expedite progress.',
          applicability: 'Schedule Acceleration & Recovery',
        },
        {
          subClause: 'Clause 31.1 & 31.2',
          title: 'Extension of Time for Completion & Delay Damages',
          summary: 'Entitlement to time extension for extra/additional work or Employer delays; Liquidated damages for unexcused lag.',
          applicability: 'EOT Claims & Delay Penalties',
        },
        {
          subClause: 'Clause 33.1 & 33.3',
          title: 'Certificates and Payments & Delayed Payment Interest',
          summary: 'Engineer certifies monthly IPCs; Employer pays within agreed period; late disbursement accrues interest.',
          applicability: 'Monthly Payments & Interest Claims',
        },
        {
          subClause: 'Clause 42.1',
          title: 'Possession of Site & Access',
          summary: 'Employer gives Contractor possession of site. Delay in site access entitles Contractor to EOT & costs.',
          applicability: 'Site Access & ROW Handover',
        },
        {
          subClause: 'Clause 45.1',
          title: 'Notice to Correct Default & Remediation',
          summary: 'Formal notice specifying failure and requiring Contractor to remedy default within specified reasonable time.',
          applicability: 'Default Notice & Contractual Compliance',
        },
        {
          subClause: 'Clause 47.1',
          title: 'Price Variation / Adjustments for Changes in Cost',
          summary: 'Contract Price adjusted for fluctuations in cost of labor, materials, and other inputs using formula.',
          applicability: 'Price Escalation & Price Adjustments',
        },
        {
          subClause: 'Clause 50.1',
          title: 'Settlement of Disputes (Engineer Decision & Arbitration)',
          summary: 'Disputes referred to Engineer for decision; if unsatisfied, parties proceed to ICC Arbitration.',
          applicability: 'Dispute Resolution & Claims',
        },
        {
          subClause: 'Clause 53.1 - 53.3',
          title: 'Procedure for Claims & Mandatory 28-Day Notice',
          summary: 'Contractor must give notice of claim within 28 days of event awareness. Detailed particulars within 28 days.',
          applicability: 'Claims Management & 28-Day Bar',
        },
      ];
    }

    return [
      {
        subClause: 'Clause 2.1 & 2.6',
        title: "Engineer's Authority & Impartiality Mandate",
        summary: "Engineer acts impartially when making decisions, determinations, or evaluations between Employer and Contractor.",
        applicability: 'Design-Bid-Build (FIDIC Red Book 1987/1992)',
      },
      {
        subClause: 'Clause 6.1 & 6.2',
        title: 'Custody and Supply of Drawings & Delay Instructions',
        summary: 'Engineer supplies drawings. Delay or failure to issue drawings entitles Contractor to EOT (Clause 44) & Cost + Profit.',
        applicability: 'Employer Design & Drawing Issuance',
      },
      {
        subClause: 'Clause 10.1 & 10.2',
        title: 'Performance Security & Period of Validity',
        summary: 'Contractor provides Performance Security valid until Taking-Over Certificate issuance and defect period.',
        applicability: 'Bank Guarantees & Bonds Validity',
      },
      {
        subClause: 'Clause 12.2',
        title: 'Not Foreseeable Adverse Physical Obstructions',
        summary: 'Encountering physical obstructions or conditions not reasonably foreseeable by an experienced contractor.',
        applicability: 'Site Geology & Hydrology Claims',
      },
      {
        subClause: 'Clause 42.1 & 42.2',
        title: 'Possession of Site & Right of Way Handover',
        summary: 'Employer must grant unhindered site possession. Failure/delay triggers EOT (Clause 44.1) & idle resource cost.',
        applicability: 'ROW & Utilities Site Access',
      },
      {
        subClause: 'Clause 44.1 & 44.2',
        title: 'Extension of Time for Completion & 28-Day Notice',
        summary: 'Entitlement to time extension for variations, exceptionally adverse weather, or Employer delay. Notice within 28 days.',
        applicability: 'EOT Claims & Time Management',
      },
      {
        subClause: 'Clause 46.1',
        title: 'Rate of Progress & Acceleration Instruction',
        summary: 'If progress is too slow, Engineer instructs Contractor to take necessary steps to expedite completion at own cost.',
        applicability: 'Schedule Recovery & SPI Acceleration',
      },
      {
        subClause: 'Clause 47.1',
        title: 'Liquidated Damages for Delay',
        summary: 'Contractor pays specified liquidated damages if works fail to achieve completion within Time for Completion.',
        applicability: 'Contractual Delay Liability',
      },
      {
        subClause: 'Clause 51.1 & 52.1',
        title: 'Variations & Valuation of Variations',
        summary: 'Engineer may order variations in quantity, quality, or scope. Valued using BOQ rates or new rate fixing.',
        applicability: 'Variations & Scope Change Orders',
      },
      {
        subClause: 'Clause 52.2',
        title: 'Power of Engineer to Fix Rates (15% Variance Threshold)',
        summary: 'If BOQ item quantity changes by >15% and impacts contract sum, Engineer establishes new unit rate.',
        applicability: 'BOQ Remeasurement & Unit Re-Rating',
      },
      {
        subClause: 'Clause 53.1 - 53.3',
        title: 'Procedure for Claims & Mandatory 28-Day Notice Bar',
        summary: 'Contractor must submit claim notice within 28 days of event. Failure to notify discharges Employer liability.',
        applicability: 'Contract Claims & 28-Day Legal Notice Bar',
      },
      {
        subClause: 'Clause 60.1, 60.2 & 60.10',
        title: 'Monthly Statements, IPC Certification & Delay Interest',
        summary: 'Engineer certifies monthly IPCs within 28 days; Employer pays within 56 days; overdue amounts accrue compounding interest.',
        applicability: 'Financial Cash Flow & IPC Disbursements',
      },
      {
        subClause: 'Clause 63.1',
        title: 'Default of Contractor & Termination Notice',
        summary: 'Notice of default issued if Contractor repudiates, fails to proceed with due diligence, or breaches contract.',
        applicability: 'Default Notice & Employer Remedies',
      },
      {
        subClause: 'Clause 67.1 - 67.3',
        title: 'Settlement of Disputes (Engineer Decision & ICC Arbitration)',
        summary: 'Disputes referred first to Engineer for formal Decision; unsatisfied parties proceed to ICC Arbitration.',
        applicability: 'Dispute Resolution Framework',
      },
      {
        subClause: 'Clause 70.1',
        title: 'Increase or Decrease of Cost (Price Escalation Formula)',
        summary: 'Adjusts Contract Price for price variations in labor, materials (fuel, bitumen, cement, steel), and plant inputs.',
        applicability: 'Price Escalation & Financial Adjustments',
      },
    ];
  }

  if (isDb) {
    return [
      {
        subClause: 'Sub-Clause 1.9',
        title: 'Errors in the Employer\'s Requirements',
        summary: 'If an experienced contractor could not discover errors in Employer\'s Requirements, entitled to EOT & Cost + Profit.',
        applicability: 'Design-Build (FIDIC Yellow Book)',
      },
      {
        subClause: 'Sub-Clause 2.1',
        title: 'Right of Access to the Site',
        summary: 'Employer must give right of access and possession of site. Delay entitles Contractor to EOT (Sub-Clause 8.4) & Cost.',
        applicability: 'All FIDIC Contracts (ROW / Utilities)',
      },
      {
        subClause: 'Sub-Clause 4.12',
        title: 'Unforeseeable Physical Conditions',
        summary: 'Physical hazards/conditions encountered on site that could not reasonably have been foreseen by an experienced contractor.',
        applicability: 'Site Geology / Unforeseen Hydrology',
      },
      {
        subClause: 'Sub-Clause 5.1 - 5.8',
        title: 'Contractor\'s General Design Obligations & Review',
        summary: 'Contractor carries full responsibility for design fitness for purpose, submission of Contractor\'s Documents, and technical standards compliance.',
        applicability: 'Design-Build (Yellow Book Specific)',
      },
      {
        subClause: 'Sub-Clause 8.4',
        title: 'Extension of Time for Completion (EOT)',
        summary: 'Entitlement to time extension for variations, exceptionally adverse climatic conditions, or Employer-caused delays.',
        applicability: 'Time Management & Delay Claims',
      },
      {
        subClause: 'Sub-Clause 8.6',
        title: 'Rate of Progress & Acceleration',
        summary: 'If progress falls behind planned schedule, Engineer may instruct revised program. Contractor must accelerate at own expense unless delay was excusable.',
        applicability: 'SPI Lag & Work Program Recovery',
      },
      {
        subClause: 'Sub-Clause 8.7 / 8.8',
        title: 'Delay Damages (Liquidated Damages)',
        summary: 'Employer entitled to liquidated delay damages if Contractor fails to complete within Time for Completion.',
        applicability: 'Contract Completion Default',
      },
      {
        subClause: 'Sub-Clause 13.1 & 13.2',
        title: 'Right to Vary & Value Engineering',
        summary: 'Engineer may initiate variations or Contractor may submit Value Engineering proposals for cost/time savings.',
        applicability: 'Variations & Scope Changes',
      },
      {
        subClause: 'Sub-Clause 13.8',
        title: 'Adjustments for Changes in Cost (Price Adjustment)',
        summary: 'Contract Price adjustment for inflation using the parametric formula for labor, fuel, bitumen, steel, and cement.',
        applicability: 'Financial & IPC Price Adjustment',
      },
      {
        subClause: 'Sub-Clause 14.3, 14.6 & 14.7',
        title: 'IPC Certification & Payment Timelines',
        summary: 'Contractor submits IPC -> Engineer certifies within 28 days -> Employer pays within 56 days of submission.',
        applicability: 'Financial Cashflow & Payment Certification',
      },
      {
        subClause: 'Sub-Clause 14.8',
        title: 'Financing Charges for Delayed Payment',
        summary: 'Contractor entitled to compounded financing interest on overdue payments without formal notice.',
        applicability: 'Overdue IPC Financial Default',
      },
      {
        subClause: 'Sub-Clause 20.1',
        title: 'Contractor\'s Claims & 28-Day Notice Bar',
        summary: 'Mandatory requirement to submit claim notice within 28 days of event awareness, or claim is barred legally.',
        applicability: 'Claims Management & Dispute Prevention',
      },
    ];
  }

  // FIDIC Red / Pink Book (DBB)
  return [
    {
      subClause: 'Sub-Clause 1.9',
      title: 'Delayed Drawings or Instructions',
      summary: 'If Engineer fails to issue drawings or instructions within reasonable time, Contractor entitled to EOT & Cost + Profit.',
      applicability: 'Design-Bid-Build (FIDIC Red/Pink Book)',
    },
    {
      subClause: 'Sub-Clause 2.1',
      title: 'Right of Access to the Site',
      summary: 'Employer obligation to give site possession. Delay triggers EOT (Sub-Clause 8.4) & Cost reimbursement.',
      applicability: 'Right-of-Way (ROW) & Utilities Clearance',
    },
    {
      subClause: 'Sub-Clause 4.12',
      title: 'Unforeseeable Physical Conditions',
      summary: 'Geological, geotechnical, or subsurface conditions encountered on site that were not reasonably foreseeable.',
      applicability: 'Unforeseen Excavation & Foundation Works',
    },
    {
      subClause: 'Sub-Clause 8.4',
      title: 'Extension of Time for Completion (EOT)',
      summary: 'Entitlement to time extension for variations, quantity increases, exceptionally adverse weather, or Employer delays.',
      applicability: 'Time Management & Delay Claims',
    },
    {
      subClause: 'Sub-Clause 8.6',
      title: 'Rate of Progress & Work Program Notice',
      summary: 'Engineer authority to instruct revised program and resource catch-up when actual progress lags behind schedule.',
      applicability: 'Schedule Catch-Up & Acceleration Notice',
    },
    {
      subClause: 'Sub-Clause 8.7',
      title: 'Delay Damages (Liquidated Damages)',
      summary: 'Contractual damages payable by Contractor for failure to complete works within agreed contractual time.',
      applicability: 'Completion Lag Liability',
    },
    {
      subClause: 'Sub-Clause 12.3',
      title: 'Evaluation of Quantities & Rate Variation',
      summary: 'Re-rating BOQ items if measured quantity changes by >10% and financial value changes by >0.01% of Contract Price.',
      applicability: 'BOQ Remeasurement & BOQ Variation',
    },
    {
      subClause: 'Sub-Clause 13.1 & 13.3',
      title: 'Right to Vary & Variation Procedure',
      summary: 'Engineer\'s authority to issue variations in scope, quantities, levels, or specifications before Taking-Over.',
      applicability: 'Variations & Scope Revisions',
    },
    {
      subClause: 'Sub-Clause 13.8',
      title: 'Adjustments for Changes in Cost (Price Escalation)',
      summary: 'Parametric price escalation calculation for construction materials (Bitumen, Fuel, Cement, Rebar, Labor).',
      applicability: 'Price Adjustment & Financial Escalation',
    },
    {
      subClause: 'Sub-Clause 14.3, 14.6 & 14.7',
      title: 'Interim Payment Certification & Payment Duration',
      summary: 'Certification by Engineer within 28 days of IPC receipt, followed by Employer payment within 56 days.',
      applicability: 'Monthly IPC Certification',
    },
    {
      subClause: 'Sub-Clause 14.8',
      title: 'Delayed Payment Financing Charges',
      summary: 'Automatic entitlement to late payment interest compounded monthly at Central Bank rate + 3%.',
      applicability: 'Overdue IPC Financial Claims',
    },
    {
      subClause: 'Sub-Clause 20.1',
      title: 'Contractor\'s Claims & 28-Day Notice Requirement',
      summary: 'Strict notice bar: Failure to submit claim notice within 28 days discharges Employer from all liability.',
      applicability: 'Contractual Claims & Legal Compliance',
    },
  ];
}

/**
 * Generates comprehensive FIDIC contractual analysis tailored to the project's real EVM metrics,
 * ROW status, IPC payment tracker, securities, and schedule data.
 */
export function generateFidicContractualAnalysis(project: Project): FidicAnalysisCategory[] {
  const info = getFidicContractInfo(project);
  const evm = calculateProjectEvm(project);
  const { CPI, SPI, plannedPct } = evm;
  const phys = project.physicalProgress || 0;
  const isDb = info.contractType === 'DB';
  const is1987 = info.editionYear === '1987';
  const now = new Date();

  const analysis: FidicAnalysisCategory[] = [];

  // ==========================================
  // A. CONTRACTOR BREACHES & OBLIGATIONS
  // ==========================================

  // A1. Contractor Schedule Progress Lag & Acceleration Default
  const lagPct = plannedPct - phys;
  if (SPI < 0.90 || lagPct > 10) {
    analysis.push({
      category: 'Contractor Delay & Work Program Lag',
      responsibleParty: 'Contractor',
      status: SPI < 0.80 || lagPct > 15 ? 'Critical Risk' : 'Action Required',
      fidicSubClause: info.clauses.progressRate,
      findings: `Physical progress (${phys.toFixed(2)}%) lags target plan (${plannedPct.toFixed(2)}%) by ${lagPct.toFixed(2)}% (SPI = ${SPI.toFixed(3)}).`,
      contractualImpact: `Failure to execute works with due diligence within Time for Completion. Triggers Acceleration Notice under ${info.clauses.progressRate.split(' [')[0]} at Contractor's sole expense, and Liquidated Delay Damages under ${info.clauses.delayDamages.split(' [')[0]}.`,
      recommendedAction: `Issue formal Acceleration Order requiring Contractor to submit a 14-day Catch-Up Work Program with increased plant & labor shifts.`,
    });
  } else {
    analysis.push({
      category: 'Contractor Schedule Progress & Velocity',
      responsibleParty: 'Contractor',
      status: 'Compliant',
      fidicSubClause: info.clauses.eot,
      findings: `Progress velocity (SPI = ${SPI.toFixed(3)}) aligns satisfactorily with the approved master CPM schedule.`,
      contractualImpact: `Works are proceeding within acceptable schedule float tolerances under ${info.clauses.eot.split(' [')[0]}.`,
      recommendedAction: 'Continue bi-weekly CPM critical path inspections to maintain momentum.',
    });
  }

  // A2. Contractor Guarantees & Bank Securities Expiration Default
  const expiredBonds = (project.bonds || []).filter(b => {
    if (b.status === 'Recovered' || b.status === 'N/A') return false;
    const exp = new Date(b.expireDate);
    return b.status === 'Expired' || isNaN(exp.getTime()) || exp < now;
  });

  if (expiredBonds.length > 0) {
    analysis.push({
      category: 'Contractor Guarantees & Securities Expiration Default',
      responsibleParty: 'Contractor',
      status: 'Critical Risk',
      fidicSubClause: info.clauses.performanceSecurity,
      findings: `${expiredBonds.length} bank performance or advance guarantee(s) are expired or unextended.`,
      contractualImpact: `Material breach of ${info.clauses.performanceSecurity.split(' [')[0]}. Contractor failed to maintain valid security until Taking-Over. Employer entitled to call full bond amount or withhold IPC payments.`,
      recommendedAction: `Issue immediate 14-day cure notice under ${info.clauses.noticeToCorrect.split(' [')[0]} instructing Contractor to extend guarantee validity matching revised completion date.`,
    });
  } else {
    analysis.push({
      category: 'Contractor Guarantees & Securities Compliance',
      responsibleParty: 'Contractor',
      status: 'Compliant',
      fidicSubClause: info.clauses.performanceSecurity,
      findings: 'All Performance Securities and Advance Payment Guarantees are valid with adequate expiration buffer.',
      contractualImpact: 'Contractual financial risk buffer is fully secured.',
      recommendedAction: 'Schedule automated calendar alerts 60 days prior to guarantee expiration dates.',
    });
  }

  // A3. Contractor Claims Logging & 28-Day Notice Bar
  const loggedClaimsCount = (project.issues || []).filter(i => (i.category || '').toLowerCase().includes('claim') || (i.title || '').toLowerCase().includes('claim')).length;
  analysis.push({
    category: 'Contractor Claims Procedure & 28-Day Notice Bar',
    responsibleParty: 'Contractor',
    status: loggedClaimsCount > 0 ? 'Caution' : 'Compliant',
    fidicSubClause: info.clauses.claims,
    findings: loggedClaimsCount > 0 
      ? `Project has ${loggedClaimsCount} registered claim(s) for Extension of Time (EOT) or financial compensation.`
      : 'No formal contractor claims currently registered in dispute log.',
    contractualImpact: `FIDIC ${info.fidicName} ${info.clauses.claims.split(' [')[0]} strictly mandates claim notice within 28 days of event awareness. Failure to give notice within 28 days bars all entitlement legally.`,
    recommendedAction: `Audit all logged claim records against the strict 28-day notice window before certifying any time or cost adjustments under ${info.clauses.engineerDetermination.split(' [')[0]}.`,
  });

  // A4. Contractor Design & Submittal Fitness (Design-Build)
  if (isDb) {
    analysis.push({
      category: 'Contractor Design Obligations & Submittal Fitness (Design-Build)',
      responsibleParty: 'Contractor',
      status: 'Caution',
      fidicSubClause: info.clauses.designReview,
      findings: `Contractor holds single-point responsibility for detailed design fitness for purpose under ${info.fidicName}.`,
      contractualImpact: `Design errors or omissions are solely Contractor's risk unless directly caused by un-discoverable errors in Employer's Requirements (${is1987 ? 'Clause 7' : 'Sub-Clause 1.9'}).`,
      recommendedAction: 'Supervision Consultant must strictly review Contractor\'s Design Submittals for technical specification compliance without assuming design liability.',
    });
  }

  // ==========================================
  // B. SUPERVISION CONSULTANT / ENGINEER BREACHES & DEFAULTS
  // ==========================================

  // B1. Consultant IPC Certification SLA Delay (>28 Days)
  const ipcs = project.ipcTracker || [];
  let pendingConsultantCertCount = 0;
  ipcs.forEach(ipc => {
    if (ipc.submissionDate && (!ipc.certificationDate || ipc.status === 'Unpaid')) {
      const subDate = new Date(ipc.submissionDate);
      const diffDays = Math.floor((now.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 28) {
        pendingConsultantCertCount++;
      }
    }
  });

  if (pendingConsultantCertCount > 0) {
    analysis.push({
      category: 'Supervision Consultant IPC Certification SLA Default',
      responsibleParty: 'Supervision Consultant',
      status: 'Action Required',
      fidicSubClause: info.clauses.ipcPayment,
      findings: `${pendingConsultantCertCount} Interim Payment Certificate(s) are pending Supervision Consultant certification past the 28-day statutory SLA.`,
      contractualImpact: `Consultant default in certifying statements within 28 days under ${info.clauses.ipcPayment.split(' [')[0]} and White Book Cl. 3. Delays contractor cashflow and exposes Employer to late payment interest.`,
      recommendedAction: `Issue formal ERA PMO directive to Supervision Consultant to finalize IPC valuations within 5 business days.`,
    });
  } else {
    analysis.push({
      category: 'Supervision Consultant IPC Certification SLA',
      responsibleParty: 'Supervision Consultant',
      status: 'Compliant',
      fidicSubClause: info.clauses.ipcPayment,
      findings: 'IPC certification turnaround by Supervision Consultant is complying with the 28-day statutory SLA.',
      contractualImpact: 'Payment certification workflow is operating smoothly without consultant-caused bottleneck.',
      recommendedAction: 'Maintain current weekly IPC processing logs between Consultant Quantity Surveyor and ERA Team Leader.',
    });
  }

  // B2. Consultant Design & Technical Submittal Review Delay (>21 Days)
  const latestGrading = (project.monthlyGradingRecords || [])[project.monthlyGradingRecords?.length ? project.monthlyGradingRecords.length - 1 : 0];
  const overdueRfis = (latestGrading?.consultantAvgRfiDays ?? 0) > 21 ? 1 : 0;
  if (overdueRfis > 0) {
    analysis.push({
      category: 'Supervision Consultant Technical Review Delay',
      responsibleParty: 'Supervision Consultant',
      status: 'Action Required',
      fidicSubClause: info.clauses.designReview,
      findings: `Supervision Consultant technical turnaround average (${latestGrading?.consultantAvgRfiDays || 0} days) exceeds the 21-day review SLA.`,
      contractualImpact: `Engineer delay in issuing drawings, approvals, or instructions under ${info.clauses.designReview.split(' [')[0]} entitles Contractor to claim Extension of Time (${info.clauses.eot.split(' [')[0]}) and idle equipment costs against Employer.`,
      recommendedAction: `Direct Supervision Consultant Resident Engineer to deploy additional highway/bridge specialists to resolve all overdue submittals within 7 days.`,
    });
  } else {
    analysis.push({
      category: 'Supervision Consultant Technical Submittal Review SLA',
      responsibleParty: 'Supervision Consultant',
      status: 'Compliant',
      fidicSubClause: info.clauses.designReview,
      findings: 'Supervision Consultant is resolving technical RFIs and material submittals within the 21-day review SLA.',
      contractualImpact: 'No consultant-caused engineering blockages identified on critical path activities.',
      recommendedAction: 'Continue tracking technical submittals via automated weekly review logs.',
    });
  }

  // B3. Engineer Impartial Determination Default
  analysis.push({
    category: 'Supervision Consultant Impartial Determination Obligations',
    responsibleParty: 'Supervision Consultant',
    status: 'Caution',
    fidicSubClause: info.clauses.engineerDetermination,
    findings: `Supervision Consultant is obligated under ${info.fidicName} to act impartially when issuing determinations on claims, variations, and evaluations.`,
    contractualImpact: `Failure or delay by Engineer to issue formal determinations under ${info.clauses.engineerDetermination.split(' [')[0]} forces disputes directly into formal Dispute Board or ICC Arbitration.`,
    recommendedAction: `Require Supervision Consultant to issue formal written determinations for all outstanding contractor claim notices within 14 calendar days.`,
  });

  // ==========================================
  // C. EMPLOYER / CLIENT (ERA) BREACHES & LIABILITIES
  // ==========================================

  // C1. Employer Overdue IPC Payment Disbursement & Late Interest Penalty (>56 Days)
  const rateUsd = project.usdExchangeRate || 57.50;
  let overdueUnpaidCount = 0;
  let overdueUnpaidTotalEtb = 0;

  ipcs.forEach(ipc => {
    const isUnpaidEtb = (ipc.statusEtb || ipc.status) === 'Unpaid';
    const isUnpaidUsd = (ipc.statusUsd || ipc.status) === 'Unpaid';
    if ((isUnpaidEtb || isUnpaidUsd) && ipc.submissionDate) {
      const subDate = new Date(ipc.submissionDate);
      const diffDays = Math.floor((now.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 56) {
        overdueUnpaidCount++;
        let amt = 0;
        if (isUnpaidEtb) amt += ipc.certifiedEtb || 0;
        if (isUnpaidUsd) amt += (ipc.certifiedUsd || 0) * rateUsd;
        overdueUnpaidTotalEtb += amt;
      }
    }
  });

  const interestClause = is1987 ? (isDb ? 'Clause 33.3' : 'Clause 60.10') : 'Sub-Clause 14.8';

  if (overdueUnpaidCount > 0) {
    analysis.push({
      category: 'Employer IPC Payment Disbursement & Late Interest Penalty',
      responsibleParty: 'Employer (Client)',
      status: 'Critical Risk',
      fidicSubClause: info.clauses.ipcPayment,
      findings: `${overdueUnpaidCount} certified IPC(s) totaling Br. ${(overdueUnpaidTotalEtb / 1_000_000).toFixed(2)} Million remain unpaid past the 56-day statutory FIDIC deadline.`,
      contractualImpact: `Employer breach of payment obligations under ${info.clauses.ipcPayment.split(' [')[0]}. Accrues automatic compounding late interest under ${interestClause} and grants Contractor right to slow down or suspend work.`,
      recommendedAction: 'ERA PMO & Finance Directorate must process urgent disbursement to clear certified IPC net balances and halt compounding interest accrual.',
    });
  } else {
    analysis.push({
      category: 'Employer IPC Payment Disbursement & Financial Compliance',
      responsibleParty: 'Employer (Client)',
      status: 'Compliant',
      fidicSubClause: info.clauses.ipcPayment,
      findings: 'Certified IPC disbursements are paid within the statutory 56-day contractual payment window.',
      contractualImpact: `Payment terms under ${info.clauses.ipcPayment.split(' [')[0]} are fulfilled; no late payment interest penalty exposure for Employer.`,
      recommendedAction: 'Maintain current payment processing turnaround SLAs between ERA Finance and commercial banks.',
    });
  }

  // C2. Employer Right-of-Way (ROW) Handover & Site Access Default
  const rowClear = (project.rowMetrics || []).find(m => m.name === 'ROW Obstruction free Section')?.value || 0;
  const rowReq = (project.rowMetrics || []).find(m => m.name === 'ROW Request By Contractor')?.value || 0;
  const rowTarget = rowReq > 0 ? rowReq : project.lengthKm;
  const rowImpediment = Math.max(0, rowTarget - rowClear);

  const rowClauseStr = is1987 
    ? (isDb ? 'Clause 42.1 [Possession of Site]' : 'Clause 42.1 & 42.2 [Possession of Site & Right of Way]')
    : 'Sub-Clause 2.1 [Right of Access to the Site]';

  if (rowImpediment > 5) {
    analysis.push({
      category: 'Employer Site Possession & ROW Access Default',
      responsibleParty: 'Employer (Client)',
      status: 'Critical Risk',
      fidicSubClause: rowClauseStr,
      findings: `Contractor is blocked on ${rowImpediment.toFixed(2)} Km out of ${rowTarget.toFixed(2)} Km due to pending ROW compensation and utility relocations.`,
      contractualImpact: `Employer breach of site access obligations under ${rowClauseStr.split(' [')[0]}. Entitles Contractor to Extension of Time (${info.clauses.eot.split(' [')[0]}) plus Cost + Profit reimbursement for idle resources.`,
      recommendedAction: 'ERA ROW Directorate must expedite local administration compensation disbursements and issue formal site handover notices for unencumbered sections.',
    });
  } else {
    analysis.push({
      category: 'Employer Site Possession & ROW Access Compliance',
      responsibleParty: 'Employer (Client)',
      status: 'Compliant',
      fidicSubClause: rowClauseStr,
      findings: `Site possession is ${((rowClear / Math.max(1, rowTarget)) * 100).toFixed(1)}% free of obstruction (${rowClear.toFixed(2)} Km clear).`,
      contractualImpact: `${rowClauseStr.split(' [')[0]} obligations are substantially satisfied with minimal delay exposure to Employer.`,
      recommendedAction: 'Maintain continuous coordination with local authorities for remaining minor structure relocations.',
    });
  }

  // C3. Employer Scope Variations & BOQ Re-Rating Approvals
  const boqClause = is1987 ? 'Clause 6.1 & Clause 52.2 [Custody of Drawings & Power to Fix Rates]' : 'Sub-Clause 1.9 & 12.3 [Delayed Drawings & Evaluation]';
  analysis.push({
    category: 'Employer Scope Revisions & BOQ Evaluation Approvals',
    responsibleParty: 'Employer (Client)',
    status: 'Caution',
    fidicSubClause: isDb ? info.clauses.variations : boqClause,
    findings: `Employer holds ultimate approval authority for Variation Orders and scope changes under ${info.fidicName}.`,
    contractualImpact: `Administrative delay by Employer in approving Variation Orders disrupts construction workflow and creates risk of contractor suspension under ${is1987 ? 'Clause 40' : 'Sub-Clause 16.1'}.`,
    recommendedAction: `ERA Change Control Committee must expedite review and signature of pending Variation Orders and BOQ re-rating submissions.`,
  });

  return analysis;
}

/**
 * Generates prioritized executive recommendations for project management leadership
 * strictly tied to the selected FIDIC Contract Type and Project Delivery Method.
 */
export function generateFidicExecutiveRecommendations(project: Project): FidicExecutiveRecommendation[] {
  const info = getFidicContractInfo(project);
  const evm = calculateProjectEvm(project);
  const { CPI, SPI, plannedPct } = evm;
  const phys = project.physicalProgress || 0;
  const isDb = info.contractType === 'DB';
  const is1987 = info.editionYear === '1987';

  const recommendations: FidicExecutiveRecommendation[] = [];

  // Recommendation 1: Claims & 28-Day Notice Bar
  recommendations.push({
    priority: 'Immediate',
    subClause: info.clauses.claims.split(' [')[0],
    title: 'Contractual Claims Logging & Strict 28-Day Notice Verification',
    stakeholder: 'Supervision Consultant / Engineer',
    finding: `Project has registered claims and issues regarding delay and financial compensation.`,
    clauseMandate: `FIDIC ${info.fidicName} ${info.clauses.claims.split(' [')[0]} strictly mandates that Contractor must give notice within 28 days of event awareness. Failure to give notice within 28 days bars all entitlement legally.`,
    actionableStep: `Audit all logged issue records (EOT requests, ROW claims, variations) against the 28-day notice window before certifying any time or cost adjustments under ${info.clauses.engineerDetermination.split(' [')[0]}.`,
  });

  // Recommendation 2: ROW & Site Access
  const rowClear = (project.rowMetrics || []).find(m => m.name === 'ROW Obstruction free Section')?.value || 0;
  const rowReq = (project.rowMetrics || []).find(m => m.name === 'ROW Request By Contractor')?.value || 0;
  const rowTarget = rowReq > 0 ? rowReq : project.lengthKm;
  if (rowClear < rowTarget - 2) {
    const rowClauseNum = is1987 ? 'Clause 42.1' : 'Sub-Clause 2.1';
    recommendations.push({
      priority: 'Immediate',
      subClause: rowClauseNum,
      title: 'Site Possession Handover Protocol & Delay Mitigation',
      stakeholder: 'Employer / ERA PMO',
      finding: `Pending obstruction on ${(rowTarget - rowClear).toFixed(2)} Km of project corridor.`,
      clauseMandate: `${rowClauseNum} obligates Employer to give right of access. Failure creates cost exposure under ${rowClauseNum} and EOT entitlement under ${info.clauses.eot.split(' [')[0]}.`,
      actionableStep: `Issue prioritized phased site handover certificates focusing on critical structures (bridges, major box culverts) to unblock CPM critical path activities.`,
    });
  }

  // Recommendation 3: Schedule Recovery or Acceleration
  if (SPI < 0.90 || plannedPct - phys > 8) {
    const progClauseNum = info.clauses.progressRate.split(' [')[0];
    recommendations.push({
      priority: 'High',
      subClause: progClauseNum,
      title: 'Work Program Acceleration Order & Resource Catch-Up',
      stakeholder: 'Supervision Consultant / Engineer',
      finding: `Physical execution (${phys.toFixed(2)}%) lags target plan (${plannedPct.toFixed(2)}%) by ${(plannedPct - phys).toFixed(2)}%.`,
      clauseMandate: `${progClauseNum} empowers Engineer to instruct revised program and method statement at Contractor's expense if delay is unexcused.`,
      actionableStep: `Issue formal ${progClauseNum} instruction giving Contractor 14 calendar days to submit a Revised Catch-Up Program with increased site shifts, additional crushers, and asphalt plants.`,
    });
  }

  // Recommendation 4: Delivery Method Specific Design & Variation Control
  if (isDb) {
    recommendations.push({
      priority: 'High',
      subClause: `${info.clauses.designReview.split(' [')[0]} & ${info.clauses.variations.split(' [')[0]}`,
      title: 'Design Approval Workflow & Value Engineering Governance (Design-Build)',
      stakeholder: 'All Parties',
      finding: `Executed under Design-Build delivery method (${info.fidicName}).`,
      clauseMandate: `Contractor holds single-point design liability under ${info.clauses.designReview.split(' [')[0]}. Variation proposals under ${info.clauses.variations.split(' [')[0]} offer cost-sharing benefits.`,
      actionableStep: `Enforce a strict 21-day turnaround SLA for Engineer review of Contractor's Design Submittals to prevent Employer-caused design delay claims.`,
    });
  } else {
    recommendations.push({
      priority: 'High',
      subClause: `${info.clauses.boqEvaluation.split(' [')[0]} & ${info.clauses.variations.split(' [')[0]}`,
      title: 'BOQ Quantity Re-Rating & Variation Order Execution (Design-Bid-Build)',
      stakeholder: 'Supervision Consultant / Engineer',
      finding: `Executed under Design-Bid-Build delivery method (${info.fidicName}).`,
      clauseMandate: `${info.clauses.boqEvaluation.split(' [')[0]} specifies that if measured BOQ quantity changes beyond contractual threshold (${is1987 ? '15%' : '10%'}), new unit rates must be evaluated.`,
      actionableStep: `Perform joint field remeasurement for earthworks and subgrade layers to finalize Variation Orders under ${info.clauses.variations.split(' [')[0]} and avoid unpaid work disputes at Taking-Over.`,
    });
  }

  // Recommendation 5: Financial Overdue IPCs
  recommendations.push({
    priority: 'Medium',
    subClause: `${info.clauses.ipcPayment.split(' [')[0]} & ${info.clauses.priceAdjustment.split(' [')[0]}`,
    title: 'IPC Payment Disbursement & Price Escalation Verification',
    stakeholder: 'Employer / ERA PMO',
    finding: `Financial payments require strict compliance with FIDIC payment cycles and parametric price adjustments.`,
    clauseMandate: `${info.clauses.ipcPayment.split(' [')[0]} mandates payment within 56 days; ${info.clauses.priceAdjustment.split(' [')[0]} provides parametric price adjustment formula for fuel, cement, bitumen, and steel.`,
    actionableStep: `Audit monthly price escalation indices against National Bank of Ethiopia / ERA market indices and disburse IPC certified net balances promptly.`,
  });

  return recommendations;
}

/**
 * Alias for generateFidicExecutiveRecommendations for ease of use.
 */
export const getFidicRecommendations = generateFidicExecutiveRecommendations;

/**
 * Decorates data inconsistency alerts with corresponding FIDIC Sub-Clauses according
 * to the project's active FIDIC Contract Type and Delivery Method.
 */
export function enhanceAlertsWithFidicClause(alert: any, project: Project): string {
  const info = getFidicContractInfo(project);
  const cat = (alert.category || alert.field || '').toString().toLowerCase();

  if (cat.includes('boq') || cat.includes('financial') || cat.includes('ipc') || cat.includes('budget')) {
    return info.contractType === 'DB' 
      ? 'FIDIC Yellow Book Sub-Clause 14.3 & 13.8 [IPC Application & Price Adjustment]'
      : 'FIDIC Red Book Sub-Clause 12.3 & 14.3 [Evaluation of Quantities & IPC Certification]';
  }
  if (cat.includes('s-curve') || cat.includes('progress') || cat.includes('schedule') || cat.includes('work program') || cat.includes('cpi') || cat.includes('spi')) {
    return 'FIDIC Sub-Clause 8.3 & 8.6 [Programme & Rate of Progress Instruction]';
  }
  if (cat.includes('bond') || cat.includes('guarantee') || cat.includes('securities')) {
    return 'FIDIC Sub-Clause 4.2 [Performance Security & Guarantee Validity]';
  }
  if (cat.includes('row') || cat.includes('right-of-way') || cat.includes('access')) {
    return 'FIDIC Sub-Clause 2.1 [Right of Access to the Site & Employer Handover]';
  }
  if (cat.includes('claim') || cat.includes('dispute') || cat.includes('issue')) {
    return 'FIDIC Sub-Clause 20.1 [Contractor\'s Claims & 28-Day Notice Requirement]';
  }

  return info.contractType === 'DB' 
    ? 'FIDIC Yellow Book Conditions of Contract'
    : 'FIDIC Red/Pink Book Conditions of Contract';
}

export interface FidicProjectDocument {
  id: string;
  documentTitle: string;
  documentType: 'Contract Agreement' | 'Particular Conditions' | 'Work Program Submittal' | 'Financial IPC' | 'ROW Handover' | 'Security Bond' | 'Claim Notice' | 'Design Submittal' | 'Variation Order' | 'Quality & WIR';
  fidicSubClause: string;
  clauseNumber: string;
  clauseTitle: string;
  keywords: string[];
  documentSummary: string;
  contractualAnalysis: string;
  analysisRecommendation: string;
  status: 'Compliant' | 'Caution' | 'Critical Risk' | 'Action Required';
  dateLogged: string;
}

/**
 * Compiles comprehensive project documents dynamically mapped to FIDIC Clause numbers,
 * legal analysis, and actionable recommendations based on project contract type and delivery method.
 */
export function getFidicProjectDocuments(project: Project): FidicProjectDocument[] {
  const info = getFidicContractInfo(project);
  const evm = calculateProjectEvm(project);
  const { SPI, CPI, plannedPct } = evm;
  const phys = project.physicalProgress || 0;
  const isDb = info.contractType === 'DB';
  const is1987 = info.editionYear === '1987';

  const docs: FidicProjectDocument[] = [
    {
      id: 'doc-001',
      documentTitle: `Conditions of Particular Application (COPA) & Contract Agreement - ${project.name}`,
      documentType: 'Contract Agreement',
      fidicSubClause: is1987 
        ? `Clause 1.1 [Definitions] & ${isDb ? 'Clause 7.1 [Contractor Drawings]' : 'Clause 6.1 [Engineer Drawings]'}` 
        : `Sub-Clause 1.1 & 1.9 [Definitions & Contractual Obligations]`,
      clauseNumber: is1987 ? (isDb ? '7.1' : '6.1') : '1.9',
      clauseTitle: is1987 
        ? (isDb ? 'Contractor Drawings & Approval Standards' : 'Custody and Supply of Drawings and Instructions')
        : 'Delayed Drawings or Instructions / Errors in Requirements',
      keywords: ['contract', 'copa', 'agreement', 'delivery method', 'jurisdiction', 'particular conditions', '1.9', '6.1', '7.1', '1987', '1992', 'law'],
      documentSummary: `Master Contract Agreement signed on ${project.signDate || 'N/A'} designating ${info.fidicName} under the ${info.deliveryMethodName} delivery framework.`,
      contractualAnalysis: `Under ${info.fidicName} and ${info.deliveryMethodName}, ${isDb ? 'the Contractor carries engineering and erection responsibility under Clause 7 (Yellow Book 1987)' : 'the Employer retains civil design responsibility through ERA Design Directorate and Supervision Consultant under Clause 6 (Red Book 1987/1992), exposing Employer to Clause 6.2 delay costs if drawings are delayed'}. Governing jurisdiction is Ethiopian Civil Code and ERA Manuals.`,
      analysisRecommendation: `Enforce strict compliance with Particular Conditions clauses. Ensure all project communications cite ${info.fidicName} clause references to maintain formal legal validity.`,
      status: 'Compliant',
      dateLogged: project.startDate || '2025-01-01',
    },
    {
      id: 'doc-002',
      documentTitle: `Integrated Master CPM Schedule & Progress Recovery Submittal (${info.clauses.progressRate})`,
      documentType: 'Work Program Submittal',
      fidicSubClause: `${info.clauses.progressRate} & ${info.clauses.eot}`,
      clauseNumber: info.editionYear === '2017' ? '8.8' : '8.6',
      clauseTitle: 'Rate of Progress & Program Recovery Instruction',
      keywords: ['schedule', 'program', 'cpm', 'progress', 'spi', 'delay', 'rate of progress', '8.3', '8.6', '8.8', 'acceleration', 'catch-up'],
      documentSummary: `Current baseline work program recording ${phys.toFixed(2)}% actual physical execution vs ${plannedPct.toFixed(2)}% planned target (SPI: ${SPI.toFixed(3)}).`,
      contractualAnalysis: `Execution SPI of ${SPI.toFixed(3)} indicates a progress lag of ${(plannedPct - phys).toFixed(2)}%. Under ${info.fidicName} ${info.clauses.progressRate}, if actual progress does not conform to the approved Programme, the Engineer has full contractual authority to issue a formal Notice instructing a revised catch-up program at Contractor's cost.`,
      analysisRecommendation: `Direct Supervision Consultant (${project.consultant || 'Engineer'}) to issue a formal ${info.clauses.progressRate} Rate of Progress Instruction requiring Contractor (${project.contractor}) to submit an accelerated 14-day catch-up schedule with extra shifts and equipment.`,
      status: SPI < 0.85 ? 'Critical Risk' : (SPI < 0.95 ? 'Caution' : 'Compliant'),
      dateLogged: project.lastModifiedAt ? project.lastModifiedAt.split('T')[0] : '2026-09-01',
    },
    {
      id: 'doc-003',
      documentTitle: `Right-of-Way (ROW) Corridor Handover & Access Protocol (Sub-Clause 2.1 & ${info.clauses.eot})`,
      documentType: 'ROW Handover',
      fidicSubClause: `Sub-Clause 2.1 & ${info.clauses.eot}`,
      clauseNumber: '2.1',
      clauseTitle: 'Right of Access to the Site & Obstruction Handover',
      keywords: ['row', 'right-of-way', 'site access', 'possession', 'obstruction', 'compensation', '2.1', '8.4', '8.5', 'handover', 'utility'],
      documentSummary: `Site possession and utility clearance register recording ROW handover status across the ${project.lengthKm} Km road project corridor.`,
      contractualAnalysis: `FIDIC ${info.fidicName} Sub-Clause 2.1 obligates the Employer (ERA) to grant continuous, unhindered site possession. Delayed site release directly triggers Contractor entitlement to Extension of Time (EOT) under ${info.clauses.eot} and reimbursement of idle equipment costs.`,
      analysisRecommendation: `Issue prioritized, phased site possession certificates focusing on critical structures (bridges, culverts) to unblock CPM critical-path activities while mitigating Contractor idle equipment claims.`,
      status: (project.rowMetrics || []).some(m => m.name.includes('Obstruction free') && m.value < project.lengthKm - 2) ? 'Caution' : 'Compliant',
      dateLogged: '2026-08-15',
    },
    {
      id: 'doc-004',
      documentTitle: `Interim Payment Certificate (IPC) Certification & Price Adjustment Ledger`,
      documentType: 'Financial IPC',
      fidicSubClause: `${info.clauses.ipcPayment} & ${info.clauses.priceAdjustment}`,
      clauseNumber: '14.7',
      clauseTitle: 'Payment Certification & Financing Charges for Delay',
      keywords: ['ipc', 'payment', 'interim payment certificate', 'price adjustment', 'escalation', '14.3', '14.7', '14.8', '13.8', '13.7', 'cpi', 'gross bill', 'interest'],
      documentSummary: `Financial certification records tracking cumulative IPC gross billings, net certified payments (Br. ${(evm.AC / 1_000_000).toFixed(2)} M), and price adjustment claims.`,
      contractualAnalysis: `Payment timeliness is governed by ${info.clauses.ipcPayment} (56 days from Contractor IPC submission to Employer disbursement). ${info.clauses.priceAdjustment} provides parametric price adjustment formulas for fuel, bitumen, steel, and cement. Payment delays beyond 56 days automatically trigger compounding interest under Sub-Clause 14.8.`,
      analysisRecommendation: `Employer (ERA PMO) must enforce strict 56-day payment turnaround times and verify parametric price adjustment index coefficients against National Bank of Ethiopia market data.`,
      status: CPI < 0.90 ? 'Caution' : 'Compliant',
      dateLogged: '2026-09-05',
    },
    {
      id: 'doc-005',
      documentTitle: `Performance Security & Advance Payment Bond Securities Register`,
      documentType: 'Security Bond',
      fidicSubClause: `${info.clauses.performanceSecurity} & Sub-Clause 14.2 [Advance Payment Guarantee]`,
      clauseNumber: '4.2',
      clauseTitle: 'Performance Security Validity & Renewal Mandate',
      keywords: ['bond', 'guarantee', 'performance security', 'advance payment', 'bank guarantee', '4.2', '14.2', 'expiry', 'validity'],
      documentSummary: `Register of active bank guarantees and performance securities (${(project.bonds || []).length} bonds registered).`,
      contractualAnalysis: `Under ${info.fidicName} ${info.clauses.performanceSecurity}, the Contractor must keep the Performance Security valid until Taking-Over Certificate issuance. If the completion date is extended via EOT, the Contractor is contractually obligated to extend the guarantee validity at its own expense. Failure to do so grants Employer right to draw down securities.`,
      analysisRecommendation: `Maintain an automated 60-day advance audit window for bond expirations and issue formal ${info.clauses.performanceSecurity} renewal notices to the Contractor prior to guarantee expiry.`,
      status: (project.bonds || []).some(b => b.status === 'Expired') ? 'Critical Risk' : 'Compliant',
      dateLogged: '2026-08-20',
    },
    {
      id: 'doc-006',
      documentTitle: `Contractual Claim Notifications & Notice Register (${info.clauses.claims})`,
      documentType: 'Claim Notice',
      fidicSubClause: `${info.clauses.claims} & ${info.clauses.engineerDetermination}`,
      clauseNumber: info.editionYear === '2017' ? '20.2' : '20.1',
      clauseTitle: 'Contractor Claims & Mandatory Notice Bar',
      keywords: ['claim', 'dispute', 'notice', '28-day bar', '20.1', '20.2', '3.5', '3.7', 'extension of time', 'eot', 'compensation', 'determination'],
      documentSummary: `Log of formal contractor claims, time extension requests, and dispute notices (${(project.issues || []).length} registered issues/claims).`,
      contractualAnalysis: `FIDIC ${info.fidicName} ${info.clauses.claims} imposes a strict 28-day mandatory notice period. If the claiming party fails to give notice within 28 days after becoming aware of the event, entitlement to EOT or additional payment is legally barred and discharged.`,
      analysisRecommendation: `Audit all pending EOT and financial claims against the 28-day notice timestamp bar before issuing formal Determinations under ${info.clauses.engineerDetermination}.`,
      status: (project.issues || []).some(i => i.priority === 'High' || i.priority === 'Critical') ? 'Action Required' : 'Compliant',
      dateLogged: '2026-09-02',
    },
    {
      id: 'doc-007',
      documentTitle: `Design Submittal Review & Technical Quality Approval Ledger`,
      documentType: 'Design Submittal',
      fidicSubClause: `${info.clauses.designReview}`,
      clauseNumber: isDb ? '5.2' : '3.1',
      clauseTitle: 'Review of Contractor Documents & Design Approvals',
      keywords: ['design', 'submittal', 'review', 'technical', 'drawings', '5.1', '5.2', '3.1', 'quality', 'approval', 'wir', 'rfi', 'specification'],
      documentSummary: `Supervision Consultant submittal review log tracking working drawings, design calculations, and technical submittals.`,
      contractualAnalysis: `Under ${isDb ? `Design-Build (${info.fidicName} Clause 5), the Contractor submits design documents for Engineer review within 21 days` : `Design-Bid-Build (${info.fidicName} Clause 3), the Engineer issues working drawings and reviews Contractor shop drawings`}. Timely Engineer review is crucial to prevent Contractor claims for Employer-caused design delay.`,
      analysisRecommendation: `Enforce a strict 21-day review turnaround SLA for the Supervision Consultant to review design and material submittals, avoiding critical path bottlenecks.`,
      status: 'Compliant',
      dateLogged: '2026-08-28',
    },
    {
      id: 'doc-008',
      documentTitle: `Variation Orders & BOQ Evaluation Register (${info.clauses.variations})`,
      documentType: 'Variation Order',
      fidicSubClause: `${info.clauses.variations} & ${info.clauses.boqEvaluation}`,
      clauseNumber: '13.1',
      clauseTitle: 'Right to Vary & Variation Order Procedure',
      keywords: ['variation', 'vo', 'boq', 're-rating', 'quantity', 'scope change', '13.1', '13.2', '13.3', '12.3', '14.1', 'unit rate'],
      documentSummary: `Register of approved and pending variation orders (Total Variation Amount: Br. ${(project.variation || 0).toFixed(2)}).`,
      contractualAnalysis: `Under ${info.fidicName} Sub-Clause 13.1, the Engineer has authority to instruct variations. Under ${isDb ? 'Yellow Book Design-Build, variations are governed by Lump Sum milestones and Value Engineering' : `Red Book DBB (${info.clauses.boqEvaluation}), measured BOQ variations exceeding threshold triggers unit re-rating`}.`,
      analysisRecommendation: `Formalize all scope changes via written Variation Orders under Sub-Clause 13.3 prior to execution to maintain strict budget governance and prevent post-completion disputes.`,
      status: project.variation > 0 ? 'Caution' : 'Compliant',
      dateLogged: '2026-08-10',
    },
    {
      id: 'doc-009',
      documentTitle: `Quality Assurance & Work Inspection Requests (WIR) Register`,
      documentType: 'Quality & WIR',
      fidicSubClause: 'Sub-Clause 7.1 - 7.6 [Plant, Materials and Workmanship]',
      clauseNumber: '7.4',
      clauseTitle: 'Testing, Work Inspection & Remediation Directives',
      keywords: ['quality', 'wir', 'inspection', 'testing', 'materials', '7.4', '7.5', 'workmanship', 'compaction', 'asphalt', 'concrete'],
      documentSummary: `Quality control log tracking Work Inspection Requests (WIR), laboratory compaction tests, and material sample approvals.`,
      contractualAnalysis: `Sub-Clause 7.4 grants the Engineer full authority to inspect materials, plant, and workmanship. If materials or work fail inspection, the Engineer may issue instructions under Sub-Clause 7.5 requiring Contractor to uncover, remediate, or replace defective work at Contractor's cost.`,
      analysisRecommendation: `Direct Supervision Consultant to maintain rigid first-time WIR inspection standards and verify density test reports for subgrade, subbase, and asphalt pavement layers.`,
      status: 'Compliant',
      dateLogged: '2026-09-08',
    },
    {
      id: 'doc-010',
      documentTitle: `Formal Notice to Correct & Default Remediation Directive`,
      documentType: 'Contract Agreement',
      fidicSubClause: `${info.clauses.noticeToCorrect} & Sub-Clause 15.2 [Termination by Employer]`,
      clauseNumber: '15.1',
      clauseTitle: 'Notice to Correct Contractual Defaults',
      keywords: ['notice to correct', 'default', 'cure notice', '15.1', '15.2', 'remediation', 'termination', 'breach', 'warning'],
      documentSummary: `Administrative notice repository for contractual defaults, rate of progress warnings, and cure instructions.`,
      contractualAnalysis: `Under ${info.fidicName} ${info.clauses.noticeToCorrect}, the Employer/Engineer notifies the Contractor of contractual defaults, specifying a reasonable timeframe for remediation. Failure to comply gives Employer grounds to terminate under Sub-Clause 15.2.`,
      analysisRecommendation: `Use Sub-Clause 15.1 Notices judiciously as formal legal warnings for persistent schedule delay or resource mobilization defaults before initiating formal dispute proceedings.`,
      status: SPI < 0.80 ? 'Action Required' : 'Compliant',
      dateLogged: '2026-08-01',
    }
  ];

  return docs;
}

export interface FidicProjectDocumentSearchResult {
  doc: FidicProjectDocument;
  matchedClause: string;
  matchedKeywords: string[];
  relevanceScore: number;
}

/**
 * Searches project documents filtering by FIDIC clause numbers, keywords, and text query,
 * returning matched clause numbers, legal analysis, and recommendations.
 */
export function searchFidicProjectDocuments(project: Project, query: string): FidicProjectDocumentSearchResult[] {
  const allDocs = getFidicProjectDocuments(project);
  if (!query || !query.trim()) {
    return allDocs.map(doc => ({
      doc,
      matchedClause: doc.fidicSubClause,
      matchedKeywords: doc.keywords.slice(0, 3),
      relevanceScore: 1,
    }));
  }

  const cleanQuery = query.trim().toLowerCase();
  const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);

  const results: FidicProjectDocumentSearchResult[] = [];

  for (const doc of allDocs) {
    let score = 0;
    const matchedKw: string[] = [];

    // Exact clause number match (e.g. "8.4", "2.1", "14.7", "20.1")
    if (doc.clauseNumber.toLowerCase() === cleanQuery || cleanQuery.includes(doc.clauseNumber.toLowerCase())) {
      score += 50;
    }

    if (doc.fidicSubClause.toLowerCase().includes(cleanQuery)) {
      score += 40;
    }

    if (doc.documentTitle.toLowerCase().includes(cleanQuery)) {
      score += 25;
    }

    if (doc.documentType.toLowerCase().includes(cleanQuery)) {
      score += 20;
    }

    if (doc.contractualAnalysis.toLowerCase().includes(cleanQuery)) {
      score += 15;
    }

    if (doc.analysisRecommendation.toLowerCase().includes(cleanQuery)) {
      score += 15;
    }

    for (const kw of doc.keywords) {
      if (cleanQuery.includes(kw) || kw.includes(cleanQuery)) {
        score += 10;
        if (!matchedKw.includes(kw)) matchedKw.push(kw);
      }
    }

    // Check individual query terms
    for (const term of queryTerms) {
      if (term.length > 1) {
        if (doc.clauseNumber.includes(term)) score += 15;
        if (doc.documentTitle.toLowerCase().includes(term)) score += 5;
        if (doc.contractualAnalysis.toLowerCase().includes(term)) score += 3;
        if (doc.analysisRecommendation.toLowerCase().includes(term)) score += 3;
      }
    }

    if (score > 0) {
      results.push({
        doc,
        matchedClause: doc.fidicSubClause,
        matchedKeywords: matchedKw.length > 0 ? matchedKw : doc.keywords.slice(0, 3),
        relevanceScore: score,
      });
    }
  }

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

