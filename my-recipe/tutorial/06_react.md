# 06. React — 画面を部品に分けて組み立てる

> この章のゴール: コンポーネント・props・stateの3つを理解し、
> `components/` 配下のファイルが何をしているか読めるようになる。

---

## 6.1 Reactは何を解決したのか

素のJavaScriptで画面を書き換えるのは、こういう作業でした。

```js
document.getElementById("result").innerHTML = "<h2>" + recipe.title + "</h2>";
document.getElementById("save-btn").disabled = true;
document.getElementById("error").style.display = "none";
```

「**データが変わったら、画面のどこをどう書き換えるか**」を全部自分で指示します。
機能が10個を超えると、必ず書き換え漏れが起きます。

Reactの発想は逆です。

> **「このデータのとき、画面はこう見える」だけを書く。**
> **データが変わったら、Reactが画面を勝手に作り直す。**

```jsx
{recipe && <h2>{recipe.title}</h2>}
```

「レシピがあれば見出しを出す」と書いておけば、
レシピが入った瞬間に表示され、消えた瞬間に消えます。
**書き換えの指示を書かなくていい。** これがReactの本質です。

---

## 6.2 コンポーネント — 画面の部品

**コンポーネントは「HTMLを返す関数」です。** それ以上でも以下でもありません。

```jsx
function Header() {
  return (
    <header className="site-header">
      <a href="/">my-recipe</a>
    </header>
  );
}
```

ルールは3つ。

1. **関数名は大文字で始める**(`Header`、`RecipeResult`)。小文字だとHTMLタグ扱いされる
2. HTMLのようなもの(JSX)を `return` する
3. 使うときはタグのように書く: `<Header />`

### なぜ部品に分けるのか

my-recipe のホーム画面は、こうなっています。

```jsx
<>
  <Header />
  <main className="page">
    <div className="page-intro"> ... </div>
    <IngredientForm ... />
    {recipe && <RecipeResult ... />}
  </main>
</>
```

**画面の構造が一目で読めます。** 全部を1ファイルに書いたら300行の壁になり、
「どこを直せばいいか」を探すだけで時間が溶けます。

分ける基準は、実務ではだいたいこの3つです。

- **繰り返し使う**(Headerは2画面で使う)
- **1つの役割で完結する**(お気に入りカード1枚)
- **長くなってきた**(50行を超えたら分割を考える)

---

## 6.3 JSX — HTMLに見えるJavaScript

```jsx
return <h1>my-recipe</h1>;
```

これはHTMLではなく、**JavaScriptの式** です。Next.jsが裏でJavaScriptに変換します。
HTMLとよく似ていますが、**違いが5つ** あります。ここは必ず踏みます。

| # | HTML | JSX | 理由 |
|---|---|---|---|
| 1 | `class="card"` | `className="card"` | `class` はJSの予約語 |
| 2 | `for="id"` | `htmlFor="id"` | `for` はJSの予約語 |
| 3 | `onclick="..."` | `onClick={...}` | イベント名はキャメルケース |
| 4 | `<br>` | `<br />` | 閉じないタグも `/>` が必要 |
| 5 | 複数要素をそのまま並べられる | **1つにまとめる必要がある** | 関数は1つしか返せない |

### 5番の対処法: フラグメント

```jsx
// ✕ エラーになる
return (
  <Header />
  <main>...</main>
);

// ○ 空タグ(フラグメント)で包む
return (
  <>
    <Header />
    <main>...</main>
  </>
);
```

`<>...</>` は「余計なdivを増やさずに、まとめるだけ」の記法です。
my-recipe の `app/page.tsx` の先頭がこれです。

### `{ }` — JSXの中でJavaScriptを使う

```jsx
<h2>{recipe.title}</h2>                        {/* 変数を表示 */}
<p>調理時間: {recipe.cookingTime}</p>
<button disabled={generating}>保存</button>     {/* 属性に値を渡す */}
<p>{count + 1}個目</p>                          {/* 計算してもいい */}
```

**`{ }` の中はJavaScriptの世界、外はHTMLの世界** と考えてください。
この2つの世界を行き来しているのがJSXです。

⚠️ `{ }` の中に書けるのは **式(値になるもの)** だけです。
`if` 文や `for` 文はそのまま書けません。だから次の書き方を使います。

### 条件で表示を切り替える

```jsx
{/* あれば表示、なければ何も出さない */}
{error && <p className="form-error">{error}</p>}

{/* AかBか */}
{generating ? "考案中..." : "レシピを考えてもらう"}

{/* 早期リターン(コンポーネントごと出し分ける) */}
function FavoriteList({ favorites }) {
  if (favorites.length === 0) {
    return <p>まだお気に入りがありません。</p>;
  }
  return <div>...</div>;
}
```

3つ目の「早期リターン」は `components/FavoriteList.tsx` で実際に使われています。
条件が複雑になったら、三項演算子をネストせず早期リターンにするほうが読めます。

### リストを表示する

```jsx
<ul>
  {recipe.ingredients.map((item, i) => (
    <li key={i}>{item}</li>
  ))}
</ul>
```

