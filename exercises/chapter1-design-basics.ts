/**
 * 第1章：設計を語ろう
 *
 * この章で気づいたこと：
 * 「設計はセンスや経験だけじゃなくて、ちゃんと理論があった！」
 *
 * 設計理論 × ドメイン知識 = 設計判断
 *
 * 今までは先輩のコードを意味も分からずコピーしてたけど、
 * この公式を知ってから「なぜそうするのか」が分かるようになってきた
 */

// ============================================================
// 気づき1：「設計理論」と「ドメイン知識」は別物だった
// ============================================================

/**
 * 最初に書いてたコード：ドメイン知識だけで設計してた
 *
 * 「いいねボタンは押したらすぐ反映される」っていう
 * UIの常識だけで作ってしまった例
 */

interface LikeButtonProps_Bad {
  postId: string;
  initialLikes: number;
}

// ❌ 僕が最初に書いてたコード
function useLikeButton_Bad(props: LikeButtonProps_Bad) {
  // 状態管理
  let likes = props.initialLikes;
  let isLiked = false;

  async function handleLike() {
    // 問題1: APIを呼んでから状態を更新してた
    // → ユーザーが「押しても反応しない」と感じる
    const response = await fetch(`/api/posts/${props.postId}/like`, {
      method: "POST",
    });

    if (response.ok) {
      likes += 1;
      isLiked = true;
    }
    // 問題2: エラーハンドリングがない
    // 問題3: 連打されたときの対策がない
  }

  return { likes, isLiked, handleLike };
}

/**
 * 本を読んで気づいたこと：
 *
 * 「楽観的UI更新」は設計理論（どのシステムでも使えるパターン）
 * 「いいねの仕様」はドメイン知識（このアプリ固有の知識）
 *
 * この2つを組み合わせて「設計判断」をする必要があった！
 */

// ✅ 設計理論を学んでから書いたコード

interface LikeState {
  count: number;
  isLiked: boolean;
  isPending: boolean;
}

interface LikeButtonProps {
  postId: string;
  initialCount: number;
  initialIsLiked: boolean;
}

// 楽観的UI更新のパターンを適用
function useLikeButton(props: LikeButtonProps) {
  // 状態を構造化（設計理論：状態は一箇所にまとめる）
  const state: LikeState = {
    count: props.initialCount,
    isLiked: props.initialIsLiked,
    isPending: false,
  };

  // 前の状態を保存しておく（ロールバック用）
  let previousState: LikeState | null = null;

  async function toggleLike() {
    // 連打防止（設計理論：冪等性の確保）
    if (state.isPending) return;

    // 楽観的に更新（設計理論：レスポンシブなUI）
    previousState = { ...state };
    state.isPending = true;
    state.isLiked = !state.isLiked;
    state.count += state.isLiked ? 1 : -1;

    try {
      const response = await fetch(`/api/posts/${props.postId}/like`, {
        method: state.isLiked ? "POST" : "DELETE",
      });

      if (!response.ok) {
        throw new Error("API Error");
      }
    } catch {
      // 失敗したらロールバック（設計理論：エラーリカバリ）
      if (previousState) {
        state.count = previousState.count;
        state.isLiked = previousState.isLiked;
      }
    } finally {
      state.isPending = false;
      previousState = null;
    }
  }

  return { state, toggleLike };
}

// ============================================================
// 気づき2：「場合による」には根拠がある
// ============================================================

/**
 * 先輩に「これ同期でやるべき？非同期でやるべき？」って聞いたら
 * 「場合による」って言われて困ってた
 *
 * 本を読んで分かったこと：
 * 「場合による」の「場合」には明確な判断基準がある！
 *
 * 判断基準：
 * 1. ユーザーが結果を待つ必要があるか？
 * 2. 失敗したときにロールバックが必要か？
 * 3. 処理に時間がかかるか？
 */

