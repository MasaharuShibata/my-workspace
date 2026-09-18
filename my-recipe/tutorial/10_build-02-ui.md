# Step 2. 動かない画面を作る

> この章のゴール: ボタンを押しても何も起きないが、
> **完成形と同じ見た目の画面** を、ダミーデータで表示する。

---

## 10.1 なぜ「動かない画面」から作るのか

初心者がやりがちなのは、機能から作って最後に画面を作ることです。
それだと **完成するまで何も見えません**。モチベーションが持ちません。

先に画面を作ると、こうなります。

- **完成イメージが自分にも見える**(達成感がある)
- 「ここに材料を出すには、材料の配列が要る」と、**必要なデータが逆算できる**
- HTMLの構造が固まるので、あとからCSSを当てやすい

そして最大の利点は、**この段階では絶対に壊れない** ことです。
通信もDBもAIも登場しないので、エラーの原因は自分の書いたHTMLだけ。
デバッグが簡単な状態で、構造を固めきってしまいます。

💡 この「データが本物かどうかは後回しにして、まず形を作る」進め方を
**モックアップ(ハリボテ)を作る** と言います。実務でも普通にやります。

---

## 10.2 Header コンポーネントを作る

一番簡単なところから作ります。

```tsx
ファイル名: components/Header.tsx

import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        my-recipe
      </Link>
      <nav className="site-nav">
        <Link href="/">ホーム</Link>
        <Link href="/favorites">お気に入り</Link>
      </nav>
    </header>
  );
}
```

ポイントを確認します。

| 項目 | 説明 |
|---|---|
| `export default function Header()` | コンポーネントは **大文字始まりの関数** (06章) |
| `<Link>` | ページ移動は `<a>` ではなく `<Link>` (07章) |
| `className` | JSXでは `class` ではなく `className` (06章) |
| `"use client"` が無い | stateもクリックイベントも無いので **サーバーコンポーネントのまま** (07章) |
| `<header>` `<nav>` | 意味のあるタグを使う(03章) |

⚠️ `/favorites` のページはまだ作っていないので、押すと404になります。**今は正常です。**
Step 7 で作ります。

### ページに組み込む

```tsx
ファイル名: app/page.tsx

import Header from "@/components/Header";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>my-recipe</h1>
          <p>手元にある食材を入力すると、AIがそれらを活かしたレシピを考案します。</p>
        </div>
      </main>
    </>
  );
}
```

`<>...</>` で包んでいるのは、**返せる要素は1つだけ** だからです(06章)。

ブラウザを確認してください。ヘッダーが出ていれば成功です。
まだ装飾していないので、文字が縦に並んでいるだけの見た目です。それでいいです。

---

## 10.3 入力フォームの「見た目だけ」を作る

まだ動きません。HTMLとしての形だけ作ります。

```tsx
ファイル名: components/IngredientForm.tsx

import { GENRES } from "@/lib/types";

const MAX_INGREDIENTS = 10;

export default function IngredientForm() {
  return (
    <form className="ingredient-form">
      <label htmlFor="ingredients">
        食材(カンマ区切りで複数入力できます・最大{MAX_INGREDIENTS}個)
      </label>
      <div className="ingredient-form-row">
        <input
          id="ingredients"
          type="text"
          placeholder="例: 鶏むね肉, 白菜, しょうが"
        />
        <select id="genre" aria-label="ジャンル">
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button type="submit">レシピを考えてもらう</button>
      </div>
    </form>
  );
}
```

### ここで使っている考え方

**① 定数を先に切り出す**

```tsx
const MAX_INGREDIENTS = 10;
```

`10` を直接書かず、名前を付けています。この数字は
「ラベルの文言」「バリデーション」「エラーメッセージ」の3か所に出てくるので、
**1か所で管理しないと、変更したとき必ず食い違います**。

**② 選択肢をベタ書きしない**

```tsx
{GENRES.map((g) => (
  <option key={g} value={g}>{g}</option>
))}
```

