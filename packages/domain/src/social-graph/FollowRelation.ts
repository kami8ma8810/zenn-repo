/**
 * フォロー関係集約
 * フォローの重複禁止・自己フォロー禁止などの不変条件を管理
 */

import { UserId, FollowId } from '../shared/ids';

export class FollowRelation {
  private constructor(
    readonly id: FollowId,
    readonly followerId: UserId,
    readonly followeeId: UserId,
    readonly createdAt: Date
  ) {}

  /**
   * ファクトリメソッド: 新規フォロー関係作成
   */
  static create(
    id: FollowId,
    followerId: UserId,
    followeeId: UserId,
    now: Date
  ): FollowRelation {
    // 不変条件: 自己フォロー禁止
    if (followerId === followeeId) {
      throw new Error('自分自身をフォローすることはできません');
    }
    
    return new FollowRelation(id, followerId, followeeId, now);
  }

  /**
   * 再構築用ファクトリ
   */
  static reconstruct(
    id: FollowId,
    followerId: UserId,
    followeeId: UserId,
    createdAt: Date
  ): FollowRelation {
    return new FollowRelation(id, followerId, followeeId, createdAt);
  }

  /**
   * フォロー解除可能かチェック
   */
  canUnfollow(by: UserId): boolean {
    return by === this.followerId;
  }
}