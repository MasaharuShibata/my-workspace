# Step 7. お気に入り一覧画面を作る

> この章のゴール: `/favorites` を作り、保存したレシピを一覧表示・削除できるようにする。
> **サーバーコンポーネントの強みを、実際に体験します。**

---

## 15.1 この画面の設計を確認する

基本設計書 2.4 で決めた内容です。

- 保存済みレシピをカード形式で一覧表示
- 通常は **タイトルとジャンルだけ** 表示し、タップで詳細が開く(折りたたみ式)
- 各カードに削除ボタン
- 0件のときはメッセージを出す
- (ジャンル絞り込みは Step 8 で追加)

### コンポーネントの分け方

```
app/favorites/page.tsx     サーバー: DBから取得する
  └─ FavoriteList          サーバー: 並べる。0件のメッセージも担当
       └─ FavoriteCard     クライアント: 開閉・削除
```

⚠️ **なぜ3つに分けるのか。** 1ファイルに書くこともできますが、

- `page.tsx` は **DBから取る** ことだけに責任を持つ
- `FavoriteList` は **並べる/0件** だけ
- `FavoriteCard` は **1件の見た目と操作** だけ

こう分けると、**クライアントコンポーネントを最小限にできます**。
開閉と削除のためにstateが必要なのは `FavoriteCard` だけなので、
そこだけ `"use client"` にすれば、ブラウザに送るコードが最小で済みます。

💡 これは「**クライアント境界をできるだけ内側に押し込む**」という
App Routerの重要な設計パターンです。

---

## 15.2 一覧ページ(サーバーコンポーネント)

```tsx
ファイル名: app/favorites/page.tsx

import Header from "@/components/Header";
import FavoriteList from "@/components/FavoriteList";
import { createClient } from "@/lib/supabase/server";
import type { FavoriteRecipe } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("favorite_recipes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>お気に入り</h1>
          <p>保存したレシピの一覧です。タイトルを押すと詳細が開きます。</p>
        </div>

        <FavoriteList favorites={(data as FavoriteRecipe[]) ?? []} />
      </main>
    </>
  );
}
```

### ここに `"use client"` が無いことに注目

このファイルは **サーバーコンポーネント** です。だから:

```tsx
export default async function FavoritesPage() {     // async が書ける
  const { data } = await supabase.from(...)          // DBを直接 await できる
```

- `useState` も `useEffect` も要らない
- ローディング状態の管理も要らない
- APIを作る必要も無い
- **DBの接続情報がブラウザに送られない**

⚠️ これをクライアントコンポーネントでやろうとすると、こうなります。

```tsx
// ✕ 昔のやり方(やらなくていい)
const [favorites, setFavorites] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch("/api/favorites").then(r => r.json()).then(d => { setFavorites(d); setLoading(false); });
}, []);
```

**行数が3倍になり、`/api/favorites` も別途作る必要があります。**
サーバーコンポーネントの価値が分かる比較です。

### クエリの読み方

```ts
supabase
  .from("favorite_recipes")                       // このテーブルから
  .select("*")                                    // 全部の列を
  .order("created_at", { ascending: false })      // 作成日時の降順で
```

SQLにするとこうなります。

```sql
SELECT * FROM favorite_recipes ORDER BY created_at DESC;
```

`ascending: false` が **降順(新しい順)** です。
14章で作った `created_at` のインデックスが、ここで効きます。

### `export const dynamic = "force-dynamic"`

```tsx
export const dynamic = "force-dynamic";
```

**この1行が無いと、ハマります。**

Next.jsは高速化のため、ビルド時にページを1回だけ作って固定しようとします。
しかしこのページの内容はDBの中身に依存するので、固定されては困ります。

この指定は「**毎回アクセスのたびに作り直して**」という宣言です(07章)。

⚠️ 詳細設計書 2.2 にも「認証を使わない構成ではNext.jsが静的ページ化を試みて
ビルド時エラーになるため」と明記されています。
**設計時点で分かっていた落とし穴** なので、先に書いてあるわけです。

### `(data as FavoriteRecipe[]) ?? []`

```tsx
<FavoriteList favorites={(data as FavoriteRecipe[]) ?? []} />
```

2つのことをしています。

1. `as FavoriteRecipe[]` … Supabaseは型を知らないので、こちらで明示する(05章)
2. `?? []` … 取得に失敗して `null` だったら、空配列にする(04章)

`?? []` が無いと、`FavoriteList` の中で `favorites.length` を読んだ瞬間に
「nullのプロパティは読めません」で画面が真っ白になります。

💡 **「無いかもしれない値は、受け取った側で既定値に倒す」** のは基本の防御です。

---

## 15.3 一覧コンポーネント

