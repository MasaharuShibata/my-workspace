# 07. Next.js — 画面とサーバーを1つのプロジェクトで書く

> この章のゴール: 「サーバーコンポーネント」「クライアントコンポーネント」の違いと、
> Route Handler / Server Actions の使い分けを理解する。

---

## 7.1 Next.jsとは何か

Reactは **画面を作る道具** でしかありません。Reactだけでは、

- ページを分ける仕組みが無い(`/` と `/favorites`)
- サーバー側の処理が書けない(APIキーを隠す場所が無い)
- 公開するための準備が自分でやることになる

Next.jsは、そこを全部まとめて面倒見てくれる **フレームワーク** です。

```
React      = 画面を作る部品
Next.js    = React + ルーティング + サーバー処理 + ビルド + 最適化
```

そして重要なのが、**1つのプロジェクトにフロントとバックが同居する** ことです。

```
my-recipe/
├─ app/page.tsx                    ← ブラウザで動く画面
├─ app/api/generate-recipe/route.ts ← サーバーで動く処理(APIキーを使う)
└─ app/actions.ts                   ← サーバーで動く処理(DBを触る)
```

別々のプロジェクトを2つ管理しなくていい。これが、
基本設計書 1.2 に「構成をシンプルにできる」と書かれている理由です。

---

## 7.2 App Router — フォルダがそのままURLになる

Next.js(App Router)では、**ファイルの置き場所がURLになります**。

| ファイル | URL |
|---|---|
| `app/page.tsx` | `/` |
| `app/favorites/page.tsx` | `/favorites` |
| `app/about/page.tsx` | `/about` |
| `app/api/generate-recipe/route.ts` | `/api/generate-recipe` |

ルーティング設定ファイルは **ありません**。フォルダを作れば、そのURLができます。

### 特別な名前のファイル

| ファイル名 | 役割 |
|---|---|
| `page.tsx` | そのURLの画面本体 |
| `layout.tsx` | 配下のページ全部を包む共通の枠 |
| `route.ts` | 画面ではなくAPI(JSONを返す窓口) |
| `loading.tsx` | 読み込み中に表示するもの(今回は未使用) |
| `error.tsx` | エラー時に表示するもの(今回は未使用) |

⚠️ `page.tsx` という名前でないと画面になりません。
`Page.tsx` や `index.tsx` ではダメです。

### layout.tsx

`app/layout.tsx` は **全ページ共通の一番外側** です。

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSans.variable}>
      <body>{children}</body>
    </html>
  );
}
```

`children` のところに、各ページの中身が差し込まれます。
`<html>` と `<body>` はここにしか書きません。

my-recipe ではここで、
- 日本語フォント(Noto Sans JP)の読み込み
- ページタイトル・説明文(`metadata`)

を設定しています。

### ページ間の移動 — Link

```tsx
import Link from "next/link";

<Link href="/favorites">お気に入り</Link>
```

⚠️ `<a href="/favorites">` でも動きますが、**`<Link>` を使ってください。**
`<a>` はページ全体を読み込み直しますが、`<Link>` は必要な部分だけ差し替えるので
圧倒的に速く、画面のちらつきもありません。

---

## 7.3 サーバーコンポーネントとクライアントコンポーネント

**ここが Next.js で一番大事で、一番混乱するところです。**

App Router では、コンポーネントは **デフォルトでサーバー側で実行されます**。

```
サーバーコンポーネント(デフォルト)
  → サーバーで実行され、結果のHTMLだけがブラウザに届く
  → ブラウザにはコードが送られない

クライアントコンポーネント("use client" を書いたもの)
  → コードがブラウザに送られ、ブラウザで実行される
  → useState などが使える
```

### 使い分けの基準

| やりたいこと | どちら |
|---|---|
| DBから直接データを取る | **サーバー** |
| APIキーなど秘密情報を使う | **サーバー** |
| ボタンを押したら表示が変わる | **クライアント** |
| 入力欄に文字を打つ | **クライアント** |
| `useState` / `useEffect` を使う | **クライアント** |
| ただ表示するだけ | **サーバー**(のままでいい) |

**判断の合言葉**: 「**利用者の操作に反応するか?**」
反応するならクライアント。しないならサーバーのままにします。

### "use client"

ファイルの1行目に書きます。

```tsx
"use client";

import { useState } from "react";

