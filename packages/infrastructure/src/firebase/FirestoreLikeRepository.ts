/**
 * Firestore実装のいいねリポジトリ
 */

import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { Like, UserId, PostId } from '@domain/index';
import { LikeRepository } from '@application/ports/LikeRepository';
import { getFirebaseFirestore } from './config';

export class FirestoreLikeRepository implements LikeRepository {
  /**
   * いいねは /likes/{postId}/by/{userId} として保存
   */
  private getDocPath(postId: string, userId: string): string {
    return `likes/${postId}/by/${userId}`;
  }

  async save(like: Like): Promise<void> {
    const db = getFirebaseFirestore();
    const docPath = this.getDocPath(
      like.postId as string,
      like.userId as string
    );
    const docRef = doc(db, docPath);
    
    const data = {
      createdAt: Timestamp.fromDate(like.createdAt)
    };
    
    await setDoc(docRef, data);
  }

  async findByUserAndPost(
    userId: UserId,
    postId: PostId
  ): Promise<Like | null> {
    const db = getFirebaseFirestore();
    const docPath = this.getDocPath(
      postId as string,
      userId as string
    );
    const docRef = doc(db, docPath);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data();
    
    return Like.reconstruct(
      userId,
      postId,
      data.createdAt?.toDate() ?? new Date()
    );
  }

  async countByPost(postId: PostId): Promise<number> {
    const db = getFirebaseFirestore();
    const likesRef = collection(db, `likes/${postId as string}/by`);
    const snapshot = await getDocs(likesRef);
    
    return snapshot.size;
  }

  async delete(userId: UserId, postId: PostId): Promise<void> {
    const db = getFirebaseFirestore();
    const docPath = this.getDocPath(
      postId as string,
      userId as string
    );
    const docRef = doc(db, docPath);
    
    await deleteDoc(docRef);
  }

  async exists(userId: UserId, postId: PostId): Promise<boolean> {
    const db = getFirebaseFirestore();
    const docPath = this.getDocPath(
      postId as string,
      userId as string
    );
    const docRef = doc(db, docPath);
    const snapshot = await getDoc(docRef);
    
    return snapshot.exists();
  }
}