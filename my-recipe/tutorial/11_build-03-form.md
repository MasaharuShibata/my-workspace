# Step 3. フォームを動かす

> この章のゴール: 入力・選択・送信が動き、入力チェックが働くようにする。
> **まだサーバーは登場しません。** ブラウザの中だけで完結させます。

---

## 11.1 この段階のゴールを具体化する

「フォームが動く」とは、何ができれば動いたと言えるのか。先に決めます。

- [ ] 入力欄に打った文字が、Reactのstateに入る
- [ ] ジャンルを選ぶと、選んだ値がstateに入る
- [ ] 送信してもページが再読み込みされない
- [ ] 「鶏むね肉, 白菜」が `["鶏むね肉", "白菜"]` に変換される
- [ ] 空のまま送ると「食材を1つ以上入力してください。」が出る
- [ ] 11個以上送ると「食材は10個までにしてください。」が出る
- [ ] 送信された内容が、親コンポーネントに伝わる(今はConsoleに出せばOK)

**先にゴールを箇条書きにすると、どこまでやったか迷いません。**

---

## 11.2 "use client" を付ける

入力欄を動かすには `useState` が要ります。つまりクライアントコンポーネントです(07章)。

```tsx
ファイル名: components/IngredientForm.tsx

"use client";

import { useState, type FormEvent } from "react";
import { GENRES, type Genre } from "@/lib/types";
```

⚠️ `"use client"` は **ファイルの一番上** に書きます。
import より下に書くとエラーになります。

💡 `import { useState, type FormEvent }` の `type` キーワードは、
「これは型だけを取り込んでいる」という印です。付けなくても動きますが、
付けると「実行時には消える」ことが明示されて読みやすくなります。

---

## 11.3 stateを持たせる

```tsx
export default function IngredientForm() {
  const [input, setInput] = useState("");
  const [genre, setGenre] = useState<Genre>("こだわりなし");
  const [error, setError] = useState<string | null>(null);
  ...
}
```

3つのstateを置きました。それぞれの理由:

| state | 型 | なぜ必要か |
|---|---|---|
| `input` | `string` | 入力欄の中身。打つたびに変わる |
| `genre` | `Genre` | 選択中のジャンル |
| `error` | `string \| null` | エラーメッセージ。**無いときは `null`** |

⚠️ `error` を `string` で初期値 `""` にしてもいいのですが、
`null` にすると「エラーが無い」ことがはっきりします(04章の `null` の話)。
そして `{error && <p>...}` の判定がそのまま書けます。

`useState<Genre>("こだわりなし")` のように型を `<>` で指定しているのは、
初期値から推論すると `string` になってしまい、
「`"フレンチ"` を入れてもエラーにならない」状態になるからです(05章)。

---

## 11.4 入力欄をstateと繋ぐ(制御されたコンポーネント)

```tsx
<input
  id="ingredients"
  type="text"
  placeholder="例: 鶏むね肉, 白菜, しょうが"
  value={input}
  onChange={(e) => setInput(e.target.value)}
/>
```

- `value={input}` … 表示される文字はstateから来る
- `onChange` … 1文字打つたびに `setInput` が呼ばれ、stateが更新される

この往復があるので、**入力欄の中身とstateが常に一致** します(06章)。

`e.target.value` の `e` は **イベントオブジェクト** で、
「何が起きたか」の情報が入っています。`target` が「操作された要素」、
`value` が「その中身」です。

同じ要領でジャンルも繋ぎます。

```tsx
<select
  id="genre"
  value={genre}
  onChange={(e) => setGenre(e.target.value as Genre)}
  aria-label="ジャンル"
>
```

⚠️ `as Genre` が必要な理由: `e.target.value` は必ず `string` 型として返ってきます。
TypeScriptは「その文字列が7つのジャンルのどれかである」ことを知りません。
`<select>` の選択肢を `GENRES` から作っている以上、他の値は入りえないので、
ここは `as` で断言して構いません(05章の「最後の手段」の正当な使い所です)。

---

## 11.5 入力文字列を配列に変換する

「鶏むね肉, 白菜 ,,  しょうが」のような雑な入力を、きれいな配列にします。

```tsx
function parseIngredients(input: string): string[] {
  return input
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
```

**1行ずつ何が起きているか** を追ってください。入力が `"鶏むね肉, 白菜 ,, "` の場合:

```
"鶏むね肉, 白菜 ,, "
  .split(/[,、]/)         → ["鶏むね肉", " 白菜 ", "", " "]
  .map(s => s.trim())     → ["鶏むね肉", "白菜", "", ""]
  .filter(s => s.length>0)→ ["鶏むね肉", "白菜"]
```

04章でやった `split` `map` `filter` の合わせ技です。

| 処理 | 役割 |
|---|---|
| `split(/[,、]/)` | 半角カンマ **または** 全角読点で区切る |
| `trim()` | 前後の空白を除去 |
| `filter(...)` | 空になったものを捨てる |

💡 全角読点 `、` にも対応しているのは、**日本語入力では普通に打ってしまうから**です。
「半角カンマで区切ってください」と利用者に強いるより、
両方受け付けるほうが親切です。こういう細かい配慮が使い勝手を決めます。

