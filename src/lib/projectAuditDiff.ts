import { Project, HistoryItem, HistoryChangeDetail, formatAccounting } from '../types';

/**
 * Maps field keys to human-readable display labels for the audit changelog.
 */
const FIELD_LABELS: Record<string, string> = {
  name: 'Project Name',
  status: 'Project Lifecycle Status',
  contractor: 'Contractor',
  consultant: 'Consultant Firm',
  client: 'Employer / Client',
  contractType: 'Contract Type (DB/DBB)',
  classification: 'Road Classification',
  contractorGrade: 'Contractor Grade',
  programDirectorate: 'Program Directorate',
  pmo: 'Project Management Office (PMO)',
  lengthKm: 'Contract Total Length (Km)',
  spurRoadLengthKm: 'Spur Road Length (Km)',
  hasCappingLayer: 'Capping Layer Enabled',
  origAmount: 'Original Contract Amount (M ETB)',
  contractAmountEtb: 'Contract Amount (ETB)',
  revisedContractAmountEtb: 'Revised Contract Amount (ETB)',
  variation: 'Variation Orders Total (ETB)',
  provisionalSum: 'Provisional Sum (ETB)',
  signDate: 'Contract Signing Date',
  startDate: 'Commencement / Start Date',
  origDays: 'Original Contract Duration (Days)',
  eotDays: 'Extension of Time (EOT Days)',
  interimEotDays: 'Interim EOT (Days)',
  physicalProgress: 'Overall Physical Progress (%)',
  financialProgress: 'Financial Progress (%)',
  usdExchangeRate: 'USD Exchange Rate (ETB/USD)',
  annualInterestRate: 'Annual Financing Delay Interest Rate (%)',
  enableUsdPayments: 'Foreign Currency (USD) Tracking',
  hasForeignCurrency: 'Foreign Currency Component',
  ipcTracker: 'Interim Payment Certificates (IPCs)',
  bonds: 'Guarantees & Security Bonds',
  workProgram: 'Work Program Schedule & CPM Activities',
  quantities: 'Major Work Quantities & Accomplishments',
  linear: 'Main Road Linear Progress Diagram',
  linearSpur: 'Spur Road Linear Progress Diagram',
  monthly: 'Monthly Progress Accomplishment History',
  series: 'Contract Bill Series & Executed Quantities',
  supervisionConsultant: 'Supervision Consultant Agreement & Personnel',
  annual: 'Annual Physical & Financial Accomplishments',
  rowMetrics: 'Right of Way (ROW) Status & Metrics',
  rowCompensation: 'Right of Way Compensation Schedule',
  utilityCompensation: 'Utility Relocation & Compensation',
  risks: 'Risk Register & Mitigations',
  issues: 'Issue Management & Lessons Learned Log',
  documents: 'Project Documents & Dossier Attachments',
  progressPlan: 'Progress Plan Baseline'
};

function formatVal(val: any, fieldKey?: string): string {
  if (val === undefined || val === null) return 'None';
  if (typeof val === 'boolean') return val ? 'Yes / Enabled' : 'No / Disabled';
  if (typeof val === 'number') {
    if (fieldKey === 'physicalProgress' || fieldKey === 'financialProgress' || fieldKey === 'annualInterestRate') {
      return `${val.toFixed(2)}%`;
    }
    if (fieldKey === 'lengthKm' || fieldKey === 'spurRoadLengthKm') {
      return `${val.toFixed(2)} Km`;
    }
    if (fieldKey === 'origDays' || fieldKey === 'eotDays' || fieldKey === 'interimEotDays') {
      return `${val} Days`;
    }
    if (fieldKey === 'origAmount') {
      return `${val.toLocaleString()} M ETB`;
    }
    if (fieldKey?.toLowerCase().includes('amount') || fieldKey === 'variation' || fieldKey === 'provisionalSum') {
      return `ETB ${formatAccounting(val, '')}`;
    }
    return val.toLocaleString();
  }
  if (typeof val === 'string') {
    return val.trim() === '' ? 'Empty' : val;
  }
  if (Array.isArray(val)) {
    return `[${val.length} items]`;
  }
  return typeof val === 'object' ? JSON.stringify(val) : String(val);
}

/**
 * Computes deep human-readable audit change items between currentProject and incoming updated fields.
 */