`<option>和食</option>` を7回書いてもいいのですが、そうすると
ジャンルを増やすとき **`lib/types.ts` と画面の両方を直す** ことになります。
`GENRES` から作れば、型定義を1行足すだけで画面にも反映されます(05章)。

**③ `htmlFor` と `id` を揃える**

```tsx
<label htmlFor="ingredients">...</label>
<input id="ingredients" ... />
```

ラベルをタップすると入力欄にカーソルが入ります。スマホでは特に効きます。

**④ `aria-label`**

`<select>` には見えるラベルが無いので、読み上げソフト向けに
「これはジャンル選択です」と名前を付けています。

### ページに組み込む

```tsx
ファイル名: app/page.tsx

import Header from "@/components/Header";
import IngredientForm from "@/components/IngredientForm";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>my-recipe</h1>
          <p>手元にある食材を入力すると、AIがそれらを活かしたレシピを考案します。</p>
        </div>

        <IngredientForm />
      </main>
    </>
  );
}
```

ボタンを押すとページが再読み込みされます。**これは正常な挙動です**(03章の`<form>`)。
Step 3 で止めます。

---

## 10.4 レシピ結果の「見た目だけ」を作る

ここがこの章の本番です。**まだAIは無いので、ダミーのレシピを埋め込みます。**

```tsx
ファイル名: components/RecipeResult.tsx

import type { Recipe } from "@/lib/types";

export default function RecipeResult({ recipe }: { recipe: Recipe }) {
  return (
    <section className="recipe-result">
      <div className="recipe-result-header">
        <h2>{recipe.title}</h2>
        <span className="genre-badge">和食</span>
      </div>
      <p className="recipe-meta">
        調理時間: {recipe.cookingTime} ・ {recipe.servings}
      </p>
      <p className="recipe-source">使った食材: 鶏むね肉、白菜</p>

      <h3>材料</h3>
      <ul className="recipe-ingredients">
        {recipe.ingredients.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <h3>作り方</h3>
      <ol className="recipe-steps">
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      <div className="recipe-result-actions">
        <button>お気に入り登録</button>
        <button type="button" className="btn-secondary">
          別のレシピを提案してもらう
        </button>
      </div>
    </section>
  );
}
```

### 読み解く

**props で `recipe` を受け取っている**

```tsx
export default function RecipeResult({ recipe }: { recipe: Recipe }) {
```

06章の props です。そして型は 09章で作った `Recipe` を使います。
**型を先に書いておいたおかげで、`recipe.` と打つと項目が補完で出てきます。**

**配列をリストに変換**

```tsx
{recipe.ingredients.map((item, i) => <li key={i}>{item}</li>)}
```

`map` + `key` です(06章)。材料は並び替えも削除もしないので `key={i}` で十分です。

**材料は `<ul>`、手順は `<ol>`**

順番に意味があるかどうかで使い分けます(03章)。

**ジャンルと使った食材は、まだベタ書き**

```tsx
<span className="genre-badge">和食</span>
<p className="recipe-source">使った食材: 鶏むね肉、白菜</p>
```

これは Step 3 で props から受け取る形に直します。
**今は「後で直す」と分かっていればいい** です。一度に全部やろうとしない。

### ダミーデータで表示する

