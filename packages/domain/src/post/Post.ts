// 第2章：値オブジェクトを使用したPostエンティティ
import { PostId, UserId, createPostId, createUserId } from '../shared/ids';
import { PostContent } from '../shared/valueObjects';

export class Post {
  constructor(
    public readonly id: PostId,  // 値オブジェクト化
    public readonly authorId: UserId,  // 値オブジェクト化
    private content: PostContent,  // 値オブジェクト化
    public readonly createdAt: Date
  ) {}

  static create(args: {
    id: string;
    authorId: string;
    text: string;
    imageUrl?: string | null;
  }): Post {
    // TODO: 第3章で集約として完成させます
    
    const postId = createPostId(args.id);
    const userId = createUserId(args.authorId);
    const content = new PostContent(
      args.text,
      args.imageUrl ?? null
    );
    
    return new Post(
      postId,
      userId,
      content,
      new Date()
    );
  }
  
  // ゲッター（カプセル化）
  getText(): string {
    return this.content.text;
  }
  
  getImageUrl(): string | null {
    return this.content.imageUrl;
  }
  
  // 同一性の判定
  equals(other: Post): boolean {
    return this.id === other.id;
  }
}