```tsx
ファイル名: components/FavoriteList.tsx

import FavoriteCard from "@/components/FavoriteCard";
import type { FavoriteRecipe } from "@/lib/types";

export default function FavoriteList({ favorites }: { favorites: FavoriteRecipe[] }) {
  if (favorites.length === 0) {
    return <p className="panel-empty">まだお気に入りがありません。</p>;
  }

  return (
    <div className="favorite-list">
      {favorites.map((favorite) => (
        <FavoriteCard key={favorite.id} favorite={favorite} />
      ))}
    </div>
  );
}
```

### 早期リターンで0件を処理する

```tsx
if (favorites.length === 0) {
  return <p className="panel-empty">まだお気に入りがありません。</p>;
}
```

三項演算子でJSXの中に埋め込むこともできますが、
**「0件のときは、まったく別の画面」なので、早期リターンのほうが読めます**(06章)。

### `key={favorite.id}`

```tsx
{favorites.map((favorite) => (
  <FavoriteCard key={favorite.id} favorite={favorite} />
))}
```

⚠️ **ここでは `key={i}` ではなく `key={favorite.id}` を使います。**

削除すると並びが変わるので、インデックスをkeyにすると
「2番目を消したのに3番目の開閉状態が引き継がれる」といった不具合が起きます。
**追加・削除・並べ替えがあるリストには、必ず安定したIDを使ってください**(06章)。

### この部品もサーバーコンポーネント

`"use client"` がありません。配列を受け取って並べるだけで、stateが要らないからです。

---

## 15.4 カードコンポーネント(クライアント)

```tsx
ファイル名: components/FavoriteCard.tsx

"use client";

import { useState } from "react";
import { deleteFavorite } from "@/app/actions";
import type { FavoriteRecipe } from "@/lib/types";

export default function FavoriteCard({ favorite }: { favorite: FavoriteRecipe }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteFavorite(favorite.id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
    }
    // 成功時は revalidatePath により一覧側が再描画されるため、ここでの状態更新は不要
  }

  return (
    <article className="favorite-card">
      <div className="favorite-card-header">
        <button
          type="button"
          className="favorite-card-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="favorite-card-caret">{open ? "▾" : "▸"}</span>
          <h3>{favorite.title}</h3>
          <span className="genre-badge">{favorite.genre}</span>
        </button>
        <button onClick={handleDelete} disabled={deleting} className="favorite-card-delete">
          {deleting ? "削除中..." : "削除"}
        </button>
      </div>

      {open && (
        <div className="favorite-card-body">
          <p className="recipe-meta">
            調理時間: {favorite.cooking_time} ・ {favorite.servings}
          </p>
          <p className="recipe-source">使った食材: {favorite.source_ingredients}</p>

          <h4>材料</h4>
          <ul className="recipe-ingredients">
            {favorite.ingredients.split("\n").map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          <h4>作り方</h4>
          <ol className="recipe-steps">
            {favorite.steps.split("\n").map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </article>
  );
}
```

### 🔑 split("\n") — DB側から画面側への変換

```tsx
{favorite.ingredients.split("\n").map((item, i) => <li key={i}>{item}</li>)}
```

14章で `join("\n")` して保存したものを、ここで `split("\n")` で戻しています。
**往復が完成しました。**

```
Recipe.ingredients (配列)
   │ join("\n")
   ▼
DB: "鶏むね肉 200g\n白菜 1/4個"
   │ split("\n")
   ▼
["鶏むね肉 200g", "白菜 1/4個"] → <li> に変換
```

### 開閉の実装

```tsx
const [open, setOpen] = useState(false);
...
onClick={() => setOpen((v) => !v)}
...
{open && ( <div className="favorite-card-body"> ... </div> )}
```

- `setOpen((v) => !v)` … 今の値を反転させる(`!` は真偽の反転)
- `{open && (...)}` … 開いているときだけ中身を描画(06章)

⚠️ `{open && ...}` は **本当にHTMLごと消えます**(CSSで隠しているのではない)。
閉じているカードの中身は、そもそもブラウザに存在しません。
100件あっても軽いのは、このためです。

### aria-expanded

```tsx
aria-expanded={open}
```

読み上げソフトに「この開閉ボタンは今開いている/閉じている」と伝えます。
見た目には影響しませんが、**付けるだけなのでやっておく価値があります**。

### 開閉ボタンを `<button>` にしている理由

`<div onClick={...}>` でも見た目上は動きます。が、`<button>` にすると:

- **キーボードのTabで移動でき、Enterで押せる**
- 読み上げソフトが「ボタン」と認識する
- スマホで押せる範囲が正しく扱われる

⚠️ **クリックできるものは `<button>` か `<a>` にする。**
これはアクセシビリティの基本ルールです。

---

## 15.5 削除のServer Action

