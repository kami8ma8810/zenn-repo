/**
 * ユーザーフォローユースケース
 */

import { nanoid } from 'nanoid';
import { FollowRelation, FollowId, UserId } from '@domain/index';
import { FollowRepository } from '../ports/FollowRepository';
import { UserRepository } from '../ports/UserRepository';

export interface FollowUserInput {
  followerId: string;
  followeeId: string;
}

export class FollowUser {
  constructor(
    private readonly followRepository: FollowRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(input: FollowUserInput): Promise<void> {
    const followerId = UserId(input.followerId);
    const followeeId = UserId(input.followeeId);
    
    // ユーザーの存在確認
    const [followerExists, followeeExists] = await Promise.all([
      this.userRepository.exists(followerId),
      this.userRepository.exists(followeeId)
    ]);
    
    if (!followerExists) {
      throw new Error('フォロワーが存在しません');
    }
    if (!followeeExists) {
      throw new Error('フォロー対象のユーザーが存在しません');
    }
    
    // 既にフォローしているか確認
    const existingFollow = await this.followRepository.findByFollowerAndFollowee(
      followerId,
      followeeId
    );
    
    if (existingFollow) {
      throw new Error('既にフォローしています');
    }
    
    // フォロー関係の作成
    const followId = FollowId(nanoid());
    const follow = FollowRelation.create(
      followId,
      followerId,
      followeeId,
      new Date()
    );
    
    // 永続化
    await this.followRepository.save(follow);
  }
}