// パターン1: フォームのバリデーション → 同期（結果を待つ必要あり）
interface FormData {
  email: string;
  password: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

function validateForm(data: FormData): ValidationResult {
  const errors: Record<string, string> = {};

  // バリデーションは同期で即座に結果を返す
  // 理由：ユーザーは入力後すぐにエラーを知りたい
  if (!data.email.includes("@")) {
    errors.email = "メールアドレスの形式が正しくありません";
  }

  if (data.password.length < 8) {
    errors.password = "パスワードは8文字以上必要です";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// パターン2: フォーム送信 → 非同期だけど結果は待つ
interface SubmitResult {
  success: boolean;
  userId?: string;
  error?: string;
}

async function submitRegistrationForm(data: FormData): Promise<SubmitResult> {
  // まず同期でバリデーション
  const validation = validateForm(data);
  if (!validation.isValid) {
    return { success: false, error: "入力内容を確認してください" };
  }

  // API呼び出しは非同期だけど、結果を待って画面遷移を決める
  // 理由：登録成功/失敗でユーザーに見せる画面が変わる
  try {
    const response = await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, userId: result.userId };
    } else {
      return { success: false, error: "登録に失敗しました" };
    }
  } catch {
    return { success: false, error: "通信エラーが発生しました" };
  }
}

// パターン3: 画像アップロード → 非同期でプログレス表示
interface UploadProgress {
  status: "idle" | "uploading" | "success" | "error";
  progress: number; // 0-100
  url?: string;
  error?: string;
}

interface UploadCallbacks {
  onProgress: (progress: number) => void;
  onComplete: (url: string) => void;
  onError: (error: string) => void;
}

function createImageUploader() {
  const state: UploadProgress = {
    status: "idle",
    progress: 0,
  };

  async function upload(file: File, callbacks: UploadCallbacks): Promise<void> {
    // 処理時間が長いので、進捗を表示する（設計理論：フィードバック）
    // 結果を待たずにUIは操作可能にする（ドメイン知識：画像は後からでもOK）

    state.status = "uploading";
    state.progress = 0;

    try {
      const formData = new FormData();
      formData.append("file", file);

      // XMLHttpRequestで進捗を取得（fetchだと進捗が取れない）
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          state.progress = percent;
          callbacks.onProgress(percent);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          state.status = "success";
          state.url = result.url;
          callbacks.onComplete(result.url);
        } else {
          state.status = "error";
          state.error = "アップロードに失敗しました";
          callbacks.onError(state.error);
        }
      });

      xhr.addEventListener("error", () => {
        state.status = "error";
        state.error = "通信エラーが発生しました";
        callbacks.onError(state.error);
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    } catch {
      state.status = "error";
      state.error = "アップロードに失敗しました";
      callbacks.onError(state.error);
    }
  }

  return { state, upload };
}

// ============================================================
// 気づき3：先輩のコードを「意味なくコピー」してた
// ============================================================

/**
 * 先輩のコードでよく見る AbortController
 * 最初は「なんか難しそう」って思ってスルーしてた
 *
 * 本を読んで気づいたこと：
 * これは「キャンセル可能な非同期処理」という設計理論の実装だった！
 *
 * ドメイン知識：検索中に別の文字を入力したら、前の検索は不要
 * 設計理論：不要になった処理はキャンセルすべき
 * 設計判断：AbortController でキャンセル可能にする
 */

interface SearchResult {
  id: string;
  title: string;
}

// ❌ 最初の実装：キャンセルなし
async function searchProducts_Bad(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  // 問題：古いリクエストの結果が後から返ってきて
  // 新しい検索結果を上書きしてしまうことがある
  return response.json();
}

