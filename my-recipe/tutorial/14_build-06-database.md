# Step 6. データベースに保存する

> この章のゴール: Supabaseにテーブルを作り、
> 「お気に入り登録」ボタンでレシピが1件保存されるようにする。

---

## 14.1 この章で新しく学ぶこと

| 項目 | 内容 |
|---|---|
| SQL | テーブルを作る命令 |
| RLS | データベース側のアクセス制御 |
| Supabaseクライアント | JavaScriptからDBを読み書きする道具 |
| Server Actions | 07章で学んだ、サーバー側の関数 |

---

## 14.2 Supabaseのプロジェクトを作る

1. https://supabase.com にGitHubアカウントでログイン
2. 「New Project」で新規プロジェクトを作成
   - プロジェクト名: 任意(`my-recipe` など)
   - Region: **Northeast Asia (Tokyo)** を推奨(近いほうが速い)
   - Database Password: 自動生成で構いません(今回は直接使いません)
3. 作成完了まで1〜2分待つ

⚠️ 無料プランには **アクティブなプロジェクト数の上限** があります(組織あたり2件など)。
上限に達したら、使っていないプロジェクトを **削除ではなく一時停止(Pause)** してください。
一時停止ならデータは消えず、後から復元できます。

---

## 14.3 SQLでテーブルを作る

### SQLとは

データベースに命令するための言語です。今回使うのは、実質この程度です。

| 命令 | 意味 |
|---|---|
| `create table` | 表を作る |
| `insert` | 行を追加 |
| `select` | 行を読む |
| `delete` | 行を消す |
| `alter table` | 表の定義を変える |

`insert` / `select` / `delete` は、SupabaseのJavaScriptライブラリ経由で書くので
直接書くのは `create table` だけです。

### schema.sql を書く

**設計書(詳細設計書 5節)で決めた列定義** を、そのままSQLにします。

```sql
ファイル名: supabase/schema.sql

-- my-recipe: database schema
-- Supabaseの「SQL Editor」でこのファイルの内容をそのまま実行してください。
-- ログイン機能は無く、個人利用の単一データセットを前提にしています。

-- ================================
-- テーブル
-- ================================

-- お気に入り登録されたレシピ。「お気に入り登録」ボタンが押された時にだけ1行作られる。
create table if not exists favorite_recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  genre text not null default 'こだわりなし',
  cooking_time text not null default '',
  servings text not null default '',
  source_ingredients text not null,
  ingredients text not null,
  steps text not null,
  created_at timestamptz not null default now()
);

create index if not exists favorite_recipes_created_idx
  on favorite_recipes (created_at desc);
```

### 1行ずつ理解する

| 部分 | 意味 |
|---|---|
| `create table if not exists` | 無ければ作る。**既にあれば何もしない**(再実行しても壊れない) |
| `id uuid primary key` | 主キー。1行を一意に特定するための列 |
| `default gen_random_uuid()` | 値を指定しなければ、ランダムなIDを自動生成 |
| `text not null` | 文字列。**空(NULL)を許さない** |
| `default 'こだわりなし'` | 指定しなかったときの既定値 |
| `timestamptz` | タイムゾーン付きの日時 |
| `default now()` | 登録した瞬間の時刻を自動で入れる |
| `create index` | **並び替え・検索を速くするための索引** |

### uuid を使う理由

`id` を `1, 2, 3...` の連番にすることもできます。が、UUID
(`a1b2c3d4-...` のような長いランダム文字列)を使っています。

- 連番だと、URLに `/recipes/5` と出たとき **`6` を試せば他人のデータが見られる**
- UUIDなら推測できない

今回は個人利用なので影響は小さいですが、**癖として安全な方を選んでおく** 価値があります。

### インデックスとは

本の索引と同じです。

```sql
create index ... on favorite_recipes (created_at desc);
```

「作成日時の降順で並べる」ことが多いと分かっているので、
あらかじめ **並んだ状態のメモ** を作らせておきます。
データが増えたときの表示速度が変わります。

⚠️ インデックスは万能ではありません。作るほど **書き込みは遅くなります**。
「よく使う検索・並び替え」にだけ付けるものです。

---

## 14.4 RLS — データベース側のアクセス制御

