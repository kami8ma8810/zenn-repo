/**
 * 第4章：抽象化を実現する
 *
 * この章で気づいたこと：
 * 「抽象化すればするほど良い」わけじゃなかった！
 *
 * - 漏れのある抽象化：隠したはずの詳細が漏れ出す
 * - 過剰な抽象化：シンプルで済むものを複雑にする
 * - YAGNI：今必要ないものは作らない
 */

// ============================================================
// 気づき1：「漏れのある抽象化」を理解した
// ============================================================

/**
 * 僕がやった失敗：
 * APIクライアントを作ったけど、呼び出し側が
 * 「中身の仕様」を知らないと使えなかった
 *
 * これが「漏れのある抽象化」だった
 */

// ❌ 漏れのある抽象化の例

interface ApiClient_Bad {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: unknown): Promise<T>;
}

// 「シンプルなAPIクライアント」のつもりで作った
class SimpleApiClient_Bad implements ApiClient_Bad {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    // 問題：エラー時の挙動が隠蔽されていない
    // 呼び出し側が「404のときどうなるか」を知らないと使えない
    return response.json();
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  }
}

// 呼び出し側：漏れのある抽象化の被害者
async function fetchUser_Bad(client: ApiClient_Bad, userId: string) {
  const user = await client.get(`/api/users/${userId}`);
  // 問題：404のときはどうなる？エラー？null？
  // APIクライアントの実装を知らないと分からない...
  return user;
}

/**
 * 本を読んで気づいたこと：
 *
 * 良い抽象化 = 「使う側が中身を知らなくても使える」
 *
 * 漏れのある抽象化の原因：
 * - エラー処理が曖昧
 * - 戻り値の型が不明確
 * - 副作用が隠れている
 */

// ✅ 漏れのない抽象化

// 結果を明示的に表現
interface ApiResult<T> {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  statusCode?: number;
}

interface ApiClient {
  get<T>(url: string): Promise<ApiResult<T>>;
  post<T>(url: string, data: unknown): Promise<ApiResult<T>>;
}

class BetterApiClient implements ApiClient {
  async get<T>(url: string): Promise<ApiResult<T>> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP Error: ${response.status}`,
          statusCode: response.status,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  }

  async post<T>(url: string, data: unknown): Promise<ApiResult<T>> {
    try {
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP Error: ${response.status}`,
          statusCode: response.status,
        };
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  }
}

// 呼び出し側：中身を知らなくても安全に使える
interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(client: ApiClient, userId: string): Promise<User | null> {
  const result = await client.get<User>(`/api/users/${userId}`);

  if (result.success) {
    return result.data;
  }

  // エラー処理が明確
  console.error(`Failed to fetch user: ${result.error}`);
  return null;
}

// ============================================================
// 気づき2：汎用Modalコンポーネントの「漏れ」
// ============================================================

/**
 * 「汎用的なModalを作ろう！」と思って作ったけど
 * 使う側が「内部の仕様」を知らないと使えなかった話
 */

// ❌ 漏れのある汎用Modal

interface ModalProps_Bad {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// 汎用Modalのつもり...
function Modal_Bad(props: ModalProps_Bad) {
  // 問題1: z-indexがハードコード
  // 問題2: ESCキーで閉じる？閉じない？
  // 問題3: 背景クリックで閉じる？閉じない？
  // → 使う側がソースを読まないと分からない

  if (!props.isOpen) return null;

  return `
    <div class="modal-overlay" style="z-index: 1000">
      <div class="modal-content">
        ${props.children}
        <button onclick="${props.onClose}">×</button>
      </div>
    </div>
  `;
}

/**
 * 本を読んで気づいたこと：
 *
 * 「暗黙の挙動」は漏れの原因
 * → propsで明示的に制御できるようにする
 */

// ✅ 漏れのない汎用Modal

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // 挙動を明示的にpropsで制御
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  // スタイルの上書きを許可
  zIndex?: number;
  // アクセシビリティ
  ariaLabel: string;
}

