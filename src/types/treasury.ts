export type PaymentStatus = 'Pending' | 'Approved' | 'Processing' | 'Paid' | 'Failed';

export type PaymentCategory = 
  | 'IPC_VALUATION'
  | 'ADVANCE_MOBILIZATION'
  | 'ROW_COMPENSATION'
  | 'CONSULTANT_FEES'
  | 'RETENTION_RELEASE'
  | 'TAX_SETTLEMENT';

export type CurrencyCode = 'ETB' | 'USD' | 'EUR' | 'GBP';

export type ActiveRole = 'DIRECTOR_GENERAL' | 'FINANCIAL_DIRECTOR' | 'DEPARTMENT_HEAD';

export interface BankDetail {
  bankName: string;
  accountNumber: string;
  iban?: string;
  swiftBic: string;
  branchName: string;
}

export interface PayeeDetail {
  name: string;
  tin: string;
  entityType: 'Contractor' | 'Consultant' | 'PAP' | 'Authority' | 'Supplier';
  contactEmail: string;
  contactPhone: string;
}

export interface SupportingDocument {
  id: string;
  name: string;
  type: string;
  fileSize: string;
  referenceCode: string;
  verificationStatus: 'Verified' | 'Pending Verification';
  uploadedAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  role: string;
  notes?: string;
}

export interface ReviewHistoryEntry {
  id: string;
  timestamp: string;
  reviewerName: string;
  reviewerRole: string;
  decision: 'APPROVED' | 'REJECTED' | 'RECOMMENDED' | 'CLARIFICATION_REQUESTED' | string;
  reviewerCommentary: string; // Required commentary field
  previousStatus?: PaymentStatus;
  newStatus: PaymentStatus;
}

export interface EditHistoryEntry {
  id: string;
  timestamp: string;
  editorName: string;
  editorRole: string;
  previousAmount: number;
  newAmount: number;
  previousCurrency: CurrencyCode;
  newCurrency: CurrencyCode;
  actionTaken: 'RESUBMIT_FOR_AUDIT' | 'SAVE_CHANGES' | 'CANCEL_INSTRUCTION' | string;
  justification: string;
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus;
}

export interface PaymentInstruction {
  id: string; // e.g. PAY-ERA-2026-0089
  projectReference: string; // e.g. ERA/ICB/R-2023/LOT-04
  projectName: string;
  category: PaymentCategory;
  purpose: string;
  amount: number;
  currency: CurrencyCode;
  payee: PayeeDetail;
  destinationBank: BankDetail;
  sourceBank?: BankDetail; // Explicit source treasury bank details
  status: PaymentStatus;
  createdByRole: 'DEPARTMENT_HEAD' | 'FINANCIAL_DIRECTOR' | 'DIRECTOR_GENERAL';
  createdByName: string;
  createdAt: string;
  supportingDocuments: SupportingDocument[];
  
  reviewerCommentary?: string; // Latest commentary from reviewer
  clarificationNotes?: string; // Active clarification request notes
  reviewHistory?: ReviewHistoryEntry[]; // Full audit log of reviewer comments & decisions
  
  editHistory?: EditHistoryEntry[]; // Full history of revisions
  
  approvedByRole?: 'FINANCIAL_DIRECTOR' | 'DIRECTOR_GENERAL';
  approvedByName?: string;
  approvedAt?: string;
  
  rejectionReason?: string;
  rejectedAt?: string;
  
  gatewayTransactionId?: string; // e.g. ADY-TRF-99238102
  gatewayPlatform?: 'Adyen BalancePlatform' | 'Yapily ISO 20022' | 'CBE RTGS Gateway';
  executedAt?: string;
  paidAt?: string;
  
  linkedBankAccountId: string;
  webhookEventId?: string;
  auditTrail: AuditEntry[];
}

export interface WebhookLog {
  id: string;
  eventId: string;
  timestamp: string;
  gateway: 'Adyen BalancePlatform' | 'Yapily ISO 20022' | 'CBE RTGS Gateway';
  eventType: 'balancePlatform.transfer.updated' | 'payment.completed' | 'COMPLETED' | 'TRANSFER_SUCCESSFUL' | 'TRANSFER_FAILED';
  instructionId: string;
  gatewayTransactionId: string;
  httpMethod: 'POST';
  requestUrl: string;
  requestHeaders: Record<string, string>;
  requestBody: Record<string, unknown>;
  responseStatus: 200 | 400 | 404 | 500;
  responseBody: Record<string, unknown>;
  signatureVerified: boolean;
  executionDurationMs: number;
}

export interface TreasuryBankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban?: string;
  currency: CurrencyCode;
  clearedBalance: number;
  reservedCommitments: number;
  availableBalance: number;
  lastUpdated: string;
  colorScheme: 'indigo' | 'emerald' | 'amber' | 'blue' | 'purple';
  isFx: boolean;
  swiftBic: string;
  branch: string;
}
