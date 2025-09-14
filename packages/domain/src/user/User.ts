/**
 * ユーザー集約
 * プロフィール管理の不変条件を担保
 */

import { UserId } from '../shared/ids';

export interface UserCreateArgs {
  id: UserId;
  displayName: string;
  photoURL?: string | null;
  email: string;
  now: Date;
}

export interface UserEditProfileArgs {
  displayName?: string;
  photoURL?: string | null;
  bio?: string;
}

export class User {
  private constructor(
    readonly id: UserId,
    private _displayName: string,
    private _photoURL: string | null,
    readonly email: string,
    private _bio: string,
    readonly createdAt: Date,
    private _updatedAt: Date
  ) {}

  /**
   * ファクトリメソッド: 新規ユーザー作成
   */
  static create(args: UserCreateArgs): User {
    const displayName = args.displayName.trim();
    
    // 不変条件: 表示名は必須
    if (displayName.length === 0) {
      throw new Error('表示名は必須です');
    }
    
    // 不変条件: 表示名の文字数制限
    if (displayName.length > 50) {
      throw new Error('表示名は50文字以内にしてください');
    }

    // 不変条件: メールアドレスの形式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error('有効なメールアドレスを入力してください');
    }
    
    return new User(
      args.id,
      displayName,
      args.photoURL ?? null,
      args.email,
      '',
      args.now,
      args.now
    );
  }

  /**
   * 再構築用ファクトリ（リポジトリからの復元用）
   */
  static reconstruct(
    id: UserId,
    displayName: string,
    photoURL: string | null,
    email: string,
    bio: string,
    createdAt: Date,
    updatedAt: Date
  ): User {
    return new User(id, displayName, photoURL, email, bio, createdAt, updatedAt);
  }

  // Getters
  get displayName(): string {
    return this._displayName;
  }

  get photoURL(): string | null {
    return this._photoURL;
  }

  get bio(): string {
    return this._bio;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * プロフィール編集
   */
  editProfile(args: UserEditProfileArgs, now: Date): void {
    if (args.displayName !== undefined) {
      const displayName = args.displayName.trim();
      
      // 不変条件: 表示名は必須
      if (displayName.length === 0) {
        throw new Error('表示名は必須です');
      }
      
      // 不変条件: 表示名の文字数制限
      if (displayName.length > 50) {
        throw new Error('表示名は50文字以内にしてください');
      }
      
      this._displayName = displayName;
    }

    if (args.photoURL !== undefined) {
      this._photoURL = args.photoURL;
    }

    if (args.bio !== undefined) {
      const bio = args.bio.trim();
      
      // 不変条件: 自己紹介の文字数制限
      if (bio.length > 200) {
        throw new Error('自己紹介は200文字以内にしてください');
      }
      
      this._bio = bio;
    }

    this._updatedAt = now;
  }
}