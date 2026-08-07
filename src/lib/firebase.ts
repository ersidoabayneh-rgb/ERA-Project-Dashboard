import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Firebase Firestore offline persistence using IndexedDB
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open; attempt multi-tab persistence fallback if supported
      console.warn('Firestore single-tab persistence warning: Multiple tabs open. Attempting multi-tab enablement...');
      enableMultiTabIndexedDbPersistence(db).catch((multiErr) => {
        console.warn('Firestore multi-tab persistence fallback notice:', multiErr?.message || multiErr);
      });
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore offline persistence is not supported by this browser environment.');
    } else {
      console.warn('Firestore offline persistence initialization notice:', err?.message || err);
    }
  });
}

export let analytics: any = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (err) {
        console.warn("Analytics initialization notice:", err);
      }
    }
  }).catch(() => {});
}

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test passed.");
  } catch (error: any) {
    // If doc doesn't exist or permission issues occur, log debug info without failing app state
    console.log("Firestore connection check finished:", error?.message || error);
  }
}

testFirestoreConnection();