export function generateAuditChangeDetails(
  currentProject: Project,
  fields: Partial<Project>,
  sectionName?: string
): { changes: HistoryChangeDetail[]; summaryDetails: string } {
  const changes: HistoryChangeDetail[] = [];
  const summarySentences: string[] = [];

  const keys = Object.keys(fields) as (keyof Project)[];

  keys.forEach(key => {
    // Ignore internal metadata fields
    if (
      key === 'lastModifiedBy' ||
      key === 'lastModifiedAt' ||
      key === 'lastModifiedSection' ||
      key === 'history' ||
      key === 'approvedBy' ||
      key === 'approvedAt' ||
      key === 'approverRole'
    ) {
      return;
    }

    const oldVal = (currentProject as any)[key];
    const newVal = (fields as any)[key];

    // Check if value actually changed
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) {
      return;
    }

    const fieldLabel = FIELD_LABELS[key as string] || String(key);

    // Specific formatting for complex array/object keys:
    if (key === 'ipcTracker' && Array.isArray(newVal)) {
      const oldIpcs = Array.isArray(oldVal) ? oldVal : [];
      const newIpcs = newVal;
      const diffCount = Math.abs(newIpcs.length - oldIpcs.length);
      
      // Look for individual modified IPCs
      const modifiedIpcNotes: string[] = [];
      newIpcs.forEach((item, idx) => {
        const oldItem = oldIpcs.find((o: any) => o.id === item.id || o.paymentNo === item.paymentNo);
        if (!oldItem) {
          modifiedIpcNotes.push(`Added IPC #${item.paymentNo || idx + 1} (Certified: ETB ${formatAccounting(item.certifiedEtb || 0, '')})`);
        } else if (
          oldItem.status !== item.status ||
          oldItem.certifiedEtb !== item.certifiedEtb ||
          oldItem.certifiedUsd !== item.certifiedUsd ||
          oldItem.grossBillEtb !== item.grossBillEtb ||
          oldItem.paymentDate !== item.paymentDate
        ) {
          const parts: string[] = [];
          if (oldItem.status !== item.status) parts.push(`Status: ${oldItem.status} → ${item.status}`);
          if (oldItem.certifiedEtb !== item.certifiedEtb) parts.push(`ETB: ${formatAccounting(oldItem.certifiedEtb || 0, '')} → ${formatAccounting(item.certifiedEtb || 0, '')}`);
          if (oldItem.certifiedUsd !== item.certifiedUsd) parts.push(`USD: $${formatAccounting(oldItem.certifiedUsd || 0, '')} → $${formatAccounting(item.certifiedUsd || 0, '')}`);
          if (oldItem.paymentDate !== item.paymentDate) parts.push(`Paid Date: ${oldItem.paymentDate || 'Unpaid'} → ${item.paymentDate || 'Unpaid'}`);
          
          modifiedIpcNotes.push(`Modified IPC #${item.paymentNo || idx + 1} (${parts.join(', ') || 'Updated data'})`);
        }
      });

      const desc = modifiedIpcNotes.length > 0 
        ? modifiedIpcNotes.slice(0, 3).join('; ') + (modifiedIpcNotes.length > 3 ? ` (+${modifiedIpcNotes.length - 3} more)` : '')
        : `Updated IPC Claim records (${newIpcs.length} total IPCs)`;

      changes.push({
        field: key,
        label: fieldLabel,
        oldVal: `${oldIpcs.length} IPCs`,
        newVal: `${newIpcs.length} IPCs`,
        description: desc
      });
      summarySentences.push(desc);
      return;
    }

    if (key === 'bonds' && Array.isArray(newVal)) {
      const oldBonds = Array.isArray(oldVal) ? oldVal : [];
      const newBonds = newVal;
      const modifiedBonds: string[] = [];

      newBonds.forEach((b, idx) => {
        const oldB = oldBonds.find((o: any) => o.sno === b.sno || o.type === b.type);
        if (!oldB) {
          modifiedBonds.push(`Added ${b.type || 'Bond'} (ETB ${formatAccounting(b.amount || 0, '')})`);
        } else if (oldB.amount !== b.amount || oldB.bank !== b.bank || (oldB as any).expiryDate !== (b as any).expiryDate) {
          modifiedBonds.push(`Updated ${b.type || 'Bond'}: ETB ${formatAccounting(b.amount || 0, '')}, ${b.bank || 'Bank'}`);
        }
      });

      const desc = modifiedBonds.length > 0
        ? modifiedBonds.join('; ')
        : `Updated Security Guarantees & Bonds (${newBonds.length} records)`;

      changes.push({
        field: key,
        label: fieldLabel,
        oldVal: `${oldBonds.length} Bonds`,
        newVal: `${newBonds.length} Bonds`,
        description: desc
      });
      summarySentences.push(desc);
      return;
    }

    if (key === 'workProgram' && Array.isArray(newVal)) {
      const oldWp = Array.isArray(oldVal) ? oldVal : [];
      const desc = `Updated Work Program CPM Activities (${newVal.length} activities scheduled)`;
      changes.push({
        field: key,
        label: fieldLabel,
        oldVal: `${oldWp.length} activities`,
        newVal: `${newVal.length} activities`,
        description: desc
      });
      summarySentences.push(desc);
      return;
    }

    if (key === 'quantities' && Array.isArray(newVal)) {
      const oldQ = Array.isArray(oldVal) ? oldVal : [];
      const modifiedQ: string[] = [];
      newVal.forEach((q, idx) => {
        const oq = oldQ.find((o: any) => o.itemNo === q.itemNo || o.name === q.name);
        if (oq && (oq.exec !== q.exec || oq.contractQty !== q.contractQty)) {
          modifiedQ.push(`${q.name || `Item ${idx+1}`}: ${oq.exec || 0} → ${q.exec || 0} ${q.unit || ''}`);
        }
      });

      const desc = modifiedQ.length > 0
        ? `Modified Quantities: ${modifiedQ.slice(0, 3).join('; ')}${modifiedQ.length > 3 ? ` (+${modifiedQ.length - 3} more)` : ''}`
        : `Updated Quantities Schedule (${newVal.length} items)`;

      changes.push({
        field: key,
        label: fieldLabel,
        oldVal: `${oldQ.length} items`,
        newVal: `${newVal.length} items`,
        description: desc
      });
      summarySentences.push(desc);
      return;
    }

    if (key === 'supervisionConsultant' && typeof newVal === 'object' && newVal !== null) {
      const oldSc = (typeof oldVal === 'object' && oldVal !== null) ? oldVal : {};
      const parts: string[] = [];
      if (newVal.firmName && newVal.firmName !== oldSc.firmName) {
        parts.push(`Firm: "${newVal.firmName}"`);
      }
      if (Array.isArray(newVal.personnel)) {
        parts.push(`${newVal.personnel.length} Staff`);
      }
      if (Array.isArray(newVal.invoices)) {
        parts.push(`${newVal.invoices.length} Invoices`);
      }
      const desc = `Updated Supervision Agreement (${parts.join(', ') || 'Consultant details'})`;
      changes.push({
        field: key,
        label: fieldLabel,
        oldVal: oldSc.firmName || 'Previous Info',
        newVal: newVal.firmName || 'Updated Info',
        description: desc
      });
      summarySentences.push(desc);
      return;
    }

    if (key === 'linear' || key === 'linearSpur') {
      const desc = `Updated ${key === 'linearSpur' ? 'Spur Road' : 'Main Road'} Linear Diagram Layer Execution`;
      changes.push({
        field: key,
        label: fieldLabel,
        oldVal: 'Previous diagram state',
        newVal: 'Updated layer chainage segments',
        description: desc
      });
      summarySentences.push(desc);
      return;
    }

    if (key === 'monthly' && Array.isArray(newVal)) {
      const desc = `Updated Monthly Accomplishment Progress Records (${newVal.length} monthly records)`;
      changes.push({
        field: key,
        label: fieldLabel,
        oldVal: `${(oldVal || []).length} monthly rows`,
        newVal: `${newVal.length} monthly rows`,
        description: desc
      });
      summarySentences.push(desc);
      return;
    }

    if (key === 'series' && Array.isArray(newVal)) {
      const desc = `Updated Contract Series Breakdown (${newVal.length} Bill Series items)`;
      changes.push({
        field: key,
        label: fieldLabel,
        oldVal: `${(oldVal || []).length} items`,
        newVal: `${newVal.length} items`,
        description: desc
      });
      summarySentences.push(desc);
      return;
    }

    // Scalar / standard fields
    const formattedOld = formatVal(oldVal, key as string);
    const formattedNew = formatVal(newVal, key as string);
    const desc = `${fieldLabel}: ${formattedOld} → ${formattedNew}`;

    changes.push({
      field: key as string,
      label: fieldLabel,
      oldVal: formattedOld,
      newVal: formattedNew,
      description: desc
    });

    summarySentences.push(desc);
  });

  const summaryDetails = summarySentences.length > 0
    ? summarySentences.join('; ')
    : (sectionName ? `Updated records in ${sectionName}` : 'Updated project details');

  return { changes, summaryDetails };
}

