import { 
  PaymentInstruction, 
  TreasuryBankAccount, 
  WebhookLog, 
  PaymentStatus, 
  ActiveRole,
  PaymentCategory,
  CurrencyCode 
} from '../types/treasury';
import { 
  INITIAL_PAYMENT_INSTRUCTIONS, 
  INITIAL_TREASURY_ACCOUNTS, 
  INITIAL_WEBHOOK_LOGS 
} from '../data/initialTreasuryData';

const LOCAL_STORAGE_PAYMENTS_KEY = 'treasurypay_payments_v2';
const LOCAL_STORAGE_ACCOUNTS_KEY = 'treasurypay_accounts_v2';
const LOCAL_STORAGE_LOGS_KEY = 'treasurypay_webhook_logs_v2';
const LOCAL_STORAGE_ROLE_KEY = 'treasurypay_active_role';

// Initialize localStorage if not present
function initializeLocalStorage() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY)) {
    localStorage.setItem(LOCAL_STORAGE_PAYMENTS_KEY, JSON.stringify(INITIAL_PAYMENT_INSTRUCTIONS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_ACCOUNTS_KEY)) {
    localStorage.setItem(LOCAL_STORAGE_ACCOUNTS_KEY, JSON.stringify(INITIAL_TREASURY_ACCOUNTS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_LOGS_KEY)) {
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(INITIAL_WEBHOOK_LOGS));
  }
}

initializeLocalStorage();

export function getStoredRole(): ActiveRole {
  if (typeof window === 'undefined') return 'FINANCIAL_DIRECTOR';
  const role = localStorage.getItem(LOCAL_STORAGE_ROLE_KEY);
  return role === 'DIRECTOR_GENERAL' ? 'DIRECTOR_GENERAL' : 'FINANCIAL_DIRECTOR';
}

export function setStoredRole(role: ActiveRole) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, role);
}

// Local fallback getters and setters
function getLocalPayments(): PaymentInstruction[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_PAYMENT_INSTRUCTIONS;
  } catch {
    return INITIAL_PAYMENT_INSTRUCTIONS;
  }
}

function saveLocalPayments(data: PaymentInstruction[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PAYMENTS_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed saving payments to localStorage:', err);
  }
}

function getLocalAccounts(): TreasuryBankAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_TREASURY_ACCOUNTS;
  } catch {
    return INITIAL_TREASURY_ACCOUNTS;
  }
}

function saveLocalAccounts(data: TreasuryBankAccount[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ACCOUNTS_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed saving accounts to localStorage:', err);
  }
}

function getLocalLogs(): WebhookLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_WEBHOOK_LOGS;
  } catch {
    return INITIAL_WEBHOOK_LOGS;
  }
}

function saveLocalLogs(data: WebhookLog[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed saving logs to localStorage:', err);
  }
}

// Event Dispatcher for in-browser reactivity
type TreasuryEventHandler = (event: { type: string; payload: unknown }) => void;
const subscribers = new Set<TreasuryEventHandler>();

export function notifySubscribers(type: string, payload: unknown) {
  subscribers.forEach(cb => {
    try {
      cb({ type, payload });
    } catch (err) {
      console.error('Error in subscriber callback:', err);
    }
  });
}

export function subscribeTreasuryEvents(handler: TreasuryEventHandler): () => void {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}

// -------------------------------------------------------------
// PUBLIC API METHODS
// -------------------------------------------------------------

export async function fetchPayments(): Promise<PaymentInstruction[]> {
  try {
    const res = await fetch('/api/payments');
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        saveLocalPayments(json.data);
        return json.data;
      }
    }
  } catch {
    // network or dev fallback
  }
  return getLocalPayments();
}

export async function fetchAccounts(): Promise<TreasuryBankAccount[]> {
  try {
    const res = await fetch('/api/treasury/accounts');
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        saveLocalAccounts(json.data);
        return json.data;
      }
    }
  } catch {
    // fallback
  }
  return getLocalAccounts();
}

export async function fetchWebhookLogs(): Promise<WebhookLog[]> {
  try {
    const res = await fetch('/api/webhooks/logs');
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        saveLocalLogs(json.data);
        return json.data;
      }
    }
  } catch {
    // fallback
  }
  return getLocalLogs();
}

