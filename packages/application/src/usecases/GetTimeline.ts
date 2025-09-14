/**
 * タイムライン取得ユースケース
 */

import { Post, UserId } from '@domain/index';
import { PostRepository } from '../ports/PostRepository';
import { FollowRepository } from '../ports/FollowRepository';

export interface GetTimelineInput {
  userId: string;
  limit?: number;
}

export interface GetTimelineOutput {
  posts: Post[];
}

export class GetTimeline {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly followRepository: FollowRepository
  ) {}

  async execute(input: GetTimelineInput): Promise<GetTimelineOutput> {
    const userId = UserId(input.userId);
    const limit = input.limit ?? 20;
    
    // フォローしているユーザーを取得
    const followeeIds = await this.followRepository.findFollowees(userId);
    
    // 自分自身も含める
    const targetUserIds = [...followeeIds, userId];
    
    // 投稿を取得（Firestoreのin句の制限を考慮）
    // 注意: in句は最大30件までなので、大規模な場合は別の実装が必要
    const posts = await this.postRepository.findByAuthors(
      targetUserIds.slice(0, 30),
      limit
    );
    
    // 作成日時で降順ソート
    posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return {
      posts: posts.slice(0, limit)
    };
  }
}