// ✅ 設計理論を理解してから書いたコード
function createSearchHandler() {
  let abortController: AbortController | null = null;

  async function search(query: string): Promise<SearchResult[]> {
    // 前のリクエストをキャンセル（設計理論：不要な処理の停止）
    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`,
        { signal: abortController.signal }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      return await response.json();
    } catch (error) {
      // AbortError は正常なキャンセルなのでエラーとして扱わない
      if (error instanceof Error && error.name === "AbortError") {
        return []; // または前の結果を維持
      }
      throw error;
    }
  }

  function cancel() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  return { search, cancel };
}

// ============================================================
// 気づき4：設計理論を知ると「なぜ」が分かる
// ============================================================

/**
 * 設計理論の例：「単一責任の原則」
 *
 * 最初はルール暗記だと思ってた
 * でも実際は「変更理由が1つになる」ことで
 * 変更時の影響範囲を限定できるという実用的なメリットがある
 */

// ❌ 複数の責任が混在したフック
function useUserProfile_Bad(userId: string) {
  // 1. データの取得（責任1）
  // 2. フォームの状態管理（責任2）
  // 3. バリデーション（責任3）
  // 4. 保存処理（責任4）
  // → 1つを変更すると他に影響が出る可能性あり

  return {
    /* ... */
  };
}

// ✅ 責任を分離したフック

// データ取得の責任
interface UserProfile {
  id: string;
  name: string;
  email: string;
  bio: string;
}

interface UserProfileState {
  data: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

function useUserData(userId: string) {
  const state: UserProfileState = {
    data: null,
    isLoading: true,
    error: null,
  };

  async function fetchUser() {
    state.isLoading = true;
    try {
      const response = await fetch(`/api/users/${userId}`);
      state.data = await response.json();
    } catch {
      state.error = "ユーザー情報の取得に失敗しました";
    } finally {
      state.isLoading = false;
    }
  }

  return { state, fetchUser };
}

// フォーム状態管理の責任
interface FormState<T> {
  values: T;
  isDirty: boolean;
  touchedFields: Set<keyof T>;
}

function useForm<T extends Record<string, unknown>>(initialValues: T) {
  const state: FormState<T> = {
    values: { ...initialValues },
    isDirty: false,
    touchedFields: new Set(),
  };

  function setValue<K extends keyof T>(key: K, value: T[K]) {
    state.values[key] = value;
    state.isDirty = true;
    state.touchedFields.add(key);
  }

  function reset() {
    state.values = { ...initialValues };
    state.isDirty = false;
    state.touchedFields.clear();
  }

  return { state, setValue, reset };
}

// バリデーションの責任
type ValidationRule<T> = (value: T) => string | null;

function useValidation<T extends Record<string, unknown>>(
  rules: Partial<Record<keyof T, ValidationRule<T[keyof T]>>>
) {
  function validate(values: T): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const [key, rule] of Object.entries(rules)) {
      if (rule) {
        const error = rule(values[key as keyof T]);
        if (error) {
          errors[key] = error;
        }
      }
    }

    return errors;
  }

  return { validate };
}

// ============================================================
// まとめ：第1章で学んだ公式
// ============================================================

/**
 * 設計理論 × ドメイン知識 = 設計判断
 *
 * 設計理論：どのプロジェクトでも使える一般的なパターン
 * - 楽観的UI更新
 * - キャンセル可能な非同期処理
 * - 単一責任の原則
 * - エラーリカバリ
 *
 * ドメイン知識：このアプリ固有の仕様
 * - いいねは即座にUIに反映したい
 * - 検索は最新の結果だけ表示したい
 * - 登録は成功/失敗で画面遷移が変わる
 *
 * この2つを組み合わせて「設計判断」ができるようになった！
 */

// ============================================================
// エクスポート（テスト用）
// ============================================================

export {
  // Types
  LikeState,
  LikeButtonProps,
  FormData,
  ValidationResult,
  SubmitResult,
  UploadProgress,
  UploadCallbacks,
  SearchResult,
  UserProfile,
  UserProfileState,
  FormState,
  ValidationRule,
  // Functions
  useLikeButton_Bad,
  useLikeButton,
  validateForm,
  submitRegistrationForm,
  createImageUploader,
  searchProducts_Bad,
  createSearchHandler,
  useUserData,
  useForm,
  useValidation,
};
