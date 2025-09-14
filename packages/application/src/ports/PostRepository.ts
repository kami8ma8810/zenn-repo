/**
 * 投稿リポジトリのポート定義
 * DDDにおけるリポジトリパターンのインターフェース
 */

import { Post, PostId, UserId } from '@domain/index';

export interface PostRepository {
  save(post: Post): Promise<void>;
  findById(id: PostId): Promise<Post | null>;
  findByAuthor(authorId: UserId, limit?: number): Promise<Post[]>;
  findByIds(ids: PostId[]): Promise<Post[]>;
  delete(id: PostId): Promise<void>;
  
  /**
   * タイムライン用: 複数ユーザーの投稿を取得
   */
  findByAuthors(authorIds: UserId[], limit?: number): Promise<Post[]>;
}