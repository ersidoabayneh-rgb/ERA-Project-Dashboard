import type { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
admin.initializeApp();

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
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return _res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    _res.status(401).json({ error: 'Unauthorized' });
  }
};

export const checkRole = (allowedRoles: string[]) => async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const userDoc = await getFirestore().collection('users').doc(uid).get();
    const userRole = userDoc.data()?.role;
    if (allowedRoles.includes(userRole)) {
      req.user = { ...req.user, role: userRole };
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