```tsx
ファイル名: app/page.tsx

import Header from "@/components/Header";
import IngredientForm from "@/components/IngredientForm";
import RecipeResult from "@/components/RecipeResult";
import type { Recipe } from "@/lib/types";

// Step 4 で本物のAIに差し替える。それまでの仮データ
const DUMMY_RECIPE: Recipe = {
  title: "鶏むね肉と白菜の生姜炒め",
  cookingTime: "20分",
  servings: "2人分",
  ingredients: [
    "鶏むね肉 200g",
    "白菜 1/4個",
    "しょうが 1片",
    "しょうゆ 大さじ1",
    "ごま油 小さじ1",
  ],
  steps: [
    "鶏むね肉を一口大のそぎ切りにし、酒と片栗粉をもみ込む",
    "白菜は芯と葉に分け、芯はそぎ切り、葉はざく切りにする",
    "しょうがはせん切りにする",
    "フライパンにごま油を熱し、鶏肉を色が変わるまで炒める",
    "白菜の芯、葉の順に加えて炒め、しょうゆで味を調える",
  ],
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>my-recipe</h1>
          <p>手元にある食材を入力すると、AIがそれらを活かしたレシピを考案します。</p>
        </div>

        <IngredientForm />
        <RecipeResult recipe={DUMMY_RECIPE} />
      </main>
    </>
  );
}
```

ブラウザを確認してください。**完成形とほぼ同じ情報が並んでいるはずです。**

⚠️ `DUMMY_RECIPE` に `// Step 4 で差し替える` とコメントを書いておいてください。
仮実装には必ず印を残します。書かないと、本番に混入します(実際によくある事故です)。

---

## 10.5 少しだけCSSを当てる

Step 9 で本格的にやりますが、真っ白だと構造が見えないので、
**読める程度** だけ足しておきます。

```css
ファイル名: app/globals.css (末尾に追記)

.site-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ddd;
}

.site-nav {
  display: flex;
  gap: 16px;
}

.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px;
}

.ingredient-form-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.ingredient-form-row input {
  flex: 1;
}

.recipe-result {
  margin-top: 32px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 14px;
}

.recipe-result-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}
```

03章で学んだものしか使っていません。

| 指定 | 効果 |
|---|---|
| `max-width: 720px; margin: 0 auto` | 中央寄せの定番。幅を制限して読みやすくする |
| `display: flex; gap` | 横並び |
| `flex: 1`(inputに) | 余った幅を入力欄に吸わせる |
| `justify-content: space-between` | ロゴを左、ナビを右に |

---

## 10.6 この段階で確認すること

- [ ] ヘッダーが横並びで表示される
- [ ] 入力欄・ジャンル選択・ボタンが横に並んでいる
- [ ] ジャンルの選択肢が7つ出る
- [ ] ダミーのレシピが、材料は「・」付き、手順は番号付きで表示される
- [ ] ブラウザのConsole(F12)に赤いエラーが無い

最後の項目が大事です。**エラーが無い状態を維持したまま進んでください。**
「あとで直そう」と放置したエラーは、後で原因の切り分けを不可能にします。

---

## 10.7 コミット

```
ターミナル
git add .
git commit -m "ホーム画面の静的UI(ヘッダー・入力フォーム・レシピ表示)を作成"
```

---

## 10.8 Step 2 のまとめ

- **動かない画面から作る**。この段階では壊れようがないので、構造に集中できる
- ダミーデータを使うと、**必要なデータの形が逆算できる**
- 定数(`MAX_INGREDIENTS`)と一覧(`GENRES`)は **1か所で管理** する
- 仮実装には **コメントで印を付ける**
- CSSは「読める程度」だけ。本格的な装飾は最後

🖐 **考えてみよう**
いまの `RecipeResult` は、ジャンルと「使った食材」がベタ書きです。
これを props で受け取るようにすると、型定義はどうなるでしょうか。

<details>
<summary>答え</summary>

```tsx
export default function RecipeResult({
  recipe,
  sourceIngredients,
  genre,
}: {
  recipe: Recipe;
  sourceIngredients: string;
  genre: Genre;
}) { ... }
```

`sourceIngredients` を `string[]` ではなく `string` にしているのは、
表示するときは「鶏むね肉、白菜」という1つの文字列だからです。
配列を渡して中で `join` してもいいですが、
**「表示用の文字列は、渡す前に作っておく」** ほうが部品の責任がすっきりします。

次のStepで、実際にこの形にします。
</details>

→ [11_build-03-form.md](./11_build-03-form.md)
