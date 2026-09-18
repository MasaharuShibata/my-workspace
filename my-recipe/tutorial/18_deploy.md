# 18. デプロイ — インターネットに公開する

> この章のゴール: 手元でしか動かないアプリを、スマホから使えるURLにする。

---

## 18.1 いま何が起きているか

```
今:    localhost:3000  ← 自分のPCの中だけ。PCを閉じたら終わり
これから: https://my-recipe-xxxx.vercel.app  ← 誰でも、いつでも
```

Vercelは、**GitHubにpushするだけで自動的に公開してくれる** サービスです。

```
自分のPC ──push──> GitHub ──自動検知──> Vercel ──ビルド──> 公開
```

一度繋いでしまえば、**以降は `git push` だけで更新されます**。

---

## 18.2 準備: 最終チェック

### ① .env.local がGitに入っていないか

```
ターミナル
git status
git log --all --oneline -- .env.local
```

2つ目のコマンドで **何も出なければOK** です。
何か出たら、**過去のコミットに含まれてしまっています**。

⚠️ その場合、履歴から消すのは面倒です。**一番早くて確実な対処は、
Anthropic/Supabaseのコンソールでキーを無効化して作り直すこと** です。
「公開してしまったキーは、もう使わない」が鉄則です。

### ② ビルドが通るか

```
ターミナル
npm run build
```

ここでエラーが出るなら、デプロイしても必ず失敗します。先に直します。

### ③ README を書く

公開するなら、最低限これだけは書いておきます。

```markdown
ファイル名: README.md

# my-recipe

食材をいくつか入力すると、AI(Claude API)がそれらを活かしたレシピを考案してくれる
レシピ提案Webアプリです。気に入ったレシピはお気に入りとして保存できます。

ログイン機能は無く、個人利用(自分だけが使う)を前提にしています。

## 構成

- Next.js(App Router) + TypeScript
- Supabase(お気に入りレシピの保存)
- Claude API(Anthropic、`claude-haiku-4-5`)
- Vercel でホスティング

## 必要な環境変数

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`(`NEXT_PUBLIC_` は付けないこと)

## セットアップ

1. Supabaseの「SQL Editor」で `supabase/schema.sql` を実行
2. 上記の環境変数を設定
3. `npm install && npm run dev`

## 注意

ログイン機能が無いため、URLとSupabaseのanonキーを知っている人は誰でも
お気に入りを閲覧・削除できます。気になる場合はVercelの
Deployment Protection(パスワード保護)を有効にしてください。

Claude APIは従量課金です(1回のレシピ考案あたり1円未満が目安)。
```

💡 READMEは **半年後の自分への手紙** です。
「環境変数は何が要るか」「DBはどう作るか」を書いておかないと、
別のPCで動かすときに必ず詰まります。

---

## 18.3 GitHubに上げる

1. https://github.com で「New repository」
2. リポジトリ名を入力(`my-recipe` など)
3. **Public / Private を選ぶ**
   - Private でもVercelからは使えます。迷ったら Private
4. 「Create repository」

⚠️ README / .gitignore / license の **自動生成にはチェックを入れない** でください。
既にローカルにあるので、後で衝突します。

作成後に表示されるコマンドを実行します。

```
ターミナル
git remote add origin https://github.com/あなたのID/my-recipe.git
git branch -M main
git push -u origin main
```

GitHubのページを更新して、ファイルが上がっているか確認します。

⚠️ **`.env.local` が無いこと、`node_modules` が無いことを、目で確認してください。**

---

## 18.4 Vercelでデプロイする

### ① アカウント作成

https://vercel.com で **GitHubアカウントでログイン** します。

⚠️ **Vercelでプロジェクトを作るには「チーム」が必要** です。
個人アカウント単体では作成できないことがあります。
無料(Hobbyプラン)でチームを作れるので、案内に従って作成してください。
**Proプランを勧められても選ぶ必要はありません。**

### ② プロジェクトをインポート

1. 「Add New...」→「Project」
2. さきほど作ったGitHubリポジトリを選び「Import」
3. 設定画面が出る

### ③ 設定

| 項目 | 値 |
|---|---|
| Framework Preset | **Next.js**(自動検出されるはず) |
| Root Directory | **リポジトリ直下にアプリがあるなら空のまま** |
| Build Command | 既定のまま |
| Output Directory | 既定のまま |

⚠️ **Root Directory は注意が必要です。**
もし `my-workspace/my-recipe/` のように、リポジトリの中の
サブフォルダにアプリがある場合は、ここに `my-recipe` と指定します。
指定しないと「package.jsonが見つかりません」で失敗します。

### ④ 環境変数を登録する ← 最重要

「Environment Variables」を開き、**3つすべて** 登録します。

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseのProject URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseのanon/publishableキー |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

⚠️⚠️ **`.env.local` はGitに含まれていないので、Vercelには届いていません。**
ここで手で登録しないと、デプロイは成功するのに **動かしたらエラー** になります。

初心者が最も詰まるポイントです。

💡 変数名のコピペミスにも注意してください。
`ANTHROPIC_API_KEY` を `ANTROPIC_API_KEY` と打ち間違えると、
SDKが見つけられず認証エラーになります。**目で1文字ずつ確認する価値があります。**

### ⑤ Deploy

「Deploy」を押して、2〜3分待ちます。
成功すると紙吹雪が舞い、URLが表示されます。

---

## 18.5 ⚠️ どのURLで動作確認するか

**ここは必ず読んでください。** Vercelは複数のURLを発行します。

| 種類 | 形 | 使えるか |
|---|---|---|
| **本番ドメイン** | `https://my-recipe-xxxx.vercel.app` | ○ **こちらを使う** |
| デプロイ固有URL | `https://my-recipe-a1b2c3d4-team.vercel.app` | ✕ **ログイン保護がかかっている** |

