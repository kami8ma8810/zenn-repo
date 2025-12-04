# X-Clipper E2Eテスト調査計画書

## 概要

Chrome DevTools MCP を活用して、実際の X（Twitter）のポストを使った E2E テストシステムを構築するための調査計画。

## 調査目的

1. 現在のテスト構成を理解する
2. テストすべきポストのパターンを網羅的に洗い出す
3. Chrome DevTools MCP の機能を理解し、テストへの活用方法を検討する
4. 実装計画を策定する

---

## 調査項目

### 1. 現在のコードベース調査

- [x] 既存のテストファイル構成
- [x] Content Script の処理フロー
- [x] 抽出対象のデータ構造（Tweet 型など）
- [x] 現在のテスト方法（モック / 実際のDOM / etc.）

### 2. テスト対象ポストパターンの洗い出し

#### ユーザー提示のパターン
- [x] 通常のポスト
- [x] 通常のポスト＋同一人物による返信（スレッド）
- [x] 通常のポスト+画像添付（1枚または複数枚）
- [x] 通常のポスト+動画またはGIF添付
- [x] 引用ポスト+引用元に画像なし
- [x] 引用ポスト+引用元に画像がある
- [x] 引用ポスト+引用元に動画またはGIFがある
- [x] 引用ポスト+同一人物による返信（スレッド）
- [x] 引用ポスト+引用元で投稿者が返信している場合の除外

#### 追加調査が必要なパターン（候補）
- [x] リポスト（リツイート）
- [x] 投票（Poll）付きポスト
- [x] スペースへのリンク付きポスト
- [x] 外部リンクカード付きポスト
- [x] メンション付きポスト
- [x] ハッシュタグ付きポスト
- [x] 長文ポスト（Note / Long-form）
- [x] 削除済み / 非公開アカウントの引用
- [x] センシティブコンテンツ警告付きポスト
- [x] コミュニティノート付きポスト
- [x] 返信制限付きポスト
- [x] 認証バッジ付きアカウントのポスト
- [x] 広告ポスト（Promoted）
- [x] ブックマーク/いいね済みの状態

### 3. Chrome DevTools MCP 機能調査

- [x] 利用可能なツール一覧
- [x] スナップショット取得方法
- [x] DOM 操作方法
- [x] スクリーンショット機能
- [x] ネットワークリクエスト監視機能

---

## 調査結果

### 1. 現在のコードベース

#### 1.1 テスト構成

| 項目 | 内容 |
|-----|------|
| **フレームワーク** | Vitest v4.0.14 |
| **テストファイル数** | 7 ファイル |
| **テスト数** | 150 テスト（全PASS） |
| **実行時間** | 約 220ms |
| **テストディレクトリ** | `tests/unit/` |

#### 1.2 テストファイル一覧

| ファイル | テスト数 | 対象モジュール |
|---------|--------|--------------|
| color-contrast.test.ts | 23 | lib/color-contrast.ts |
| errors.test.ts | 16 | lib/errors.ts |
| obsidian-api.test.ts | 12 | lib/obsidian-api.ts |
| storage.test.ts | 7 | lib/storage.ts |
| tag-manager.test.ts | 23 | lib/tag-manager.ts |
| thread-utils.test.ts | 5 | lib/thread-utils.ts |
| tweet-parser.test.ts | 64 | lib/tweet-parser.ts |

#### 1.3 テストカバレッジの現状

**✅ テスト済み**
- lib/color-contrast.ts（色彩コントラスト計算）
- lib/errors.ts（エラーハンドリング）
- lib/obsidian-api.ts（API通信）
- lib/storage.ts（Chrome Storage）
- lib/tag-manager.ts（タグ管理）
- lib/thread-utils.ts（スレッド判定）
- lib/tweet-parser.ts（ツイート形式変換）

**❌ テスト未実装**
- content/content-script.ts（DOM操作、データ抽出）← **今回の主要対象**
- background/service-worker.ts（バックグラウンド処理）
- popup/popup.ts（ポップアップUI）
- onboarding/onboarding.ts（オンボーディングUI）

#### 1.4 モック使用状況

```typescript
// Chrome API モック
vi.stubGlobal('chrome', {
  storage: { local: { get: vi.fn(), set: vi.fn() } },
  i18n: { getMessage: vi.fn(), getUILanguage: () => 'ja' }
})

// fetch API モック
vi.stubGlobal('fetch', vi.fn())
```

