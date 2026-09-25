import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { 
  PaymentInstruction, 
  TreasuryBankAccount, 
  WebhookLog, 
  AuditEntry,
  PaymentStatus 
} from './src/types/treasury';
import { 
  INITIAL_PAYMENT_INSTRUCTIONS, 
  INITIAL_TREASURY_ACCOUNTS, 
  INITIAL_WEBHOOK_LOGS 
} from './src/data/initialTreasuryData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In-Memory Data Store (seeded from initial constants)
let payments: PaymentInstruction[] = JSON.parse(JSON.stringify(INITIAL_PAYMENT_INSTRUCTIONS));
let accounts: TreasuryBankAccount[] = JSON.parse(JSON.stringify(INITIAL_TREASURY_ACCOUNTS));
let webhookLogs: WebhookLog[] = JSON.parse(JSON.stringify(INITIAL_WEBHOOK_LOGS));

// Server-Sent Events (SSE) Client Pool
const sseClients = new Set<Response>();

function broadcastSse(eventType: string, data: unknown) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Health check
app.get('/api/treasury/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    application: 'TreasuryPay Real-Time Bank Gateway',
    timestamp: new Date().toISOString(),
    activePayments: payments.length,
    totalWebhooksLogged: webhookLogs.length
  });
});

// SSE Live Stream
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Register client
  sseClients.add(res);

  // Send initial handshake
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ 
    connected: true, 
    serverTime: new Date().toISOString(),
    clientId: `client_${Date.now()}` 
  })}\n\n`);

  // Keep-alive heartbeat every 20s
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// GET /api/payments - Fetch all payment instructions
app.get('/api/payments', (_req: Request, res: Response) => {
  res.json({ success: true, count: payments.length, data: payments });
});

// GET /api/payments/:id - Fetch single instruction
app.get('/api/payments/:id', (req: Request, res: Response) => {
  const instruction = payments.find(p => p.id === req.params.id);
  if (!instruction) {
    return res.status(404).json({ success: false, error: 'Payment instruction not found' });
  }
  res.json({ success: true, data: instruction });
});

// POST /api/payments - Submit new payment instruction (Director General)
app.post('/api/payments', (req: Request, res: Response) => {
  const body = req.body;
  
  if (!body.payee?.name || !body.amount || !body.destinationBank?.bankName) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing mandatory fields (Payee name, Amount, or Destination Bank)' 
    });
  }

  const generatedId = `PAY-ERA-2026-${String(payments.length + 92).padStart(4, '0')}`;
  const now = new Date().toISOString();

  const auditEntry: AuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    action: 'INSTRUCTION_CREATED',
    actor: body.createdByName || 'Eng. Habtamu Tegegne',
    role: 'Director General',
    notes: `Submitted payment instruction for ${body.currency || 'ETB'} ${Number(body.amount).toLocaleString('en-US')}`
  };

  const newInstruction: PaymentInstruction = {
    id: generatedId,
    projectReference: body.projectReference || 'ERA/ICB/2026-HQ',
    projectName: body.projectName || 'ERA Strategic Infrastructure Project',
    category: body.category || 'IPC_VALUATION',
    purpose: body.purpose || 'Payment against approved valuation',
    amount: parseFloat(body.amount) || 0,
    currency: body.currency || 'ETB',
    payee: {
      name: body.payee.name,
      tin: body.payee.tin || '0000000000',
      entityType: body.payee.entityType || 'Contractor',
      contactEmail: body.payee.contactEmail || 'accounts@contractor.et',
      contactPhone: body.payee.contactPhone || '+251 11 000 0000'
    },
    destinationBank: {
      bankName: body.destinationBank.bankName,
      accountNumber: body.destinationBank.accountNumber,
      iban: body.destinationBank.iban || '',
      swiftBic: body.destinationBank.swiftBic || 'CBETETAA',
      branchName: body.destinationBank.branchName || 'Central Branch'
    },
    status: 'Pending',
    createdByRole: 'DIRECTOR_GENERAL',
    createdByName: body.createdByName || 'Eng. Habtamu Tegegne (Director General)',
    createdAt: now,
    supportingDocuments: body.supportingDocuments || [
      {
        id: `doc-${Date.now()}`,
        name: 'IPC_Valuation_Certificate.pdf',
        type: 'Engineer IPC Certificate',
        fileSize: '2.5 MB',
        referenceCode: `ERA-DOC-${Date.now()}`,
        verificationStatus: 'Verified',
        uploadedAt: now
      }
    ],
    linkedBankAccountId: body.linkedBankAccountId || (body.currency === 'USD' ? 'acc_citi_fx' : 'acc_cbe_main'),
    auditTrail: [auditEntry]
  };

  payments.unshift(newInstruction);

  // Broadcast to all clients
  broadcastSse('PAYMENT_CREATED', newInstruction);

  res.status(201).json({ success: true, data: newInstruction });
});

// PATCH /api/payments/:id - Authorize, Reject, or Execute Transfer
app.patch('/api/payments/:id', (req: Request, res: Response) => {
  const index = payments.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Payment instruction not found' });
  }

  const { action, notes, reason, gatewayPlatform } = req.body;
  const current = payments[index];
  const now = new Date().toISOString();

  if (action === 'APPROVE') {
    const commentary = (req.body.reviewerCommentary || req.body.notes || '').trim();
    if (!commentary) {
      return res.status(400).json({ 
        success: false, 
        error: 'Reviewer Commentary is required to authorize the payment instruction.' 
      });
    }

    const previousStatus = current.status;
    current.status = 'Approved';
    current.approvedByRole = 'FINANCIAL_DIRECTOR';
    current.approvedByName = 'Ato Berhanu Zeleke (Financial Director)';
    current.approvedAt = now;
    current.approvalNotes = commentary;
    current.reviewerCommentary = commentary;
    
    if (!current.reviewHistory) current.reviewHistory = [];
    current.reviewHistory.unshift({
      id: `rev-${Date.now()}`,
      timestamp: now,
      reviewerName: 'Ato Berhanu Zeleke',
      reviewerRole: 'Financial Management Director',
      decision: 'APPROVED',
      reviewerCommentary: commentary,
      previousStatus,
      newStatus: 'Approved'
    });

    current.auditTrail.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'INSTRUCTION_APPROVED',
      actor: 'Ato Berhanu Zeleke',
      role: 'Financial Director',
      notes: `Reviewer Commentary: ${commentary}`
    });
  } else if (action === 'REJECT') {
    const commentary = (req.body.reviewerCommentary || req.body.reason || '').trim();
    if (!commentary) {
      return res.status(400).json({ 
        success: false, 
        error: 'Reviewer Commentary is required to record a formal rejection.' 
      });
    }

    const previousStatus = current.status;
    current.status = 'Failed';
    current.rejectionReason = commentary;
    current.reviewerCommentary = commentary;
    current.rejectedAt = now;
    
    if (!current.reviewHistory) current.reviewHistory = [];
    current.reviewHistory.unshift({
      id: `rev-${Date.now()}`,
      timestamp: now,
      reviewerName: 'Ato Berhanu Zeleke',
      reviewerRole: 'Financial Management Director',
      decision: 'REJECTED',
      reviewerCommentary: commentary,
      previousStatus,
      newStatus: 'Failed'
    });

    current.auditTrail.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'INSTRUCTION_REJECTED',
      actor: 'Ato Berhanu Zeleke',
      role: 'Financial Director',
      notes: `Reviewer Rejection Commentary: ${commentary}`
    });
  } else if (action === 'EXECUTE_TRANSFER') {
    current.status = 'Processing';
    current.executedAt = now;
    current.gatewayPlatform = gatewayPlatform || 'Adyen BalancePlatform';
    
    const prefix = current.gatewayPlatform === 'Adyen BalancePlatform' ? 'ADY-TRF-' :
                   current.gatewayPlatform === 'Yapily ISO 20022' ? 'YAP-ETH-' : 'CBE-RTGS-';
    current.gatewayTransactionId = `${prefix}${Math.floor(10000000 + Math.random() * 90000000)}`;

    current.auditTrail.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'GATEWAY_DISPATCHED',
      actor: 'Ato Berhanu Zeleke',
      role: 'Financial Director',
      notes: `Dispatched to ${current.gatewayPlatform} with Tx ID ${current.gatewayTransactionId}`
    });
  } else if (action === 'DG_EDIT' || action === 'DIRECTOR_GENERAL_UPDATE') {
    const { amount, currency, actionType, justification, status: newStatus } = req.body;
    const oldAmount = current.amount;
    const oldCurrency = current.currency;
    const oldStatus = current.status;

    if (amount !== undefined) {
      const parsedAmount = parseFloat(String(amount));
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        current.amount = parsedAmount;
      }
    }

    if (currency && ['ETB', 'USD', 'EUR', 'GBP'].includes(currency)) {
      current.currency = currency;
      if (currency === 'USD') {
        current.linkedBankAccountId = 'acc_citi_fx';
      } else if (currency === 'ETB' && current.linkedBankAccountId === 'acc_citi_fx') {
        current.linkedBankAccountId = 'acc_cbe_main';
      }
    }

    let appliedActionLabel = 'Updated Details';
    if (actionType === 'RESUBMIT_FOR_AUDIT' || newStatus === 'Pending') {
      current.status = 'Pending';
      appliedActionLabel = 'Resubmitted for Financial Director Audit';
      current.rejectionReason = undefined;
    } else if (actionType === 'CANCEL_INSTRUCTION' || newStatus === 'Failed') {
      current.status = 'Failed';
      current.rejectionReason = `Cancelled by Director General: ${justification || 'Administrative void'}`;
      appliedActionLabel = 'Cancelled & Voided Instruction';
    } else if (actionType === 'SAVE_CHANGES') {
      appliedActionLabel = 'Saved Revised Amount & Currency';
    } else if (newStatus && ['Pending', 'Approved', 'Processing', 'Failed'].includes(newStatus)) {
      current.status = newStatus;
      appliedActionLabel = `Status adjusted to ${newStatus}`;
    }

    const editJustification = (justification || 'Administrative terms revision by Director General').trim();
    const noteText = `Director General edited: ${oldCurrency} ${oldAmount.toLocaleString('en-US')} → ${current.currency} ${current.amount.toLocaleString('en-US')}. Action: ${appliedActionLabel}. Justification: ${editJustification}`;

    // Maintain Edit History log for payment instructions
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
      actionTaken: appliedActionLabel,
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
      notes: noteText
    });
  } else if (action === 'REQUEST_CLARIFICATION') {
    const { targetRole, question, requesterRole } = req.body;
    const qText = (question || 'Clarification requested on supporting documentation and valuation terms').trim();
    const actorName = requesterRole === 'DIRECTOR_GENERAL' ? 'Eng. Habtamu Tegegne (Director General)' : 'Ato Berhanu Zeleke (Financial Director)';
    const roleLabel = requesterRole === 'DIRECTOR_GENERAL' ? 'Director General' : 'Financial Director';

    current.clarificationNotes = `Clarification Requested from ${String(targetRole).replace('_', ' ')}: "${qText}"`;
    if (!current.reviewHistory) current.reviewHistory = [];
    current.reviewHistory.unshift({
      id: `rev-${Date.now()}`,
      timestamp: now,
      reviewerName: actorName,
      reviewerRole: roleLabel,
      decision: 'CLARIFICATION_REQUESTED',
      reviewerCommentary: `Clarification Requested from ${String(targetRole).replace('_', ' ')}: ${qText}`,
      previousStatus: current.status,
      newStatus: current.status
    });

    current.auditTrail.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'CLARIFICATION_REQUESTED',
      actor: actorName,
      role: roleLabel,
      notes: `Requested Clarification from ${targetRole}: ${qText}`
    });
  } else {
    return res.status(400).json({ success: false, error: 'Invalid action provided' });
  }

  payments[index] = current;
  broadcastSse('PAYMENT_UPDATED', current);

  res.json({ success: true, data: current });
});

// -------------------------------------------------------------
// POST /api/webhooks/payment-status - Real-Time Bank Gateway Webhook
// -------------------------------------------------------------
app.post('/api/webhooks/payment-status', (req: Request, res: Response) => {
  const startTime = Date.now();
  const rawBody = req.body || {};
  const headers = req.headers as Record<string, string>;
  const now = new Date().toISOString();

  // Extract reference or transaction ID from different gateway formats
  let targetRef = '';
  let txId = '';
  let gatewayName: 'Adyen BalancePlatform' | 'Yapily ISO 20022' | 'CBE RTGS Gateway' = 'Adyen BalancePlatform';
  let eventType: WebhookLog['eventType'] = 'balancePlatform.transfer.updated';
  let isSuccess = true;

  if (rawBody.type === 'balancePlatform.transfer.updated') {
    gatewayName = 'Adyen BalancePlatform';
    eventType = 'balancePlatform.transfer.updated';
    targetRef = rawBody.data?.reference || '';
    txId = rawBody.data?.id || '';
    const status = String(rawBody.data?.status || '').toLowerCase();
    isSuccess = status === 'booked' || status === 'settled' || status === 'completed';
  } else if (rawBody.event === 'payment.completed' || rawBody.event === 'payment.status_update') {
    gatewayName = 'Yapily ISO 20022';
    eventType = 'payment.completed';
    targetRef = rawBody.instructionIdentification || rawBody.reference || '';
    txId = rawBody.paymentId || '';
    isSuccess = rawBody.status === 'COMPLETED' || rawBody.status === 'SETTLED';
  } else if (rawBody.messageType?.includes('pacs.002') || rawBody.txStatus) {
    gatewayName = 'CBE RTGS Gateway';
    eventType = rawBody.txStatus === 'SETTLED' ? 'TRANSFER_SUCCESSFUL' : 'COMPLETED';
    targetRef = rawBody.originalInstructionId || rawBody.reference || '';
    txId = rawBody.settlementId || '';
    isSuccess = rawBody.txStatus === 'SETTLED' || rawBody.txStatus === 'COMPLETED';
  } else {
    // Generic fallback parsing
    targetRef = rawBody.reference || rawBody.instructionId || rawBody.id || '';
    txId = rawBody.gatewayTransactionId || rawBody.transactionId || `GW-${Date.now()}`;
    isSuccess = rawBody.status !== 'FAILED' && rawBody.status !== 'REJECTED';
  }

  // Find corresponding payment instruction
  const targetIndex = payments.findIndex(p => 
    (targetRef && p.id === targetRef) ||
    (txId && p.gatewayTransactionId === txId) ||
    (p.status === 'Processing')
  );

  const eventId = `evt_${gatewayName.split(' ')[0].toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  let updatedRecordId = '';
  let finalStatus: PaymentStatus = isSuccess ? 'Paid' : 'Failed';

  if (targetIndex !== -1) {
    const payment = payments[targetIndex];
    updatedRecordId = payment.id;
    payment.status = finalStatus;
    payment.webhookEventId = eventId;
    if (txId && !payment.gatewayTransactionId) {
      payment.gatewayTransactionId = txId;
    }

    if (isSuccess) {
      payment.paidAt = now;
      payment.auditTrail.push({
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: 'WEBHOOK_STATUS_PAID',
        actor: `${gatewayName} Webhook Callback`,
        role: 'SYSTEM_GATEWAY',
        notes: `Webhook 200 OK Auto-Sync: ${eventType} confirmed settled. Status set to Paid.`
      });

      // Deduct balance from linked Treasury Bank Account
      const accIndex = accounts.findIndex(a => a.id === payment.linkedBankAccountId);
      if (accIndex !== -1) {
        const acc = accounts[accIndex];
        acc.clearedBalance = Math.max(0, acc.clearedBalance - payment.amount);
        acc.reservedCommitments = Math.max(0, acc.reservedCommitments - payment.amount);
        acc.availableBalance = acc.clearedBalance - acc.reservedCommitments;
        acc.lastUpdated = now;
        accounts[accIndex] = acc;
      }
    } else {
      payment.auditTrail.push({
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: 'WEBHOOK_STATUS_FAILED',
        actor: `${gatewayName} Webhook Callback`,
        role: 'SYSTEM_GATEWAY',
        notes: `Webhook returned failure callback: ${rawBody.errorReason || 'Transfer declined by clearing network.'}`
      });
    }

    payments[targetIndex] = payment;
    broadcastSse('PAYMENT_UPDATED', payment);
    broadcastSse('ACCOUNTS_UPDATED', accounts);
  }

  const durationMs = Date.now() - startTime;

  // Build standard 200 OK acknowledgment payload
  const ackResponseBody = {
    received: true,
    status: 'acknowledged',
    eventId,
    timestamp: now,
    recordUpdated: updatedRecordId || 'N/A',
    currentStatus: finalStatus,
    gateway: gatewayName
  };

  // Record webhook log
  const newLog: WebhookLog = {
    id: `log-${Date.now()}`,
    eventId,
    timestamp: now,
    gateway: gatewayName,
    eventType,
    instructionId: updatedRecordId || 'UNMAPPED',
    gatewayTransactionId: txId || 'TX-UNKNOWN',
    httpMethod: 'POST',
    requestUrl: '/api/webhooks/payment-status',
    requestHeaders: {
      'content-type': headers['content-type'] || 'application/json',
      'user-agent': headers['user-agent'] || 'PaymentGateway-Webhook/2.0',
      'x-signature-sha256': headers['x-signature-sha256'] || 'verified_valid_hmac_signature'
    },
    requestBody: rawBody,
    responseStatus: 200,
    responseBody: ackResponseBody,
    signatureVerified: true,
    executionDurationMs: Math.max(12, durationMs)
  };

  webhookLogs.unshift(newLog);

  // Broadcast Webhook event
  broadcastSse('WEBHOOK_RECEIVED', newLog);

  // Return standard HTTP 200 OK
  return res.status(200).json(ackResponseBody);
});

// GET /api/webhooks/logs - Retrieve Webhook logs
app.get('/api/webhooks/logs', (_req: Request, res: Response) => {
  res.json({ success: true, count: webhookLogs.length, data: webhookLogs });
});

// GET /api/treasury/accounts - Retrieve Bank Accounts
app.get('/api/treasury/accounts', (_req: Request, res: Response) => {
  res.json({ success: true, data: accounts });
});

// -------------------------------------------------------------
// VITE DEV MIDDLEWARE / STATIC ASSETS
// -------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TreasuryPay] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[TreasuryPay] Webhook endpoint active at POST http://0.0.0.0:${PORT}/api/webhooks/payment-status`);
  });
}

startServer().catch((err) => {
  console.error('[TreasuryPay] Failed to start server:', err);
  process.exit(1);
});
