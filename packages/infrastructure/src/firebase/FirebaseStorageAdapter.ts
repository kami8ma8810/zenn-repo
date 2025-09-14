/**
 * Firebase Storage実装のストレージアダプタ
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { PostId, UserId } from '@domain/index';
import { StoragePort } from '@application/ports/StoragePort';
import { getFirebaseStorage } from './config';

export class FirebaseStorageAdapter implements StoragePort {
  async uploadPostImage(postId: PostId, file: File): Promise<string> {
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, `posts/${postId as string}/image`);
    
    // ファイルをアップロード
    await uploadBytes(storageRef, file);
    
    // ダウンロードURLを取得
    const url = await getDownloadURL(storageRef);
    
    return url;
  }

  async uploadUserAvatar(userId: UserId, file: File): Promise<string> {
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, `users/${userId as string}/avatar`);
    
    // ファイルをアップロード
    await uploadBytes(storageRef, file);
    
    // ダウンロードURLを取得
    const url = await getDownloadURL(storageRef);
    
    return url;
  }

  async deletePostImage(postId: PostId): Promise<void> {
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, `posts/${postId as string}/image`);
    
    try {
      await deleteObject(storageRef);
    } catch (error: unknown) {
      // ファイルが存在しない場合はエラーを無視
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code !== 'storage/object-not-found') {
          throw error;
        }
      }
    }
  }

  async deleteUserAvatar(userId: UserId): Promise<void> {
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, `users/${userId as string}/avatar`);
    
    try {
      await deleteObject(storageRef);
    } catch (error: unknown) {
      // ファイルが存在しない場合はエラーを無視
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code !== 'storage/object-not-found') {
          throw error;
        }
      }
    }
  }
}