⚠️ この関数はコンポーネントの **外側** に置いてください。

```tsx
const MAX_INGREDIENTS = 10;

function parseIngredients(input: string): string[] { ... }   // ← ここ

export default function IngredientForm() { ... }
```

コンポーネントの中に書くと、**再描画のたびに関数が作り直されます**。
stateに依存しない処理は外に出す、と覚えてください。

---

## 11.6 送信処理とバリデーション

```tsx
function handleSubmit(e: FormEvent) {
  e.preventDefault();
  const ingredients = parseIngredients(input);

  if (ingredients.length === 0) {
    setError("食材を1つ以上入力してください。");
    return;
  }
  if (ingredients.length > MAX_INGREDIENTS) {
    setError(`食材は${MAX_INGREDIENTS}個までにしてください。`);
    return;
  }

  setError(null);
  onSubmit(ingredients, genre);
}
```

### e.preventDefault()

**これを忘れるとページが再読み込みされます**(06章)。
「ボタンを押したら画面が真っ白に戻る」「入力が消える」はほぼこれです。

### 早期リターン

```tsx
if (条件) {
  setError("...");
  return;      // ← ここで関数を抜ける
}
```

エラーなら即座に抜ける書き方です。
`if / else` を入れ子にするより圧倒的に読みやすくなります。
**「例外を先に片付けて、最後に正常系を書く」** のが読みやすいコードの型です。

### 成功時に setError(null)

```tsx
setError(null);
```

これを忘れると、一度出たエラーが消えません。
**「エラーを出す」だけでなく「エラーを消す」も必ず書く。** 定番の抜けです。

### バリデーションの順番

空チェック → 個数チェック、の順です。逆にすると、
空入力のときに「10個まで」と出る…ことはありませんが、
一般に **「そもそも入っているか」→「中身が正しいか」** の順が基本です。

---

## 11.7 親に結果を伝える

送信結果は、この部品の中では使いません。親に渡します(06章)。

```tsx
export default function IngredientForm({
  generating,
  onSubmit,
}: {
  generating: boolean;
  onSubmit: (ingredients: string[], genre: Genre) => void;
}) {
```

`onSubmit: (ingredients: string[], genre: Genre) => void` は
「文字列配列とジャンルを受け取り、何も返さない関数」という型です(05章)。

`generating` は親から「いまAIが考え中かどうか」をもらうためのものです。
考え中は入力とボタンを無効にします。

```tsx
<input ... disabled={generating} />
<select ... disabled={generating} />
<button type="submit" disabled={generating}>
  {generating ? "考案中..." : "レシピを考えてもらう"}
</button>
```

⚠️ **二重送信の防止は必須です。**
AIの呼び出しは1回ごとにお金がかかるので、
連打で5回呼ばれたら5回課金されます。`disabled` は節約機能でもあります。

---

## 11.8 完成した IngredientForm

```tsx
ファイル名: components/IngredientForm.tsx

"use client";

import { useState, type FormEvent } from "react";
import { GENRES, type Genre } from "@/lib/types";

const MAX_INGREDIENTS = 10;

function parseIngredients(input: string): string[] {
  return input
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function IngredientForm({
  generating,
  onSubmit,
}: {
  generating: boolean;
  onSubmit: (ingredients: string[], genre: Genre) => void;
}) {
  const [input, setInput] = useState("");
  const [genre, setGenre] = useState<Genre>("こだわりなし");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ingredients = parseIngredients(input);

    if (ingredients.length === 0) {
      setError("食材を1つ以上入力してください。");
      return;
    }
    if (ingredients.length > MAX_INGREDIENTS) {
      setError(`食材は${MAX_INGREDIENTS}個までにしてください。`);
      return;
    }

    setError(null);
    onSubmit(ingredients, genre);
  }

  return (
    <form className="ingredient-form" onSubmit={handleSubmit}>
      <label htmlFor="ingredients">
        食材(カンマ区切りで複数入力できます・最大{MAX_INGREDIENTS}個)
      </label>
      <div className="ingredient-form-row">
        <input
          id="ingredients"
          type="text"
          placeholder="例: 鶏むね肉, 白菜, しょうが"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={generating}
        />
        <select
          id="genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value as Genre)}
          disabled={generating}
          aria-label="ジャンル"
        >
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button type="submit" disabled={generating}>
          {generating ? "考案中..." : "レシピを考えてもらう"}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
```

---

## 11.9 親(app/page.tsx)を対応させる

親は「クライアントコンポーネント」になります。stateを持つからです。

