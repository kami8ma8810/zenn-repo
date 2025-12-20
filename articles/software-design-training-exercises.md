---
title: "『ソフトウェア設計トレーニング』を読んで「設計完全に理解した」から「なにもわからない」に到達した話"
emoji: "🤯"
type: "tech"
topics: ["typescript", "react", "設計", "フロントエンド", "ポエム"]
published: false
---

# はじめに：私は設計を「完全に理解」していた

フロントエンドエンジニアとして1年ちょっと。TypeScriptもReactも一通り書けるようになった私は、**設計を完全に理解した**と思っていた。

- コンポーネントは小さく分割すればいい 👈 完全に理解した
- 共通化すれば再利用できる 👈 完全に理解した
- 短いコードは良いコード 👈 完全に理解した

そんな時、『わかる！ソフトウェア設計トレーニング』（足利聡太 著）という本を読んだ。

**結論から言うと、私は今「設計なにもわからない」状態になった。**

:::message
【エンジニア用語解説】
- **「完全に理解した」**: チュートリアルを終えた程度の理解
- **「なにもわからない」**: 本質的な問題に直面するほど深く理解が進んだ状態
- **「チョットデキル」**: 自分で1から作れる。または開発者本人
:::

この記事では、私が「完全に理解した」から「なにもわからない」にレベルアップした過程を、フロントエンドの具体例と一緒に共有したい。

---

# 第1章：「場合による」なにもわからない

## 完全に理解していた頃の私

- 設計は**センス**で決まる
- 「場合による」と言われたら**もう何も聞かない**
- **先輩のコードをコピペ**すれば間違いない

完全に理解していた。

## 本を読んで「なにもわからない」になった

この本で初めて知ったのが、設計には3つの要素があるということ。

| 用語 | 意味 | 例 |
|------|------|-----|
| **設計理論** | どんな場面でも使える普遍的な知識 | 関心の分離、依存関係の整理 |
| **ドメイン知識** | 今解いている問題固有の知識 | このアプリは誰が使う？予算は？ |
| **設計判断** | 理論 × 知識 で下す具体的な判断 | このコンポーネントは分割すべきか |

**「場合による」は逃げ言葉じゃなかった。**

設計理論という「地図」と、ドメイン知識という「コンパス」がないと、そもそも判断ができない。私は地図もコンパスも持ってなかった。なにもわからない。

## 具体例：いいねボタンで理解した「なにもわからない」

私が最初に書いてたコード。

```tsx
// 完全に理解していた頃の私のコード
function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await api.likePost(postId);  // APIを待ってから
      setLiked(true);              // UIを更新
    } catch (e) {
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? '...' : liked ? '❤️' : '🤍'}
    </button>
  );
}
```

**「APIを呼んでから結果を反映する」完全に理解していた。**

でも実際に使うと、いいね押すたびに「...」が表示されてUXが悪い。レビューで「楽観的更新にして」と言われた。

**楽観的更新？なにもわからない。**

本を読んで分かった。同期/非同期の判断には**ドメイン知識**が必要だった。

- いいねは**失敗しても大惨事にはならない**（銀行振込とは違う）
- でも**反応速度は超重要**（押した瞬間に変わってほしい）

```tsx
// 「なにもわからない」に到達してから書いたコード
function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);

  const handleClick = async () => {
    // 先にUIを更新（楽観的更新）
    setLiked((prev) => !prev);

    try {
      await api.likePost(postId);
    } catch (e) {
      // 失敗したら戻す
      setLiked((prev) => !prev);
    }
  };

  return (
    <button onClick={handleClick}>
      {liked ? '❤️' : '🤍'}
    </button>
  );
}
```

**これが「設計判断」だった。** 理論（楽観的更新というパターン）× 知識（いいねは失敗OK）= 判断。

先輩のコードをコピペしても、この判断基準を理解してなければ意味がない。先輩のプロジェクトでは銀行振込を扱ってたから同期処理が正解だったかもしれない。文脈が違う。

**設計理論を知らないと選択肢が分からない。ドメイン知識を知らないと判断基準が分からない。なにもわからない。**

---

# 第2章：「共通化」なにもわからない

## 完全に理解していた頃の私

- **共通化**すればするほど良い
- **utils**に入れとけば再利用できる
- 同じコードが2回出てきたら**即共通化**

完全に理解していた。

## 本を読んで「なにもわからない」になった

モジュールには2種類ある。

| タイプ | 特徴 | 例 |
|--------|------|-----|
| **汎用的** | どこからでも呼べる、文脈を持たない | `formatDate()`, `Button` |
| **限定的** | 特定の場所からしか呼ばない、文脈を持つ | `UserProfileHeader`, `useCartItems` |

**問題は、この2つを混同すること。**

