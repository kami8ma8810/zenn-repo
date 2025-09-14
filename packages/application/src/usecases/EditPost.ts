/**
 * 投稿編集ユースケース
 */

import { PostId, UserId } from '@domain/index';
import { PostRepository } from '../ports/PostRepository';
import { StoragePort } from '../ports/StoragePort';

export interface EditPostInput {
  postId: string;
  editorId: string;
  text?: string;
  imageFile?: File | null;
  removeImage?: boolean;
}

export class EditPost {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly storagePort: StoragePort
  ) {}

  async execute(input: EditPostInput): Promise<void> {
    const postId = PostId(input.postId);
    const editorId = UserId(input.editorId);
    
    // 既存の投稿を取得
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new Error('投稿が見つかりません');
    }
    
    // 画像の処理
    let imageUrl: string | null | undefined = undefined;
    
    if (input.removeImage) {
      // 画像を削除
      if (post.imageUrl) {
        await this.storagePort.deletePostImage(postId);
      }
      imageUrl = null;
    } else if (input.imageFile) {
      // 新しい画像をアップロード
      if (post.imageUrl) {
        await this.storagePort.deletePostImage(postId);
      }
      imageUrl = await this.storagePort.uploadPostImage(postId, input.imageFile);
    }
    
    // ドメインオブジェクトの編集
    post.edit(
      editorId,
      {
        text: input.text,
        imageUrl
      },
      new Date()
    );
    
    // 永続化
    await this.postRepository.save(post);
  }
}