export async function submitPaymentInstruction(payload: {
  projectReference: string;
  projectName: string;
  category: PaymentCategory;
  purpose: string;
  amount: number;
  currency: CurrencyCode;
  payeeName: string;
  payeeTin: string;
  payeeEntityType: 'Contractor' | 'Consultant' | 'PAP' | 'Authority';
  payeeEmail: string;
  payeePhone: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  swiftBic: string;
  branchName?: string;
  supportingDocumentName?: string;
  supportingDocumentRef?: string;
}): Promise<PaymentInstruction> {
  const body = {
    projectReference: payload.projectReference,
    projectName: payload.projectName,
    category: payload.category,
    purpose: payload.purpose,
    amount: payload.amount,
    currency: payload.currency,
    payee: {
      name: payload.payeeName,
      tin: payload.payeeTin,
      entityType: payload.payeeEntityType,
      contactEmail: payload.payeeEmail,
      contactPhone: payload.payeePhone
    },
    destinationBank: {
      bankName: payload.bankName,
      accountNumber: payload.accountNumber,
      iban: payload.iban || '',
      swiftBic: payload.swiftBic,
      branchName: payload.branchName || 'Main Corporate'
    },
    supportingDocuments: [
      {
        id: `doc-${Date.now()}`,
        name: payload.supportingDocumentName || 'IPC_Valuation_Certificate_Signed.pdf',
        type: 'Engineer IPC Certificate',
        fileSize: '3.4 MB',
        referenceCode: payload.supportingDocumentRef || `ERA-VAL-${Date.now()}`,
        verificationStatus: 'Verified',
        uploadedAt: new Date().toISOString()
      },
      {
        id: `doc-${Date.now() + 1}`,
        name: 'Ministry_of_Revenue_VAT_Clearance.pdf',
        type: 'Tax Clearance',
        fileSize: '1.2 MB',
        referenceCode: `MOR-CLR-${Date.now()}`,
        verificationStatus: 'Verified',
        uploadedAt: new Date().toISOString()
      }
    ]
  };

  try {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        notifySubscribers('PAYMENT_CREATED', json.data);
        return json.data;
      }
    }
  } catch {
    // Fallback in-memory
  }

  // Local fallback
  const localList = getLocalPayments();
  const newId = `PAY-ERA-2026-${String(localList.length + 95).padStart(4, '0')}`;
  const now = new Date().toISOString();

  const newInstruction: PaymentInstruction = {
    id: newId,
    projectReference: payload.projectReference,
    projectName: payload.projectName,
    category: payload.category,
    purpose: payload.purpose,
    amount: payload.amount,
    currency: payload.currency,
    payee: {
      name: payload.payeeName,
      tin: payload.payeeTin,
      entityType: payload.payeeEntityType,
      contactEmail: payload.payeeEmail,
      contactPhone: payload.payeePhone
    },
    destinationBank: {
      bankName: payload.bankName,
      accountNumber: payload.accountNumber,
      iban: payload.iban || '',
      swiftBic: payload.swiftBic,
      branchName: payload.branchName || 'Main Corporate'
    },
    status: 'Pending',
    createdByRole: 'DIRECTOR_GENERAL',
    createdByName: 'Eng. Habtamu Tegegne (Director General)',
    createdAt: now,
    supportingDocuments: [
      {
        id: `doc-${Date.now()}`,
        name: payload.supportingDocumentName || 'IPC_Valuation_Certificate_Signed.pdf',
        type: 'Engineer IPC Certificate',
        fileSize: '3.4 MB',
        referenceCode: payload.supportingDocumentRef || `ERA-VAL-${Date.now()}`,
        verificationStatus: 'Verified',
        uploadedAt: now
      }
    ],
    linkedBankAccountId: payload.currency === 'USD' ? 'acc_citi_fx' : 'acc_cbe_main',
    auditTrail: [
      {
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: 'INSTRUCTION_CREATED',
        actor: 'Eng. Habtamu Tegegne',
        role: 'Director General',
        notes: `Submitted payment instruction for ${payload.currency} ${payload.amount.toLocaleString()}`
      }
    ]
  };

  localList.unshift(newInstruction);
  saveLocalPayments(localList);
  notifySubscribers('PAYMENT_CREATED', newInstruction);
  return newInstruction;
}

