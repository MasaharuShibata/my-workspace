# Step 8. 残りの機能を足す

> この章のゴール: WANT機能(F9・F11・F12)を追加し、機能面を完成させる。
> **既にあるものを壊さずに機能を足す**、という実務で最も多い作業を体験します。

---

## 16.1 追加する3つの機能

| # | 機能 | 難しさ | 新しく学ぶこと |
|---|---|---|---|
| F11 | お気に入りのジャンル絞り込み | ★☆☆ | **stateではなくURLで状態を持つ** |
| F9 | 材料のチェックボックス | ★★☆ | 配列のstateの更新 |
| F12 | 別レシピの再提案 | ★★★ | **propsの変化に応じてstateをリセットする** |

簡単なものから順にやります。**1つ足すたびに動作確認とコミット** をしてください。

---

## 16.2 F11: ジャンル絞り込み — URLを状態にする

### 設計の考え方

素朴に考えると、`useState` で選択中のジャンルを持ちたくなります。
でも my-recipe は **URLで持つ** 設計にしました(基本設計書 2.4)。

```
/favorites            → すべて表示
/favorites?genre=和食  → 和食だけ表示
```

| | stateで持つ | **URLで持つ** |
|---|---|---|
| クライアントコードが必要か | 必要(`"use client"`) | **不要** |
| 絞り込んだ状態を共有できるか | できない | **URLを送れる** |
| ブラウザの「戻る」が効くか | 効かない | **効く** |
| リロードすると | リセットされる | **維持される** |

⚠️ **「画面上の状態」のうち、URLに出せるものはURLに出す。** これは
Webアプリの設計で効く考え方です。stateを減らせば、バグも減ります。

### ① クエリパラメータとは

```
/favorites?genre=和食
           ^^^^^^^^^^
           クエリパラメータ(キー=値)
```

`?` 以降に `キー=値` の形で付ける、URLの追加情報です。
複数付けるときは `&` で繋ぎます(`?genre=和食&sort=new`)。

### ② GenreFilter コンポーネント

```tsx
ファイル名: components/GenreFilter.tsx

import Link from "next/link";
import { GENRES } from "@/lib/types";

export default function GenreFilter({ selected }: { selected: string | null }) {
  return (
    <div className="genre-filter">
      <Link href="/favorites" className={selected === null ? "is-active" : ""}>
        すべて
      </Link>
      {GENRES.map((g) => (
        <Link
          key={g}
          href={`/favorites?genre=${encodeURIComponent(g)}`}
          className={selected === g ? "is-active" : ""}
        >
          {g}
        </Link>
      ))}
    </div>
  );
}
```

**`"use client"` がありません。** ただのリンクの集まりだからです。
JavaScriptを1行もブラウザに送らずに、絞り込み機能が実現できています。

#### encodeURIComponent

```tsx
href={`/favorites?genre=${encodeURIComponent(g)}`}
```

URLには **日本語や記号をそのまま書けません**。
この関数が `和食` を `%E5%92%8C%E9%A3%9F` のような形に変換します。

⚠️ 忘れると、環境によってはリンクが壊れます。
**URLに変数を埋めるときは `encodeURIComponent`**、と覚えてください。

#### 選択中の見た目

```tsx
className={selected === g ? "is-active" : ""}
```

選択中のものにだけ `is-active` クラスを付けます。
CSSで色を変えれば「今どれが選ばれているか」が分かります。

### ③ ページ側でクエリを読む

```tsx
ファイル名: app/favorites/page.tsx

import GenreFilter from "@/components/GenreFilter";
import { GENRES } from "@/lib/types";

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre: genreParam } = await searchParams;
  const genre =
    genreParam && (GENRES as readonly string[]).includes(genreParam) ? genreParam : null;

  const supabase = createClient();
  let query = supabase
    .from("favorite_recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (genre) {
    query = query.eq("genre", genre);
  }
  const { data } = await query;

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>お気に入り</h1>
          <p>保存したレシピの一覧です。タイトルを押すと詳細が開きます。</p>
        </div>

        <GenreFilter selected={genre} />

        <FavoriteList favorites={(data as FavoriteRecipe[]) ?? []} filtered={genre !== null} />
      </main>
    </>
  );
}
```

#### searchParams は await する

```tsx
searchParams: Promise<{ genre?: string }>;
const { genre: genreParam } = await searchParams;
```

