import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createServer as createViteServer } from 'vite';
import { requireAuth, checkRole } from './src/middleware/auth.ts';
import { GoogleGenAI } from '@google/genai';

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.resolve(__dirname, '.data', 'progress_plan_backups');
if (!fs.existsSync(BACKUP_DIR)) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (e) {}
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Generic health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    application: 'ERA ERP Management System',
    timestamp: new Date().toISOString()
  });
});

// Helper to get GoogleGenAI client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Fallback dynamic contractual & engineering advisor for ERA projects
function generateDynamicAdvisory(prompt: string, projectContext?: any): string {
  const p = (prompt || '').toLowerCase();
  const projName = projectContext?.name || 'Ethiopian Trunk Road Infrastructure Project';
  const contractor = projectContext?.contractor || 'Assigned Prime Contractor';
  const consultant = projectContext?.consultant || 'Assigned Supervision Consultant';
  const physical = projectContext?.physicalProgress !== undefined ? `${projectContext.physicalProgress}%` : 'N/A';
  const planned = projectContext?.plannedProgress !== undefined ? `${projectContext.plannedProgress}%` : 'N/A';
  const slippage = projectContext?.slippage !== undefined ? `${projectContext.slippage}%` : '0%';
  const contractType = projectContext?.contractType || 'FIDIC Red Book (MDB Harmonized)';
  const roadLength = projectContext?.lengthKm ? `${projectContext.lengthKm} KM` : 'Trunk Segment';

  if (p.includes('eot') || p.includes('extension of time') || p.includes('clause 8.4') || p.includes('delay')) {
    return `### ⏱️ FIDIC Sub-Clause 8.4: Extension of Time (EOT) Evaluation Protocol
**Target Project:** ${projName}
**Contract Framework:** ${contractType}

---

#### 📋 Mandatory Criteria for Valid EOT Claims
1. **Sub-Clause 20.1 Strict Condition Precedent:**
   - Formal notice must have been served within **28 days** from the date the Contractor became aware (or should have become aware) of the delay event.
   - Failure to provide notice within 28 days extinguishes Employer liability under standard FIDIC precedent.
2. **Substantiated Contemporary Records (Sub-Clause 20.1):**
   - Daily site diaries, joint weather station logs (rainfall > 10-year return period), and dated photographic evidence certified by the Resident Engineer.
3. **Critical Path Impact Demonstration:**
   - Delay must directly impact the baseline CPM Critical Path. Non-critical path float consumption does not warrant an Extension of Time until total float is depleted to zero.

#### 🛠️ Recommended RE Determination Steps
- **Step 1:** Issue Engineer's Notice of Insufficient Particulars if contemporaneous records are incomplete.
- **Step 2:** Execute a Time-Impact Analysis (TIA) or Collapsed As-Built method using the approved project CPM baseline.
- **Step 3:** Render fair determination under Sub-Clause 3.5 within 42 days of detailed claim receipt.`;
  }

  if (p.includes('audit') || p.includes('health') || p.includes('assessment')) {
    return `### 🏛️ ERA Project Performance & Contract Health Audit
**Project:** ${projName} (${roadLength})
**Contract Framework:** ${contractType}
**Parties:** Employer (ERA) | Contractor (${contractor}) | Consultant (${consultant})

---

#### 📊 1. Progress Trajectory & Schedule Variance
- **Physical Progress Achieved:** **${physical}** vs. Planned: **${planned}**
- **Calculated Slippage:** **${slippage}**
${parseFloat(slippage) < -10 ? '⚠️ **Critical Alert:** Slippage exceeds negative 10% threshold triggering ERA Directive Clause 8.6 Revised Work Programme notice.' : '🟢 Progress is within manageable programmatic tolerances.'}

#### ⚖️ 2. FIDIC Contractual & Operational Chokepoints
1. **Clause 8.3 & 8.6 (Work Programme & Rate of Progress):**
   - The Contractor must immediately submit an updated Critical Path Method (CPM) recovery schedule illustrating revised mobilization of asphalt paving trains and earthwork fleets.
2. **Sub-Clause 14.3 & 14.6 (IPC Turnaround & Cash Flow):**
   - Streamline Resident Engineer interim certification within 28 days to prevent Contractor interest claims under Sub-Clause 14.8.
3. **Sub-Clause 2.1 (Right of Way & Site Possession):**
   - Ensure ERA Right-of-Way (ROW) task force expedites structural and crop compensation to maintain unhindered critical path work fronts.

#### 🎯 3. Actionable Directives for Resident Engineer (RE)
- **Immediate:** Convene a tripartite technical progress steering meeting with Directorate leadership.
- **7-Day Action:** Issue formal Engineer's Instruction on prioritized high-yield embankment and drainage structures.
- **14-Day Action:** Audit consultant submittal logs and enforce 14-day maximum RFI/drawing turnaround SLA.`;
  }

  if (p.includes('payment') || p.includes('ipc') || p.includes('escalation') || p.includes('clause 14')) {
    return `### 💰 Interim Payment Certificate (IPC) & Financial Advisory
**Project:** ${projName} | **Contractor:** ${contractor}

---

#### 📌 FIDIC Sub-Clause 14.3 & 14.6 Review Checklist
1. **Advance Payment Recovery (Sub-Clause 14.2):**
   - Verify amortization deductions commence once cumulative IPC value exceeds 10%–20% of the initial Contract Price, terminating upon total recovery prior to 80% completion.
2. **Retention Money Withholding (Sub-Clause 14.3 & 14.9):**
   - 5% retention per IPC up to maximum 5% of Contract Price. 50% release upon Taking-Over Certificate (Sub-Clause 10.1); remaining 50% upon Performance Certificate.
3. **Price Adjustment / Escalation Formula (Sub-Clause 13.8):**
   - Apply official Central Statistics Agency / National Bank indices for fuel, cement, bitumen, reinforcement steel, and labor.

#### ⚡ Risk Mitigation
- Ensure the Contractor's Advance Payment Guarantee and Performance Security remain valid and unexpired before certifying any interim disbursements.`;
  }

  if (p.includes('row') || p.includes('right of way') || p.includes('compensation') || p.includes('obstruction')) {
    return `### 🚧 Right-of-Way (ROW) Clearance & Site Handover Protocol
**Project:** ${projName} (${roadLength})

---

#### 📜 Contractual Standing (Sub-Clause 2.1 - Right of Access to the Site)
- The Employer is obligated to grant the Contractor right of access to and possession of the site within specified timing.
- Unresolved utility lines (EEU power poles, Ethio Telecom cables, municipal water lines) or unpaid property compensations that halt the critical path entitle the Contractor to EOT and reasonable Cost under Sub-Clause 2.1.

#### 🛡️ Recommended Mitigations
1. **Segmental Handover:** Execute sectional site handovers where alignment is cleared, issuing formal instructions to re-sequence earthworks.
2. **Joint ROW Taskforce:** Coordinate with regional Woreda administration, utility liaison officers, and ERA ROW Directorate to fast-track compensation verification.
3. **Mitigation of Losses:** Instruct the Contractor under Sub-Clause 8.4 to reallocate idle heavy plant (graders, excavators, dump trucks) to cleared sub-base and structural culvert segments.`;
  }

  if (p.includes('notice') || p.includes('letter') || p.includes('warning') || p.includes('clause 15')) {
    return `### ✉️ Formal Contractual Notice Template
**Reference:** Notice under Sub-Clause 8.6 / 15.1 of FIDIC Conditions of Contract
**Project:** ${projName}
**To:** The Contractor (${contractor})
**From:** The Resident Engineer (${consultant})

---

**SUBJECT: NOTICE TO CORRECT — RATE OF PROGRESS & PROGRAMME REVISION (SUB-CLAUSE 8.6)**

Dear Sir/Madam,

Reference is made to the approved Works Programme and the cumulative progress review conducted for the month ending recently. 

1. **Deficiency Observed:** The current physical progress of **${physical}** substantially lags behind the baseline scheduled target of **${planned}**, representing an unacceptable slippage of **${slippage}**.
2. **Contractual Directive:** Pursuant to **Sub-Clause 8.6 [Rate of Progress]**, you are hereby formally instructed to:
   - Within **14 days** of this notice, submit a revised CPM Work Programme showing the expedited methods, additional equipment, and increased manpower necessary to recover lost progress.
   - Deploy additional asphalt concrete paving trains and dedicated aggregate crushing plant without entitlement to additional cost.
3. **Failure to Comply:** Be advised that continued failure to adhere to the revised schedule may constitute a default under **Sub-Clause 15.1 [Notice to Correct]** and will trigger liquidated delay damages under **Sub-Clause 8.7**.

Yours faithfully,  
**Resident Engineer**  
For and on behalf of ${consultant}  
*Cc: Director General, Ethiopian Roads Administration (ERA)*`;
  }

  return `### 🛣️ ERA Senior Engineering & Contract Advisory
**Project:** ${projName} | **Contract Framework:** ${contractType}
**Query:** "${prompt.trim()}"

---

#### 📌 Contractual Perspective & FIDIC Provisions
1. **Contract Management Governance:**
   - Under ERA standard conditions (based on FIDIC Red/MDB Harmonized Edition), all formal communications, submittals, and notices must be in writing with contemporary logs maintained in the central ERP register.
2. **Quality Assurance & Specifications:**
   - Ensure all laboratory material testing (CBR values, Marshall stability, aggregate crushing value, bitumen penetration grade) strictly comply with the ERA Standard Technical Specifications (2013/2022).
3. **Submittal Turnaround SLAs:**
   - Supervision consultant must evaluate Requests for Inspection (RFIs), Method Statements, and Working Drawings within the contractual 14-calendar-day window to prevent delay claims.
4. **Dispute Avoidance:**
   - Utilize regular tripartite joint progress audits and early warning mechanisms (Clause 8.3) to resolve site impediments before escalating to Dispute Board (DAB) proceedings under Clause 20.

*Consult the Directorate Admin or Chief Engineer for project-specific variation approvals exceeding delegated financial limits.*`;
}

