# jiro-ramen-map

口コミ数と評価をもとにしたおすすめ順で、二郎系ラーメン店を紹介する地図アプリです。
ログイン(メールのマジックリンク)、お気に入り登録、店舗の追加に対応しています。

## 構成

- Next.js(App Router) + TypeScript
- Supabase(データベース + ログイン機能)
- Google Maps Platform(Maps JavaScript API + Places API)

## 必要な準備

### 1. Supabase

1. プロジェクトの「SQL Editor」で `supabase/schema.sql` の内容を実行(テーブル作成)
2. 続けて `supabase/seed.sql` の内容を実行(初期の店舗リストを登録)
   - ここで登録される評価・口コミ数・地図上の位置は空です。アプリにログイン後、「データを更新」ボタンを押すとGoogleから取得されます
3. 「Authentication → Providers → Email」で **Confirm email** をオフにしておくと、マジックリンクでのログインがスムーズです(初期設定のままでも動作しますが、確認メールが増えます)
4. Project Settings → API から取得できる値を、Vercelの環境変数に設定
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`(Publishable key)
   - `SUPABASE_SERVICE_ROLE_KEY`(Secret key。**絶対に公開しないこと**)

### 2. Google Maps Platform

1. Google Cloudのプロジェクトで以下のAPIを有効化
   - Maps JavaScript API
   - Places API
2. 作成したAPIキーに、利用するVercelのドメインでHTTPリファラー制限をかける(推奨)
3. Vercelの環境変数に設定
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### 3. Vercel

- 「Root Directory」を `jiro-ramen-map` に設定してデプロイしてください
- 上記の環境変数(4つ)をすべて登録してからデプロイすると、初回から正しく動作します

## デプロイ後の初回操作

1. アプリにログイン(メールアドレスを入力→届いたリンクをタップ)
2. トップページの「データを更新(Googleから評価を取得)」を押す
3. 数十秒ほどで、各店舗の評価・口コミ数・地図上の位置が反映される

## おすすめ順(スコア)の考え方

口コミ数が少ない店舗が、たまたま高評価なだけで上位に来てしまわないよう、
口コミ数が多いほど「その店自体の評価」を重視し、少ないほど「全店舗の平均評価」に近づける
加重平均(ベイズ平均)でスコアを計算しています(`lib/score.ts`)。

## 今後の拡張候補

- 店舗の重複登録チェック
- 都道府県・エリアでの絞り込み
- 「データを更新」の自動実行(Vercel Cronなど)