⚠️ **Next.js 15 から `searchParams` はPromiseになりました**(07章)。
古い記事のまま `searchParams.genre` と書くとエラーになります。

`{ genre: genreParam }` は分割代入の「名前を変えて取り出す」書き方です。
この後で加工した結果を `genre` という名前で使いたいので、
元の値は `genreParam` という別名にしています。

#### 値の検証(ホワイトリスト)

```tsx
const genre =
  genreParam && (GENRES as readonly string[]).includes(genreParam) ? genreParam : null;
```

URLは利用者が自由に書き換えられます。`?genre=<script>...` のようなものも送れます。
**だから、既知の7つに含まれているかを確認します**(12章のホワイトリスト方式)。

含まれなければ `null` = 絞り込みなし、として扱います。

#### クエリを条件で組み立てる

```tsx
let query = supabase.from("favorite_recipes").select("*").order(...);
if (genre) {
  query = query.eq("genre", genre);
}
const { data } = await query;
```

⚠️ ここだけ `const` ではなく `let` です(04章)。
条件によって `query` を組み替えるため、再代入が必要だからです。

**`await` を最後にまとめている** のがポイントです。
Supabaseのクエリは、`await` するまで実行されません。
だから、それまでは条件を足したり足さなかったりできます。

### ④ 0件メッセージの出し分け

```tsx
ファイル名: components/FavoriteList.tsx

export default function FavoriteList({
  favorites,
  filtered = false,
}: {
  favorites: FavoriteRecipe[];
  filtered?: boolean;
}) {
  if (favorites.length === 0) {
    return (
      <p className="panel-empty">
        {filtered ? "このジャンルのお気に入りはありません。" : "まだお気に入りがありません。"}
      </p>
    );
  }
  ...
}
```

`filtered = false` は **デフォルト引数** で、渡されなければ `false` になります。
型の `filtered?: boolean` の `?` は「省略可能」(05章)。

💡 **同じ「0件」でも意味が違う** ので、メッセージを分けています。

- 絞り込み無しで0件 → 「まだ何も保存していない」
- 絞り込みで0件 → 「このジャンルには無いが、他にはあるかもしれない」

こういう細かい配慮が、使っていて気持ちのいいアプリを作ります。

### ⑤ CSS

```css
ファイル名: app/globals.css (追記)

.genre-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.genre-filter a {
  font-size: 13px;
  padding: 4px 12px;
  border: 1px solid #ddd;
  border-radius: 999px;
}

.genre-filter a.is-active {
  background: #cf6a2c;
  color: #fff;
  border-color: #cf6a2c;
}
```

`flex-wrap: wrap` で、スマホの狭い画面では折り返します(03章)。

### ⑥ 確認

- ジャンルをクリックすると、URLが変わり、一覧が絞られる
- 「すべて」で戻る
- **ブラウザの戻るボタンが効く** ← URLで状態を持つ利点
- 絞り込んだURLを直接開いても、その状態で表示される
- 存在しないジャンル(`?genre=あああ`)を打つと、全件表示に戻る

```
ターミナル
git add . && git commit -m "お気に入り一覧のジャンル絞り込みを追加"
```

---

## 16.3 F9: 材料のチェックボックス

調理中に「この材料は用意した」とチェックできる機能です。
**保存はしません**(要件定義のスコープ外。設計書 5.3)。

### 実装

```tsx
ファイル名: components/RecipeResult.tsx (抜粋)

const [checked, setChecked] = useState<boolean[]>(() => recipe.ingredients.map(() => false));

function toggleChecked(i: number) {
  setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
}
```

表示部分:

```tsx
<ul className="recipe-ingredients recipe-ingredients-checkable">
  {recipe.ingredients.map((item, i) => (
    <li key={i}>
      <label>
        <input type="checkbox" checked={checked[i]} onChange={() => toggleChecked(i)} />
        <span className={checked[i] ? "is-checked" : ""}>{item}</span>
      </label>
    </li>
  ))}
</ul>
```

### 初期値を関数で渡す理由

```tsx
useState<boolean[]>(() => recipe.ingredients.map(() => false));
```

材料の数だけ `false` を並べた配列を作ります(材料が5つなら `[false,false,false,false,false]`)。

⚠️ `useState(recipe.ingredients.map(() => false))` と書いても動きますが、
**再描画のたびに配列が作られます**(使われないのに)。
関数を渡す形にすると **初回だけ実行** されます。これを **遅延初期化** と呼びます。

