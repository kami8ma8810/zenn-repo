// 第1章：基本的なPostクラス（まだstring型を使用）
export class Post {
  constructor(
    public id: string,
    public authorId: string,
    public text: string,
    public imageUrl: string | null,
    public createdAt: Date
  ) {}

  static create(args: {
    id: string;
    authorId: string;
    text: string;
    imageUrl?: string | null;
  }): Post {
    // TODO: 第2章で値オブジェクトに置き換えます
    // TODO: 第3章で不変条件を追加します
    
    const text = (args.text ?? '').trim();
    
    // 基本的なバリデーション
    if (text.length === 0 && !args.imageUrl) {
      throw new Error('投稿内容または画像のどちらかは必須です');
    }
    
    if (text.length > 300) {
      throw new Error('本文は300文字以内にしてください');
    }
    
    return new Post(
      args.id,
      args.authorId,
      text,
      args.imageUrl ?? null,
      new Date()
    );
  }
}