```sql
ファイル名: supabase/schema.sql (続き)

-- ================================
-- Row Level Security
-- ================================
alter table favorite_recipes enable row level security;

create policy "anyone can view favorites"
  on favorite_recipes for select
  using (true);

create policy "anyone can add favorites"
  on favorite_recipes for insert
  with check (true);

create policy "anyone can delete favorites"
  on favorite_recipes for delete
  using (true);
```

### RLS(Row Level Security)とは

**「どの行を、誰が、どう操作できるか」をデータベース自身に守らせる仕組み** です。

重要なのは、**アプリのコードがどうであれ、データベースが拒否する** という点です。
アプリにバグがあっても、DBが最後の砦になります。

### ここでのポリシーの意味

| ポリシー | 対象 | 条件 |
|---|---|---|
| anyone can view favorites | SELECT(読む) | `true` = **常に許可** |
| anyone can add favorites | INSERT(追加) | `true` = 常に許可 |
| anyone can delete favorites | DELETE(削除) | `true` = 常に許可 |

つまり **誰でも全部できる** 設定です。

### ⚠️ なぜ、わざわざ「全部許可」を書くのか

RLSを **無効のまま** にしても同じように動きます。では、なぜ有効にして
「常に許可」というポリシーを書くのか。基本設計書 5.1 の説明が秀逸です。

> 「無効化」ではなく「意図的に開放したポリシー」にすることで、
> 将来ログインを追加する場合にポリシーの条件式を差し替えるだけで済むようにしている

将来ログインを足すとき:

```sql
-- 今
using (true)

-- 将来
using (auth.uid() = user_id)    -- 「自分のデータだけ」に変えるだけ
```

**RLSが無効だと、有効化+ポリシー作成+全体の動作確認が必要になります。**
今の手間はほぼ同じで、将来の手間が減る。これが良い設計判断の形です。

💡 もうひとつの効果として、**「開放されている」ことがSQLに明示される** ので、
後から見た人が「セキュリティ設定を忘れている」のか「意図的に開けている」のかを
判断できます。

### UPDATEのポリシーが無い理由

編集機能を作らないからです(要件定義のスコープ外)。
**ポリシーが無い操作は、拒否されます。** つまり
「編集機能を作らない」がDBレベルでも保証されている状態です。

---

## 14.5 SQLを実行する

1. Supabaseの左メニューから **SQL Editor** を開く
2. 「New query」を選ぶ
3. `supabase/schema.sql` の中身を **全部** コピーして貼り付ける
4. **Run** を押す

「Success. No rows returned」と出れば成功です。

左メニューの **Table Editor** で `favorite_recipes`(0件)ができていることを確認します。

---

## 14.6 接続情報を取得する

1. 左メニューの **Project Settings**(歯車)→ **API**(または **API Keys**)
2. 2つの値を控える
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **Publishable key** / **anon key** (`sb_publishable_...` または `eyJ...`)

⚠️ **`service_role key` は絶対に使わないでください。** これは
RLSを **すべて無視できる管理者用の鍵** です。ブラウザに渡ったら終わりです。
今回のアプリでは使う場面がありません。

`.env.local` に追記します。

```
ファイル名: .env.local

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### なぜ Supabase のキーには NEXT_PUBLIC_ を付けるのか

07章で「秘密のものには付けない」と学びました。矛盾しているようですが、違います。

| キー | 性質 |
|---|---|
| `ANTHROPIC_API_KEY` | **これ単体でお金が使える**。絶対に秘密 |
| Supabase anon key | **公開される前提で設計されている**。何ができるかはRLSが決める |

anon キーは「あなたはログインしていない人ですね」と名乗るための札で、
権限そのものではありません。実際に何ができるかは、**RLSのポリシーが決めます**。

⚠️ ただし今回は「RLSが全部許可」なので、**結果としてキーを知る人は誰でも
読み書きできます**。これは要件定義 3.3 で明記されている、
承知のうえの制約です。気になる場合は、Vercelのパスワード保護をかけます。

---

## 14.7 Supabaseクライアントを作る

```
ターミナル
npm install @supabase/supabase-js
```

```ts
ファイル名: lib/supabase/server.ts

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ログイン機能を持たないため、cookieベースのセッション管理は不要。
// anonキーで直接Supabaseにアクセスするだけのシンプルなクライアント。
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 末尾の `!` は何か

```ts
process.env.NEXT_PUBLIC_SUPABASE_URL!
```

