/**
 * 第2章：誰が何を呼び出せるか
 *
 * この章で気づいたこと：
 * 「共通化すればいい」じゃなくて「誰が使うか」で設計が変わる！
 *
 * 汎用的なモジュール vs 限定的なモジュール
 * どちらが正解かじゃなくて、適材適所だった
 */

// ============================================================
// 気づき1：「とりあえず共通化」が間違いだった
// ============================================================

/**
 * 僕がやりがちだった失敗：
 * 「同じような処理があるから共通化しよう！」
 * → 結果として、変な依存関係ができて後から困る
 */

// ❌ 僕がやってしまった共通化の失敗例

// 「赤色で表示する」という共通点だけで作った関数
function formatError_Bad(message: string): string {
  return `<span style="color: red">${message}</span>`;
}

// 新着バッジも赤色だから...と使い回してしまった
function formatNewBadge_Bad(label: string): string {
  // 「エラー」と「新着」は意味が全然違うのに同じ関数を使ってる
  return formatError_Bad(label);
}

// 問題：エラーの色を変えたくなったら、新着バッジにも影響が出る！

/**
 * 本を読んで気づいたこと：
 *
 * 「見た目が同じ」と「意味が同じ」は違う！
 * 共通化するときは「変更理由が同じか？」を考える
 */

// ✅ 適切な抽象度で分けた例

// 汎用的な「色付きテキスト」関数
function formatWithColor(text: string, color: string): string {
  return `<span style="color: ${color}">${text}</span>`;
}

// それぞれの用途に特化した関数
function formatErrorMessage(message: string): string {
  // エラーは赤（変更理由：エラー表示のガイドライン変更）
  return formatWithColor(message, "red");
}

function formatNewBadge(label: string): string {
  // 新着も赤だけど別の関数（変更理由：新着表示のデザイン変更）
  return formatWithColor(label, "red");
}

// これなら、エラーの色を変えても新着には影響しない！

// ============================================================
// 気づき2：カスタムフックの切り出し判断
// ============================================================

/**
 * Reactで「いつカスタムフックに切り出すべきか」が分からなかった
 *
 * 本を読んで分かったこと：
 * - 汎用的なフック：どのコンポーネントからも使える
 * - 限定的なフック：特定の機能専用
 *
 * この区別で配置場所も変わる！
 */

// ❌ 最初に書いてたコード：全部 hooks/ に入れてた

// hooks/useUser.ts に入れてた
// でも実際は「ユーザー詳細ページ」でしか使わない機能が混在
interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
}

interface UserWithActivity extends User {
  lastLoginAt: Date;
  postsCount: number;
  followersCount: number;
}

// ✅ 汎用的なフック：hooks/useUser.ts

interface UseUserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

// どのページでも使える基本的なユーザー取得
function useUser(userId: string) {
  const state: UseUserState = {
    user: null,
    isLoading: true,
    error: null,
  };

  async function fetchUser() {
    state.isLoading = true;
    state.error = null;

    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error("User not found");
      state.user = await response.json();
    } catch (e) {
      state.error = e instanceof Error ? e.message : "Unknown error";
    } finally {
      state.isLoading = false;
    }
  }

  return { state, fetchUser };
}

// ✅ 限定的なフック：features/user-profile/hooks/useUserActivity.ts

interface UseUserActivityState {
  activity: UserWithActivity | null;
  isLoading: boolean;
}

// ユーザー詳細ページ専用（他では使わない）
function useUserActivity(userId: string) {
  const state: UseUserActivityState = {
    activity: null,
    isLoading: true,
  };

  async function fetchActivity() {
    state.isLoading = true;
    try {
      const response = await fetch(`/api/users/${userId}/activity`);
      state.activity = await response.json();
    } finally {
      state.isLoading = false;
    }
  }

  return { state, fetchActivity };
}

// ============================================================
// 気づき3：コンポーネントの props 設計
// ============================================================

/**
 * Button コンポーネントを汎用的に作ろうとして失敗した話
 *
 * 最初は「なんでも受け取れるButton」を作ろうとした
 * でも結局、使う側が何を渡せばいいか分からなくなった
 */

// ❌ 過剰に汎用的な Button（何でもできすぎて使いにくい）

interface ButtonProps_Bad {
  label?: string;
  icon?: string;
  iconPosition?: "left" | "right";
  variant?: "primary" | "secondary" | "danger" | "ghost" | "link";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  isDisabled?: boolean;
  loadingText?: string;
  leftIcon?: string;
  rightIcon?: string;
  fullWidth?: boolean;
  // ... まだまだ増える
}

// 使う側「どれを使えばいいの...？」