04章の `map` がここで効いてきます。**配列 → JSXの配列** に変換すると、
Reactが並べて表示してくれます。

⚠️ **`key` を必ず付けてください。** Reactが「どの要素がどれか」を見分けるための札です。
無いと警告が出ますし、並べ替えたときに表示がおかしくなります。

- 一意なIDがあるなら **それを使う**: `key={favorite.id}` ← お気に入り一覧はこちら
- 並び替えも削除もしないなら index でよい: `key={i}` ← 材料リストはこちら

---

## 6.4 props — 親から子へデータを渡す

コンポーネントに渡す引数のことを **props** と呼びます。

```jsx
// 親が渡す
<FavoriteCard favorite={favorite} />

// 子が受け取る
function FavoriteCard({ favorite }) {
  return <h3>{favorite.title}</h3>;
}
```

`{ favorite }` は04章でやった分割代入です。
TypeScriptでは、受け取る型も一緒に書きます。

```tsx
export default function FavoriteCard({ favorite }: { favorite: FavoriteRecipe }) {
  ...
}
```

複数渡すときはこうなります(`components/RecipeResult.tsx` の実物):

```tsx
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
}) { ... }
```

`onRegenerate: () => void` に注目してください。
**props には関数も渡せます。** 「引数なし・戻り値なしの関数」という型です。

### データは上から下にしか流れない

```
app/page.tsx  (親)
   ├─ recipe というデータを持っている
   ↓ props で渡す
RecipeResult  (子)
   └─ 受け取って表示するだけ。書き換えてはいけない
```

これを **単方向データフロー** と呼びます。
子が勝手に親のデータを書き換えられないので、
「誰がこの値を変えたのか」を追いかけやすくなります。

### では、子から親に何か伝えたいときは?

**関数を渡します。** 子はその関数を呼ぶだけです。

```jsx
// 親: 「食材が確定したら、この関数を呼んでね」
<IngredientForm onSubmit={(ing, g) => generate(ing, g)} />

// 子: 送信されたら、もらった関数を呼ぶ
function IngredientForm({ onSubmit }) {
  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(ingredients, genre);   // ← 親に伝える
  }
}
```

⚠️ これは初心者が最も混乱する部分ですが、決まり文句です。
**「データは props で下へ、出来事は 関数 で上へ」**。これだけです。

---

## 6.5 state — 変化する値

props は親からもらう値でした。**state はコンポーネント自身が持つ、変化する値** です。

```jsx
import { useState } from "react";

function IngredientForm() {
  const [input, setInput] = useState("");
  //     ↑現在の値  ↑変更する関数        ↑初期値

  return (
    <input value={input} onChange={(e) => setInput(e.target.value)} />
  );
}
```

### なぜ普通の変数ではダメなのか

```jsx
let input = "";                    // ✕ これでは画面が変わらない
input = "鶏むね肉";                 // 値は変わるが、Reactは知らない
```

**Reactは `setXxx` が呼ばれたときだけ、「画面を作り直す必要がある」と気づきます。**
普通の変数を書き換えても、画面は古いままです。

### 動きのイメージ

```
1. 利用者がキーを打つ
2. onChange が発火 → setInput("鶏") が呼ばれる
3. Reactが「状態が変わった」と気づく
4. IngredientForm 関数がもう一度実行される
5. 今度は input = "鶏" になっている
6. 画面が更新される
```

**コンポーネント関数は、stateが変わるたびに何度も実行されます。**
これがReactの一番の「変な」ところです。慣れるまで気持ち悪いですが、
「state が変わる → 関数が再実行 → 新しい画面」というループだと覚えてください。

### my-recipeで使われているstate

| ファイル | state | 何を表すか |
|---|---|---|
| `app/page.tsx` | `recipe` | 今表示しているレシピ(まだなら `null`) |
| | `generating` | AIが考え中かどうか |
| | `error` | エラーメッセージ(無ければ `null`) |
| `IngredientForm.tsx` | `input` | 入力欄の文字 |
| | `genre` | 選択中のジャンル |
| `RecipeResult.tsx` | `saving` / `saved` | 保存中/保存済み |
| | `checked` | 材料のチェック状態(true/falseの配列) |
| `FavoriteCard.tsx` | `open` | カードが開いているか |

**「画面の見た目を変える要素」がstateになる**、と考えると見つけやすいです。

---

## 6.6 stateの鉄則 — 必ず新しい値を作る

```jsx
// ✕ 元の配列を書き換えている → 画面が更新されない
checked[0] = true;
setChecked(checked);

// ○ 新しい配列を作る
setChecked(checked.map((v, i) => (i === 0 ? !v : v)));
```

Reactは「**同じものか、別のものか**」だけを見ます。
中身をいじっても、同じ配列であればReactは「変わっていない」と判断します。

my-recipe の実物:

```jsx
function toggleChecked(i: number) {
  setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
}
```

読み方: 「今のチェック状態(prev)を全部見て、i番目だけ反転させた**新しい配列**を作る」

