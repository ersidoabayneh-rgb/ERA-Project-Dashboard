import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let db: any = null;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    let app;
    if (getApps().length === 0) {
      app = initializeApp({
        projectId: config.projectId,
      });
    } else {
      app = getApp();
    }
    
    // Initialize Firestore
    if (config.firestoreDatabaseId) {
      db = getFirestore(app, config.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
    
    console.log(`✅ [Firebase Admin SDK Initialized]: Connected to Firestore Database: ${config.firestoreDatabaseId || '(default)'}`);
  } else {
    console.warn('⚠️ [Firebase Admin]: firebase-applet-config.json not found in root.');
  }
} catch (err: any) {
  console.error('❌ [Firebase Admin Initialization Error]:', err?.message || err);
}

export { db };