export default function IngredientForm() { ... }
```

⚠️ `useState` を使っているのに `"use client"` が無いと、こう怒られます。

```
Error: You're importing a component that needs useState.
This React hook only works in a client component.
```

**「useStateのエラーが出たら、1行目に "use client" を書く」** と覚えてください。
初心者が最もよく出すエラーです。

### my-recipe の内訳

| ファイル | 種別 | 理由 |
|---|---|---|
| `app/layout.tsx` | サーバー | 表示するだけ |
| `app/page.tsx` | **クライアント** | 入力・生成結果の切り替えをする |
| `app/favorites/page.tsx` | **サーバー** | DBから直接取ってきて表示するだけ |
| `components/Header.tsx` | サーバー | リンクを並べるだけ |
| `components/GenreFilter.tsx` | サーバー | リンクを並べるだけ |
| `components/FavoriteList.tsx` | サーバー | 受け取った配列を並べるだけ |
| `components/IngredientForm.tsx` | **クライアント** | 入力state |
| `components/RecipeResult.tsx` | **クライアント** | チェック・保存state |
| `components/FavoriteCard.tsx` | **クライアント** | 開閉state |

💡 `GenreFilter` がクライアントでないのは面白い判断です。
「ジャンルで絞り込む」という一見インタラクティブな機能を、
**stateではなくURL(`/favorites?genre=和食`)で表現している** からです。
リンクを踏むだけなので、クライアント側のコードが1行も要りません。

**stateにできることを、あえてURLでやる。** こうすると
「絞り込んだ状態のURLを共有できる」「ブラウザの戻るボタンが効く」
というおまけまで付いてきます。設計の妙です。

### サーバーコンポーネントの強み

```tsx
// app/favorites/page.tsx (サーバーコンポーネント)
export default async function FavoritesPage() {
  const supabase = createClient();
  const { data } = await supabase.from("favorite_recipes").select("*");

  return <FavoriteList favorites={data ?? []} />;
}
```

注目点:

- **`async` が付いている**。サーバーコンポーネントは直接 `await` できます
- **DBを直接触っている**。APIを経由する必要がありません
- このコードは **ブラウザに一切送られません**。DBの接続情報も漏れません

クライアントコンポーネントで同じことをやろうとすると、
「useEffectでfetchして、ローディング状態を管理して…」と何倍も面倒になります。

⚠️ ただし、サーバーコンポーネントでは `useState` も `onClick` も使えません。
**混ぜるときは「外側をサーバー、内側の操作する部分だけクライアント」** にします。
my-recipe のお気に入りページは、まさにこの構造です。

```
FavoritesPage (サーバー: DBから取得)
  └─ FavoriteList (サーバー: 並べる)
       └─ FavoriteCard (クライアント: 開閉・削除ボタン)
```

---

## 7.4 Route Handler — 自分のAPIを作る

`app/api/なんとか/route.ts` を作ると、そのURLがAPIになります。

```ts
// app/api/generate-recipe/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();          // 送られてきたJSONを読む
  // ...何か処理...
  return NextResponse.json({ recipe });       // JSONを返す
}
```

- 関数名が **HTTPメソッド名**(`GET` / `POST` / `DELETE`)になります
- `POST` という名前でexportすれば、POSTリクエストを受けます
- **これは完全にサーバー側**。環境変数のAPIキーを安全に使えます

### エラーを返す

```ts
return NextResponse.json({ error: "食材を1つ以上入力してください。" }, { status: 400 });
```

第2引数でステータスコードを指定します(01章のおさらい)。

---

## 7.5 Server Actions — もっと手軽なサーバー処理

Route Handler は「URLを作ってfetchで呼ぶ」という手順が要ります。
**Server Actions は、サーバーの関数をそのまま呼べる仕組み** です。

```ts
// app/actions.ts
"use server";                       // ← このファイルはサーバーで動く、という宣言

export async function addFavorite(recipe: Recipe, sourceIngredients: string, genre: Genre) {
  const supabase = createClient();
  const { error } = await supabase.from("favorite_recipes").insert({ ... });
  if (error) return { error: "お気に入りの登録に失敗しました。" };
  revalidatePath("/favorites");
  return { error: null };
}
```

呼ぶ側(クライアントコンポーネント):

```tsx
import { addFavorite } from "@/app/actions";

