// 第2章：値オブジェクトとしてのID
// Brand型を使って型安全性を確保

declare const PostIdBrand: unique symbol;
export type PostId = string & { [PostIdBrand]: never };

declare const UserIdBrand: unique symbol;
export type UserId = string & { [UserIdBrand]: never };

export function createPostId(value: string): PostId {
  if (!value || value.trim().length === 0) {
    throw new Error('PostId cannot be empty');
  }
  return value as PostId;
}

export function createUserId(value: string): UserId {
  if (!value || value.trim().length === 0) {
    throw new Error('UserId cannot be empty');
  }
  return value as UserId;
}

// ID生成ユーティリティ
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}