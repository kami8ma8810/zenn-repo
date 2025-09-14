/**
 * いいねリポジトリのポート定義
 */

import { Like, UserId, PostId } from '@domain/index';

export interface LikeRepository {
  save(like: Like): Promise<void>;
  findByUserAndPost(userId: UserId, postId: PostId): Promise<Like | null>;
  countByPost(postId: PostId): Promise<number>;
  delete(userId: UserId, postId: PostId): Promise<void>;
  exists(userId: UserId, postId: PostId): Promise<boolean>;
}