---

### 2. データ構造

#### 2.1 主要な型定義

```typescript
// TweetData: メインツイートの型
interface TweetData {
  id: string
  text: string
  authorUsername: string
  authorName: string
  authorBio?: string
  url: string
  createdAt?: string
  images: string[]
  hasVideo?: boolean
  hasAnimatedGif?: boolean
  quotedTweet?: QuotedTweetData
}

// QuotedTweetData: 引用ツイートの型
interface QuotedTweetData {
  text: string
  url: string
  authorUsername: string
  images?: string[]
  hasVideo?: boolean
  hasAnimatedGif?: boolean
}

// ThreadData: スレッドの型
interface ThreadData {
  authorUsername: string
  authorName: string
  authorBio?: string
  tweets: TweetData[]
  originalUrl: string
}
```

#### 2.2 Content Script 内部型

```typescript
// Content Script で使用する画像データ
interface TweetImageData {
  tweetId: string
  imageUrls: string[]
  authorBio?: string
  hasVideo: boolean
  hasAnimatedGif: boolean
  quotedTweet?: QuotedTweetData
}
```

---

### 3. Content Script 抽出ロジック

#### 3.1 DOM セレクタ

| 要素 | セレクタ |
|-----|---------|
| ツイート | `article[data-testid="tweet"]` |
| テキスト本文 | `[data-testid="tweetText"]` |
| ユーザー名 | `[data-testid="User-Name"]` |
| BIO | `[data-testid="UserDescription"]` |
| 投稿日時 | `time[datetime]` |
| 画像 | `img[src*="pbs.twimg.com/media"]` |
| 動画 | `video` |
| GIF | `[aria-label*="GIF"]`, `[data-testid="tweetGif"]` |
| 引用ツイート | `[data-testid="quoteTweet"]`, `[role="link"]:has([data-testid="tweetText"])` |

#### 3.2 React Fiber からの URL 取得

```typescript
// 引用ツイート URL を React Fiber から取得
function getQuotedUrlFromReactFiber(element: Element): string | undefined {
  const fiberKey = Object.keys(element).find(key => key.startsWith('__reactFiber'))
  const fiber = (element as any)[fiberKey]
  return fiber?.return?.memoizedProps?.link?.pathname
}
```

#### 3.3 フォールバック戦略

```
優先順位 1: React Fiber から URL を取得（最確実）
     ↓
優先順位 2: DOM から role="link" + tweetText を探す（新しい構造）
     ↓
優先順位 3: data-testid="quoteTweet" や card.wrapper（従来の方法）
     ↓
優先順位 4: UserAvatar-Container- や User-Name から著者情報を抽出
```

---

### 4. ポストパターン詳細分析

#### 4.1 ユーザー提示パターン（必須テスト対象）

| No | パターン | 現在の対応状況 | テスト優先度 |
|----|---------|--------------|------------|
| 1 | 通常のポスト | ✅ 完全対応 | 高 |
| 2 | 通常のポスト＋スレッド | ✅ 完全対応 | 高 |
| 3 | 通常のポスト＋画像（1枚） | ✅ 完全対応 | 高 |
| 4 | 通常のポスト＋画像（複数枚） | ✅ 完全対応 | 高 |
| 5 | 通常のポスト＋動画 | ⚠️ 警告のみ（DL不可） | 中 |
| 6 | 通常のポスト＋GIF | ⚠️ 警告のみ（DL不可） | 中 |
| 7 | 引用ポスト（引用元：テキストのみ） | ✅ 完全対応 | 高 |
| 8 | 引用ポスト（引用元：画像あり） | ✅ 完全対応 | 高 |
| 9 | 引用ポスト（引用元：動画/GIF） | ⚠️ 警告のみ | 中 |
| 10 | 引用ポスト＋スレッド | ✅ 完全対応 | 高 |
| 11 | 引用ポスト＋引用元で投稿者が返信 | 🔍 要確認 | 高 |

#### 4.2 追加調査パターン

