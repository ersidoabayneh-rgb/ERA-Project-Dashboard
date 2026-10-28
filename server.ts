import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createServer as createViteServer } from 'vite';
import { requireAuth, checkRole } from './src/middleware/auth.ts';

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
