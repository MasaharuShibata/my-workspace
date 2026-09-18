# kakeibo

収入・支出を記録して、月ごとの収支とカテゴリ別の内訳をひと目で確認できる、シンプルな家計簿Webアプリです。
毎日の記録に使えるだけでなく、「記録するたびにデータベースが何をしているか」が見える作りになっているので、データベースの動きを学ぶ題材にもなります。

ログイン機能は無く、個人利用(自分だけが使う)を前提にしています。

## 構成

- Next.js(App Router) + TypeScript
- Supabase(データベースのみ。認証機能は使用しません)

Google Maps APIのような外部APIキーは不要で、Supabaseだけで動きます。

## 機能

- 収入・支出の記録の追加・編集・削除
- 月の切り替え(前月・翌月)
- 月ごとの収入合計・支出合計・収支
- カテゴリ別の内訳(棒グラフ表示)
- カテゴリの追加(食費・交通費・給与など、初期カテゴリは`supabase/seed.sql`で登録)
- データベース操作ログ(記録の追加・更新・削除がリアルタイムで一覧表示される)

## データベースの学習ポイント

このアプリで見えるデータベースの動きは、主に次の3つです。

1. **基本のCRUD** — 記録の追加・編集・削除は、`transactions`テーブルへの素直な`insert` / `update` / `delete`です(`app/actions.ts`)。カテゴリと記録は`category_id`で結びついた1対多のリレーションになっています。
2. **JOIN + GROUP BYによる集計** — カテゴリ別の内訳は、アプリ側でデータを集計するのではなく、`get_category_summary`というSQL関数(`supabase/schema.sql`)が`transactions`と`categories`をJOINし、`GROUP BY`で合計を計算して返しています。フロントエンドは`supabase.rpc(...)`でこの関数を呼び出すだけです。
3. **トリガーによる自動ログ記録** — 「データベース操作ログ」パネルは、アプリのコードが書き込んでいるわけではありません。`transactions`テーブルにAFTER INSERT/UPDATE/DELETEトリガーを設定しており、データが変更されるたびにデータベース自身が`activity_log`テーブルへ記録を書き込みます。

## セキュリティに関する注意

ログイン機能が無いため、Row Level Security(RLS)は「誰でも(anonキーで)読み書きできる」ポリシーになっています。つまり、**デプロイ後のURLとSupabaseのanonキーを知っている人は誰でも記録を閲覧・編集・削除できます**。

個人利用でも家計の情報が外部に見えてしまうのは避けたい場合は、Vercelの「Deployment Protection」でサイト全体にパスワードを掛けることをおすすめします(Project Settings → Deployment Protection → Password Protection)。これならログイン画面を自作せずに、合言葉1つでアクセスを制限できます。

## 必要な準備

### 1. Supabase

1. プロジェクトの「SQL Editor」で `supabase/schema.sql` の内容を実行(テーブル・RLS・トリガー・RPC関数の作成)
2. 続けて `supabase/seed.sql` の内容を実行(初期カテゴリの登録)
3. Project Settings → API から取得できる値を、Vercelの環境変数に設定
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`(Publishable key)

### 2. Vercel

- 「Root Directory」を `kakeibo` に設定してデプロイしてください
- 上記の環境変数(2つ)を登録してからデプロイすると、初回から正しく動作します

## デプロイ後の初回操作

1. 「記録する」フォームから収入・支出を追加
2. 追加すると同時に、右側の「データベース操作ログ」に自動で記録が増えることを確認できます

## 今後の拡張候補

- 複数月・複数年をまたいだ推移グラフ
- カテゴリの編集・削除(現状は追加のみ)
- 予算(月ごとの上限額)を設定して、超過を警告する機能