// POST /api/gemini - Secure server-side AI engineering assistant
app.post('/api/gemini', async (req: Request, res: Response) => {
  try {
    const { prompt, systemInstruction, projectContext, history } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Valid prompt string is required' });
    }

    const ai = getGeminiClient();

    // If Gemini API is configured with key, call the model
    if (ai) {
      try {
        const sysInstruction = systemInstruction || 
          `You are an expert Chief Resident Engineer and Senior FIDIC Contract Claims Specialist for the Ethiopian Roads Administration (ERA).
You advise Directorate Admins, Resident Engineers, and CPM scheduling specialists on civil highway engineering, ERA Standard Technical Specifications, FIDIC Conditions of Contract (Conditions of Contract for Construction MDB Harmonized Edition / Red Book), BOQ variations, CPM float delays (Clause 8.4), payments (Clause 14), and dispute mitigation.
Always provide structured, clear, professional responses formatted with clean markdown, specific clause references, and practical action plans.`;

        let contents: any[] = [];

        // If conversation history is provided, incorporate recent context
        if (Array.isArray(history) && history.length > 0) {
          const recentHistory = history.slice(-6);
          for (const msg of recentHistory) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: String(msg.content || '') }]
              });
            }
          }
        }

        // Add contextual data if available
        let contextPrefix = '';
        if (projectContext) {
          contextPrefix = `[Current ERA Project Live Context:
Name: ${projectContext.name || 'N/A'}
Contractor: ${projectContext.contractor || 'N/A'}
Consultant: ${projectContext.consultant || 'N/A'}
Contract Type: ${projectContext.contractType || 'FIDIC Red Book'}
Length: ${projectContext.lengthKm || 'N/A'} KM
Physical Progress: ${projectContext.physicalProgress !== undefined ? projectContext.physicalProgress : 'N/A'}%
Planned Progress: ${projectContext.plannedProgress !== undefined ? projectContext.plannedProgress : 'N/A'}%
Slippage: ${projectContext.slippage !== undefined ? projectContext.slippage : 'N/A'}%
Status: ${projectContext.status || 'Active'}
]\n\n`;
        }

        contents.push({
          role: 'user',
          parts: [{ text: `${contextPrefix}User Query: ${prompt.trim()}` }]
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: sysInstruction,
            temperature: 0.3
          }
        });

        const responseText = response.text || '';
        if (responseText) {
          return res.json({ text: responseText, source: 'gemini-3.8-flash' });
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to dynamic advisory:', geminiError?.message || geminiError);
      }
    }

    // Dynamic, high-fidelity engineering fallback
    const dynamicResponse = generateDynamicAdvisory(prompt, projectContext);
    return res.json({ text: dynamicResponse, source: 'dynamic-era-advisory' });
  } catch (err: any) {
    console.error('Error in /api/gemini route:', err);
    return res.status(500).json({ 
      error: 'Failed to process AI chat request', 
      text: generateDynamicAdvisory(req.body?.prompt || '', req.body?.projectContext) 
    });
  }
});

