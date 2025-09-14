/**
 * Firestore実装の投稿リポジトリ
 * ドメインオブジェクトとFirestoreドキュメントのマッピングを担当
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { Post, PostId, UserId } from '@domain/index';
import { PostRepository } from '@application/ports/PostRepository';
import { getFirebaseFirestore } from './config';

export class FirestorePostRepository implements PostRepository {
  private readonly collectionName = 'posts';

  async save(post: Post): Promise<void> {
    const db = getFirebaseFirestore();
    const docRef = doc(db, this.collectionName, post.id as string);
    
    const data = this.toFirestoreData(post);
    await setDoc(docRef, data, { merge: true });
  }

  async findById(id: PostId): Promise<Post | null> {
    const db = getFirebaseFirestore();
    const docRef = doc(db, this.collectionName, id as string);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return this.fromFirestoreData(id, snapshot.data());
  }

  async findByAuthor(authorId: UserId, limit: number = 20): Promise<Post[]> {
    const db = getFirebaseFirestore();
    const q = query(
      collection(db, this.collectionName),
      where('authorId', '==', authorId as string),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      this.fromFirestoreData(PostId(doc.id), doc.data())
    );
  }

  async findByIds(ids: PostId[]): Promise<Post[]> {
    if (ids.length === 0) return [];
    
    const db = getFirebaseFirestore();
    const posts: Post[] = [];
    
    // Firestoreのin句は最大10件までなので、分割して取得
    const chunks = this.chunkArray(ids, 10);
    
    for (const chunk of chunks) {
      const q = query(
        collection(db, this.collectionName),
        where('__name__', 'in', chunk.map(id => id as string))
      );
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        posts.push(this.fromFirestoreData(PostId(doc.id), doc.data()));
      });
    }
    
    return posts;
  }

  async findByAuthors(authorIds: UserId[], limit: number = 20): Promise<Post[]> {
    if (authorIds.length === 0) return [];
    
    const db = getFirebaseFirestore();
    const posts: Post[] = [];
    
    // Firestoreのin句は最大30件までなので、分割して取得
    const chunks = this.chunkArray(authorIds, 30);
    
    for (const chunk of chunks) {
      const q = query(
        collection(db, this.collectionName),
        where('authorId', 'in', chunk.map(id => id as string)),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      );
      
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        posts.push(this.fromFirestoreData(PostId(doc.id), doc.data()));
      });
    }
    
    // 重複を除去して日付順にソート
    const uniquePosts = Array.from(
      new Map(posts.map(p => [p.id, p])).values()
    );
    
    return uniquePosts
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async delete(id: PostId): Promise<void> {
    const db = getFirebaseFirestore();
    const docRef = doc(db, this.collectionName, id as string);
    await deleteDoc(docRef);
  }

  /**
   * ドメインオブジェクトをFirestoreデータに変換
   */
  private toFirestoreData(post: Post): DocumentData {
    return {
      authorId: post.authorId as string,
      text: post.text,
      imageUrl: post.imageUrl,
      likeCount: post.likeCount,
      createdAt: Timestamp.fromDate(post.createdAt),
      updatedAt: Timestamp.fromDate(post.updatedAt)
    };
  }

  /**
   * FirestoreデータをドメインオブジェクトIn変換
   */
  private fromFirestoreData(id: PostId, data: DocumentData): Post {
    return Post.reconstruct(
      id,
      UserId(data.authorId),
      data.text,
      data.imageUrl ?? null,
      data.createdAt?.toDate() ?? new Date(),
      data.updatedAt?.toDate() ?? new Date(),
      data.likeCount ?? 0
    );
  }

  /**
   * 配列を指定サイズのチャンクに分割
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}