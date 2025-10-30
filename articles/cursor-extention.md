---
title: "Cursorデフォルト機能のおかげでVSCode拡張を断捨離"
emoji: "🗑️"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ['VSCode','Cursor','拡張機能','環境構築']
published: false
---

## MacBookを新調した

仕事のMacBookマシンが新しくなった。（M2→M4）

現在、エディタはCursorを使っているが、おそらく設定などを引き継ぐ手段がないと思われる（そこまで詳しく調べてないのでもしかしたらあるかも）

VSCodeではアカウントで連携すれば引き継がれる。

しかし、せっかく新しいマシンにしたのであまり余計なソフトは入れたくない、ということで、VSCodeはインストールしないことに。

新しくCursorをインストールしたので、軽量化のためにも拡張機能を見直した。

## 不要になった拡張機能

主に以下の理由で消えていったものたち
- 用途の違い（一時期プライベートPCがなく個人的な仕事のコーディング環境などが含まれてしまっていた）
- Cursorのデフォルト機能で十分だった
- 個人的な気分の変化

### Highlight Matching Tag

HTMLタグを選択したとき、対となる閉じタグをハイライトしてくれる。
Cursorのデフォルト機能で動作しているので不要（Cursor上で設定が必要かもしれないが、特に設定した記憶はなく動作している）。

### indent-rainbow

スペースやタブに色がつく機能。
色がなくても罫線があるので、不要と感じたため。

:::message
VSCodeの設定で自分でカスタマイズできるっぽい。
https://qiita.com/htcd/items/21266f6472ac2c39933e
:::

### HTML CSS Support

ピュアなHTML/CSSを書く機会がなくなっているので思い切って不要と判断。

### Color Info

rgbで書かれている色コードをホバーして色情報の詳細を見たりhslなどに変換できたりするものだが、Cursorデフォルトでもできるので不要。

### colorize

こちらも同様。color: red; などと書いてある場合、文字がその色に変化するが不要と判断。

### CSS Variable Autocomplete

CSS変数をサジェストくれるものですが、デフォルトで候補出してくれるのでおそらく不要と判断。

### Path Intellisense, Path Autocomplete

どちらもパス補完だが、おそらくCursorだと不要。

### Tamplate String Converter

`${variable}`などを入力したいとき、「${」と入力した時点で閉じタグも自動で追加される機能。AIによるサジェストのおかげか、デフォルトで機能していたので不要。

### zenkaku

全角スペースをハイライトしてくれる。デフォルトでも機能しているっぽいので不要。

## 必要となって残った拡張機能

### Auto Rename Tag

開始タグを変更したときに自動で閉じタグも変えてくれる。
![alt text](/images/cursor-extention/picture_pc_bdb21189016330b4b94faf22d4aff088.webp)

### GitHub Pull Requests

現在のPRの変更ファイル一覧が見られるので重宝。

### vscode-icons

デフォルトのままでも問題ないが個人的な好み。material-iconsよりこっちのアイコンテーマが好き。

### htmltagwrap

`alt` + `W` で選択した範囲を新しいタグで囲える機能。選択範囲から`Cmd`+`Shift`+`P`から`Element wrap〜`みたいなコマンド機能でも同様の動作ができるが、拡張機能だと一発でできるため残し。（デフォルトの方をキーバインドに設定しようと思ったらなぜかできなかった）

![alt text](/images/cursor-extention/picture_pc_37dd4b18f18ff4cd0473c6c88f13620b.webp)

### Tailwind Docs

エディター内でTailwindのコマンドを検索できる。

### TODO Highlight

TODO:, FIXME: などのコメントに色がつくようになる。視認性が高くなるので残し。
![alt text](/images/cursor-extention/1761564902-jKOpkWm4VnNaquZ0TQJCG6Rz.webp)

### Todo Tree

TODO: , FIXME: などのコメントをツリーでみることができる。
![alt text](/images/cursor-extention/1761564980-2bviZlIwzOyrRnYx4hPF7GDS.webp)

### Code Spell Checker

英語の誤字脱字を知らせてくれる。

### テキスト校正くん

残したけど悩んでいるもの。個人開発のときは良いが、チーム全員で入れていないと割とドキュメントファイルなどは赤線だらけになるので注意。（ルール変更の設定は可）
（例：「インターフェース」という表記だと、「インターフェイス」にしてくださいと怒られる^^;。この記事の中でも怒られている）

![alt text](</images/cursor-extention/スクリーンショット 2025-10-30 10.05.07.png>)

## その他おすすめのCursor設定

### フォント: Google Sans Code

割と最近？出た、「Google Sans Code」が個人的に好き。結構読みやすいので試してみる価値はある。

https://fonts.google.com/specimen/Google+Sans+Code