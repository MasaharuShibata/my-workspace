# 動画版 作成の進捗

**1章につき1セッション**で作る。コンテキストが膨らむので、1つのセッションで
複数章をまとめて作らないこと。

このファイルがセッション間で共有できる唯一の状態。着手したら必ず更新して push する。

台本(YAML)のファイル名は、原本と同じ stem にする。
例: `tutorial/11_build-03-form.md` → `chapters/11_build-03-form.yaml`

---

## セッションの始め方

新しいセッションを開き、作る章を指定して依頼する。以下をそのまま使える。

```
my-recipe 開発教材の動画、第NN章を作ってください。

- my-recipe/video/PROGRESS.md で、この章に使うデモシーンを確認してください
- my-recipe/video/README.md と CLAUDE.md「教材コンテンツ(音声版・動画版)を作るとき」に従ってください
- chapters/01_web-app-overview.yaml が書き方の手本です
```

### 1セッションでやること

1. `tutorial/<章>_*.md` を読み、`chapters/<同じstem>.yaml` を書く
2. デモを撮る（`demoapp/setup.sh` → `capture-demo.mjs --scenes <下の表の値>`）
3. 動画を生成し、確認して `SendUserFile` で渡す
4. この表の状態を更新し、commit / push して PR を作る

尺が長くなりそうなら、**台本を書いた時点で一度区切ってよい**（状態を「台本済」にして
push しておけば、次のセッションが動画生成から再開できる）。

---

## 状態

| 状態 | 意味 |
|---|---|
| 未着手 | まだ何もしていない |
| 台本済 | 台本はコミット済み。動画生成から再開できる |
| 完了 | 動画を渡した |
| 要確認 | 詰まった。備考に理由を書く |
| 保留 | 意図的に後回し |

---

## 進捗

「使うデモ」は `scripts/capture-demo.mjs --scenes` にそのまま渡す値。
撮れるシーンと尺の目安は `README.md`「実機デモ」を参照。

| 章 | 題 | 使うデモ | 状態 | 備考 |
|---|---|---|---|---|
| 01 | Webアプリのしくみ | input,thinking,result,save,list | 完了 | 13分15秒 / 納品済 |
| 02 | 開発環境を準備する | input,thinking,result | 未着手 | |
| 03 | HTMLとCSS | input,result | 未着手 | |
| 04 | JavaScript | validation,thinking,result | 未着手 | 非同期処理の説明にthinkingを使う |
| 05 | TypeScript | result,thinking | 未着手 | レシピの型の話にresultを使う |
| 06 | React | input,result | 未着手 | チェックボックスがstateの実例 |
| 07 | Next.js | thinking,list | 完了 | 13分55秒 / 納品済。台本の並びを撮影の採番に合わせ thinking→list にした |
| 08 | 設計する | input,result,list | 未着手 | 何を作ると決めたかを実物で示す |
| 09 | Step1 プロジェクトを作る | input | 未着手 | |
| 10 | Step2 動かない画面を作る | input,result | 未着手 | 見た目だけの話 |
| 11 | Step3 フォームを動かす | validation,input | 未着手 | validationが主役 |
| 12 | Step4 サーバー側の処理 | thinking,result | 未着手 | まだ偽レシピの段階 |
| 13 | Step5 Claude APIに繋ぐ | thinking,result,regenerate | 未着手 | |
| 14 | Step6 データベースに保存 | save | 未着手 | |
| 15 | Step7 お気に入り一覧 | list,delete | 未着手 | |
| 16 | Step8 残りの機能 | regenerate,delete | 未着手 | |
| 17 | Step9 CSSで仕上げる | input,result | 未着手 | 仕上がった見た目を見せる |
| 18 | デプロイ | input,thinking,result | 未着手 | |
| 19 | 試験 | validation,input,result | 未着手 | 試験項目の実例として |
| 20 | エラーの読み方 | validation,thinking | 未着手 | |
| 21 | 次に学ぶこと | list,regenerate | 未着手 | |
| 22 | ネットワークの基礎 | thinking,result | 未着手 | リクエストが飛ぶ瞬間 |
| 23 | Vercelの仕組み | input,thinking,result | 未着手 | |
| 24 | Supabaseの仕組み | save,list,delete | 未着手 | CRUDが揃う |
| 25 | 商用化 | input,thinking,save | 未着手 | どこでお金が動くか |

`tutorial/00_index.md` は索引なので動画化しない。内容は第1章の導入に入っている。

---

## 動画の受け取りについて

mp4 は **Git管理しない**ので、生成したセッションのチャットにしか残らない。
コンテナは破棄されるため、**そのセッションで受け取らないと消える**。
作ったらその場で `SendUserFile` で渡すこと。
