import { 
  ContractCondition1Data, 
  ContractCondition2Data, 
  ContractStaffRateCondition1, 
  ContractStaffRateCondition2, 
  ContractReimbursableCondition1,
  ContractReimbursableCondition2 
} from '../types';

export const DEFAULT_CONDITION_1_STAFF: ContractStaffRateCondition1[] = [
  // Sub-total 1 (Key Professional): 215 Constr | 10 DLP | 225 Total | 4,700,500 ETB
  { id: 'c1_1_1', no: '1.1', position: 'Resident Engineer', name: 'Berhanu Geremew', category: 'Key Professional', mmConstr: 24, mmDlp: 2, totalMm: 26, rateEtb: 37500, totalEtb: 975000 },
  { id: 'c1_1_2', no: '1.2', position: 'Deputy Resident Engineer', name: 'Wegayehu Endale', category: 'Key Professional', mmConstr: 23, mmDlp: 0, totalMm: 23, rateEtb: 28500, totalEtb: 655500 },
  { id: 'c1_1_3', no: '1.3', position: 'Sr. Pavement/Materials Eng.', name: 'Abreham Hisbte', category: 'Key Professional', mmConstr: 16, mmDlp: 1, totalMm: 17, rateEtb: 30000, totalEtb: 510000 },
  { id: 'c1_1_4', no: '1.4', position: 'Sr. Structural Engineer', name: 'Hashim Awol', category: 'Key Professional', mmConstr: 8, mmDlp: 0, totalMm: 8, rateEtb: 15000, totalEtb: 120000 },
  { id: 'c1_1_5', no: '1.5', position: 'Sr. Geotechnical Engineer', name: 'To be nominated', category: 'Key Professional', mmConstr: 8, mmDlp: 0, totalMm: 8, rateEtb: 15000, totalEtb: 120000 },
  { id: 'c1_1_6', no: '1.6', position: 'Sr. Highway Engineer', name: 'Shalom Yeneneh', category: 'Key Professional', mmConstr: 8, mmDlp: 0, totalMm: 8, rateEtb: 15000, totalEtb: 120000 },
  { id: 'c1_1_7', no: '1.7', position: 'Sr. Quantity Surveyor', name: 'Hablom Berhane', category: 'Key Professional', mmConstr: 24, mmDlp: 1, totalMm: 25, rateEtb: 18500, totalEtb: 462500 },
  { id: 'c1_1_8', no: '1.8', position: 'Sr. Surveyor', name: 'Tesfaye Alemu', category: 'Key Professional', mmConstr: 24, mmDlp: 1, totalMm: 25, rateEtb: 18500, totalEtb: 462500 },
  { id: 'c1_1_9', no: '1.9', position: 'Sr. Claims Expert', name: 'Asfaw Dabebe', category: 'Key Professional', mmConstr: 8, mmDlp: 1, totalMm: 9, rateEtb: 15000, totalEtb: 135000 },
  { id: 'c1_1_10', no: '1.10', position: 'Sr. Environmentalist', name: 'To be nominated', category: 'Key Professional', mmConstr: 8, mmDlp: 1, totalMm: 9, rateEtb: 15000, totalEtb: 135000 },
  { id: 'c1_1_11', no: '1.11', position: 'Sr. Hydrologist/Hydraulic Eng.', name: 'To be nominated', category: 'Key Professional', mmConstr: 8, mmDlp: 1, totalMm: 9, rateEtb: 15000, totalEtb: 135000 },
  { id: 'c1_1_12', no: '1.12', position: 'Sr. Road Safety & Audit Spec.', name: 'To be nominated', category: 'Key Professional', mmConstr: 8, mmDlp: 1, totalMm: 9, rateEtb: 15000, totalEtb: 135000 },
  { id: 'c1_1_13', no: '1.13', position: 'Right of Way Mgmt Specialist', name: 'To be nominated', category: 'Key Professional', mmConstr: 24, mmDlp: 1, totalMm: 25, rateEtb: 15000, totalEtb: 375000 },
  { id: 'c1_1_14', no: '1.14', position: 'Gender Specialist', name: 'To be nominated', category: 'Key Professional', mmConstr: 24, mmDlp: 0, totalMm: 24, rateEtb: 15000, totalEtb: 360000 },

  // Sub-total 2 (Intermediate Staff): 144 Constr | 0 DLP | 144 Total | 864,000 ETB
  { id: 'c1_2_1', no: '2.1–2.6', position: 'Intermediate staff (Pavement/Material/Geotech, Structural, Highway, Claims, Environmental, QS), 6 × 24 MM', name: 'To be nominated', category: 'Intermediate', mmConstr: 144, mmDlp: 0, totalMm: 144, rateEtb: 6000, totalEtb: 864000 },

  // Sub-total 3 (Support): 421 Constr | 0 DLP | 421 Total | 3,450,000 ETB
  { id: 'c1_3_1', no: '3.1', position: 'Two Soil Lab Technicians', name: 'TBN', category: 'Support', mmConstr: 46, mmDlp: 0, totalMm: 46, rateEtb: 12000, totalEtb: 552000 },
  { id: 'c1_3_2', no: '3.2', position: 'Material Inspector', name: 'TBN', category: 'Support', mmConstr: 23, mmDlp: 0, totalMm: 23, rateEtb: 12000, totalEtb: 276000 },
  { id: 'c1_3_3', no: '3.3', position: 'Structural Inspector', name: 'TBN', category: 'Support', mmConstr: 23, mmDlp: 0, totalMm: 23, rateEtb: 12000, totalEtb: 276000 },
  { id: 'c1_3_4', no: '3.4', position: 'Draftsperson', name: 'TBN', category: 'Support', mmConstr: 23, mmDlp: 0, totalMm: 23, rateEtb: 6000, totalEtb: 138000 },
  { id: 'c1_3_5', no: '3.5', position: 'Two Inspectors of Works', name: 'TBN', category: 'Support', mmConstr: 46, mmDlp: 0, totalMm: 46, rateEtb: 12000, totalEtb: 552000 },
  { id: 'c1_3_6', no: '3.6', position: 'Two Surveyors', name: 'TBN', category: 'Support', mmConstr: 48, mmDlp: 0, totalMm: 48, rateEtb: 8000, totalEtb: 384000 },
  { id: 'c1_3_7', no: '3.7', position: 'Secretary', name: 'TBN', category: 'Support', mmConstr: 24, mmDlp: 0, totalMm: 24, rateEtb: 6000, totalEtb: 144000 },
  { id: 'c1_3_8', no: '3.8', position: 'Four Chainmen', name: 'TBN', category: 'Support', mmConstr: 96, mmDlp: 0, totalMm: 96, rateEtb: 6000, totalEtb: 576000 },
  { id: 'c1_3_9', no: '3.9', position: 'Four Laboratory Assistants', name: 'TBN', category: 'Support', mmConstr: 92, mmDlp: 0, totalMm: 92, rateEtb: 6000, totalEtb: 552000 },

  // Sub-total 4 (Head Office): 28 Constr | 2 DLP | 30 Total | 525,000 ETB
  { id: 'c1_4_1', no: '4.1', position: 'Project Coordinator (Head Office)', name: 'TBN', category: 'Head Office', mmConstr: 24, mmDlp: 2, totalMm: 26, rateEtb: 12500, totalEtb: 325000 },
  { id: 'c1_4_2', no: '4.2', position: 'Head Office & Technical Staff (4 bi-annual quality audits)', name: 'TBN', category: 'Head Office', mmConstr: 4, mmDlp: 0, totalMm: 4, rateEtb: 50000, totalEtb: 200000 }
];

