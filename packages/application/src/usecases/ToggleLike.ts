/**
 * いいね切り替えユースケース
 */

import { Like, PostId, UserId } from '@domain/index';
import { PostRepository } from '../ports/PostRepository';
import { LikeRepository } from '../ports/LikeRepository';

export interface ToggleLikeInput {
  userId: string;
  postId: string;
}

export interface ToggleLikeOutput {
  liked: boolean;
}

export class ToggleLike {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly likeRepository: LikeRepository
  ) {}

  async execute(input: ToggleLikeInput): Promise<ToggleLikeOutput> {
    const userId = UserId(input.userId);
    const postId = PostId(input.postId);
    
    // 投稿の存在確認
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new Error('投稿が見つかりません');
    }
    
    // 既存のいいねを確認
    const existingLike = await this.likeRepository.findByUserAndPost(userId, postId);
    
    if (existingLike) {
      // いいねを取り消し
      await this.likeRepository.delete(userId, postId);
      post.applyLikeCountDelta(-1);
      await this.postRepository.save(post);
      
      return { liked: false };
    } else {
      // いいねを追加
      const like = Like.create(userId, postId, new Date());
      await this.likeRepository.save(like);
      post.applyLikeCountDelta(1);
      await this.postRepository.save(post);
      
      return { liked: true };
    }
  }
}