/**
 * 本を読んで気づいたこと：
 *
 * 汎用的すぎると「選択肢が多すぎて使いにくい」
 * 限定的すぎると「似たようなコンポーネントが増える」
 *
 * → 「よく使うパターン」を見つけて、適度に抽象化する
 */

// ✅ 基本の Button（シンプルなインターフェース）

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}

// 基本のButton
function Button(props: ButtonProps) {
  const { children, variant = "secondary", onClick, disabled, type = "button" } = props;

  const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-blue-500 text-white",
    secondary: "bg-gray-200 text-gray-800",
    danger: "bg-red-500 text-white",
  };

  return `<button
    type="${type}"
    class="${variantStyles[variant]}"
    ${disabled ? "disabled" : ""}
  >${children}</button>`;
}

// ✅ 特定用途のボタン（Buttonを使って作る）

interface SubmitButtonProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

// フォーム送信専用（よく使うパターンを抽出）
function SubmitButton(props: SubmitButtonProps) {
  const { isLoading, loadingText = "送信中...", children } = props;

  return Button({
    variant: "primary",
    type: "submit",
    disabled: isLoading,
    children: isLoading ? loadingText : children,
  });
}

interface DeleteButtonProps {
  onConfirm: () => void;
  children: React.ReactNode;
}

// 削除専用（確認ダイアログ付き）
function DeleteButton(props: DeleteButtonProps) {
  const { onConfirm, children } = props;

  function handleClick() {
    if (confirm("本当に削除しますか？")) {
      onConfirm();
    }
  }

  return Button({
    variant: "danger",
    onClick: handleClick,
    children,
  });
}

// ============================================================
// 気づき4：ディレクトリ構成の考え方
// ============================================================

/**
 * 最初は「種類別」に分けてた
 *
 * src/
 *   components/   ← 全コンポーネント
 *   hooks/        ← 全フック
 *   utils/        ← 全ユーティリティ
 *
 * でも大きくなると「このフックはどの機能用？」が分からなくなる
 */

/**
 * 本を読んで気づいたこと：
 *
 * 「種類別」と「機能別」を組み合わせる
 * - 汎用的なもの → 種類別（components/, hooks/, utils/）
 * - 限定的なもの → 機能別（features/xxx/）
 */

// ディレクトリ構成の例
const directoryStructure = `
src/
  // 汎用的なもの（どこからでも使える）
  components/
    Button.tsx
    Modal.tsx
    Input.tsx
  hooks/
    useUser.ts        // 基本的なユーザー取得
    useLocalStorage.ts
  utils/
    formatDate.ts
    formatCurrency.ts

  // 機能別（その機能内でのみ使う）
  features/
    auth/
      components/
        LoginForm.tsx
        SignupForm.tsx
      hooks/
        useAuth.ts      // 認証専用
      utils/
        validatePassword.ts

    user-profile/
      components/
        ProfileCard.tsx
        ActivityFeed.tsx
      hooks/
        useUserActivity.ts  // プロフィール専用

    shopping-cart/
      components/
        CartItem.tsx
        CartSummary.tsx
      hooks/
        useCart.ts      // カート専用
`;

// ============================================================
// 気づき5：関数の「汎用性」を見極める
// ============================================================

/**
 * 「この関数は汎用的？限定的？」を判断する基準が分かった
 *
 * チェックポイント：
 * 1. 他の機能でも使いそう？
 * 2. 変更理由は何？
 * 3. 依存しているものは何？
 */

// ✅ 汎用的な関数：utils/formatDate.ts

// どこでも使える（投稿日、更新日、誕生日...）
function formatDate(date: Date, format: "short" | "long" = "short"): string {
  const options: Intl.DateTimeFormatOptions =
    format === "short"
      ? { year: "numeric", month: "2-digit", day: "2-digit" }
      : { year: "numeric", month: "long", day: "numeric", weekday: "long" };

  return new Intl.DateTimeFormat("ja-JP", options).format(date);
}

// ✅ 限定的な関数：features/shopping-cart/utils/calculateTax.ts

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  taxRate: number; // 商品ごとの税率（軽減税率対応）
}

// カート専用（税率の計算ルールがカート固有）
function calculateCartTax(items: CartItem[]): number {
  return items.reduce((total, item) => {
    const itemTotal = item.price * item.quantity;
    return total + itemTotal * item.taxRate;
  }, 0);
}

// ✅ 汎用的に見えるけど実は限定的な例

