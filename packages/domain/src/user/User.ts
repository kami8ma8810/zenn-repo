// 第1章：基本的なUserクラス
export class User {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public profileImageUrl: string | null,
    public bio: string,
    public createdAt: Date
  ) {}

  static create(args: {
    id: string;
    name: string;
    email: string;
  }): User {
    // TODO: 第2章でEmailを値オブジェクトにします
    // TODO: 第3章でプロフィール更新のロジックを追加します
    
    return new User(
      args.id,
      args.name,
      args.email,
      null,
      '',
      new Date()
    );
  }
}