import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
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
