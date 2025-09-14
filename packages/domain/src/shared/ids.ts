/**
 * ブランド型を使った型安全なID定義
 * DDDにおけるValueObjectの実装例
 */

export type UserId = string & { readonly brand: unique symbol };
export type PostId = string & { readonly brand: unique symbol };
export type FollowId = string & { readonly brand: unique symbol };

export const UserId = (value: string): UserId => {
  if (!value || value.trim().length === 0) {
    throw new Error('UserIdは空にできません');
  }
  return value as UserId;
};

export const PostId = (value: string): PostId => {
  if (!value || value.trim().length === 0) {
    throw new Error('PostIdは空にできません');
  }
  return value as PostId;
};

export const FollowId = (value: string): FollowId => {
  if (!value || value.trim().length === 0) {
    throw new Error('FollowIdは空にできません');
  }
  return value as FollowId;
};