`process.env.XXX` の型は `string | undefined` です
(環境変数が設定されていない可能性があるため)。

`!` は **非nullアサーション** で、「これは必ずある、と保証する」という宣言です。

⚠️ `as` と同じく、これは **TypeScriptを黙らせるだけ** です(05章)。
環境変数が未設定なら、実行時にエラーになります。
ただし、**設定されていなければどのみち動かない** ので、
ここは `!` を使うのが実用的な判断です。

### なぜ `createClient` を関数にしているのか

```ts
export function createClient() { return createSupabaseClient(...); }
```

変数に入れて使い回すこともできますが、関数にしておくと
**呼ばれるたびに新しいクライアントを作る** 形になります。

サーバー側では複数のリクエストが同時に走るので、
「1つのインスタンスを使い回して状態が混ざる」事故を避けられます。
また、将来ログインを追加してリクエストごとにcookieを読む形になっても、
**呼び出し側を変えずに済みます**。

---

## 14.8 Server Actions を書く

```ts
ファイル名: app/actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Genre, Recipe } from "@/lib/types";

export async function addFavorite(recipe: Recipe, sourceIngredients: string, genre: Genre) {
  const supabase = createClient();
  const { error } = await supabase.from("favorite_recipes").insert({
    title: recipe.title,
    genre,
    cooking_time: recipe.cookingTime,
    servings: recipe.servings,
    source_ingredients: sourceIngredients,
    ingredients: recipe.ingredients.join("\n"),
    steps: recipe.steps.join("\n"),
  });

  if (error) return { error: "お気に入りの登録に失敗しました。時間をおいて再度お試しください。" };

  revalidatePath("/favorites");
  return { error: null };
}
```

### "use server"

ファイルの先頭に書くと、**このファイルの関数はすべてサーバーで実行される** という宣言です(07章)。
クライアントコンポーネントから普通に `import` して呼べますが、
中身のコードはブラウザに送られません。

### insert の書き方

```ts
const { error } = await supabase.from("favorite_recipes").insert({ ... });
```

読み下すと「`favorite_recipes` テーブルに、このオブジェクトを1行追加する」。
SQLの `INSERT INTO ... VALUES ...` を、JavaScriptで書いているだけです。

`const { error } = ...` は分割代入(04章)で、
結果オブジェクトから `error` だけを取り出しています。

### 🔑 ここが Step 6 の核心 — 配列 → 文字列の変換

```ts
ingredients: recipe.ingredients.join("\n"),
steps: recipe.steps.join("\n"),
```

**05章の演習で扱った、あの境界です。**

```
画面・AI側                        DB側
Recipe.ingredients               favorite_recipes.ingredients
= ["鶏むね肉 200g", "白菜 1/4個"]  = "鶏むね肉 200g\n白菜 1/4個"
        │                                    ▲
        └────── join("\n") ───────────────────┘
        ◀────── split("\n") ──────────────────┘
```

- **保存するとき**: `join("\n")` で配列 → 改行区切りの1つの文字列
- **表示するとき**: `split("\n")` で文字列 → 配列(Step 7で使います)

`\n` は改行を表す特殊な文字です。

⚠️ この設計は「材料を個別に検索しない」という要件だからこそ成立しています(08章)。
**設計判断がコードのこの1行に現れている**、という良い例です。

### 列名がスネークケースになっている

```ts
cooking_time: recipe.cookingTime,
```

左がDBの列名(`cooking_time`)、右がJavaScriptのプロパティ名(`cookingTime`)。
09章で型定義を分けた理由が、ここで効いてきます。

### genre は省略記法

```ts
genre,     // genre: genre と同じ
```

キー名と変数名が同じときは、片方だけ書けます。

### エラー処理

```ts
if (error) return { error: "お気に入りの登録に失敗しました。時間をおいて再度お試しください。" };
```

Supabaseのライブラリは **例外を投げません**。
`{ data, error }` という形で結果を返してくるので、**`error` を自分で確認する** 必要があります。

⚠️ ここを忘れると、失敗しているのに「登録しました」と表示されます。
**「エラーが返っていないか確認する」** は必ずやってください。

### revalidatePath

```ts
revalidatePath("/favorites");
```

「お気に入り一覧ページのキャッシュを捨てて」という指示です(07章)。
これがあるので、登録直後に一覧ページを開くと最新の状態が表示されます。