let firestoreAdminDisabled = false;

// Automated Daily Backup API for project progressPlanHistory records (Persistent File & Cloud Storage)
app.post('/api/backup/progress-plan-history', async (req: Request, res: Response) => {
  const { projectId, progressPlanHistory, timestamp, projectName } = req.body;
  if (!projectId || !Array.isArray(progressPlanHistory)) {
    return res.status(400).json({ error: 'Invalid payload. projectId and progressPlanHistory array required.' });
  }
  
  const backupPayload = {
    projectId,
    projectName: projectName || projectId,
    progressPlanHistory,
    backedUpAt: timestamp || new Date().toISOString(),
    recordCount: progressPlanHistory.length
  };

  try {
    // 1. Write to persistent filesystem storage
    const filePath = path.join(BACKUP_DIR, `${projectId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');

    // 2. Also persist in Firestore database if available
    if (!firestoreAdminDisabled) {
      try {
        await db.collection('progress_plan_history_backups').doc(projectId).set(backupPayload, { merge: true });
      } catch (fsErr: any) {
        const msg = fsErr?.message || String(fsErr || '');
        if (msg.includes('PERMISSION_DENIED') || msg.includes('has not been used') || msg.includes('disabled')) {
          firestoreAdminDisabled = true;
          console.info('[ERA Backup] Cloud Firestore API is not enabled on this GCP project; utilizing persistent local disk storage.');
        } else {
          console.warn('[ERA Backup] Firestore history backup notice:', msg);
        }
      }
    }

    res.json({
      success: true,
      projectId,
      recordCount: progressPlanHistory.length,
      backedUpAt: backupPayload.backedUpAt,
      storage: firestoreAdminDisabled ? 'persistent_disk' : 'persistent_disk_and_firestore'
    });
  } catch (err: any) {
    console.error('[ERA Backup] Error saving progress plan history backup:', err);
    res.status(500).json({ error: 'Failed to persist progress plan history backup', details: err?.message });
  }
});

app.get('/api/backup/progress-plan-history/:projectId', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  
  // 1. Try local disk backup first
  const filePath = path.join(BACKUP_DIR, `${projectId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return res.json({ success: true, source: 'disk', ...data });
    } catch (e) {}
  }

  // 2. Fallback to Firestore if enabled
  if (!firestoreAdminDisabled) {
    try {
      const docSnap = await db.collection('progress_plan_history_backups').doc(projectId).get();
      if (docSnap.exists) {
        return res.json({ success: true, source: 'firestore', ...docSnap.data() });
      }
    } catch (e: any) {
      const msg = e?.message || String(e || '');
      if (msg.includes('PERMISSION_DENIED') || msg.includes('has not been used')) {
        firestoreAdminDisabled = true;
      }
    }
  }

  res.status(404).json({ error: 'No persistent backup found for project' });
});

app.post('/api/projects/:projectId/contract-amount', requireAuth, checkRole(['director_general', 'master_admin', 'cpm_admin']), async (req: any, res: Response) => {
  const { projectId } = req.params;
  const { contractAmountEtb } = req.body;
  
  try {
    const projDoc = await db.collection('projects').doc(projectId).get();
    if (projDoc.exists && projDoc.data()?.contractAmountStatus === 'Validated') {
      return res.status(403).json({ error: 'Contract amount is validated and locked against modifications.' });
    }
    await db.collection('projects').doc(projectId).update({
      contractAmountEtb,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: req.user?.uid
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contract amount' });
  }
});

app.post('/api/projects/:projectId/contract-amount/submit', requireAuth, async (req: any, res: Response) => {
  const { projectId } = req.params;
  try {
    await db.collection('projects').doc(projectId).update({
      contractAmountStatus: 'Submitted',
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: req.user?.uid
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit contract amount' });
  }
});

app.post('/api/projects/:projectId/contract-amount/validate', requireAuth, checkRole(['director_general', 'master_admin', 'cpm_admin']), async (req: any, res: Response) => {
  const { projectId } = req.params;
  try {
    await db.collection('projects').doc(projectId).update({
      contractAmountStatus: 'Validated',
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: req.user?.uid
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate contract amount' });
  }
});

app.post('/api/projects/:projectId/supervision-consultant-contracts', requireAuth, async (req: any, res: Response) => {
  const { projectId } = req.params;
  const contract = req.body;
  try {
    const docRef = db.collection('projects').doc(projectId).collection('supervision_consultant_contracts').doc();
    await docRef.set({ ...contract, id: docRef.id, status: 'Draft' });
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add contract' });
  }
});

app.post('/api/projects/:projectId/supervision-consultant-contracts/:contractId/approve', requireAuth, checkRole(['directorate_admin']), async (req: any, res: Response) => {
  const { projectId, contractId } = req.params;
  try {
    await db.collection('projects').doc(projectId).collection('supervision_consultant_contracts').doc(contractId).update({
      status: 'Approved',
      approvedAt: new Date().toISOString(),
      approvedBy: req.user?.uid
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve contract' });
  }
});
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
    console.log(`[ERA ERP] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ERA ERP] Failed to start server:', err);
  process.exit(1);
});