| No | パターン | 対応状況 | テスト必要性 | 備考 |
|----|---------|---------|------------|------|
| 12 | リポスト（RT） | ⚠️ 未対応 | 低 | 元ツイートのURLで保存推奨 |
| 13 | 投票（Poll）付き | ❌ 未対応 | 低 | 投票結果は取得不可 |
| 14 | スペースへのリンク | ❌ 未対応 | 低 | ストリーム内容は取得不可 |
| 15 | 外部リンクカード | ⚠️ 部分対応 | 中 | URLのみ抽出、サムネイル不可 |
| 16 | メンション付き | ✅ 対応 | 低 | テキストに含まれる |
| 17 | ハッシュタグ付き | ✅ 対応 | 低 | テキストに含まれる |
| 18 | 長文ポスト（Note） | 🔍 要検証 | 中 | 展開が必要な場合あり |
| 19 | 削除済み引用 | ⚠️ 部分対応 | 中 | 「このツイートは削除されました」表示 |
| 20 | 非公開アカウントの引用 | ⚠️ 部分対応 | 中 | 閲覧権限による |
| 21 | センシティブコンテンツ | 🔍 要検証 | 中 | 警告表示のクリック要否 |
| 22 | コミュニティノート付き | ⚠️ 部分対応 | 低 | 注釈テキストは別要素 |
| 23 | 返信制限付き | ✅ 対応 | 低 | 本文抽出に影響なし |
| 24 | 認証バッジ付き | ✅ 対応 | 低 | 本文抽出に影響なし |
| 25 | 広告ポスト | ❌ 除外推奨 | 低 | テスト対象外 |
| 26 | ブックマーク/いいね済み | ✅ 対応 | 低 | 状態は抽出に無関係 |

#### 4.3 テスト優先度マトリクス

```
高優先度（必須）:
├── 通常のポスト（テキストのみ）
├── 通常のポスト＋画像（1枚）
├── 通常のポスト＋画像（複数枚）
├── 通常のポスト＋スレッド
├── 引用ポスト（テキストのみ）
├── 引用ポスト＋引用元画像
└── 引用ポスト＋スレッド

中優先度（推奨）:
├── 通常のポスト＋動画
├── 通常のポスト＋GIF
├── 引用ポスト＋引用元動画/GIF
├── 外部リンクカード付き
├── 長文ポスト（Note）
├── 削除済み/非公開の引用
└── センシティブコンテンツ

低優先度（オプショナル）:
├── リポスト（RT）
├── 投票（Poll）付き
├── スペースへのリンク
└── その他
```

---

### 5. Chrome DevTools MCP 機能

#### 5.1 利用可能なツール一覧

| カテゴリ | ツール名 | 用途 |
|---------|---------|------|
| **ページ操作** | `navigate_page` | URLへの遷移 |
| | `new_page` | 新規ページ作成 |
| | `select_page` | ページ選択 |
| | `list_pages` | ページ一覧取得 |
| | `close_page` | ページを閉じる |
| | `resize_page` | ウィンドウサイズ変更 |
| **DOM操作** | `take_snapshot` | A11Yツリーのテキストスナップショット取得 |
| | `click` | 要素クリック |
| | `fill` | テキスト入力 |
| | `fill_form` | フォーム一括入力 |
| | `hover` | ホバー |
| | `drag` | ドラッグ&ドロップ |
| | `press_key` | キー入力 |
| **JavaScript** | `evaluate_script` | JavaScript実行 |
| **スクリーンショット** | `take_screenshot` | スクリーンショット取得 |
| **ネットワーク** | `list_network_requests` | リクエスト一覧 |
| | `get_network_request` | リクエスト詳細 |
| **コンソール** | `list_console_messages` | コンソールログ一覧 |
| | `get_console_message` | ログ詳細 |
| **パフォーマンス** | `performance_start_trace` | トレース開始 |
| | `performance_stop_trace` | トレース終了 |
| **ダイアログ** | `handle_dialog` | アラート処理 |
| **エミュレーション** | `emulate` | ネットワーク/位置情報エミュレーション |
| **ファイル** | `upload_file` | ファイルアップロード |
| **待機** | `wait_for` | テキスト出現まで待機 |

#### 5.2 テストに有用な機能

**1. `take_snapshot` - A11Yスナップショット取得**
```
用途: ページのDOM構造をテキストベースで取得
特徴:
- uid（一意識別子）付きの要素リストを取得
- その後のclick, fill等の操作でuidを使用
```

**2. `evaluate_script` - JavaScript実行**
```
用途: Content Script のロジックをテスト
特徴:
- 任意のJavaScriptを実行可能
- DOM操作、React Fiberアクセスなど
```

**3. `take_screenshot` - スクリーンショット取得**
```
用途: ビジュアルリグレッションテスト
オプション:
- fullPage: ページ全体をキャプチャ
- uid: 特定要素のみキャプチャ
- format: png/jpeg/webp
```

