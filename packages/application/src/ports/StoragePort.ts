/**
 * ストレージポート定義
 * 画像アップロード等のファイル操作を抽象化
 */

import { PostId, UserId } from '@domain/index';

export interface StoragePort {
  uploadPostImage(postId: PostId, file: File): Promise<string>;
  uploadUserAvatar(userId: UserId, file: File): Promise<string>;
  deletePostImage(postId: PostId): Promise<void>;
  deleteUserAvatar(userId: UserId): Promise<void>;
}