// 一見汎用的に見える...
function calculateTotal_Bad(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// でも「カートの合計」と「注文履歴の合計」では
// 割引や税金の扱いが違うかもしれない
// → 安易に共通化しない方がいい場合もある

// ============================================================
// 気づき6：依存関係の方向を意識する
// ============================================================

/**
 * 本を読んで分かった大事なこと：
 *
 * 「誰が誰を呼び出せるか」には方向がある
 *
 * features/auth → components（OK：機能が汎用を使う）
 * components → features/auth（NG：汎用が特定機能に依存）
 */

// ❌ ダメな例：汎用コンポーネントが特定機能に依存

// components/Header.tsx
function Header_Bad() {
  // 汎用的なHeaderが、auth機能に直接依存してる
  // → auth機能がないプロジェクトで使えない
  const auth = useAuth_Feature(); // features/auth/hooks/useAuth.ts

  return `<header>${auth.user?.name}</header>`;
}

// ✅ 良い例：依存関係を逆転

// components/Header.tsx（汎用）
interface HeaderProps {
  userName?: string;
  onLogout?: () => void;
}

function Header(props: HeaderProps) {
  // Headerは「ユーザー名」と「ログアウト処理」を受け取るだけ
  // authの詳細は知らない
  return `<header>
    ${props.userName ?? "ゲスト"}
    ${props.onLogout ? '<button>ログアウト</button>' : ''}
  </header>`;
}

// features/auth/components/AuthHeader.tsx（限定的）
function AuthHeader() {
  const auth = useAuth_Feature();

  // auth機能がHeaderを使う（依存の方向が正しい）
  return Header({
    userName: auth.user?.name,
    onLogout: auth.logout,
  });
}

// ============================================================
// まとめ：第2章で学んだこと
// ============================================================

/**
 * 「共通化すればいい」じゃなかった！
 *
 * 判断基準：
 * 1. 誰が使うか？（全体？特定機能？）
 * 2. 変更理由は同じか？
 * 3. 依存関係の方向は正しいか？
 *
 * 配置の指針：
 * - 汎用的 → components/, hooks/, utils/
 * - 限定的 → features/xxx/
 *
 * これで「このコードどこに置けばいい？」が分かるようになった！
 */

// ============================================================
// 補足：インターフェースによる依存関係の整理
// ============================================================

/**
 * 第2章の後半で出てきた「インターフェースで抽象化」の例
 *
 * 支払い方法を例に、汎用的な設計を学んだ
 */

// 支払い方法のインターフェース
interface PaymentMethod {
  name: string;
  charge(amount: number): Promise<PaymentResult>;
  refund(transactionId: string, amount: number): Promise<void>;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  pending?: boolean;
}

// クレジットカード決済
class CreditCardPayment implements PaymentMethod {
  name = "クレジットカード";

  constructor(
    private cardNumber: string,
    private expiry: string,
    private cvv: string
  ) {}

  async charge(amount: number): Promise<PaymentResult> {
    console.log(`${amount}円をカードに請求`);
    return { success: true, transactionId: crypto.randomUUID() };
  }

  async refund(transactionId: string, amount: number): Promise<void> {
    console.log(`${transactionId}に${amount}円を返金`);
  }
}

// PayPay決済
class PayPayPayment implements PaymentMethod {
  name = "PayPay";

  constructor(private userId: string) {}

  async charge(amount: number): Promise<PaymentResult> {
    console.log(`PayPayで${amount}円を決済`);
    return { success: true, transactionId: crypto.randomUUID() };
  }

  async refund(transactionId: string, amount: number): Promise<void> {
    console.log(`PayPayで${amount}円を返金`);
  }
}

// 使う側は「PaymentMethod」として扱える
async function processPayment(
  payment: PaymentMethod,
  amount: number
): Promise<void> {
  console.log(`${payment.name}で決済を開始`);

  const result = await payment.charge(amount);
  if (result.success) {
    console.log(`決済成功: ${result.transactionId}`);
  } else {
    console.log("決済失敗");
  }
}

// ============================================================
// エクスポート（テスト用）
// ============================================================

// React.ReactNode の型定義（このファイル用）
declare namespace React {
  type ReactNode = string | number | boolean | null | undefined;
}

// useAuth のスタブ（型チェック用）
function useAuth_Feature() {
  return {
    user: null as User | null,
    logout: () => {},
  };
}

export {
  // Types
  User,
  UserWithActivity,
  UseUserState,
  UseUserActivityState,
  ButtonVariant,
  ButtonProps,
  SubmitButtonProps,
  DeleteButtonProps,
  CartItem,
  PaymentMethod,
  PaymentResult,
  // Functions
  formatError_Bad,
  formatNewBadge_Bad,
  formatWithColor,
  formatErrorMessage,
  formatNewBadge,
  useUser,
  useUserActivity,
  Button,
  SubmitButton,
  DeleteButton,
  formatDate,
  calculateCartTax,
  Header,
  AuthHeader,
  processPayment,
  // Classes
  CreditCardPayment,
  PayPayPayment,
  // Constants
  directoryStructure,
};
