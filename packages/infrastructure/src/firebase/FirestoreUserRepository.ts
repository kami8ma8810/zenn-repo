/**
 * Firestore実装のユーザーリポジトリ
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { User, UserId } from '@domain/index';
import { UserRepository } from '@application/ports/UserRepository';
import { getFirebaseFirestore } from './config';

export class FirestoreUserRepository implements UserRepository {
  private readonly collectionName = 'users';

  async save(user: User): Promise<void> {
    const db = getFirebaseFirestore();
    const docRef = doc(db, this.collectionName, user.id as string);
    
    const data = this.toFirestoreData(user);
    await setDoc(docRef, data, { merge: true });
  }

  async findById(id: UserId): Promise<User | null> {
    const db = getFirebaseFirestore();
    const docRef = doc(db, this.collectionName, id as string);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return this.fromFirestoreData(id, snapshot.data());
  }

  async findByEmail(email: string): Promise<User | null> {
    const db = getFirebaseFirestore();
    const q = query(
      collection(db, this.collectionName),
      where('email', '==', email)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return this.fromFirestoreData(UserId(doc.id), doc.data());
  }

  async exists(id: UserId): Promise<boolean> {
    const db = getFirebaseFirestore();
    const docRef = doc(db, this.collectionName, id as string);
    const snapshot = await getDoc(docRef);
    
    return snapshot.exists();
  }

  /**
   * ドメインオブジェクトをFirestoreデータに変換
   */
  private toFirestoreData(user: User): DocumentData {
    return {
      displayName: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
      bio: user.bio,
      createdAt: Timestamp.fromDate(user.createdAt),
      updatedAt: Timestamp.fromDate(user.updatedAt)
    };
  }

  /**
   * FirestoreデータをドメインオブジェクトIn変換
   */
  private fromFirestoreData(id: UserId, data: DocumentData): User {
    return User.reconstruct(
      id,
      data.displayName,
      data.photoURL ?? null,
      data.email,
      data.bio ?? '',
      data.createdAt?.toDate() ?? new Date(),
      data.updatedAt?.toDate() ?? new Date()
    );
  }
}