export const DEFAULT_CONDITION_1_DLP_STAFF: ContractStaffRateCondition1[] = [
  { id: 'c1_dlp_1', no: '1.1', position: 'Resident Engineer', name: 'Berhanu Geremew', category: 'Key Professional', mmConstr: 0, mmDlp: 2, totalMm: 2, rateEtb: 37500, totalEtb: 75000 },
  { id: 'c1_dlp_2', no: '1.2', position: 'Sr. Pavement/Materials Eng.', name: 'Abreham Hisbte', category: 'Key Professional', mmConstr: 0, mmDlp: 1, totalMm: 1, rateEtb: 30000, totalEtb: 30000 },
  { id: 'c1_dlp_3', no: '1.3', position: 'Sr. Quantity Surveyor', name: 'Hablom Berhane', category: 'Key Professional', mmConstr: 0, mmDlp: 1, totalMm: 1, rateEtb: 18500, totalEtb: 18500 },
  { id: 'c1_dlp_4', no: '1.4', position: 'Sr. Surveyor', name: 'Tesfaye Alemu', category: 'Key Professional', mmConstr: 0, mmDlp: 1, totalMm: 1, rateEtb: 18500, totalEtb: 18500 },
  { id: 'c1_dlp_5', no: '1.5', position: 'Sr. Claims Expert', name: 'Asfaw Dabebe', category: 'Key Professional', mmConstr: 0, mmDlp: 1, totalMm: 1, rateEtb: 15000, totalEtb: 15000 },
  { id: 'c1_dlp_6', no: '1.6', position: 'Sr. Environmentalist', name: 'To be nominated', category: 'Key Professional', mmConstr: 0, mmDlp: 1, totalMm: 1, rateEtb: 15000, totalEtb: 15000 },
  { id: 'c1_dlp_7', no: '1.7', position: 'Sr. Hydrologist/Hydraulic Eng.', name: 'To be nominated', category: 'Key Professional', mmConstr: 0, mmDlp: 1, totalMm: 1, rateEtb: 15000, totalEtb: 15000 },
  { id: 'c1_dlp_8', no: '1.8', position: 'Sr. Road Safety & Audit Spec.', name: 'To be nominated', category: 'Key Professional', mmConstr: 0, mmDlp: 1, totalMm: 1, rateEtb: 15000, totalEtb: 15000 },
  { id: 'c1_dlp_9', no: '1.9', position: 'Right of Way Mgmt Specialist', name: 'To be nominated', category: 'Key Professional', mmConstr: 0, mmDlp: 1, totalMm: 1, rateEtb: 15000, totalEtb: 15000 },
  { id: 'c1_dlp_10', no: '4.1', position: 'Project Coordinator (Head Office)', name: 'TBN', category: 'Head Office', mmConstr: 0, mmDlp: 2, totalMm: 2, rateEtb: 12500, totalEtb: 25000 }
];