---

## 14.9 画面から呼ぶ

`components/RecipeResult.tsx` に保存処理を足します。

```tsx
ファイル名: components/RecipeResult.tsx

"use client";                                     // ← 追加(stateを使うため)

import { useState } from "react";
import { addFavorite } from "@/app/actions";
import type { Genre, Recipe } from "@/lib/types";

export default function RecipeResult({
  recipe,
  sourceIngredients,
  genre,
}: {
  recipe: Recipe;
  sourceIngredients: string;
  genre: Genre;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await addFavorite(recipe, sourceIngredients, genre);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <section className="recipe-result">
      {/* ...表示部分は今までと同じ... */}

      {error && <p className="form-error">{error}</p>}

      <div className="recipe-result-actions">
        <button onClick={handleSave} disabled={saving || saved}>
          {saved ? "お気に入りに登録しました" : saving ? "登録中..." : "お気に入り登録"}
        </button>
        <button type="button" className="btn-secondary">
          別のレシピを提案してもらう
        </button>
      </div>
    </section>
  );
}
```

### 3つのstateが必要な理由

| state | 用途 |
|---|---|
| `saving` | 保存中。ボタンを無効にして二重登録を防ぐ |
| `saved` | 保存済み。**同じレシピを何度も登録させない** |
| `error` | 失敗メッセージ |

### `disabled={saving || saved}`

保存中でも、保存済みでも押せなくします。
`||` は「または」です。

### 三項演算子のネスト

```tsx
{saved ? "お気に入りに登録しました" : saving ? "登録中..." : "お気に入り登録"}
```

読み方:

```
saved なら          → "お気に入りに登録しました"
そうでなくて saving なら → "登録中..."
どちらでもなければ    → "お気に入り登録"
```

⚠️ 三項演算子のネストは、**2段までが限界** です。
3段以上になったら早期リターンや関数に切り出してください。

### サーバー側の関数を、なぜ普通に呼べるのか

```tsx
import { addFavorite } from "@/app/actions";
const result = await addFavorite(recipe, sourceIngredients, genre);
```

`"use client"` のファイルから、`"use server"` の関数を import して呼んでいます。
**実際にはブラウザ→サーバーの通信が発生していますが、Next.jsが隠しています**(07章)。

`fetch` も `JSON.stringify` も書かなくていい。これがServer Actionsの利点です。

---

## 14.10 動作確認

1. レシピを生成する
2. 「お気に入り登録」を押す
3. ボタンが「登録中...」→「お気に入りに登録しました」に変わる
4. **Supabaseの Table Editor** を開いて、1行増えていることを確認する

### Table Editor で見るべきところ

| 列 | 確認 |
|---|---|
| `id` | UUIDが自動で入っている |
| `ingredients` | **改行区切りで複数行になっている** |
| `genre` | 選んだジャンルが入っている |
| `created_at` | 現在時刻が自動で入っている |

`ingredients` のセルをクリックすると、中身が複数行で見えます。
**`join("\n")` が効いている証拠です。**

### わざと失敗させてみる

`.env.local` の `NEXT_PUBLIC_SUPABASE_ANON_KEY` を1文字変えて再起動し、
登録を試してみてください。エラーメッセージが表示されるはずです。

⚠️ **エラー処理は、わざと失敗させないと確認できません。**
「成功したから大丈夫」ではなく、**失敗したときの挙動も試す** 癖をつけてください。
確認できたらキーは戻します。

---

## 14.11 コミット

```
ターミナル
git add .
git commit -m "Supabaseへのお気に入り登録機能を実装"
```

---

## 14.12 Step 6 のまとめ

- テーブル定義は **設計書の列定義をそのままSQLに** する
- `create table if not exists` にすると、再実行しても壊れない
- **RLSは「無効」ではなく「意図的に開放したポリシー」** にする(将来への布石)
- `service_role key` は使わない。`anon key` は公開前提
- Supabaseは **例外を投げない**。`{ error }` を自分で確認する
- **配列 ⇄ 文字列の変換(`join` / `split`)が、DBとの境界**
- Server Actions は、サーバーの関数を普通に呼ぶだけで使える
- **エラー処理は、わざと失敗させて確認する**

保存できたので、次は読み出しです。

→ [15_build-07-favorites.md](./15_build-07-favorites.md)