私は全部「汎用的」だと思って`hooks/`に突っ込んでた。なにもわからない。

## 具体例：カスタムフックで理解した「なにもわからない」

私が最初に書いてたコード。

```tsx
// 完全に理解していた頃：「汎用的なフック作った！天才！」

// hooks/useData.ts に置いた
export function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading };
}
```

**「汎用的なフェッチフック、完全に理解した」**

でも実際にユーザー機能を作ると…

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data: user } = useData<User>(`/api/users/${userId}`);

  // あれ、ユーザー固有のロジックどこに書くの…？
  // - オンライン状態の監視
  // - プロフィール画像のキャッシュ
  // - フォロー中かどうかのチェック

  // useDataには入れられないし、ここに書くと汚いし…
  // なにもわからない
}
```

本を読んで分かった。**「誰が使うか」で設計が変わる。**

```tsx
// 限定的なフック：ユーザー機能専用
// features/user/hooks/useUser.ts
export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    fetchUser(userId).then(setUser);
    const unsubscribe = subscribeToOnlineStatus(userId, setIsOnline);
    return unsubscribe;
  }, [userId]);

  return { user, isOnline };
}

// 汎用的なフック：どこでも使える
// hooks/useFetch.ts
export function useFetch<T>(url: string) {
  // シンプルなfetchロジックのみ
  // ドメイン知識を含まない
}
```

**配置場所も変わる。**

```
src/
├── components/        # 汎用：アプリ全体で使う
│   └── Button.tsx
├── hooks/             # 汎用：アプリ全体で使う
│   └── useFetch.ts
└── features/
    ├── user/          # 限定：ユーザー機能でのみ使う
    │   ├── useUser.ts
    │   └── UserCard.tsx
    └── cart/          # 限定：カート機能でのみ使う
        ├── useCart.ts
        └── CartItem.tsx
```

**「共通化 = 良いこと」ではなかった。** 誰が使うかで、汎用的か限定的かを決める。

完全に理解していた私は、全部`hooks/`に入れて「共通化できた！」と思ってた。なにもわからない。

---

# 第3章：「短いコード」なにもわからない

## 完全に理解していた頃の私

- **短いコード** = 良いコード
- **ワンライナー**で書けたらカッコいい
- テストカバレッジ**80%**目指せばOK

完全に理解していた。

## 本を読んで「なにもわからない」になった

本で知った**グッドハートの法則**。

> 指標が目標になると、その指標は良い指標ではなくなる

つまり「行数を減らす」を目標にすると、読みにくいコードになる。「カバレッジ80%」を目標にすると、意味のないテストを書いてしまう。

**「短いコード = 良いコード」は指標と目標を混同していた。** なにもわからない。

## 具体例：ワンライナーで理解した「なにもわからない」

私が最初に書いてたコード。

```tsx
// 完全に理解していた頃：「ワンライナーで書けた！天才！」
const topUsers = users.filter(u => u.active && u.age >= 18 && !u.banned).map(u => ({ ...u, score: u.posts.reduce((s, p) => s + p.likes, 0) })).sort((a, b) => b.score - a.score).slice(0, 10);
```

レビューで「読みにくい」と言われた。

**「え？短いのに？」**

本を読んで分かった。**品質 → 目標 → 手段**の順で考える必要がある。

```
品質（本当に達成したいこと）：保守しやすいコード
  ↓
目標（品質を測る指標）：可読性、テスタビリティ
  ↓
手段（目標を達成する方法）：適切な関数分割、命名
```

「行数を減らす」は手段にすらなってなかった。

```tsx
// 「なにもわからない」に到達してから書いたコード

function isEligibleUser(user: User): boolean {
  return user.active && user.age >= 18 && !user.banned;
}

function calculateUserScore(user: User): number {
  return user.posts.reduce((sum, post) => sum + post.likes, 0);
}

