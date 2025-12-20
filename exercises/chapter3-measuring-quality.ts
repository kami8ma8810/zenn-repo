/**
 * 第3章：見えないものを測る
 *
 * この章で気づいたこと：
 * 「短いコード = 良いコード」じゃなかった！
 *
 * 品質・目標・手段の3層モデルを知って、
 * 「何のためにその指標を追うのか」を考えるようになった
 */

// ============================================================
// 気づき1：「短いコード」を追求して失敗した話
// ============================================================

/**
 * グッドハートの法則：
 * 「指標が目標になると、それは良い指標ではなくなる」
 *
 * 僕がやった失敗：
 * 「行数が少ない = 良いコード」だと思ってワンライナーを書きまくった
 * → レビューで「読めない」と言われた...
 */

interface Post {
  id: string;
  likes: number;
}

interface Comment {
  id: string;
  likes: number;
}

interface User {
  id: string;
  name: string;
  active: boolean;
  age: number;
  banned: boolean;
  emailVerified: boolean;
  posts: Post[];
  comments: Comment[];
}

interface RankedUser extends User {
  score: number;
  tier: "gold" | "silver" | "bronze";
}

// ❌ 行数削減を追求した結果...（読めない！）
const getTopUsers_Bad = (users: User[]) =>
  users
    .filter(
      (u) => u.active && u.age >= 18 && !u.banned && u.emailVerified
    )
    .map((u) => ({
      ...u,
      score:
        u.posts.reduce((s, p) => s + p.likes, 0) +
        u.comments.reduce((s, c) => s + c.likes, 0),
      tier:
        u.posts.reduce((s, p) => s + p.likes, 0) +
          u.comments.reduce((s, c) => s + c.likes, 0) >
        1000
          ? "gold"
          : u.posts.reduce((s, p) => s + p.likes, 0) +
              u.comments.reduce((s, c) => s + c.likes, 0) >
            100
          ? "silver"
          : "bronze",
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) as RankedUser[];

/**
 * 本を読んで気づいたこと：
 *
 * 品質・目標・手段の3層モデル
 *
 * 品質（本当に達成したいこと）：保守しやすいコード
 * 目標（品質を測る指標）：コードの可読性
 * 手段（目標を達成する方法）：適切な関数分割、命名
 *
 * 「行数を減らす」は手段の一つに過ぎなかった！
 */

// ✅ 可読性を重視したリファクタリング

// 1. フィルタ条件を明確な関数に
function isEligibleUser(user: User): boolean {
  return user.active && user.age >= 18 && !user.banned && user.emailVerified;
}

// 2. スコア計算を独立した関数に
function calculateUserScore(user: User): number {
  const postLikes = user.posts.reduce((sum, post) => sum + post.likes, 0);
  const commentLikes = user.comments.reduce(
    (sum, comment) => sum + comment.likes,
    0
  );
  return postLikes + commentLikes;
}

// 3. ティア判定を独立した関数に
function determineTier(score: number): "gold" | "silver" | "bronze" {
  if (score > 1000) return "gold";
  if (score > 100) return "silver";
  return "bronze";
}

// 4. メイン処理は組み合わせるだけ
function getTopRankedUsers(users: User[], limit: number = 10): RankedUser[] {
  return users
    .filter(isEligibleUser)
    .map((user) => {
      const score = calculateUserScore(user);
      return {
        ...user,
        score,
        tier: determineTier(score),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// 行数は増えたけど、各関数の責任が明確になった！

// ============================================================
// 気づき2：「コンポーネントは100行以内」ルールの罠
// ============================================================

/**
 * チームルール：「コンポーネントは100行以内に収める」
 *
 * 僕がやった失敗：
 * 100行に収めるために、無理やり分割した
 * → 意味のない分割で、かえって読みにくくなった
 */

// ❌ 100行に収めるための無意味な分割

// components/ProductCard/ProductCardImage.tsx
function ProductCardImage_Bad(props: { src: string; alt: string }) {
  return `<img src="${props.src}" alt="${props.alt}" />`;
}

// components/ProductCard/ProductCardTitle.tsx
function ProductCardTitle_Bad(props: { title: string }) {
  return `<h3>${props.title}</h3>`;
}

// components/ProductCard/ProductCardPrice.tsx
function ProductCardPrice_Bad(props: { price: number }) {
  return `<span>¥${props.price.toLocaleString()}</span>`;
}

// これで100行以内になった！...でも本当に良いコード？

/**
 * 本を読んで気づいたこと：
 *
 * 「100行以内」は目標であって品質じゃない
 *
 * 品質：変更しやすいコンポーネント
 * 目標：適切な粒度で分割されている
 * 手段：100行を目安にする（あくまで目安）
 *
 * 「100行」という数字だけ追うと、本来の品質を見失う
 */

// ✅ 意味のある分割

interface Product {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  description: string;
  inStock: boolean;
}

// 分割する理由があるもの：複数箇所で使う
function formatPrice(price: number): string {
  return `¥${price.toLocaleString()}`;
}

// ProductCard は100行超えてもOK（論理的にまとまっている）
function ProductCard(props: { product: Product; onAddToCart: () => void }) {
  const { product, onAddToCart } = props;

  return `
    <article class="product-card">
      <img src="${product.imageUrl}" alt="${product.title}" />
      <h3>${product.title}</h3>
      <p>${product.description}</p>
      <span class="price">${formatPrice(product.price)}</span>
      <button
        ${product.inStock ? "" : "disabled"}
        onclick="${onAddToCart}"
      >
        ${product.inStock ? "カートに追加" : "在庫なし"}
      </button>
    </article>
  `;
}

// ============================================================
// 気づき3：テストカバレッジ80%の罠
// ============================================================

/**
 * 「テストカバレッジ80%以上を維持」というルールがあった
 *
 * 僕がやった失敗：
 * カバレッジを上げるために、意味のないテストを書いた
 */

// ❌ カバレッジのためだけのテスト例（イメージ）

/*
describe("UserService", () => {
  it("should exist", () => {
    expect(UserService).toBeDefined();  // 意味なし！
  });

  it("should have a method", () => {
    expect(typeof UserService.getUser).toBe("function");  // 意味なし！
  });
});
*/

/**
 * 本を読んで気づいたこと：
 *
 * 品質：バグが少なく、安心してリリースできる
 * 目標：重要な機能がテストされている
 * 手段：カバレッジを指標として使う
 *
 * カバレッジは「最低限のチェック」であって、
 * 「テストの質」は測れない
 */

// ✅ 意味のあるテストの例

interface RegistrationData {
  email: string;
  password: string;
  name: string;
}

interface RegistrationResult {
  success: boolean;
  userId?: string;
  error?: string;
}

// テストしやすい設計にする
class UserRegistrationService {
  constructor(
    private userRepository: { save: (user: unknown) => Promise<void> },
    private emailChecker: { exists: (email: string) => Promise<boolean> }
  ) {}

  async register(data: RegistrationData): Promise<RegistrationResult> {
    // バリデーション（テストすべきポイント1）
    if (!this.validateEmail(data.email)) {
      return { success: false, error: "Invalid email format" };
    }

    if (!this.validatePassword(data.password)) {
      return { success: false, error: "Password too weak" };
    }

    // 重複チェック（テストすべきポイント2）
    if (await this.emailChecker.exists(data.email)) {
      return { success: false, error: "Email already exists" };
    }

    // ユーザー作成（テストすべきポイント3）
    const userId = crypto.randomUUID();
    await this.userRepository.save({
      id: userId,
      ...data,
    });

    return { success: true, userId };
  }

  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validatePassword(password: string): boolean {
    return password.length >= 8;
  }
}

/*
// 意味のあるテスト例
describe("UserRegistrationService", () => {
  // 正常系
  it("有効なデータで登録が成功する", async () => {
    const result = await service.register({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });
    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();
  });

  // 異常系：バリデーション
  it("不正なメールアドレスでエラーになる", async () => {
    const result = await service.register({
      email: "invalid-email",
      password: "password123",
      name: "Test User",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid email format");
  });

  // 異常系：重複チェック
  it("既存のメールアドレスでエラーになる", async () => {
    // 重複を返すモックを設定
    const result = await service.register({
      email: "existing@example.com",
      password: "password123",
      name: "Test User",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Email already exists");
  });
});
*/

// ============================================================
// 気づき4：パフォーマンス最適化の判断
// ============================================================

/**
 * 「パフォーマンスが悪い」と言われて
 * とりあえずメモ化しまくった話
 *
 * 本を読んで気づいたこと：
 * 最適化にも品質・目標・手段がある
 */

// ❌ とりあえずメモ化（意味がない場合）

interface ListItem {
  id: string;
  name: string;
}

// すべてにuseMemoを使う必要はない
function ItemList_Bad(props: { items: ListItem[] }) {
  // この程度の処理にメモ化は不要
  // むしろコードが複雑になるだけ
  const sortedItems = useMemo_Stub(
    () => [...props.items].sort((a, b) => a.name.localeCompare(b.name)),
    [props.items]
  );

  return sortedItems.map((item) => `<li>${item.name}</li>`).join("");
}

// useMemoのスタブ（型チェック用）
function useMemo_Stub<T>(factory: () => T, deps: unknown[]): T {
  void deps;
  return factory();
}

/**
 * パフォーマンス最適化の3層モデル
 *
 * 品質：ユーザーが快適に使える
 * 目標：操作への応答が100ms以内
 * 手段：メモ化、仮想化、遅延読み込みなど
 *
 * まず「何が遅いか」を測定してから最適化する
 */

// ✅ 意味のある最適化

interface HeavyItem {
  id: string;
  data: unknown;
}

// 本当に重い処理にだけメモ化を適用
function HeavyList(props: { items: HeavyItem[]; filter: string }) {
  // 1. まず測定：この処理は本当に遅いか？
  // 2. 遅い場合のみ最適化

  // フィルタリングが重い場合のみメモ化
  const filteredItems = useMemo_Stub(
    () =>
      props.items.filter((item) => {
        // 重い処理...
        return JSON.stringify(item.data).includes(props.filter);
      }),
    [props.items, props.filter]
  );

  // 大量のアイテムがある場合は仮想化を検討
  // → react-window や react-virtualized を使う

  return filteredItems.map((item) => `<li>${item.id}</li>`).join("");
}

// ============================================================
// 気づき5：ESLintルールを守るためだけの変更
// ============================================================

/**
 * ESLintでエラーが出たから
 * とりあえずルールを満たすように書き換えた話
 *
 * 問題：「なぜそのルールがあるのか」を理解してなかった
 */

// ❌ ESLintを黙らせるためだけの変更

function processData_Bad(data: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as any; // anyを使うな → とりあえずdisable...
  return result.value;
}

/**
 * 本を読んで気づいたこと：
 *
 * ESLintルールも「品質のための手段」
 *
 * 品質：型安全で予測可能なコード
 * 目標：any型を使わない
 * 手段：ESLintルールで検出
 *
 * ルールを無効化するなら、なぜそれが正当なのか説明できるべき
 */

// ✅ ルールの意図を理解した上での対応

// APIからのデータを安全に扱う
interface ApiResponse {
  status: string;
  data: {
    value: string;
  };
}

function isApiResponse(data: unknown): data is ApiResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.status === "string" &&
    typeof obj.data === "object" &&
    obj.data !== null &&
    typeof (obj.data as Record<string, unknown>).value === "string"
  );
}

function processData(data: unknown): string | null {
  // 型ガードで安全に型を絞り込む
  if (isApiResponse(data)) {
    return data.data.value;
  }
  return null;
}

// ============================================================
// 気づき6：メトリクスの正しい使い方
// ============================================================

/**
 * 複数の観点でコードを評価することの大切さを学んだ
 *
 * 単一の指標だけで判断しない！
 */

interface CodeMetrics {
  cyclomaticComplexity: number; // 循環的複雑度
  linesOfCode: number; // 行数
  dependencyCount: number; // 依存の数
  testCoverage: number; // テストカバレッジ
}

interface CodeQualityAssessment {
  overallScore: number;
  warnings: string[];
  suggestions: string[];
}

// 複数の観点で評価する
function assessCodeQuality(metrics: CodeMetrics): CodeQualityAssessment {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // 単一の指標で判断しない
  if (metrics.cyclomaticComplexity > 10) {
    warnings.push("循環的複雑度が高い（10超）：関数の分割を検討");
  }

  if (metrics.linesOfCode > 200) {
    suggestions.push("コードが長い：責務の分離を検討");
  }

  // 複合的な判断
  if (metrics.dependencyCount > 10 && metrics.testCoverage < 80) {
    warnings.push("依存が多くテストが不十分：リスクが高い");
  }

  // 総合スコア（参考程度）
  let overallScore = 100;
  overallScore -= Math.max(0, metrics.cyclomaticComplexity - 10) * 2;
  overallScore -= Math.max(0, metrics.linesOfCode - 200) * 0.1;
  overallScore -= Math.max(0, 80 - metrics.testCoverage) * 0.5;

  return {
    overallScore: Math.max(0, overallScore),
    warnings,
    suggestions,
  };
}

// ============================================================
// まとめ：第3章で学んだ公式
// ============================================================

/**
 * 品質・目標・手段の3層モデル
 *
 * 品質（本当に達成したいこと）
 * ↑
 * 目標（品質を測るための指標）
 * ↑
 * 手段（目標を達成するための方法）
 *
 * 大事なこと：
 * - 手段が目的化しないように注意
 * - 指標は参考値であって絶対じゃない
 * - 「なぜそのルール？」を考える習慣をつける
 *
 * グッドハートの法則：
 * 「指標が目標になると、それは良い指標ではなくなる」
 * → カバレッジ80%を追うと、意味のないテストが増える
 * → 行数削減を追うと、読みにくいコードになる
 */

// ============================================================
// エクスポート（テスト用）
// ============================================================

export {
  // Types
  User,
  RankedUser,
  Post,
  Comment,
  Product,
  ListItem,
  HeavyItem,
  RegistrationData,
  RegistrationResult,
  CodeMetrics,
  CodeQualityAssessment,
  ApiResponse,
  // Functions
  getTopUsers_Bad,
  isEligibleUser,
  calculateUserScore,
  determineTier,
  getTopRankedUsers,
  formatPrice,
  ProductCard,
  isApiResponse,
  processData,
  assessCodeQuality,
  // Classes
  UserRegistrationService,
};