**4. `wait_for` - テキスト出現待機**
```
用途: 非同期コンテンツの読み込み待機
例: ツイートの読み込み完了を待つ
```

**5. `list_console_messages` / `get_console_message` - コンソールログ**
```
用途: エラー検出、デバッグログ確認
```

#### 5.3 テストワークフロー案

```
1. navigate_page → X のツイートURLへ遷移
2. wait_for → ツイート読み込み完了を待機
3. take_snapshot → DOM構造を取得
4. evaluate_script → Content Script の抽出ロジックを実行
5. (オプション) take_screenshot → ビジュアル確認
6. 結果を検証
```

---

### 6. 追加で発見されたポストパターン

調査の結果、以下の追加パターンが確認された：

#### 6.1 スレッド判定の特殊ケース

| ケース | 現在の動作 | 期待される動作 |
|--------|-----------|--------------|
| 他ユーザーの返信が間に入る | スレッド終了 | 継続すべき？ |
| 引用元で投稿者が返信 | 要確認 | 除外すべき |
| 自己リプライの連鎖が長い | 全取得 | 制限すべき？ |

#### 6.2 メディアの特殊ケース

| ケース | 現在の動作 | 備考 |
|--------|-----------|------|
| 4枚以上の画像 | 4枚まで取得 | Xの仕様上4枚が上限 |
| 混合メディア（画像+動画） | 両方検出 | 警告表示 |
| 外部埋め込み（YouTube等） | URLのみ | サムネイル不可 |

#### 6.3 アカウント状態の特殊ケース

| ケース | 現在の動作 | 備考 |
|--------|-----------|------|
| 凍結アカウントの引用 | 表示不可 | エラーハンドリング要 |
| 削除済みツイートの引用 | 「削除されました」表示 | 検出可能？ |
| 非公開アカウントの引用 | 閲覧権限による | テスト困難 |

---

## 実装計画（確定版）

### 決定事項
- **テスト実行方法**: `npm test:e2e` で自動実行可能なスクリプト
- **テスト用URL**: 公式アカウント（@X, @NASA など）のみ使用
- **引用元スレッド除外**: 引用されたツイートの投稿者がスレッドしている場合、そのスレッド部分は含めない

### ディレクトリ構造

```
tests/
├── unit/                    # 既存ユニットテスト（150件）
└── e2e/                     # E2E テスト（新規作成）
    ├── fixtures/
    │   └── tweet-urls.ts    # テスト用ツイートURL
    ├── helpers/
    │   ├── mcp-client.ts    # Chrome DevTools MCP クライアント
    │   ├── content-script-runner.ts  # Content Script 実行ヘルパー
    │   └── validators.ts    # 検証ユーティリティ
    ├── content-script.e2e.ts  # メインテストファイル
    └── vitest.e2e.config.ts   # E2E 専用 Vitest 設定
```

### Phase 1: テスト基盤構築

1. **ディレクトリ・設定ファイル作成**
   - `tests/e2e/` ディレクトリ作成
   - `tests/e2e/vitest.e2e.config.ts` 作成

2. **Chrome DevTools MCP クライアント実装**
   - `tests/e2e/helpers/mcp-client.ts` 作成
   - MCP ツールのラッパー関数を実装

3. **Content Script 実行ヘルパー実装**
   - `tests/e2e/helpers/content-script-runner.ts` 作成

### Phase 2: テスト用 URL 準備

4. **テストケース URL 収集**
   - `tests/e2e/fixtures/tweet-urls.ts` 作成
   - 公式アカウントから各パターンの URL を収集

5. **期待値データ作成**
   - 各テストケースの期待される抽出結果を定義

### Phase 3: テストケース実装

6. **基本テストケース**
   - 通常のポスト（テキストのみ/画像1枚/複数枚）
   - 動画/GIF付きポスト

7. **引用ツイートテストケース**
   - 引用元テキスト/URL/画像抽出
   - 引用元スレッド除外の検証

8. **スレッドテストケース**
   - 同一投稿者の連続ツイート抽出
   - 他ユーザー返信での終了

### Phase 4: npm scripts 追加

9. **package.json 更新**
   ```json
   {
     "scripts": {
       "test:e2e": "vitest run --config tests/e2e/vitest.e2e.config.ts"
     }
   }
   ```

---

---

## 実装進捗状況（2024-12-04時点）