export const DEFAULT_CONDITION_1_REIMBURSABLES: ContractReimbursableCondition1[] = [
  { id: 'reimb_1', no: '1', item: 'Head office Support', description: 'Head office Support', unit: 'Month', rate: 19000.00, contractQty: 36, amountEtb: 684000.00, contractAmount: 684000.00, basis: 'Approved monthly head office technical support quota' },
  { id: 'reimb_2', no: '2', item: 'Communication Cost', description: 'Communication Cost', unit: 'Month', rate: 12000.00, contractQty: 36, amountEtb: 432000.00, contractAmount: 432000.00, basis: 'Monthly communication, satellite, internet & telephone links' },
  { id: 'reimb_3', no: '3', item: 'Insurance cost', description: 'Insurance cost', unit: 'LS', rate: 400000.00, contractQty: 1, amountEtb: 400000.00, contractAmount: 400000.00, basis: 'Lump-sum professional indemnity insurance certificate' },
  { id: 'reimb_4', no: '4', item: "Accommodation - Engineer's Key Staffs", description: "Accommodation - Engineer's Key Staffs", unit: 'MM', rate: 30000.00, contractQty: 36, amountEtb: 1080000.00, contractAmount: 1080000.00, basis: 'Approved monthly housing allowance for Key Staff' },
  { id: 'reimb_5', no: '5', item: "Accommodation - Engineer's Intermediate Staffs", description: "Accommodation - Engineer's Intermediate Staffs", unit: 'MM', rate: 24000.00, contractQty: 42, amountEtb: 1008000.00, contractAmount: 1008000.00, basis: 'Approved monthly housing allowance for Intermediate Staff' },
  { id: 'reimb_6', no: '6', item: "Accommodation - Engineer's Support Staffs", description: "Accommodation - Engineer's Support Staffs", unit: 'MM', rate: 22500.00, contractQty: 30, amountEtb: 675000.00, contractAmount: 675000.00, basis: 'Approved monthly housing allowance for Field Support Staff' },
  { id: 'reimb_7', no: '7', item: "Surveying Equipment For the Engineer's Staffs", description: "Surveying Equipment For the Engineer's Staffs", unit: 'Month', rate: 85000.00, contractQty: 6, amountEtb: 510000.00, contractAmount: 510000.00, basis: 'Total station and survey instrument monthly rental' },
  { id: 'reimb_8', no: '8', item: 'Production Of Report', description: 'Production Of Report', unit: 'Month', rate: 15000.00, contractQty: 36, amountEtb: 540000.00, contractAmount: 540000.00, basis: 'Monthly, quarterly, and special report printing & reproduction' },
  { id: 'reimb_9', no: '9', item: 'Vehicle Rental & Operation', description: 'Vehicle Rental & Operation', unit: 'Month', rate: 75000.00, contractQty: 36, amountEtb: 2700000.00, contractAmount: 2700000.00, basis: 'Field vehicles operational lease, maintenance & fuel costs' },
  { id: 'reimb_10', no: '10', item: 'Materials Testing & Quality Laboratory Operations', description: 'Materials Testing & Quality Laboratory Operations', unit: 'LS', rate: 350000.00, contractQty: 1, amountEtb: 350000.00, contractAmount: 350000.00, basis: 'Site laboratory consumables, testing equipment & calibration' }
];

export const DEFAULT_CONDITION_1_DATA: ContractCondition1Data = {
  projectName: 'Stadia',
  scope: 'Construction supervision plus DLP. Total 820 man-months.',
  totalManMonths: 820,
  contingencyPct: 10,
  vatPct: 15,
  feesTimeBased: 9539500.00,
  reimbursableTotal: 8379000.00,
  reimbursableList: DEFAULT_CONDITION_1_REIMBURSABLES,
  staffFees: DEFAULT_CONDITION_1_STAFF,
  dlpStaffFees: DEFAULT_CONDITION_1_DLP_STAFF
};

