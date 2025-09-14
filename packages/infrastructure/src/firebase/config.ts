/**
 * Firebase設定
 * 環境変数または直接設定から初期化
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { connectAuthEmulator } from 'firebase/auth';

// Firebase設定（環境変数から取得、または直接設定）
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID ?? 'demo-project',
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo-project.appspot.com',
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '123456789',
  appId: import.meta.env?.VITE_FIREBASE_APP_ID ?? '1:123456789:web:abc123'
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

/**
 * Firebase初期化
 */
export function initializeFirebase(): void {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // エミュレータ接続（開発環境の場合）
    if (import.meta.env?.VITE_USE_EMULATOR === 'true' || firebaseConfig.projectId === 'demo-project') {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
    }
  }
}

export function getFirebaseAuth(): Auth {
  if (!auth) initializeFirebase();
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!db) initializeFirebase();
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) initializeFirebase();
  return storage;
}