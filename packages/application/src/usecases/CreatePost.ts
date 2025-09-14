/**
 * 投稿作成ユースケース
 * DDDにおけるアプリケーションサービスの実装例
 */

import { nanoid } from 'nanoid';
import { Post, PostId, UserId } from '@domain/index';
import { PostRepository } from '../ports/PostRepository';
import { StoragePort } from '../ports/StoragePort';

export interface CreatePostInput {
  authorId: string;
  text: string;
  imageFile?: File | null;
}

export interface CreatePostOutput {
  postId: string;
}

export class CreatePost {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly storagePort: StoragePort
  ) {}

  async execute(input: CreatePostInput): Promise<CreatePostOutput> {
    // ID生成
    const postId = PostId(nanoid());
    const authorId = UserId(input.authorId);
    
    // 画像のアップロード
    let imageUrl: string | null = null;
    if (input.imageFile) {
      imageUrl = await this.storagePort.uploadPostImage(postId, input.imageFile);
    }
    
    // ドメインオブジェクトの生成
    const post = Post.create({
      id: postId,
      authorId,
      text: input.text,
      imageUrl,
      now: new Date()
    });
    
    // 永続化
    await this.postRepository.save(post);
    
    return {
      postId: postId as string
    };
  }
}