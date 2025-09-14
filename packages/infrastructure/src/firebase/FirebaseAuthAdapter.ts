/**
 * Firebase Authentication アダプタ
 */

import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirebaseAuth } from './config';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export class FirebaseAuthAdapter {
  /**
   * Googleでサインイン
   */
  async signInWithGoogle(): Promise<AuthUser> {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    
    const result = await signInWithPopup(auth, provider);
    
    return this.toAuthUser(result.user);
  }

  /**
   * サインアウト
   */
  async signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  }

  /**
   * 現在のユーザーを取得
   */
  getCurrentUser(): AuthUser | null {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }
    
    return this.toAuthUser(user);
  }

  /**
   * 認証状態の変更を監視
   */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    const auth = getFirebaseAuth();
    
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        callback(this.toAuthUser(firebaseUser));
      } else {
        callback(null);
      }
    });
  }

  /**
   * FirebaseユーザーをAuthUserに変換
   */
  private toAuthUser(firebaseUser: FirebaseUser): AuthUser {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL
    };
  }
}