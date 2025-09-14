/**
 * いいねエンティティ
 * UserId x PostId のユニーク制約を表現
 */

import { UserId, PostId } from '../shared/ids';

export class Like {
  private constructor(
    readonly userId: UserId,
    readonly postId: PostId,
    readonly createdAt: Date
  ) {}

  /**
   * ファクトリメソッド: 新規いいね作成
   */
  static create(userId: UserId, postId: PostId, now: Date): Like {
    return new Like(userId, postId, now);
  }

  /**
   * 再構築用ファクトリ
   */
  static reconstruct(userId: UserId, postId: PostId, createdAt: Date): Like {
    return new Like(userId, postId, createdAt);
  }

  /**
   * いいね解除可能かチェック
   */
  canUnlike(by: UserId): boolean {
    return by === this.userId;
  }
}