export async function approvePaymentInstruction(id: string, reviewerCommentary: string): Promise<PaymentInstruction> {
  const commentary = reviewerCommentary.trim();
  if (!commentary) {
    throw new Error('Reviewer Commentary is required to authorize the payment instruction.');
  }

  try {
    const res = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'APPROVE', 
        reviewerCommentary: commentary, 
        notes: commentary 
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        notifySubscribers('PAYMENT_UPDATED', json.data);
        return json.data;
      }
    }
  } catch {
    // fallback
  }

  const list = getLocalPayments();
  const idx = list.findIndex(p => p.id === id);
  if (idx !== -1) {
    const now = new Date().toISOString();
    const previousStatus = list[idx].status;
    list[idx].status = 'Approved';
    list[idx].approvedByRole = 'FINANCIAL_DIRECTOR';
    list[idx].approvedByName = 'Ato Berhanu Zeleke (Financial Director)';
    list[idx].approvedAt = now;
    list[idx].approvalNotes = commentary;
    list[idx].reviewerCommentary = commentary;

    if (!list[idx].reviewHistory) list[idx].reviewHistory = [];
    list[idx].reviewHistory!.unshift({
      id: `rev-${Date.now()}`,
      timestamp: now,
      reviewerName: 'Ato Berhanu Zeleke',
      reviewerRole: 'Financial Management Director',
      decision: 'APPROVED',
      reviewerCommentary: commentary,
      previousStatus,
      newStatus: 'Approved'
    });

    list[idx].auditTrail.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'INSTRUCTION_APPROVED',
      actor: 'Ato Berhanu Zeleke',
      role: 'Financial Director',
      notes: `Reviewer Commentary: ${commentary}`
    });
    saveLocalPayments(list);
    notifySubscribers('PAYMENT_UPDATED', list[idx]);
    return list[idx];
  }
  throw new Error('Instruction not found');
}

export async function rejectPaymentInstruction(id: string, reviewerCommentary: string): Promise<PaymentInstruction> {
  const commentary = reviewerCommentary.trim();
  if (!commentary) {
    throw new Error('Reviewer Commentary is required to record a formal rejection.');
  }

  try {
    const res = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'REJECT', 
        reviewerCommentary: commentary, 
        reason: commentary 
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        notifySubscribers('PAYMENT_UPDATED', json.data);
        return json.data;
      }
    }
  } catch {
    // fallback
  }

  const list = getLocalPayments();
  const idx = list.findIndex(p => p.id === id);
  if (idx !== -1) {
    const now = new Date().toISOString();
    const previousStatus = list[idx].status;
    list[idx].status = 'Failed';
    list[idx].rejectionReason = commentary;
    list[idx].reviewerCommentary = commentary;
    list[idx].rejectedAt = now;

    if (!list[idx].reviewHistory) list[idx].reviewHistory = [];
    list[idx].reviewHistory!.unshift({
      id: `rev-${Date.now()}`,
      timestamp: now,
      reviewerName: 'Ato Berhanu Zeleke',
      reviewerRole: 'Financial Management Director',
      decision: 'REJECTED',
      reviewerCommentary: commentary,
      previousStatus,
      newStatus: 'Failed'
    });

    list[idx].auditTrail.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'INSTRUCTION_REJECTED',
      actor: 'Ato Berhanu Zeleke',
      role: 'Financial Director',
      notes: `Reviewer Rejection Commentary: ${commentary}`
    });
    saveLocalPayments(list);
    notifySubscribers('PAYMENT_UPDATED', list[idx]);
    return list[idx];
  }
  throw new Error('Instruction not found');
}

export async function executeBankTransfer(
  id: string, 
  gatewayPlatform: 'Adyen BalancePlatform' | 'Yapily ISO 20022' | 'CBE RTGS Gateway' = 'Adyen BalancePlatform'
): Promise<PaymentInstruction> {
  try {
    const res = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'EXECUTE_TRANSFER', gatewayPlatform })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        notifySubscribers('PAYMENT_UPDATED', json.data);
        return json.data;
      }
    }
  } catch {
    // fallback
  }

  const list = getLocalPayments();
  const idx = list.findIndex(p => p.id === id);
  if (idx !== -1) {
    const now = new Date().toISOString();
    const prefix = gatewayPlatform === 'Adyen BalancePlatform' ? 'ADY-TRF-' :
                   gatewayPlatform === 'Yapily ISO 20022' ? 'YAP-ETH-' : 'CBE-RTGS-';
    const txId = `${prefix}${Math.floor(10000000 + Math.random() * 90000000)}`;

    list[idx].status = 'Processing';
    list[idx].executedAt = now;
    list[idx].gatewayPlatform = gatewayPlatform;
    list[idx].gatewayTransactionId = txId;
    list[idx].auditTrail.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'GATEWAY_DISPATCHED',
      actor: 'Ato Berhanu Zeleke',
      role: 'Financial Director',
      notes: `Dispatched to ${gatewayPlatform} with Tx ID ${txId}`
    });

    saveLocalPayments(list);
    notifySubscribers('PAYMENT_UPDATED', list[idx]);
    return list[idx];
  }
  throw new Error('Instruction not found');
}

