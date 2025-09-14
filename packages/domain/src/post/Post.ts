/**
 * 投稿集約
 * DDDにおける集約ルートの実装例
 * 不変条件の管理とビジネスロジックをカプセル化
 */

import { PostId, UserId } from '../shared/ids';

export interface PostCreateArgs {
  id: PostId;
  authorId: UserId;
  text: string;
  imageUrl?: string | null;
  now: Date;
}

export interface PostEditArgs {
  text?: string;
  imageUrl?: string | null;
}

export class Post {
  private constructor(
    readonly id: PostId,
    readonly authorId: UserId,
    private _text: string,
    private _imageUrl: string | null,
    readonly createdAt: Date,
    private _updatedAt: Date,
    private _likeCount: number
  ) {}

  /**
   * ファクトリメソッド: 新規投稿作成
   * 不変条件をチェックしてからインスタンス生成
   */
  static create(args: PostCreateArgs): Post {
    const text = (args.text ?? '').trim();
    
    // 不変条件: 空投稿は禁止
    if (text.length === 0 && !args.imageUrl) {
      throw new Error('投稿内容または画像のどちらかは必須です');
    }
    
    // 不変条件: 本文の文字数制限
    if (text.length > 300) {
      throw new Error('本文は300文字以内にしてください');
    }
    
    return new Post(
      args.id,
      args.authorId,
      text,
      args.imageUrl ?? null,
      args.now,
      args.now,
      0
    );
  }

  /**
   * 再構築用ファクトリ（リポジトリからの復元用）
   */
  static reconstruct(
    id: PostId,
    authorId: UserId,
    text: string,
    imageUrl: string | null,
    createdAt: Date,
    updatedAt: Date,
    likeCount: number
  ): Post {
    return new Post(id, authorId, text, imageUrl, createdAt, updatedAt, likeCount);
  }

  // Getters
  get text(): string {
    return this._text;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get likeCount(): number {
    return this._likeCount;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * 投稿の編集
   * 権限チェックと不変条件の検証を行う
   */
  edit(by: UserId, args: PostEditArgs, now: Date): void {
    // 権限チェック
    if (by !== this.authorId) {
      throw new Error('投稿の編集は作成者のみ可能です');
    }

    const newText = (args.text ?? this._text).trim();
    const newImageUrl = args.imageUrl !== undefined ? args.imageUrl : this._imageUrl;

    // 不変条件: 空投稿は禁止
    if (newText.length === 0 && !newImageUrl) {
      throw new Error('投稿内容または画像のどちらかは必須です');
    }

    // 不変条件: 本文の文字数制限
    if (newText.length > 300) {
      throw new Error('本文は300文字以内にしてください');
    }

    this._text = newText;
    this._imageUrl = newImageUrl;
    this._updatedAt = now;
  }

  /**
   * いいね数の更新
   * カウンターの整合性を保つ
   */
  applyLikeCountDelta(delta: 1 | -1): void {
    this._likeCount = Math.max(0, this._likeCount + delta);
  }

  /**
   * 削除可能かチェック
   */
  canDelete(by: UserId): boolean {
    return by === this.authorId;
  }
}