💡 `setChecked((prev) => ...)` のように関数を渡す形は
**「今の値を元に次の値を決める」** ときの正しい書き方です。
`setChecked(checked.map(...))` でも大抵動きますが、
更新が連続したときに古い値を参照する事故が起きます。関数形式が安全です。

### オブジェクトの場合

```jsx
setUser({ ...user, name: "新しい名前" });
//        ↑スプレッド構文で全部コピーしてから、nameだけ上書き
```

---

## 6.7 イベント処理

```jsx
<button onClick={handleSave}>保存</button>
<button onClick={() => generate(ingredients, genre)}>再提案</button>
<input onChange={(e) => setInput(e.target.value)} />
<form onSubmit={handleSubmit}>...</form>
```

⚠️ **`onClick={handleSave()}` と書いてはいけません。**

```jsx
onClick={handleSave}      // ○ 関数そのものを渡す(押されたら呼ばれる)
onClick={handleSave()}    // ✕ 今すぐ実行して、戻り値を渡してしまう
onClick={() => handleSave(id)}  // ○ 引数を渡したいときはこの形
```

これは初心者が100%踏む罠です。「無限ループする」「勝手に実行される」ときは疑ってください。

### フォーム送信の `preventDefault`

```jsx
function handleSubmit(e: FormEvent) {
  e.preventDefault();   // ← これが無いとページが再読み込みされる
  ...
}
```

HTMLの `<form>` は本来「送信するとページを再読み込みする」ものです。
Reactではそれを止めて、自分で処理します。**忘れると画面が一瞬で戻ります。**

### 制御されたコンポーネント

```jsx
<input value={input} onChange={(e) => setInput(e.target.value)} />
```

- `value={input}` … 表示する値はstateから来る
- `onChange` … 打つたびにstateを更新する

この2つをセットにすると、**入力欄の中身とstateが常に一致** します。
「入力値を取り出す」必要がなくなり、stateを見ればいいだけになります。

---

## 6.8 stateをどこに置くか — my-recipeの設計判断

これは実務で最も頭を使うところで、設計書にも明記されています
(詳細設計書 2.1)。

my-recipe の悩みはこうでした。

- 「レシピを考えてもらう」ボタンは `IngredientForm` の中にある
- 「別のレシピを提案してもらう」ボタンは `RecipeResult` の中にある
- **どちらも同じ「生成処理」を呼びたい**

もし生成処理を `IngredientForm` に持たせると、
`RecipeResult` から呼べません(兄弟同士は直接やりとりできない)。

そこで **共通の親である `app/page.tsx` に生成処理とレシピのstateを置きました**。

```
app/page.tsx  ← recipe, generating, error と generate関数を持つ
   ├─ IngredientForm  ← onSubmit で親の generate を呼ぶ
   └─ RecipeResult    ← onRegenerate で親の generate を呼ぶ
```

この「共通の親まで state を持ち上げる」やり方を
**リフトアップ(state lifting)** と呼びます。

⚠️ ただし **何でも親に置けばいい訳ではありません。**
`FavoriteCard` の「開いている/閉じている」は、そのカードだけの話なので
カード自身が持っています。親に持たせたら、カードの数だけ配列で管理する羽目になります。

**判断基準**: その値を **2つ以上のコンポーネントが必要とするか**。
必要とするなら共通の親へ、1つだけなら自分で持つ。

---

## 6.9 この章のまとめ

- コンポーネントは **JSXを返す関数**。名前は大文字始まり
- JSXは `className`、`onClick`、`{ }`、1つに包む、が守るべき点
- リストは `.map()` + **`key`**
- **props は親→子**。書き換えない
- **子→親は関数を渡して呼んでもらう**
- **state は変化する値**。`setXxx` を呼んだときだけ画面が更新される
- state は **必ず新しい値を作って** 渡す(`...`、`.map()`)
- `onClick={fn}` であって `onClick={fn()}` ではない
- state は **必要とする人たちの共通の親** に置く

🖐 **考えてみよう**
`components/FavoriteCard.tsx` を開いて、次を探してください。

1. state はいくつあるか。それぞれ何のためか
2. props で何を受け取っているか
3. 削除ボタンを押したあと、なぜ「このカードを消す」処理を書いていないのか

<details>
<summary>3のヒントと答え</summary>

削除処理のあとにこうコメントが書かれています。

> 成功時は revalidatePath により一覧側が再描画されるため、ここでの状態更新は不要

削除はサーバー側(Server Action)で行われ、その中で
`revalidatePath("/favorites")` が呼ばれます。すると Next.js が
**一覧ページ全体をサーバーで作り直して** 送ってきます。
結果としてカードは消えます。

自分で「このカードを非表示にする」state を持つと、
**画面上は消えたのにDBには残っている**、という不整合が起きえます。
「**画面はデータの写し鏡であって、画面を直接いじらない**」という考え方の実例です。
次章のNext.jsで詳しく扱います。
</details>

→ [07_nextjs.md](./07_nextjs.md)