export async function editPaymentByDirectorGeneral(
  id: string,
  updates: {
    amount: number;
    currency: CurrencyCode;
    actionType: 'RESUBMIT_FOR_AUDIT' | 'SAVE_CHANGES' | 'CANCEL_INSTRUCTION';
    justification?: string;
    newStatus?: PaymentStatus;
  }
): Promise<PaymentInstruction> {
  const requestBody = {
    action: 'DG_EDIT',
    amount: updates.amount,
    currency: updates.currency,
    actionType: updates.actionType,
    justification: updates.justification,
    status: updates.newStatus
  };

  try {
    const res = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        notifySubscribers('PAYMENT_UPDATED', json.data);
        return json.data;
      }
    }
  } catch {
    // fallback
  }

  const list = getLocalPayments();
  const idx = list.findIndex(p => p.id === id);
  if (idx !== -1) {
    const now = new Date().toISOString();
    const current = list[idx];
    const oldAmount = current.amount;
    const oldCurrency = current.currency;
    const oldStatus = current.status;

    current.amount = updates.amount;
    current.currency = updates.currency;
    if (updates.currency === 'USD') {
      current.linkedBankAccountId = 'acc_citi_fx';
    } else if (updates.currency === 'ETB' && current.linkedBankAccountId === 'acc_citi_fx') {
      current.linkedBankAccountId = 'acc_cbe_main';
    }

    let appliedLabel = 'Updated Details';
    if (updates.actionType === 'RESUBMIT_FOR_AUDIT' || updates.newStatus === 'Pending') {
      current.status = 'Pending';
      current.rejectionReason = undefined;
      appliedLabel = 'Resubmitted for Financial Director Audit';
    } else if (updates.actionType === 'CANCEL_INSTRUCTION' || updates.newStatus === 'Failed') {
      current.status = 'Failed';
      current.rejectionReason = `Cancelled by Director General: ${updates.justification || 'Administrative void'}`;
      appliedLabel = 'Cancelled & Voided Instruction';
    } else if (updates.actionType === 'SAVE_CHANGES') {
      appliedLabel = 'Saved Revised Amount & Currency';
    }

    const editJustification = (updates.justification || 'Administrative terms revision by Director General').trim();

    if (!current.editHistory) current.editHistory = [];
    current.editHistory.unshift({
      id: `edit-${Date.now()}`,
      timestamp: now,
      editorName: 'Eng. Habtamu Tegegne',
      editorRole: 'Director General',
      previousAmount: oldAmount,
      newAmount: current.amount,
      previousCurrency: oldCurrency,
      newCurrency: current.currency,
      actionTaken: appliedLabel,
      justification: editJustification,
      previousStatus: oldStatus,
      newStatus: current.status
    });

    current.auditTrail.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'DG_INSTRUCTION_REVISED',
      actor: 'Eng. Habtamu Tegegne',
      role: 'Director General',
      notes: `Director General edited: ${oldCurrency} ${oldAmount.toLocaleString('en-US')} → ${current.currency} ${current.amount.toLocaleString('en-US')}. Action: ${appliedLabel}. Justification: ${editJustification}`
    });

    list[idx] = current;
    saveLocalPayments(list);
    notifySubscribers('PAYMENT_UPDATED', current);
    return current;
  }
  throw new Error('Instruction not found');
}