function getTopUsers(users: User[], limit = 10) {
  return users
    .filter(isEligibleUser)
    .map((user) => ({ ...user, score: calculateUserScore(user) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

行数は増えた。でも…

- 各関数が**単体でテストできる**
- 何をしているか**名前で分かる**
- 修正時に**影響範囲が明確**

**「短いコード = 良いコード」は完全に間違いだった。** なにもわからない。

## おまけ：「コンポーネント100行以内」ルールの罠

チームで「コンポーネントは100行以内」というルールがあった。私は必死に100行に収めようとした。

```tsx
// 完全に理解していた頃：「100行以内にした！ルール守った！」
// 10個のファイルに分散して、かえって追いにくくなった

// UserProfile.tsx (100行)
// UserProfileHeader.tsx (50行)
// UserProfileStats.tsx (30行)
// UserProfileBio.tsx (40行)
// ...
```

**「100行以内」は目標であって品質じゃなかった。**

本当に考えるべきは「このコンポーネントは何をしているか」「変更しやすいか」。行数はその結果でしかない。

目標と手段を混同していた。なにもわからない。

---

# 第4章：「抽象化」なにもわからない

## 完全に理解していた頃の私

- **抽象化**すればするほど良い
- **汎用コンポーネント**を作れば再利用できる
- **パターン**を適用すればきれいになる

完全に理解していた。

## 本を読んで「なにもわからない」になった

本で知った**「漏れのある抽象化」**。

抽象化は「呼び出し側が詳細を知らなくても使える」状態を目指す。でも、**詳細を知らないと正しく使えないなら、それは「漏れている」**。

私が作った汎用コンポーネント、全部漏れてた。なにもわからない。

## 具体例：汎用Modalで理解した「なにもわからない」

私が最初に作ったModal。

```tsx
// 完全に理解していた頃：「汎用Modal作った！何でも使える！天才！」
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
  zIndex?: number;
  // ... propsが30個くらいある
}
```

使う側。

```tsx
// 使う人「...これどう使えばいいの？」
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  closeOnOverlayClick={false}  // なぜfalse？
  closeOnEscape={true}         // これは何？
  size="lg"                    // lgって何px？
  zIndex={1000}                // 1000でいいの？
>
```

**呼び出し側がModalの内部実装を知らないと使えない。漏れのある抽象化だった。**

本を読んで分かった。**目的に応じた限定的なコンポーネントを作る方が良いケースもある。**

```tsx
// 「なにもわからない」に到達してから作ったコンポーネント

// 確認ダイアログ専用（目的が明確）
function ConfirmDialog({ isOpen, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen}>
      <p>{message}</p>
      <button onClick={onCancel}>キャンセル</button>
      <button onClick={onConfirm}>OK</button>
    </Dialog>
  );
}

// フォーム用Modal専用
function FormModal({ isOpen, title, children, onSubmit, onCancel }: FormModalProps) {
  // フォームに特化した実装
}
```

**「汎用的に作れば再利用できる」は間違いだった。** 汎用的すぎると使いにくい。なにもわからない。

## もうひとつ：YAGNIで理解した「なにもわからない」

「将来使うかも」と思って汎用化しすぎた例。

```tsx
// 完全に理解していた頃：「将来の拡張に備えた設計！天才！」

// 現在の要件：年齢による割引のみ

interface DiscountStrategy {
  calculate(price: number): number;
}

class ChildDiscount implements DiscountStrategy { ... }
class SeniorDiscount implements DiscountStrategy { ... }
class NoDiscount implements DiscountStrategy { ... }

class DiscountStrategyFactory {
  create(user: User): DiscountStrategy { ... }
}

// クラス5個作った！完璧！
```

**「将来使うかも」で5個もクラス作ったけど、2年経っても使わなかった。**

本で知った**YAGNI（You Aren't Gonna Need It）**。今必要ないものは作らない。

```tsx
// 「なにもわからない」に到達してから書いたコード

function calculateDiscountRate(age: number): number {
  if (age < 18) return 0.2;
  if (age >= 65) return 0.15;
  return 0;
}

// 将来「会員ランク割引」が追加されたら、その時に設計を見直す
```

**必要になった時点でリファクタリングする方が、正確な設計ができる。**

「将来のため」と思って作った抽象化は、たいてい間違っている。なにもわからない。

---

# まとめ：設計「なにもわからない」に到達した

この本を読んで、私は確実にレベルアップした。

| 前（完全に理解した） | 後（なにもわからない） |
|----|-----|
| 設計は**センス** | 設計は**学べるスキル** |
| 「場合による」で**思考停止** | 「場合による」には**根拠がある** |
| **短いコード** = 良いコード | **品質 → 目標 → 手段**の順で考える |
| **抽象化**すればするほど良い | **必要な分だけ**抽象化する |
| **共通化** = 正義 | **誰が使うか**で設計が変わる |

**「完全に理解した」状態では、判断基準を持っていなかった。**

**「なにもわからない」状態になって初めて、判断基準が見えてきた。**

まだ「チョットデキル」には程遠い。でも、「なにもわからない」に到達できたことで、設計で悩んだ時に**何を考えればいいか**が分かるようになった。

---

# 最後に

設計で悩んでいるエンジニアの人へ。

**「完全に理解した」と思っているなら、多分まだ「完全に理解した」フェーズにいる。**

この本を読むと、きっと「なにもわからない」にレベルアップできる。

「なにもわからない」は、成長の証。

---

# 参考文献

- 『わかる！ソフトウェア設計トレーニング』足利聡太 著

---

設計、なにもわからない。でも、それでいい。🙌
