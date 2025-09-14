---
title: "【補足】Firebase プロジェクトの詳細セットアップガイド"
emoji: "🔧"
type: "tech"
topics: ["firebase", "firestore", "設定", "tutorial"]
published: false
---

# Firebase プロジェクトの詳細セットアップガイド

SNS構築の前に、Firebaseプロジェクトを正しくセットアップしましょう！

## 📝 前提条件

- Googleアカウント
- Node.js 18以上
- pnpm（または npm/yarn）

## 🚀 ステップ1: Firebaseプロジェクトの作成

### 1. Firebase Consoleにアクセス

1. [https://console.firebase.google.com/](https://console.firebase.google.com/) にアクセス
2. Googleアカウントでログイン

### 2. 新規プロジェクト作成

1. 「プロジェクトを作成」をクリック
2. プロジェクト名を入力（例：`sns-ddd-firebase`）
3. 「続行」をクリック

![プロジェクト作成画面](https://via.placeholder.com/600x400)

### 3. Google Analytics の設定（任意）

- 今回は学習用なので「このプロジェクトでGoogle Analyticsを有効にする」はOFFでOK
- 「プロジェクトを作成」をクリック

## 🔐 ステップ2: Authentication の設定

### 1. Authentication を有効化

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック

### 2. Googleログインを有効化

1. 「Sign-in method」タブを選択
2. 「Google」をクリック
3. 「有効にする」をトグルON
4. サポートメールを選択
5. 「保存」をクリック

```typescript
// これで以下のコードが使えるようになる！
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
await signInWithPopup(auth, provider);
```

## 📊 ステップ3: Firestore Database の設定

### 1. Firestore を作成

1. 左メニューから「Firestore Database」を選択
2. 「データベースの作成」をクリック

### 2. セキュリティルールの初期設定

1. 「本番環境モード」を選択（後でルールを設定）
2. 「次へ」をクリック

### 3. ロケーションの選択

1. `asia-northeast1`（東京）を選択
2. 「有効にする」をクリック

> ⚠️ **重要**: ロケーションは後から変更できません！

## 📦 ステップ4: Storage の設定

### 1. Storage を有効化

1. 左メニューから「Storage」を選択
2. 「始める」をクリック

### 2. セキュリティルールの初期設定

1. 「本番環境モード」を選択
2. 「次へ」をクリック

### 3. ロケーションの確認

- Firestoreと同じロケーションが自動選択される
- 「完了」をクリック

## 🌐 ステップ5: Web アプリの登録

### 1. アプリを追加

1. プロジェクトの概要ページで歯車アイコン → 「プロジェクトの設定」
2. 「マイアプリ」セクションで「</> (Web)」アイコンをクリック

### 2. アプリの登録

1. アプリのニックネームを入力（例：`sns-web`）
2. 「Firebase Hosting」は今はチェックしなくてOK
3. 「アプリを登録」をクリック

### 3. Firebase SDK の設定を取得

```javascript
// 表示される設定をコピー
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "sns-ddd-firebase.firebaseapp.com",
  projectId: "sns-ddd-firebase",
  storageBucket: "sns-ddd-firebase.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

この設定を `.env` ファイルに保存：

```bash
# packages/web/.env
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=sns-ddd-firebase.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sns-ddd-firebase
VITE_FIREBASE_STORAGE_BUCKET=sns-ddd-firebase.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## 🛠️ ステップ6: Firebase CLI のセットアップ

### 1. Firebase CLI のインストール

```bash
npm install -g firebase-tools
```

### 2. ログイン

```bash
firebase login
```

### 3. プロジェクトの初期化

プロジェクトのルートディレクトリで：

```bash
firebase init
```

選択項目：
- **Firestore**: セキュリティルールとインデックス
- **Storage**: セキュリティルール
- **Hosting**: 静的ホスティング
- **Emulators**: ローカル開発環境

```
? Which Firebase features do you want to set up for this directory?
 ◉ Firestore: Configure security rules and indexes files for Firestore
 ◉ Hosting: Configure files for Firebase Hosting
 ◉ Storage: Configure a security rules file for Cloud Storage
 ◉ Emulators: Set up local emulators for Firebase products
```

### 4. 各設定の詳細

```
? Please select an option: Use an existing project
? Select a default Firebase project: sns-ddd-firebase

? What file should be used for Firestore Rules? firestore.rules
? What file should be used for Firestore indexes? firestore.indexes.json

? What do you want to use as your public directory? packages/web/dist
? Configure as a single-page app? Yes
? Set up automatic builds and deploys with GitHub? No

? What file should be used for Storage Rules? storage.rules

? Which Firebase emulators do you want to set up?
 ◉ Authentication Emulator
 ◉ Firestore Emulator
 ◉ Storage Emulator
 ◉ Hosting Emulator
```

## 🔒 ステップ7: セキュリティルールの設定

### Firestore ルール

`firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 認証済みユーザーのみアクセス可能
    function isSignedIn() {
      return request.auth != null;
    }
    
    // 本人のみ編集可能
    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }
    
    // ユーザー
    match /users/{userId} {
      allow read: if true;
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if false;
    }
    
    // 投稿
    match /posts/{postId} {
      allow read: if true;
      allow create: if isSignedIn() && 
        request.resource.data.authorId == request.auth.uid;
      allow update: if isSignedIn() && 
        resource.data.authorId == request.auth.uid;
      allow delete: if isSignedIn() && 
        resource.data.authorId == request.auth.uid;
    }
    
    // フォロー
    match /follows/{userId}/to/{followeeId} {
      allow read: if isSignedIn();
      allow create: if isOwner(userId);
      allow delete: if isOwner(userId);
    }
    
    // いいね
    match /likes/{postId}/by/{userId} {
      allow read: if true;
      allow create: if isOwner(userId);
      allow delete: if isOwner(userId);
    }
  }
}
```

### Storage ルール

`storage.rules`:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }
    
    function isImageFile() {
      return request.resource.contentType.matches('image/.*');
    }
    
    function isValidSize() {
      return request.resource.size < 5 * 1024 * 1024; // 5MB
    }
    
    // ユーザーアバター
    match /users/{userId}/avatar {
      allow read: if true;
      allow write: if isOwner(userId) && isImageFile() && isValidSize();
    }
    
    // 投稿画像
    match /posts/{postId}/image {
      allow read: if true;
      allow write: if isSignedIn() && isImageFile() && isValidSize();
    }
  }
}
```

## 🏃 ステップ8: ローカル開発環境の起動

### 1. Emulator の起動

```bash
# ターミナル1
firebase emulators:start
```

起動すると以下のURLが使える：
- Emulator UI: http://localhost:4000
- Firestore: http://localhost:8080
- Auth: http://localhost:9099
- Storage: http://localhost:9199

### 2. 開発サーバーの起動

```bash
# ターミナル2
pnpm dev
```

アプリ: http://localhost:3000

## 🚀 ステップ9: 本番環境へのデプロイ

### 1. ビルド

```bash
pnpm build
```

### 2. ルールのデプロイ

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

### 3. Hostingへのデプロイ

```bash
firebase deploy --only hosting
```

デプロイ完了後、以下のようなURLでアクセス可能：
```
https://sns-ddd-firebase.web.app
```

## ⚠️ トラブルシューティング

### CORS エラーが出る場合

Storage で CORS エラーが出る場合は、`cors.json` を作成：

```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

適用：
```bash
gsutil cors set cors.json gs://sns-ddd-firebase.appspot.com
```

### 認証エラーが出る場合

1. Firebase Console → Authentication → Settings
2. 「承認済みドメイン」に localhost を追加

### Firestore のインデックスエラー

エラーメッセージのリンクをクリックして、自動でインデックスを作成

## 📋 チェックリスト

- [ ] Firebaseプロジェクト作成
- [ ] Google認証有効化
- [ ] Firestore作成（東京リージョン）
- [ ] Storage有効化
- [ ] Webアプリ登録
- [ ] 環境変数設定（.env）
- [ ] Firebase CLI インストール
- [ ] firebase init 実行
- [ ] セキュリティルール設定
- [ ] Emulator起動確認
- [ ] ローカルで動作確認

## 🎉 完了！

これでFirebaseの設定は完了です！
あとはコードを書いて、素敵なSNSを作るだけ〜 ✨

---

何か問題があったら、Firebase公式ドキュメントも参照してね：
[https://firebase.google.com/docs](https://firebase.google.com/docs)