export async function requestClarificationOnInstruction(
  id: string,
  targetRole: 'DEPARTMENT_HEAD' | 'FINANCIAL_DIRECTOR',
  question: string,
  requesterRole: ActiveRole
): Promise<PaymentInstruction> {
  const query = question.trim();
  if (!query) throw new Error('Clarification question/notes are required.');

  try {
    const res = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'REQUEST_CLARIFICATION',
        targetRole,
        question: query,
        requesterRole
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        notifySubscribers('PAYMENT_UPDATED', json.data);
        return json.data;
      }
    }
  } catch {
    // fallback
  }

  const list = getLocalPayments();
  const idx = list.findIndex(p => p.id === id);
  if (idx !== -1) {
    const now = new Date().toISOString();
    const actorName = requesterRole === 'DIRECTOR_GENERAL' ? 'Eng. Habtamu Tegegne (Director General)' : 'Ato Berhanu Zeleke (Financial Director)';
    const roleLabel = requesterRole === 'DIRECTOR_GENERAL' ? 'Director General' : 'Financial Director';

    list[idx].clarificationNotes = `Clarification Requested from ${targetRole.replace('_', ' ')}: "${query}"`;
    if (!list[idx].reviewHistory) list[idx].reviewHistory = [];
    list[idx].reviewHistory!.unshift({
      id: `rev-${Date.now()}`,
      timestamp: now,
      reviewerName: actorName,
      reviewerRole: roleLabel,
      decision: 'CLARIFICATION_REQUESTED',
      reviewerCommentary: `Requested clarification from ${targetRole.replace('_', ' ')}: ${query}`,
      previousStatus: list[idx].status,
      newStatus: list[idx].status
    });

    list[idx].auditTrail.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'CLARIFICATION_REQUESTED',
      actor: actorName,
      role: roleLabel,
      notes: `Requested Clarification from ${targetRole}: ${query}`
    });

    saveLocalPayments(list);
    notifySubscribers('PAYMENT_UPDATED', list[idx]);
    return list[idx];
  }
  throw new Error('Instruction not found');
}

// -------------------------------------------------------------
// WEBHOOK DISPATCH & SIMULATOR
// -------------------------------------------------------------
export async function sendWebhookCallback(payload: Record<string, unknown>): Promise<{
  success: boolean;
  status: number;
  response: Record<string, unknown>;
  log: WebhookLog;
}> {
  const startTime = Date.now();
  let serverResponse: any = null;
  let status = 200;

  try {
    const res = await fetch('/api/webhooks/payment-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-source': 'TreasuryPay-Simulator',
        'x-signature-sha256': 'valid_hmac_sha256_checksum'
      },
      body: JSON.stringify(payload)
    });
    status = res.status;
    serverResponse = await res.json();
  } catch {
    // local fallback
  }

  // If server responded, fetch refreshed lists
  if (serverResponse && serverResponse.received) {
    const updatedPayments = await fetchPayments();
    const updatedAccounts = await fetchAccounts();
    const updatedLogs = await fetchWebhookLogs();
    notifySubscribers('PAYMENTS_SYNC', updatedPayments);
    notifySubscribers('ACCOUNTS_SYNC', updatedAccounts);
    notifySubscribers('WEBHOOKS_SYNC', updatedLogs);

    return {
      success: true,
      status: 200,
      response: serverResponse,
      log: updatedLogs[0] || ({} as WebhookLog)
    };
  }

  // Fallback local processing
  const now = new Date().toISOString();
  const payments = getLocalPayments();
  const accounts = getLocalAccounts();
  const logs = getLocalLogs();

  let targetRef = '';
  let txId = '';
  let gateway: WebhookLog['gateway'] = 'Adyen BalancePlatform';
  let eventType: WebhookLog['eventType'] = 'balancePlatform.transfer.updated';
  let isSuccess = true;

  if (payload.type === 'balancePlatform.transfer.updated') {
    gateway = 'Adyen BalancePlatform';
    eventType = 'balancePlatform.transfer.updated';
    const data = payload.data as any;
    targetRef = data?.reference || '';
    txId = data?.id || '';
    isSuccess = data?.status === 'booked' || data?.status === 'settled';
  } else if (payload.event === 'payment.completed') {
    gateway = 'Yapily ISO 20022';
    eventType = 'payment.completed';
    targetRef = (payload.instructionIdentification as string) || (payload.reference as string) || '';
    txId = (payload.paymentId as string) || '';
    isSuccess = payload.status === 'COMPLETED';
  } else {
    gateway = 'CBE RTGS Gateway';
    eventType = 'TRANSFER_SUCCESSFUL';
    targetRef = (payload.originalInstructionId as string) || (payload.reference as string) || '';
    txId = (payload.settlementId as string) || '';
    isSuccess = payload.txStatus === 'SETTLED' || payload.txStatus === 'COMPLETED';
  }

  const targetIdx = payments.findIndex(p => 
    (targetRef && p.id === targetRef) ||
    (txId && p.gatewayTransactionId === txId) ||
    (p.status === 'Processing')
  );

  const eventId = `evt_sim_${Date.now()}`;
  let updatedId = '';

  if (targetIdx !== -1) {
    const p = payments[targetIdx];
    updatedId = p.id;
    p.status = isSuccess ? 'Paid' : 'Failed';
    p.webhookEventId = eventId;
    if (isSuccess) {
      p.paidAt = now;
      p.auditTrail.push({
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: 'WEBHOOK_STATUS_PAID',
        actor: `${gateway} Webhook`,
        role: 'SYSTEM_GATEWAY',
        notes: `Webhook 200 OK Auto-Sync: Status automatically updated to Paid.`
      });

      // Deduct balance from linked bank account
      const accIdx = accounts.findIndex(a => a.id === p.linkedBankAccountId);
      if (accIdx !== -1) {
        accounts[accIdx].clearedBalance = Math.max(0, accounts[accIdx].clearedBalance - p.amount);
        accounts[accIdx].reservedCommitments = Math.max(0, accounts[accIdx].reservedCommitments - p.amount);
        accounts[accIdx].availableBalance = accounts[accIdx].clearedBalance - accounts[accIdx].reservedCommitments;
        accounts[accIdx].lastUpdated = now;
      }
    } else {
      p.auditTrail.push({
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: 'WEBHOOK_STATUS_FAILED',
        actor: `${gateway} Webhook`,
        role: 'SYSTEM_GATEWAY',
        notes: 'Transfer rejected by gateway clearing network.'
      });
    }

    payments[targetIdx] = p;
    saveLocalPayments(payments);
    saveLocalAccounts(accounts);
  }

  const responseBody = {
    received: true,
    status: 'acknowledged',
    eventId,
    timestamp: now,
    recordUpdated: updatedId || 'N/A',
    currentStatus: isSuccess ? 'Paid' : 'Failed'
  };

  const newLog: WebhookLog = {
    id: `log-${Date.now()}`,
    eventId,
    timestamp: now,
    gateway,
    eventType,
    instructionId: updatedId || 'UNMAPPED',
    gatewayTransactionId: txId || `TX-${Date.now()}`,
    httpMethod: 'POST',
    requestUrl: '/api/webhooks/payment-status',
    requestHeaders: {
      'content-type': 'application/json',
      'user-agent': 'TreasuryPay-Webhook-Simulator/1.0',
      'x-signature-sha256': 'verified_hmac_sha256'
    },
    requestBody: payload,
    responseStatus: 200,
    responseBody,
    signatureVerified: true,
    executionDurationMs: Math.max(14, Date.now() - startTime)
  };

  logs.unshift(newLog);
  saveLocalLogs(logs);

  notifySubscribers('PAYMENTS_SYNC', payments);
  notifySubscribers('ACCOUNTS_SYNC', accounts);
  notifySubscribers('WEBHOOK_RECEIVED', newLog);

  return {
    success: true,
    status: 200,
    response: responseBody,
    log: newLog
  };
}

