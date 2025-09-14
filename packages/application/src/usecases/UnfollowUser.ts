/**
 * ユーザーアンフォローユースケース
 */

import { UserId } from '@domain/index';
import { FollowRepository } from '../ports/FollowRepository';

export interface UnfollowUserInput {
  followerId: string;
  followeeId: string;
}

export class UnfollowUser {
  constructor(
    private readonly followRepository: FollowRepository
  ) {}

  async execute(input: UnfollowUserInput): Promise<void> {
    const followerId = UserId(input.followerId);
    const followeeId = UserId(input.followeeId);
    
    // フォロー関係を取得
    const follow = await this.followRepository.findByFollowerAndFollowee(
      followerId,
      followeeId
    );
    
    if (!follow) {
      throw new Error('フォロー関係が存在しません');
    }
    
    // アンフォロー権限の確認
    if (!follow.canUnfollow(followerId)) {
      throw new Error('アンフォローする権限がありません');
    }
    
    // フォロー関係の削除
    await this.followRepository.delete(follow.id);
  }
}