### 配列stateの更新(06章の復習)

```tsx
setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
```

読み方: 「今の状態を全部見て、**i番目だけ反転** させた **新しい配列** を作る」

```
prev  = [false, false, true]
i = 1
結果   = [false, true,  true]
         ↑そのまま ↑反転  ↑そのまま
```

⚠️ **絶対にやってはいけない書き方**:

```tsx
checked[i] = !checked[i];   // ✕ 元の配列を書き換えている
setChecked(checked);        // ✕ Reactは「同じ配列」と判断して再描画しない
```

画面が更新されず、「クリックしても何も起きない」状態になります。
**Reactのバグの中でも最頻出です。**

### `<label>` で囲む

```tsx
<label>
  <input type="checkbox" ... />
  <span>{item}</span>
</label>
```

囲むことで、**文字をタップしてもチェックが入ります**。
スマホの調理中に、小さな四角を正確にタップするのは大変です。

### チェック済みの見た目

```css
ファイル名: app/globals.css (追記)

.recipe-ingredients-checkable li label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.recipe-ingredients-checkable .is-checked {
  text-decoration: line-through;
  color: #999;
}
```

チェックすると打ち消し線が入り、薄くなります。

### 確認

- チェックを入れると打ち消し線が付く
- 別のレシピを生成すると、チェックがリセットされる(次節で対応)
- **ページをリロードすると全部消える** ← 仕様通り

```
ターミナル
git add . && git commit -m "材料のチェックボックス表示を追加"
```

---

## 16.4 F12: 別レシピの再提案

同じ食材・ジャンルのまま、直前とは違うレシピをもう一度生成する機能です。

### サーバー側は既に対応済み

13章で `avoidTitle` を受け取れるようにしてあります。**画面側だけ作れば完成です。**

💡 これは偶然ではありません。**設計段階でこの機能を見込んでいたから** です(F12)。
「後で足す機能」を設計時に知っていると、こういう先回りができます。

### ① 親の generate 関数を拡張

```tsx
ファイル名: app/page.tsx

async function generate(nextIngredients: string[], nextGenre: Genre, avoidTitle?: string) {
  setGenerating(true);
  setError(null);

  try {
    const res = await fetch("/api/generate-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: nextIngredients, genre: nextGenre, avoidTitle }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "レシピの考案に失敗しました。もう一度お試しください。");
      return;
    }

    setRecipe(data.recipe as Recipe);
    setIngredients(nextIngredients);
    setGenre(nextGenre);
  } catch {
    setError("レシピの考案に失敗しました。もう一度お試しください。");
  } finally {
    setGenerating(false);
  }
}
```

第3引数 `avoidTitle?: string` を足して、bodyに含めるだけです。

### ② RecipeResult に渡す

```tsx
{recipe && (
  <RecipeResult
    recipe={recipe}
    sourceIngredients={ingredients.join("、")}
    genre={genre}
    generating={generating}
    onRegenerate={() => generate(ingredients, genre, recipe.title)}
  />
)}
```

**ここが設計の勘所です**(詳細設計書 2.1)。

```tsx
onRegenerate={() => generate(ingredients, genre, recipe.title)}
```

- `ingredients` / `genre` … **生成時に使った値**(入力欄の現在値ではない)
- `recipe.title` … 今表示しているレシピ名を「これは避けて」として渡す

11章で「入力中の値」と「生成に使った値」を分けた理由が、ここで効きます。
利用者が入力欄をいじった後に再提案を押しても、**同じ食材で再提案** されます。

### ③ ボタンを繋ぐ

```tsx
ファイル名: components/RecipeResult.tsx

export default function RecipeResult({
  recipe,
  sourceIngredients,
  genre,
  generating,
  onRegenerate,
}: {
  recipe: Recipe;
  sourceIngredients: string;
  genre: Genre;
  generating: boolean;
  onRegenerate: () => void;
}) {
```

```tsx
<button type="button" className="btn-secondary" onClick={onRegenerate} disabled={generating}>
  {generating ? "考案中..." : "別のレシピを提案してもらう"}
</button>
```

### ④ 🔑 状態のリセット問題 — この章で一番難しいところ

再提案すると `recipe` が新しくなります。でも:

- `checked`(チェック状態)は **前のレシピのまま**
- `saved`(保存済み)は **`true` のまま** → 新しいレシピを保存できない