function Modal(props: ModalProps) {
  const {
    isOpen,
    onClose,
    children,
    closeOnEscape = true,
    closeOnOverlayClick = true,
    zIndex = 1000,
    ariaLabel,
  } = props;

  if (!isOpen) return null;

  // ESCキーの処理を明示的に
  function handleKeyDown(event: { key: string }) {
    if (closeOnEscape && event.key === "Escape") {
      onClose();
    }
  }

  // オーバーレイクリックの処理を明示的に
  function handleOverlayClick() {
    if (closeOnOverlayClick) {
      onClose();
    }
  }

  return `
    <div
      class="modal-overlay"
      style="z-index: ${zIndex}"
      onclick="${handleOverlayClick}"
      onkeydown="${handleKeyDown}"
      role="dialog"
      aria-modal="true"
      aria-label="${ariaLabel}"
    >
      <div class="modal-content" onclick="event.stopPropagation()">
        ${children}
      </div>
    </div>
  `;
}

// 使う側：挙動が明確
function ConfirmDeleteModal(props: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) {
  return Modal({
    isOpen: props.isOpen,
    onClose: props.onClose,
    ariaLabel: "削除確認",
    closeOnEscape: true, // ESCで閉じる
    closeOnOverlayClick: false, // 背景クリックでは閉じない（誤操作防止）
    children: `
      <h2>削除しますか？</h2>
      <button onclick="${props.onConfirm}">削除</button>
      <button onclick="${props.onClose}">キャンセル</button>
    `,
  });
}

// ============================================================
// 気づき3：過剰な抽象化（やりすぎ）の問題
// ============================================================

/**
 * 「将来の拡張に備えて抽象化しておこう」
 * と思ってやりすぎた話
 *
 * これが「YAGNI違反」だった
 * YAGNI = You Aren't Gonna Need It（それは必要にならない）
 */

// ❌ 過剰な抽象化の例：割引計算

// Strategy パターンを使いすぎ
interface DiscountStrategy {
  calculate(basePrice: number): number;
}

class ChildDiscountStrategy implements DiscountStrategy {
  calculate(basePrice: number): number {
    return basePrice * 0.2; // 20%割引
  }
}

class SeniorDiscountStrategy implements DiscountStrategy {
  calculate(basePrice: number): number {
    return basePrice * 0.15; // 15%割引
  }
}

class NoDiscountStrategy implements DiscountStrategy {
  calculate(_basePrice: number): number {
    return 0;
  }
}

class DiscountStrategyFactory {
  create(age: number): DiscountStrategy {
    if (age < 18) return new ChildDiscountStrategy();
    if (age >= 65) return new SeniorDiscountStrategy();
    return new NoDiscountStrategy();
  }
}

// 使う側も複雑に...
class DiscountCalculator_Overengineered {
  constructor(private factory: DiscountStrategyFactory) {}

  calculate(age: number, basePrice: number): number {
    const strategy = this.factory.create(age);
    return strategy.calculate(basePrice);
  }
}

// これ、本当に必要だった...？

/**
 * 本を読んで気づいたこと：
 *
 * 抽象化はコストがかかる
 * - 理解しにくくなる
 * - ファイルが増える
 * - テストも増える
 *
 * 「今」必要な抽象度で十分
 * 将来必要になったら、そのとき抽象化すればいい
 */

// ✅ シンプルな実装で十分

interface Customer {
  id: string;
  name: string;
  age: number;
}

// 関数1つで十分
function calculateDiscountRate(age: number): number {
  if (age < 18) return 0.2; // 20%割引
  if (age >= 65) return 0.15; // 15%割引
  return 0; // 割引なし
}

function applyDiscount(price: number, discountRate: number): number {
  return price * (1 - discountRate);
}

// 使う側もシンプル
function calculateFinalPrice(customer: Customer, basePrice: number): number {
  const discountRate = calculateDiscountRate(customer.age);
  return applyDiscount(basePrice, discountRate);
}

// ============================================================
// 気づき4：「いつ抽象化すべきか」の判断基準
// ============================================================

/**
 * じゃあいつ抽象化すればいいの？
 *
 * 本を読んで分かった基準：
 * 1. 同じパターンが3回出てきたとき
 * 2. 変更が頻繁に起きる箇所
 * 3. テストしにくいとき
 */

// 例：割引ルールが複雑になってきたら抽象化を検討

// 要件が増えた場合：
// - 年齢割引
// - 会員割引
// - まとめ買い割引
// - それらの組み合わせ

interface PurchaseContext {
  date: Date;
  totalItems: number;
  isMember: boolean;
}

interface DiscountRule {
  readonly name: string;
  isApplicable(customer: Customer, context: PurchaseContext): boolean;
  calculate(basePrice: number): number;
}