async function handleSave() {
  const result = await addFavorite(recipe, sourceIngredients, genre);
  if (result.error) { setError(result.error); return; }
  setSaved(true);
}
```

**普通の関数を呼んでいるようにしか見えません。** でも実際は、
裏でブラウザからサーバーへのリクエストが飛んでいます。
Next.jsがその通信を隠してくれています。

### Route Handler と Server Actions、どう使い分けるか

my-recipe は両方を使っています。理由がそれぞれあります。

| | 使っている場所 | 選んだ理由 |
|---|---|---|
| **Route Handler** | レシピ生成 | 外部APIを呼ぶ処理で、リクエスト/レスポンスを細かく制御したい。エラーの種類(400/500)を明確に返したい |
| **Server Actions** | お気に入り登録・削除 | DBに1行足す/消すだけ。`revalidatePath` で一覧を自動更新できる |

⚠️ 初心者向けの実用的な判断:
- **画面のデータを書き換える操作** → Server Actions
- **外部サービスを呼ぶ・複雑なレスポンスを返す** → Route Handler

迷ったら Server Actions で始めて構いません。

### revalidatePath

```ts
revalidatePath("/favorites");
```

「`/favorites` のページのキャッシュを捨てて、次に表示するとき作り直して」
という指示です。

これがあるおかげで、削除ボタンを押したあと **自分で画面を書き換える必要がありません**。
サーバーが新しい一覧を作って送り直してくれます(06章の最後の問いの答えです)。

---

## 7.6 環境変数 — 秘密情報の置き場所

コードに直接APIキーを書いてはいけません。Gitに残り、GitHubに公開されます。

```ts
// ✕ 絶対にやらない
const client = new Anthropic({ apiKey: "sk-ant-xxxxx" });
```

代わりに、プロジェクト直下の `.env.local` に書きます。

```
ファイル名: .env.local

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

コードからはこう読みます。

```ts
process.env.ANTHROPIC_API_KEY
```

### `NEXT_PUBLIC_` の意味 — ここが最重要

| 書き方 | どこで読めるか |
|---|---|
| `ANTHROPIC_API_KEY` | **サーバーのみ**。ブラウザからは読めない |
| `NEXT_PUBLIC_SUPABASE_URL` | **ブラウザにも埋め込まれる**。誰でも見られる |

⚠️⚠️ **`NEXT_PUBLIC_ANTHROPIC_API_KEY` と名前を付けたら、**
**APIキーが全世界に公開されます。** 詳細設計書 7節が
「命名を誤らないよう特に注意する」と警告しているのはこれです。

**ルール: 秘密にしたいものには `NEXT_PUBLIC_` を付けない。**

💡 ではなぜSupabaseのキーは公開していいのか?
Supabaseの anon キーは「公開される前提で設計された鍵」で、
実際のアクセス制御は **RLS(行レベルセキュリティ)** という
データベース側のルールで行うからです(14章で扱います)。

### ⚠️ .env.local は必ず .gitignore に

```
ファイル名: .gitignore
.env.local
```

`create-next-app` で作れば最初から入っていますが、**自分の目で確認してください。**

### デプロイ時

`.env.local` はGitに含まれないので、Vercelには届きません。
**Vercelの管理画面で同じ値を登録する必要があります**(18章)。

---

## 7.7 その他、my-recipeに出てくるNext.jsの記法

### `export const dynamic = "force-dynamic"`

```tsx
// app/favorites/page.tsx
export const dynamic = "force-dynamic";
```

Next.jsは高速化のため、可能なページを **ビルド時に1回だけ作って固定** しようとします。
しかしお気に入り一覧は、DBの中身が変われば表示も変わるべきです。

この1行は「**毎回アクセスされるたびに作り直して**」という指示です。
無いと、お気に入りを追加しても一覧が古いままになったり、ビルドが失敗したりします。

### searchParams — URLのクエリを読む

```tsx
export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre: genreParam } = await searchParams;
  ...
}
```

`/favorites?genre=和食` の `和食` の部分を取り出しています。

⚠️ Next.js 15 から `searchParams` は **Promise になりました**。`await` が必要です。
古い記事を見て `searchParams.genre` と書くとエラーになります。
**Next.jsはバージョン間の変化が大きいので、記事の日付を必ず見てください。**

---

## 7.8 この章のまとめ

- Next.jsは **React + ルーティング + サーバー処理** をまとめたもの
- **フォルダがURLになる**。`page.tsx` が画面、`route.ts` がAPI
- コンポーネントは **デフォルトでサーバー**。操作するものだけ `"use client"`
- サーバーコンポーネントは **DBを直接触れる**し、**ブラウザにコードが送られない**
- **Route Handler**(外部API向き)と **Server Actions**(DB更新向き)を使い分ける
- `revalidatePath` で、画面を自分で書き換えずに最新化する
- **`NEXT_PUBLIC_` を付けたら公開される。APIキーには絶対付けない**

これでPart 1は終わりです。文法の話はここまで。
次章から「そもそも何をどう決めるか」という設計の話に入ります。

→ [08_design-process.md](./08_design-process.md)
