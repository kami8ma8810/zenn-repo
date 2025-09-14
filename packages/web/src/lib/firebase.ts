/**
 * Firebase初期化（Web層）
 */

import { initializeFirebase } from '@infrastructure/firebase/config';

// Viteの環境変数からFirebase設定を取得
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true';

// Firebaseを初期化
initializeFirebase(firebaseConfig, useEmulator);

export { firebaseConfig };