// このレベルの複雑さになったら抽象化する価値がある
class AgeBasedDiscount implements DiscountRule {
  readonly name = "年齢割引";

  isApplicable(customer: Customer): boolean {
    return customer.age < 18 || customer.age >= 65;
  }

  calculate(basePrice: number): number {
    return basePrice * 0.15;
  }
}

class MembershipDiscount implements DiscountRule {
  readonly name = "会員割引";

  isApplicable(_customer: Customer, context: PurchaseContext): boolean {
    return context.isMember;
  }

  calculate(basePrice: number): number {
    return basePrice * 0.1;
  }
}

class BulkPurchaseDiscount implements DiscountRule {
  readonly name = "まとめ買い割引";

  isApplicable(_customer: Customer, context: PurchaseContext): boolean {
    return context.totalItems >= 10;
  }

  calculate(basePrice: number): number {
    return basePrice * 0.05;
  }
}

// 複数の割引を適用
class AdvancedDiscountCalculator {
  constructor(private rules: DiscountRule[]) {}

  calculateFinalPrice(
    customer: Customer,
    context: PurchaseContext,
    basePrice: number
  ): { finalPrice: number; appliedDiscounts: string[] } {
    const appliedDiscounts: string[] = [];
    let totalDiscount = 0;

    for (const rule of this.rules) {
      if (rule.isApplicable(customer, context)) {
        totalDiscount += rule.calculate(basePrice);
        appliedDiscounts.push(rule.name);
      }
    }

    // 割引上限（50%まで）
    const maxDiscount = basePrice * 0.5;
    const actualDiscount = Math.min(totalDiscount, maxDiscount);

    return {
      finalPrice: basePrice - actualDiscount,
      appliedDiscounts,
    };
  }
}

// ============================================================
// 気づき5：カスタムフックの過剰な汎用化
// ============================================================

/**
 * 「汎用的なフェッチフックを作ろう！」
 * と思って作りすぎた話
 */

// ❌ 過剰に汎用的なフック

interface UseFetchOptions_Bad<T> {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  transform?: (data: unknown) => T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retry?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTime?: number;
  // ... まだまだオプションが増える
}

// 使う側「どれを使えばいいの...？」

/**
 * 本を読んで気づいたこと：
 *
 * 汎用化しすぎると：
 * - 使い方が分かりにくい
 * - テストが難しい
 * - バグの温床になる
 *
 * → 「よく使うパターン」を特化したフックにする
 */

// ✅ 用途に特化したフック

// 基本のフェッチ状態
interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

// ユーザー取得専用（よく使うから特化）
function useUserFetch(userId: string) {
  const state: FetchState<User> = {
    data: null,
    isLoading: true,
    error: null,
  };

  async function fetchData() {
    state.isLoading = true;
    state.error = null;

    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error("User not found");
      state.data = await response.json();
    } catch (e) {
      state.error = e instanceof Error ? e.message : "Unknown error";
    } finally {
      state.isLoading = false;
    }
  }

  return { ...state, refetch: fetchData };
}

// 投稿一覧取得専用
interface Post {
  id: string;
  title: string;
  content: string;
}