デプロイ固有URL(ハッシュを含む長いもの)には、
**Vercelのログイン(SSO)保護が既定でかかっており、他人からは見えません**。

これを知らずに友人に送って「開けない」と言われる、というのが定番の事故です。

**プロジェクトのダッシュボードに表示される、短いほうのURL** を使ってください。

---

## 18.6 動作確認

スマホから本番URLを開いて、ひと通り試します。

| 確認 | 見るところ |
|---|---|
| レシピが生成される | Claude APIの環境変数が効いている |
| お気に入り登録できる | Supabaseの環境変数が効いている |
| 一覧に表示される | DBから読めている |
| 削除できる | |
| **スマホで横スクロールが出ない** | レスポンシブ対応 |

### 動かないときの確認場所

| 症状 | 確認 |
|---|---|
| レシピ生成だけ失敗する | Vercel → プロジェクト → **Logs** で `Runtime Logs` を見る |
| お気に入り登録だけ失敗する | Supabaseの環境変数、RLSポリシー |
| ページ自体が出ない | Vercel → **Deployments** → 該当デプロイのビルドログ |

⚠️ **Vercelのログが、本番での `console.log` / `console.error` の出先です。**
ローカルのターミナルに相当します。ここを見る癖をつけてください。

---

## 18.7 以降の更新のしかた

```
ターミナル
git add .
git commit -m "何を変えたか"
git push
```

**これだけです。** Vercelが自動で検知し、ビルドして差し替えます。

### ブランチを使った安全な進め方

```
ターミナル
git checkout -b feature/add-search    # 作業用の枝を作る
# ...編集...
git add . && git commit -m "検索機能を追加"
git push -u origin feature/add-search
```

すると Vercel が **プレビュー環境** を自動で作ります。
本番を壊さずに、実際の環境で試せます。

問題なければGitHubで **Pull Request** を作り、`main` にマージすると本番に反映されます。

💡 個人開発でもこの流れを使う価値があります。
「壊れたけど本番は無事」という状態を作れるからです。

---

## 18.8 公開したあとに考えること

### ① アクセス制限をかけるか

ログイン機能が無いので、URLを知る人は誰でも操作できます(要件定義 3.3)。

気になる場合:
**Vercel → Project Settings → Deployment Protection → Password Protection**
でサイト全体にパスワードをかけられます。

### ② コストの監視

- **Anthropic**: コンソールの Usage で使用量を確認。予算アラートは設定済みのはず
- **Supabase**: 無料プランは **1週間アクセスが無いと自動で一時停止** します
  (手動再開可能。データは消えません)
- **Vercel**: Hobbyプランの範囲なら無料

### ③ 短時間の大量アクセスに注意

⚠️ 自動テストなどで短時間に連続アクセスすると、
Vercel(特にHobbyプラン)の **自動レート制限・異常検知** が誤作動して、
一時的にほぼ全リクエストが403になることがあります。

- 操作の間に **2〜4秒** 空ける
- 失敗しても **すぐに再試行しない**(30〜60秒空ける)
- **連続リトライは状況を悪化させます**。悪化したら回復を待つしかありません

次章の試験で、実際にこの点を扱います。

---

## 18.9 この章のまとめ

- 公開前に **`git status` でキーが入っていないか**、**`npm run build` が通るか** を確認
- GitHubにpush → Vercelがインポート
- ⚠️ **環境変数はVercelの画面で手動登録**(`.env.local` は届かない)
- ⚠️ 動作確認は **短い本番ドメイン** で。デプロイ固有URLは保護されている
- 以降は `git push` するだけで更新される
- 本番のログは **Vercelのダッシュボード** で見る
- 短時間の連続アクセスはレート制限を誘発する

→ [19_testing.md](./19_testing.md)