// SSE Connection Listener
export function initSseListener(
  onPaymentUpdated: (p: PaymentInstruction) => void,
  onAccountsUpdated: (acc: TreasuryBankAccount[]) => void,
  onWebhookReceived: (log: WebhookLog) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource('/api/events');

    eventSource.addEventListener('PAYMENT_CREATED', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onPaymentUpdated(data);
      } catch (err) {
        console.warn('SSE parse error:', err);
      }
    });

    eventSource.addEventListener('PAYMENT_UPDATED', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onPaymentUpdated(data);
      } catch (err) {
        console.warn('SSE parse error:', err);
      }
    });

    eventSource.addEventListener('ACCOUNTS_UPDATED', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onAccountsUpdated(data);
      } catch (err) {
        console.warn('SSE parse error:', err);
      }
    });

    eventSource.addEventListener('WEBHOOK_RECEIVED', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onWebhookReceived(data);
      } catch (err) {
        console.warn('SSE parse error:', err);
      }
    });
  } catch (err) {
    console.warn('SSE connection unavailable, using local event broadcaster:', err);
  }

  // Also hook into in-memory subscribers
  const unsubscribeLocal = subscribeTreasuryEvents(({ type, payload }) => {
    if (type === 'PAYMENT_CREATED' || type === 'PAYMENT_UPDATED') {
      onPaymentUpdated(payload as PaymentInstruction);
    } else if (type === 'ACCOUNTS_SYNC' || type === 'ACCOUNTS_UPDATED') {
      onAccountsUpdated(payload as TreasuryBankAccount[]);
    } else if (type === 'WEBHOOK_RECEIVED') {
      onWebhookReceived(payload as WebhookLog);
    }
  });

  return () => {
    if (eventSource) {
      eventSource.close();
    }
    unsubscribeLocal();
  };
}