### Phase 1: テスト基盤構築 ✅ 完了

| タスク | 状態 | 作成ファイル |
|-------|------|-------------|
| ディレクトリ構造作成 | ✅ 完了 | `tests/e2e/`, `tests/e2e/fixtures/`, `tests/e2e/helpers/` |
| Vitest E2E設定 | ✅ 完了 | `tests/e2e/vitest.e2e.config.ts` |
| 型定義・ヘルパー | ✅ 完了 | `tests/e2e/helpers/mcp-client.ts` |
| 抽出スクリプト | ✅ 完了 | `tests/e2e/helpers/extraction-scripts.ts` |
| テストケース定義 | ✅ 完了 | `tests/e2e/fixtures/tweet-urls.ts` |
| スラッシュコマンド | ✅ 完了 | `.claude/commands/run-e2e-test.md` |

### Phase 2: テストケース URL 収集 🚧 進行中

#### 収集済み URL（7件）

| ID | カテゴリ | URL | アカウント | 備考 |
|----|---------|-----|-----------|------|
| text-only-1 | 通常（テキストのみ） | `https://x.com/X/status/1989466513133506962` | @X | ✅ |
| single-image-1 | 画像1枚 | `https://x.com/NASA/status/1996334334236631458` | @NASA | ✅ |
| single-image-2 | 画像1枚 | `https://x.com/NASA/status/1995912441952137380` | @NASA | ✅ |
| multiple-images-1 | 画像複数枚 | `https://x.com/SpaceX/status/1995753099340755352` | @SpaceX | ✅ 2枚 |
| quote-with-video-1 | 引用（動画あり） | `https://x.com/X/status/1989466510918914495` | @X | ✅ |
| video-1 | 動画 | `https://x.com/JonnyKimUSA/status/1995806697026101319` | @JonnyKimUSA | ✅ |
| gif-1 | GIF | `https://x.com/GIPHY/status/1117281960387334147` | @GIPHY | ✅ |

#### 未収集 URL（6件）

| ID | カテゴリ | 優先度 | 備考 |
|----|---------|--------|------|
| quote-text-only-1 | 引用（テキストのみ） | 高 | テキストのみの引用ポストを探す |
| quote-with-image-1 | 引用（画像あり） | 高 | 引用元に画像があるポストを探す |
| thread-1 | スレッド | 高 | 同一投稿者による連投を探す |
| quote-with-gif-1 | 引用（GIFあり） | 中 | 引用元にGIFがあるポストを探す |
| quote-deleted-1 | 引用（削除済み） | 中 | 引用元が削除されているケースを探す |
| thread-with-quote-1 | スレッド＋引用 | 中 | スレッド内に引用があるケースを探す |

### Phase 3: テスト実行ドキュメント ⏳ 未着手

- E2Eテストの実行手順書を作成予定

### Phase 4: npm scripts 追加 ⏳ 未着手

- `package.json` への E2E テストスクリプト追加

---

## 作成済みファイル一覧

```
x-clipper-for-obsidian/
├── .claude/commands/
│   └── run-e2e-test.md          # E2Eテスト実行用スラッシュコマンド
├── docs/
│   └── E2E_TEST_RESEARCH.md     # 本ドキュメント（調査・進捗管理）
└── tests/e2e/
    ├── vitest.e2e.config.ts     # Vitest E2E設定
    ├── fixtures/
    │   └── tweet-urls.ts        # テストURL・期待値定義
    └── helpers/
        ├── mcp-client.ts        # 型定義・エラーハンドリング
        └── extraction-scripts.ts # ブラウザ実行用抽出スクリプト
```

---

## 次回作業予定

1. **残りのテスト URL 収集**
   - 引用ポスト（テキストのみ、画像あり）
   - スレッド（連投リプライ）
   - 特殊ケース（削除済み引用、スレッド＋引用）

2. **テスト実行ドキュメント作成**
   - Chrome DevTools MCP を使ったテスト実行手順
   - 期待値の検証方法

3. **実際のテスト実行・検証**
   - 収集した URL で抽出スクリプトをテスト
   - 期待値との差分確認

---

## 更新履歴

- 2024-12-04: 初版作成
- 2024-12-04: 調査結果を反映（コードベース、データ構造、抽出ロジック、Chrome DevTools MCP機能）
- 2024-12-04: Phase 1 完了、Phase 2 進行中（テストURL 7件収集済み）
