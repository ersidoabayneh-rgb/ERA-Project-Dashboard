import { GuarantyPolicyCategory } from '../types';

export const DEFAULT_GUARANTY_POLICY_CATEGORIES: GuarantyPolicyCategory[] = [
  // Unconditional Bonds & Guarantees
  { id: 'gpc-1', name: 'Unconditional Performance Bank Guarantee', category: 'Unconditional Guarantee' },
  { id: 'gpc-2', name: 'Unconditional Advance Payment Guarantee', category: 'Unconditional Guarantee' },
  { id: 'gpc-3', name: 'Unconditional Retention Money Guarantee', category: 'Unconditional Guarantee' },
  { id: 'gpc-4', name: 'Unconditional Performance Bond', category: 'Unconditional Bond' },
  { id: 'gpc-5', name: 'Unconditional Advance Payment Bond', category: 'Unconditional Bond' },
  { id: 'gpc-6', name: 'Unconditional Bid Bond / Tender Security', category: 'Unconditional Bond' },
  { id: 'gpc-7', name: 'Unconditional Maintenance Bond', category: 'Unconditional Bond' },

  // Conditional Bonds & Guarantees
  { id: 'gpc-8', name: 'Conditional Performance Guarantee', category: 'Conditional Guarantee' },
  { id: 'gpc-9', name: 'Conditional Advance Payment Guarantee', category: 'Conditional Guarantee' },
  { id: 'gpc-10', name: 'Conditional Retention Money Guarantee', category: 'Conditional Guarantee' },
  { id: 'gpc-11', name: '10% Additional Advance Guarantee', category: 'Conditional Guarantee' },
  { id: 'gpc-12', name: 'Conditional Performance Bond', category: 'Conditional Bond' },
  { id: 'gpc-13', name: 'Conditional Advance Payment Bond', category: 'Conditional Bond' },
  { id: 'gpc-14', name: 'Retention Bond', category: 'Conditional Bond' },
  { id: 'gpc-15', name: 'Warranty Bond', category: 'Conditional Bond' },
  { id: 'gpc-16', name: 'Customs Duty Bond', category: 'Conditional Bond' },
  { id: 'gpc-17', name: 'Environmental Remediation Escrow Guarantee', category: 'Conditional Guarantee' },
  
  // Insurances & Policies
  { id: 'gpc-18', name: 'CAR Policy (Contractor All Risk Policy)', category: 'Insurance' },
  { id: 'gpc-19', name: 'Contractor All Risk Policy', category: 'Insurance' },
  { id: 'gpc-20', name: "Contractor's All Risk Policy", category: 'Insurance' },
  { id: 'gpc-21', name: "Contractor's Plant and Machinery (CPM)", category: 'Insurance' },
  { id: 'gpc-22', name: "Contractor's Workmen Compensation (WCA)", category: 'Insurance' },
  { id: 'gpc-23', name: "Employer's Liability Insurance", category: 'Insurance' },
  { id: 'gpc-24', name: 'Professional Indemnity Insurance', category: 'Insurance' },
  { id: 'gpc-25', name: 'Professional Indemnity Policy', category: 'Insurance' },
  { id: 'gpc-26', name: 'Political Violence Insurance Policy (PVT)', category: 'Insurance' },
  { id: 'gpc-27', name: 'Third Party Liability (TPL) Policy', category: 'Insurance' },
  { id: 'gpc-28', name: 'Third party (commercial motor vehicle)', category: 'Insurance' },
  { id: 'gpc-29', name: 'Motor Vehicles / Fleet Policy', category: 'Insurance' },
  { id: 'gpc-30', name: 'Motor commercial own damage', category: 'Insurance' },
  { id: 'gpc-31', name: 'Material On Site (MOS) Insurance', category: 'Insurance' },
  { id: 'gpc-32', name: 'Material Onsite / In-Transit Insurance', category: 'Insurance' },
  { id: 'gpc-33', name: 'Indemnity Insurance Policy', category: 'Insurance' },
  { id: 'gpc-34', name: 'Marine & Cargo In-Transit Insurance', category: 'Insurance' },
  { id: 'gpc-35', name: 'Fire & Special Perils Insurance', category: 'Insurance' }
];