```ts
ファイル名: app/actions.ts (追記)

export async function deleteFavorite(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("favorite_recipes").delete().eq("id", id);

  if (error) return { error: "削除に失敗しました。時間をおいて再度お試しください。" };

  revalidatePath("/favorites");
  return { error: null };
}
```

### `.eq("id", id)`

```ts
.delete().eq("id", id)
```

SQLでいう `DELETE FROM favorite_recipes WHERE id = '...'` です。
`eq` は equal(等しい)の略。

⚠️⚠️ **`.eq()` を書き忘れると、全件削除されます。**

```ts
.delete()                  // ← WHERE句が無い = 全部消える
.delete().eq("id", id)     // ← 正しい
```

実際に本番データを全部消した事故は、世界中で無数に起きています。
削除のコードを書いたら、**必ず条件が付いているか指差し確認してください。**

💡 Supabaseは安全策として、条件の無い `delete()` をエラーにする設定がありますが、
頼り切らないほうがいいです。

---

## 15.6 削除後に画面が更新される仕組み

**ここが App Router の面白いところです。**

```tsx
async function handleDelete() {
  setDeleting(true);
  const result = await deleteFavorite(favorite.id);
  if (result.error) { ... }
  // 成功時は何もしていない!
}
```

成功時、**自分のカードを消す処理を書いていません**。なぜ消えるのか。

```
1. deleteFavorite() がサーバーで実行される
2. DBから1行削除される
3. revalidatePath("/favorites") が呼ばれる
4. Next.jsが /favorites をサーバーで作り直す
5. 新しいHTMLがブラウザに送られ、該当のカードが消えた状態になる
```

つまり **「DBが正になり、画面はその写し」** という関係が保たれています。

⚠️ もし自分で「このカードを非表示にする」stateを持つと:

- 削除は失敗したのに、画面からは消える
- 別のタブで開いている一覧とズレる

という不整合が起きえます。**画面を直接いじらず、データを直してから作り直す。**
これは06章の最後の問いの答えでもあります。

---

## 15.7 最低限のCSS

```css
ファイル名: app/globals.css (追記)

.favorite-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.favorite-card {
  border: 1px solid #ddd;
  border-radius: 14px;
  padding: 16px;
}

.favorite-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.favorite-card-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  text-align: left;
  flex: 1;
  padding: 0;
}

.favorite-card-toggle h3 {
  margin: 0;
  font-size: 16px;
}

.genre-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eee;
}

.panel-empty {
  color: #777;
  text-align: center;
  padding: 32px 0;
}
```

💡 `border-radius: 999px` は「完全な丸み(カプセル型)」を作る定番テクニックです。
高さの半分以上を指定すれば、必ず両端が半円になります。

---

## 15.8 動作確認

| 操作 | 期待する結果 |
|---|---|
| ヘッダーの「お気に入り」を押す | 一覧ページに遷移する |
| 保存が0件の状態 | 「まだお気に入りがありません。」 |
| 保存済みがある状態 | タイトルとジャンルのカードが並ぶ |
| **新しい順に並んでいるか** | 最後に登録したものが一番上 |
| タイトルを押す | 詳細が展開される。▸ が ▾ に変わる |
| **材料が複数行に分かれているか** | `split("\n")` が効いている確認 |
| もう一度押す | 閉じる |
| 削除ボタン | 「削除中...」→ カードが消える |
| Supabaseの Table Editor | 実際に行が減っている |

⚠️ 最後の項目を必ず確認してください。
**「画面から消えた」と「DBから消えた」は別の話** です。

### 複数枚を同時に開けることも確認

カードを2枚開いてみてください。両方開いたままになります。
これは各カードが **自分のstateを持っている** からです(06章の「state をどこに置くか」)。

もし「1枚開いたら他は閉じる」仕様にしたければ、
開いているカードのIDを **親が1つだけ持つ** 形に変えることになります。
**仕様が変われば、stateの置き場所も変わる。** これが設計の面白いところです。

---

## 15.9 コミット

```
ターミナル
git add .
git commit -m "お気に入り一覧画面(折りたたみ表示・削除)を実装"
```

---

## 15.10 Step 7 のまとめ

- 一覧ページは **サーバーコンポーネント**。DBを直接 `await` できる
- **クライアント境界は、できるだけ内側に**(カードだけ `"use client"`)
- DBの中身に依存するページには `export const dynamic = "force-dynamic"`
- 追加・削除があるリストの `key` は **安定したID**
- **`split("\n")` で、保存時の `join("\n")` を元に戻す**
- ⚠️ `delete()` には **必ず `.eq()` を付ける**
- 削除後の画面更新は `revalidatePath` に任せる。**画面を直接いじらない**

要件の MUST も WANT も、主要なものは動きました。
残りの細かい機能を、次でまとめて足します。

→ [16_build-08-features.md](./16_build-08-features.md)