export const DEFAULT_CONDITION_2_STAFF: ContractStaffRateCondition2[] = [
  // Foreign Staff (Sub-total A): 6.00 MM | USD 44,250 | ETB-equivalent @35 = 1,548,750
  { id: 'c2_f_1', position: 'Resident Engineer', name: 'Narapati Katel', origin: 'Foreign', mm: 2.00, rateUsd: 10500, amountUsd: 21000, amountEtb: 0, etbEquivalent: 735000 },
  { id: 'c2_f_2', position: 'Sr. Pavement/Materials Eng.', name: 'Prakash Kumar Dhungana', origin: 'Foreign', mm: 1.00, rateUsd: 8000, amountUsd: 8000, amountEtb: 0, etbEquivalent: 280000 },
  { id: 'c2_f_3', position: 'Sr. Quantity Surveyor', name: 'Raj Kumar', origin: 'Foreign', mm: 1.00, rateUsd: 7250, amountUsd: 7250, amountEtb: 0, etbEquivalent: 253750 },
  { id: 'c2_f_4', position: 'Sr. Claims Expert', name: 'Anil Kumar Sharma', origin: 'Foreign', mm: 1.00, rateUsd: 5000, amountUsd: 5000, amountEtb: 0, etbEquivalent: 175000 },
  { id: 'c2_f_5', position: 'Sr. Road Safety & Audit Spec.', name: 'Nabin Kumar Nijogi', origin: 'Foreign', mm: 1.00, rateUsd: 3000, amountUsd: 3000, amountEtb: 0, etbEquivalent: 105000 },

  // Local Staff (Sub-total B): 4.00 MM | ETB 153,000 | ETB-equivalent = 153,000
  { id: 'c2_l_1', position: 'Sr. Surveyor', name: 'Misgana Bayne', origin: 'Local', mm: 1.00, rateEtb: 28000, amountUsd: 0, amountEtb: 28000, etbEquivalent: 28000 },
  { id: 'c2_l_2', position: 'Sr. Hydrologist/Hydraulic Eng.', name: 'Baza Nigussie', origin: 'Local', mm: 1.00, rateEtb: 45000, amountUsd: 0, amountEtb: 45000, etbEquivalent: 45000 },
  { id: 'c2_l_3', position: 'Sr. Environmentalist', name: 'Zeleke Chafamo', origin: 'Local', mm: 1.00, rateEtb: 45000, amountUsd: 0, amountEtb: 45000, etbEquivalent: 45000 },
  { id: 'c2_l_4', position: 'Right of Way Mgmt Specialist', name: 'To be named', origin: 'Local', mm: 1.00, rateEtb: 35000, amountUsd: 0, amountEtb: 35000, etbEquivalent: 35000 },

  // Additional experts: 2.00 MM | not priced
  { id: 'c2_add_1', position: 'Additional experts (Project Director 0.25, Project Coordinator 0.75, local Project Coordinator 1.00)', name: 'Additional experts', origin: 'Additional', mm: 2.00, notPriced: true, amountUsd: 0, amountEtb: 0, etbEquivalent: 0 }
];

export const DEFAULT_CONDITION_2_EXPENSES: ContractReimbursableCondition2[] = [
  { id: 'c2_exp_1', item: 'International flights, 4 trips × USD 700', tripDays: '4 trips', quantity: 4, rateUsd: 700, amountUsd: 2800, amountEtb: 0, isFixed: false },
  { id: 'c2_exp_2', item: 'Drafting/reproduction of reports, 10 copies × 100', tripDays: '10 copies', quantity: 10, rateUsd: 100, amountUsd: 1000, amountEtb: 0, isFixed: true },
  { id: 'c2_exp_3', item: 'Transport for consultants, 30 days × 150', tripDays: '30 days', quantity: 30, rateUsd: 150, amountUsd: 4500, amountEtb: 0, isFixed: true },
  { id: 'c2_exp_4', item: 'Special allowance for local staff, 100 days × ETB 100', tripDays: '100 days', quantity: 100, rateEtb: 100, amountUsd: 0, amountEtb: 10000, isFixed: true }
];

export const DEFAULT_CONDITION_2_DATA: ContractCondition2Data = {
  projectName: 'LEA ASSOCIATES / UNICONE JV',
  scope: 'Phase II only — Defect Liability Period (DLP). Total 12 man-months.',
  totalManMonths: 12,
  exchangeRate: 35,
  contingencyPct: 10,
  vatPct: 15,
  reimbursables: DEFAULT_CONDITION_2_EXPENSES,
  staffFees: DEFAULT_CONDITION_2_STAFF
};
