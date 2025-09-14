/**
 * ユーザーリポジトリのポート定義
 */

import { User, UserId } from '@domain/index';

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  exists(id: UserId): Promise<boolean>;
}