```tsx
ファイル名: app/page.tsx

"use client";

import { useState } from "react";
import Header from "@/components/Header";
import IngredientForm from "@/components/IngredientForm";
import RecipeResult from "@/components/RecipeResult";
import type { Genre, Recipe } from "@/lib/types";

const DUMMY_RECIPE: Recipe = {
  title: "鶏むね肉と白菜の生姜炒め",
  cookingTime: "20分",
  servings: "2人分",
  ingredients: ["鶏むね肉 200g", "白菜 1/4個", "しょうが 1片"],
  steps: ["鶏むね肉を一口大に切る", "白菜をざく切りにする", "炒め合わせる"],
};

export default function HomePage() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [genre, setGenre] = useState<Genre>("こだわりなし");
  const [generating, setGenerating] = useState(false);

  // Step 4 で本物のAPI呼び出しに差し替える
  function generate(nextIngredients: string[], nextGenre: Genre) {
    console.log("送信された食材:", nextIngredients, "ジャンル:", nextGenre);
    setRecipe(DUMMY_RECIPE);
    setIngredients(nextIngredients);
    setGenre(nextGenre);
  }

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>my-recipe</h1>
          <p>手元にある食材を入力すると、AIがそれらを活かしたレシピを考案します。</p>
        </div>

        <IngredientForm generating={generating} onSubmit={generate} />

        {recipe && (
          <RecipeResult
            recipe={recipe}
            sourceIngredients={ingredients.join("、")}
            genre={genre}
          />
        )}
      </main>
    </>
  );
}
```

### 4つのstateの役割

| state | 役割 |
|---|---|
| `recipe` | 表示中のレシピ。**初期値は `null`**(まだ何も無い) |
| `ingredients` | 生成に使った食材。結果表示の「使った食材:」に使う |
| `genre` | 生成に使ったジャンル。バッジ表示と、あとで保存に使う |
| `generating` | 考え中フラグ。Step 4 で実際に使う |

⚠️ `ingredients` / `genre` を **なぜ親が持つのか**。

`IngredientForm` も同じ値を持っていますが、あちらは「**いま入力中の値**」です。
利用者が生成後に入力欄を書き換えても、表示中のレシピの「使った食材」は
変わってはいけません。**「入力中の値」と「生成に使った値」は別物** なのです。

これは実際に設計で悩むポイントで、詳細設計書 2.1 に記載されている
「`app/page.tsx`側で一元管理」の理由でもあります。

### 条件付きレンダリング

```tsx
{recipe && (
  <RecipeResult ... />
)}
```

`recipe` が `null` の間は何も表示されません(06章)。
基本設計書 2.3 の「未生成時は非表示」がこの1行です。

### 表示用の文字列は渡す前に作る

```tsx
sourceIngredients={ingredients.join("、")}
```

配列を渡して `RecipeResult` の中で `join` してもいいのですが、
**表示用の加工は渡す側でやる** ほうが、部品が単純になります(10章の演習の答え)。

---

## 11.10 RecipeResult を props 対応にする

ベタ書きしていた2か所を、props から受け取るよう直します。

```tsx
ファイル名: components/RecipeResult.tsx

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
  return (
    <section className="recipe-result">
      <div className="recipe-result-header">
        <h2>{recipe.title}</h2>
        <span className="genre-badge">{genre}</span>
      </div>
      <p className="recipe-meta">
        調理時間: {recipe.cookingTime} ・ {recipe.servings}
      </p>
      <p className="recipe-source">使った食材: {sourceIngredients}</p>

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

---

## 11.11 エラー表示のCSS

```css
ファイル名: app/globals.css (追記)

.form-error {
  color: #b3402c;
  font-size: 14px;
  margin-top: 8px;
}
```

---

## 11.12 動作確認

ブラウザで、11.1 のチェックリストを1つずつ確認します。

| 操作 | 期待する結果 |
|---|---|
| 何も入力せず送信 | 「食材を1つ以上入力してください。」が赤字で出る |
| 「 , , 」だけ入力して送信 | 同上(空白は除去されるため) |
| 「鶏むね肉, 白菜」で送信 | ダミーレシピが表示される。Consoleに配列が出る |
| 食材を11個入力して送信 | 「食材は10個までにしてください。」が出る |
| エラー後に正しく入力して送信 | **エラーが消える** |
| ジャンルを「洋食」にして送信 | 結果のバッジが「洋食」になる |

⚠️ 最後から2番目(エラーが消える)を必ず確認してください。
`setError(null)` の書き忘れは非常に多いバグです。

💡 Consoleで配列が `["鶏むね肉", "白菜"]` と出れば、
`parseIngredients` が正しく動いている証拠です。
**ここが正しいと分かっていれば、次のStepで通信が失敗したとき、
「入力の変換は問題ない」と切り分けられます。**

---

## 11.13 コミット

```
ターミナル
git add .
git commit -m "食材入力フォームの状態管理・バリデーションを実装"
```

---

## 11.14 Step 3 のまとめ

- `useState` を使うファイルには **`"use client"`**
- 入力欄は `value` + `onChange` の **セット**(制御されたコンポーネント)
- `e.preventDefault()` を忘れるとページが再読み込みされる
- バリデーションは **早期リターン**。成功時の `setError(null)` を忘れない
- 子から親へは **関数(`onSubmit`)を渡して呼んでもらう**
- 「入力中の値」と「生成に使った値」は **別のstate**
- 処理中は `disabled` で **二重送信を防ぐ**(課金の防衛でもある)

次はいよいよサーバー側です。ただし、まだAIは呼びません。

→ [12_build-04-api.md](./12_build-04-api.md)