/**
 * Builds a complete new HistoryItem with detailed changelog and retains up to maxEntries (defaults to 150, at least 100).
 */
export function createProjectHistoryEntry(
  currentProject: Project,
  fields: Partial<Project>,
  sectionName: string,
  cleanHistProgress: number,
  currentUser: { username: string; role?: string },
  maxEntries = 150
): HistoryItem[] {
  // If explicitly clearing history
  if (fields.history !== undefined && Array.isArray(fields.history) && fields.history.length === 0) {
    return [];
  }

  const { changes, summaryDetails } = generateAuditChangeDetails(currentProject, fields, sectionName);

  let finalDetails = summaryDetails;
  if (changes.length === 0) {
    finalDetails = sectionName 
      ? `Audit Snapshot recorded for ${sectionName}` 
      : `Manual audit milestone snapshot saved by ${currentUser.username}`;
  }

  const newEntry: HistoryItem = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleString(),
    user: currentUser.username,
    role: currentUser.role,
    section: sectionName || 'General',
    physicalProgress: cleanHistProgress,
    details: finalDetails,
    changes: changes.length > 0 ? changes : undefined
  };

  const existingHistory = Array.isArray(currentProject.history) ? currentProject.history : [];

  return [newEntry, ...existingHistory].slice(0, Math.max(100, maxEntries));
}
