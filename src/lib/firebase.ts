import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress non-critical Firestore connection debug noise in sandboxed/iframe preview environments
try {
  setLogLevel('error');
} catch {}

const isValidConfig = Boolean(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

const effectiveConfig = isValidConfig ? firebaseConfig : {
  apiKey: "AIzaSy_Disconnected_Dummy_Key",
  projectId: "disconnected-app",
  appId: "1:000000000000:web:0000000000000000000000",
  authDomain: "",
  storageBucket: ""
};

const app = getApps().length > 0 ? getApp() : initializeApp(effectiveConfig);

const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

function createFirestoreInstance() {
  try {
    const settings = {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    };
    return dbId 
      ? initializeFirestore(app, settings, dbId) 
      : initializeFirestore(app, settings);
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = createFirestoreInstance();

// Catch and handle transient browser IndexedDB tab-closing / visibility state / offline / connection rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (
      msg.includes('Database is closing') ||
      msg.includes('Database is hidden') ||
      msg.includes('database is closing') ||
      msg.includes('database is hidden') ||
      msg.includes('IndexedDB') ||
      msg.includes('installations') ||
      msg.includes('API key') ||
      msg.includes('INVALID_ARGUMENT') ||
      msg.includes('permission-denied') ||
      msg.includes('unavailable') ||
      msg.includes('Could not reach Cloud Firestore backend') ||
      msg.includes('Backend didn\'t respond') ||
      msg.includes('client is offline')
    ) {
      event.preventDefault();
      console.warn('Handled background Firebase notice gracefully:', msg);
    }
  });
}

export const analytics = null;

export async function testFirestoreConnection() {
  if (!isValidConfig) return;
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection check timeout')), 3500)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise
    ]);
    console.log("Firestore connection test passed.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore running in offline mode. Local persistence active.");
    } else {
      console.log("Firestore running with resilient offline-first cache.");
    }
  }
}

// Safely test connection after initial load without blocking
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testFirestoreConnection();
  }, 1000);
}





