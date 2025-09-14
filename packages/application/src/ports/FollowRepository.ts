/**
 * フォロー関係リポジトリのポート定義
 */

import { FollowRelation, UserId, FollowId } from '@domain/index';

export interface FollowRepository {
  save(follow: FollowRelation): Promise<void>;
  findById(id: FollowId): Promise<FollowRelation | null>;
  findByFollowerAndFollowee(followerId: UserId, followeeId: UserId): Promise<FollowRelation | null>;
  findFollowees(followerId: UserId): Promise<UserId[]>;
  findFollowers(followeeId: UserId): Promise<UserId[]>;
  delete(id: FollowId): Promise<void>;
  exists(followerId: UserId, followeeId: UserId): Promise<boolean>;
}