function usePostsFetch(options?: { limit?: number }) {
  const limit = options?.limit ?? 10;

  const state: FetchState<Post[]> = {
    data: null,
    isLoading: true,
    error: null,
  };

  async function fetchData() {
    state.isLoading = true;
    state.error = null;

    try {
      const response = await fetch(`/api/posts?limit=${limit}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      state.data = await response.json();
    } catch (e) {
      state.error = e instanceof Error ? e.message : "Unknown error";
    } finally {
      state.isLoading = false;
    }
  }

  return { ...state, refetch: fetchData };
}

// ============================================================
// 気づき6：テスト駆動で「適切な抽象化」を見つける
// ============================================================

/**
 * テストを書いていると
 * 「ここは抽象化すべきだな」と気づけることがある
 *
 * テストしにくい = 依存が強すぎる = 抽象化の余地あり
 */

// ❌ テストしにくいコード

async function sendWelcomeEmail_Bad(userId: string): Promise<void> {
  // 1. DBに直接アクセス
  const response = await fetch(`/api/users/${userId}`);
  const user = await response.json();

  // 2. 現在時刻に直接依存
  const now = new Date();
  const hour = now.getHours();

  // 3. 時間帯に応じた挨拶文
  let greeting: string;
  if (hour < 12) {
    greeting = "おはようございます";
  } else if (hour < 18) {
    greeting = "こんにちは";
  } else {
    greeting = "こんばんは";
  }

  // 4. 外部APIに直接依存
  await fetch("https://api.email.com/send", {
    method: "POST",
    body: JSON.stringify({
      to: user.email,
      subject: "ご登録ありがとうございます",
      body: `${greeting}、${user.name}さん！`,
    }),
  });
}

// これをテストするには...本物のDBとメールサーバーが必要？

/**
 * 本を読んで気づいたこと：
 *
 * 「外部依存を注入可能にする」= 抽象化の基本
 * → テストしやすくなる
 * → 副作用も明確になる
 */

// ✅ テストしやすい設計

// 依存をインターフェースで定義
interface UserRepository {
  findById(id: string): Promise<User | null>;
}

interface EmailSender {
  send(params: { to: string; subject: string; body: string }): Promise<void>;
}

interface Clock {
  now(): Date;
}

// 純粋関数として抽出（テストしやすい）
function getGreetingByHour(hour: number): string {
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "こんばんは";
}

function buildWelcomeEmailBody(userName: string, greeting: string): string {
  return `${greeting}、${userName}さん！`;
}

// メインロジック（依存関係を注入）
class WelcomeEmailService {
  constructor(
    private userRepository: UserRepository,
    private emailSender: EmailSender,
    private clock: Clock
  ) {}

  async sendWelcomeEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = this.clock.now();
    const greeting = getGreetingByHour(now.getHours());
    const body = buildWelcomeEmailBody(user.name, greeting);

    await this.emailSender.send({
      to: user.email,
      subject: "ご登録ありがとうございます",
      body,
    });
  }
}

/*
// テスト例
describe("WelcomeEmailService", () => {
  it("朝は「おはようございます」と送る", async () => {
    // モックを注入
    const mockUserRepo = {
      findById: async () => ({ id: "1", name: "太郎", email: "taro@example.com" }),
    };
    const mockEmailSender = {
      send: vi.fn(),
    };
    const mockClock = {
      now: () => new Date("2024-01-01T09:00:00"), // 朝9時
    };

    const service = new WelcomeEmailService(
      mockUserRepo,
      mockEmailSender,
      mockClock
    );

    await service.sendWelcomeEmail("1");

    expect(mockEmailSender.send).toHaveBeenCalledWith({
      to: "taro@example.com",
      subject: "ご登録ありがとうございます",
      body: "おはようございます、太郎さん！",
    });
  });
});
*/

// ============================================================
// まとめ：第4章で学んだこと
// ============================================================

/**
 * 抽象化は「魔法の杖」じゃない
 *
 * 漏れのある抽象化：
 * - 使う側が中身を知らないと使えない
 * - エラー処理が曖昧、挙動が暗黙的
 * → 結果を明示的に、挙動をpropsで制御可能に
 *
 * 過剰な抽象化：
 * - 今必要ないのに「将来のため」と作る
 * - YAGNI違反
 * → シンプルな実装で始める、3回出てきたら抽象化を検討
 *
 * 適切な抽象化のタイミング：
 * 1. 同じパターンが3回出てきた
 * 2. 変更が頻繁に起きる
 * 3. テストしにくい（依存が強すぎる）
 *
 * テスト駆動で設計を改善：
 * - テストしにくい = 抽象化の余地あり
 * - 外部依存を注入可能にする
 * - 純粋関数を抽出する
 */

// ============================================================
// エクスポート（テスト用）
// ============================================================

// React.ReactNode の型定義（このファイル用）
declare namespace React {
  type ReactNode = string | number | boolean | null | undefined;
}

export {
  // Types
  User,
  Customer,
  Post,
  PurchaseContext,
  DiscountRule,
  ApiResult,
  ApiClient,
  FetchState,
  ModalProps,
  UserRepository,
  EmailSender,
  Clock,
  // Functions
  fetchUser,
  Modal,
  ConfirmDeleteModal,
  calculateDiscountRate,
  applyDiscount,
  calculateFinalPrice,
  useUserFetch,
  usePostsFetch,
  getGreetingByHour,
  buildWelcomeEmailBody,
  // Classes
  BetterApiClient,
  DiscountCalculator_Overengineered,
  AgeBasedDiscount,
  MembershipDiscount,
  BulkPurchaseDiscount,
  AdvancedDiscountCalculator,
  WelcomeEmailService,
};