**新しいレシピが来たら、これらをリセットする必要があります。**

my-recipe の解決策:

```tsx
const [lastTitle, setLastTitle] = useState(recipe.title);

// 「別のレシピを提案してもらう」で内容が変わったら、チェック・保存状態をリセットする
if (lastTitle !== recipe.title) {
  setLastTitle(recipe.title);
  setChecked(recipe.ingredients.map(() => false));
  setSaved(false);
  setError(null);
}
```

**描画中に `setState` を呼んでいます。** 一見ぎょっとしますが、これは
Reactが公式に推奨している **「propsが変わったときにstateを調整する」** パターンです。

仕組み:

1. 新しい `recipe` が props で届く
2. 描画が始まり、`lastTitle !== recipe.title` が真になる
3. その場でstateを更新し、Reactは **画面に出す前に** もう一度描画し直す
4. 利用者には、リセット済みの状態だけが見える

⚠️ **`useEffect` を使ってはいけません。**

```tsx
// ✕ よくある間違い
useEffect(() => {
  setChecked(recipe.ingredients.map(() => false));
  setSaved(false);
}, [recipe]);
```

`useEffect` は **描画が終わった後** に走ります。つまり
「一瞬だけ古いチェック状態が見えてから、リセットされる」というちらつきが起きます。

💡 判断の目安:
- **propsから計算できる値** → stateにせず、そのまま計算する
- **propsが変わったらリセットしたいstate** → 上記の「描画中に調整」パターン
- **外部との同期(タイマー・購読など)** → `useEffect`

「とりあえず `useEffect`」は初心者の典型的な躓きです。**まず要らないか考える。**

### ⑤ 確認

| 操作 | 期待する結果 |
|---|---|
| 「別のレシピを提案してもらう」を押す | 「考案中...」→ 違うレシピが出る |
| 出てきたレシピ | **前のものと違う料理名** |
| チェックしてから再提案 | **チェックが外れている** |
| 保存してから再提案 | ボタンが「お気に入り登録」に戻っている |
| 入力欄を書き換えてから再提案 | **元の食材で再提案される** |

⚠️ 「違う料理が出る」は保証ではありません(設計書 5.3)。
AIに「別のものを」と伝えているだけなので、たまに似たものが出ます。
**これは仕様として許容する**、と設計書に書いてあります。

```
ターミナル
git add . && git commit -m "別のレシピを再提案する機能を追加"
```

---

## 16.5 補足: 後から列を追加するときの注意

my-recipe は開発途中で `genre` `cooking_time` `servings` を追加しました。
そのとき、詳細設計書 8節にこう記録されています。

> `create table if not exists` だけでは既存テーブルに新しい列は追加されないため、
> `alter table ... add column if not exists ...` 形式のマイグレーションを個別に適用した

つまり:

```sql
-- schema.sql を更新しただけでは、既存のDBは変わらない
alter table favorite_recipes add column if not exists genre text not null default 'こだわりなし';
alter table favorite_recipes add column if not exists cooking_time text not null default '';
alter table favorite_recipes add column if not exists servings text not null default '';
```

⚠️ **2つの作業が必要** です。

1. `supabase/schema.sql` を更新する(**これから作る環境のため**)
2. 既存のDBに `ALTER TABLE` を実行する(**今動いている環境のため**)

1だけやって「反映されない」と悩むのは、初心者の定番です。
既に動いているデータベースには、**差分の命令を別途流す必要がある**。
この作業を **マイグレーション** と呼びます。

💡 `default` を指定しているのがポイントです。既存の行には値が無いので、
`not null` の列を既定値なしで足すとエラーになります。

---

## 16.6 Step 8 のまとめ

- **URLで表現できる状態は、stateにせずURLに出す**(共有・戻る・リロードに強い)
- URLに変数を埋めるときは `encodeURIComponent`
- URLから来た値は **ホワイトリストで検証** する
- 配列のstateは **必ず新しい配列を作って** 更新する
- 「保存しない」と決めた状態は、素直にstateだけで持つ
- **propsが変わったときのstateリセットは、`useEffect` ではなく描画中の調整**
- 既存DBへの列追加は **`ALTER TABLE` を別途実行**(マイグレーション)

機能は完成しました。最後に見た目を整えます。

→ [17_build-09-styling.md](./17_build-09-styling.md)
