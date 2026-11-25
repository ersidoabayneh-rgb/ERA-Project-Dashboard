import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let configuredProjectId: string | undefined;
let configuredDbId: string | undefined;
try {
  const cfgPath = path.resolve(__dirname, '../../firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    if (cfg?.projectId && cfg.projectId !== 'remixed-project-id') {
      configuredProjectId = cfg.projectId;
    }
    if (cfg?.firestoreDatabaseId && cfg.firestoreDatabaseId !== '(default)' && cfg.firestoreDatabaseId !== 'remixed-firestore-database-id') {
      configuredDbId = cfg.firestoreDatabaseId;
    }
  }
} catch {}

const adminApp = getApps().length
  ? getApp()
  : initializeApp(configuredProjectId ? { projectId: configuredProjectId } : undefined);
const adminDb = configuredDbId ? getFirestore(adminApp, configuredDbId) : getFirestore(adminApp);

export interface DecodedIdToken {
  uid: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth(adminApp).verifyIdToken(token);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

export const checkRole = (allowedRoles: string[]) => async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userRole = userDoc.data()?.role;
    if (allowedRoles.includes(userRole)) {
      req.user = { ...req.user, uid, role: userRole };
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
