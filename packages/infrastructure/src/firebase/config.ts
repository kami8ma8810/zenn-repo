/**
 * Firebase設定
 * 環境変数または直接設定から初期化
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { connectAuthEmulator } from 'firebase/auth';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let isInitialized = false;

/**
 * Firebase初期化（設定を外部から受け取る）
 */
export function initializeFirebase(config?: FirebaseConfig, useEmulator?: boolean): void {
  if (isInitialized) return;

  // デフォルト設定（開発用）
  const firebaseConfig = config || {
    apiKey: 'demo-api-key',
    authDomain: 'demo.firebaseapp.com',
    projectId: 'demo-project',
    storageBucket: 'demo-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123'
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // エミュレータ接続（開発環境の場合）
  if (useEmulator || firebaseConfig.projectId === 'demo-project') {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
  }

  isInitialized = true;
}

export function getFirebaseAuth(): Auth {
  if (!isInitialized) initializeFirebase();
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!isInitialized) initializeFirebase();
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!isInitialized) initializeFirebase();
  return storage;
}