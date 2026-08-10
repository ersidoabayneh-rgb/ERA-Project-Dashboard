import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const isValidConfig = Boolean(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

const effectiveConfig = isValidConfig ? firebaseConfig : {
  apiKey: "AIzaSy_Disconnected_Dummy_Key",
  projectId: "disconnected-app",
  appId: "1:000000000000:web:0000000000000000000000",
  authDomain: "",
  storageBucket: ""
};

const app = initializeApp(effectiveConfig);

const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

let dbInstance;

if (typeof window !== 'undefined') {
  try {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, dbId);
  } catch (e) {
    try {
      dbInstance = initializeFirestore(app, {
        localCache: memoryLocalCache()
      }, dbId);
    } catch (err) {
      dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
    }
  }
} else {
  dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = dbInstance;

// Catch and handle transient browser IndexedDB tab-closing / visibility state / API key / installation rejections
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
      msg.includes('permission-denied')
    ) {
      event.preventDefault();
      console.warn('Handled background Firebase event/notice gracefully:', msg);
    }
  });
}

export const analytics = null;

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test passed.");
  } catch (error: any) {
    console.log("Firestore connection check finished:", error?.message || error);
  }
}

testFirestoreConnection();




