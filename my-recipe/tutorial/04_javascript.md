# 04. JavaScript — 画面を動かす言語

> この章のゴール: my-recipe のコードに出てくる文法を、ひと通り読めるようになる。
> 暗記は不要。「見たことがある」状態を作るのが目的。

この章の例は、すべて my-recipe のコードから取っています。
いま完全に理解できなくても構いません。**Part 3 で詰まったら戻ってくる用の辞書** として使ってください。

---

## 4.1 変数 — 値に名前を付ける

```js
const MAX_INGREDIENTS = 10;   // 後から変えない
let count = 0;                // 後から変える
count = 1;                    // OK
```

| キーワード | 意味 | 使い分け |
|---|---|---|
| `const` | 再代入できない | **原則こっち** |
| `let` | 再代入できる | どうしても変える必要があるときだけ |
| `var` | 古い書き方 | **使わない** |

⚠️ 迷ったら `const`。`const` で書いてエラーになったときだけ `let` に変える、
という進め方でまず間違いありません。「変わらない」と宣言されている変数は読むのが楽だからです。

### 値の種類(型)

| 種類 | 例 |
|---|---|
| 文字列 (string) | `"和食"`, `'20分'` |
| 数値 (number) | `10`, `3.14` |
| 真偽値 (boolean) | `true`, `false` |
| 配列 (array) | `["鶏むね肉", "白菜"]` |
| オブジェクト (object) | `{ title: "生姜炒め", servings: "2人分" }` |
| null | 「値が無い」を明示 |
| undefined | 「まだ何も入っていない」 |

`null` と `undefined` の違いで悩む人が多いですが、実用的には:

- `undefined` … うっかり入っていない(未定義)
- `null` … **意図的に空**。「レシピはまだ生成していません」を表す

my-recipe では `const [recipe, setRecipe] = useState<Recipe | null>(null);` のように、
「まだ何も無い状態」を `null` で表しています。

---

## 4.2 文字列

```js
const genre = "和食";
const count = 3;

// テンプレートリテラル(バッククォート ` で囲む)
const message = `食材は${count}個までにしてください。`;
// → "食材は3個までにしてください。"
```

⚠️ `${ }` が使えるのは **バッククォート** ` ` ` で囲んだときだけです。
`"..."` や `'...'` では変数が展開されず、そのまま文字として出ます。
初心者の定番のつまずきポイントです。

### よく使う文字列メソッド

```js
"  白菜  ".trim()            // "白菜"  前後の空白を除去
"鶏肉,白菜".split(",")        // ["鶏肉", "白菜"]  区切って配列に
["鶏肉","白菜"].join("、")     // "鶏肉、白菜"  配列をつなげて文字列に
"和食".length                // 2  文字数
```

`split` と `join` は my-recipe の核心部分で使われています。

```js
// 入力欄の「鶏むね肉, 白菜」を配列にする(IngredientForm.tsx)
input.split(/[,、]/).map(s => s.trim()).filter(s => s.length > 0)

// 配列をDBに保存するとき、改行区切りの1つの文字列にする(actions.ts)
recipe.ingredients.join("\n")
```

💡 `/[,、]/` は **正規表現** といって「半角カンマ または 全角読点」という意味です。
正規表現は奥が深いですが、今は「区切り文字を複数指定している」とだけ分かれば十分です。

---

## 4.3 配列 — 同じ種類のものを並べる

```js
const ingredients = ["鶏むね肉", "白菜", "しょうが"];

ingredients[0]        // "鶏むね肉"  0から数える
ingredients.length    // 3
```

⚠️ **0から数えます。** 1番目は `[0]` です。ここは一生間違え続けるので慣れてください。

### map — 全部を別のものに変換する

**Reactを書くうえで最重要のメソッドです。**

```js
const ingredients = ["鶏むね肉", "白菜"];
const withMark = ingredients.map((item) => `・${item}`);
// → ["・鶏むね肉", "・白菜"]
```

やっていることは「配列の各要素に処理をして、**同じ長さの新しい配列**を作る」だけです。

my-recipe では、材料の配列をHTMLの `<li>` の配列に変換するのに使います。

```jsx
{recipe.ingredients.map((item, i) => (
  <li key={i}>{item}</li>
))}
```

`(item, i)` の `i` は **インデックス(何番目か)** です。使わないなら省略できます。

### filter — 条件に合うものだけ残す

```js
const items = ["鶏肉", "", "  ", "白菜"];
const valid = items.filter((s) => s.trim().length > 0);
// → ["鶏肉", "白菜"]
```

`filter` に渡した関数が `true` を返した要素だけが残ります。
my-recipe では「空っぽの食材を捨てる」のに使っています。

### その他

```js
const nums = [1, 2, 3];
nums.includes(2)                  // true  含むか
nums.find((n) => n > 1)           // 2  最初に条件を満たすもの
nums.some((n) => n > 2)           // true  1つでも満たすか
[...nums, 4]                      // [1,2,3,4]  スプレッド構文でコピー+追加
```

⚠️ **`push` ではなくスプレッド構文を使う癖をつけてください。**

```js
nums.push(4);       // 元の配列を書き換える  → Reactでは画面が更新されない
const next = [...nums, 4];  // 新しい配列を作る → こちらが正解
```

Reactは「**中身が変わったか**」ではなく「**別のものに差し替わったか**」で
画面の再描画を判断します。元の配列を直接書き換えると、Reactが気づきません。
この落とし穴は Part 1 の06章でもう一度扱います。

---

## 4.4 オブジェクト — 意味の違うものをひとまとめに

```js
const recipe = {
  title: "鶏むね肉と白菜の生姜炒め",
  cookingTime: "20分",
  servings: "2人分",
  ingredients: ["鶏むね肉 200g", "白菜 1/4個"],
  steps: ["切る", "炒める"],
};

recipe.title              // "鶏むね肉と白菜の生姜炒め"
recipe.ingredients[0]     // "鶏むね肉 200g"
```

- 配列 = **同じ種類のものが並んでいる**(材料が5つ)
- オブジェクト = **違う意味の項目が集まっている**(名前と時間と人数)

my-recipe が扱うレシピは、まさにこのオブジェクトの形です。
JSONと見た目がそっくりなのに気づいたと思います。ほぼ同じものです。

### 分割代入(デストラクチャリング)

オブジェクトから値を取り出して変数にする書き方です。

```js
const { title, servings } = recipe;
// const title = recipe.title; と同じことを短く書いている
```

Reactのコンポーネントで多用します。

```jsx
function RecipeResult({ recipe, genre }) { ... }
// ↑ 渡されたオブジェクトから recipe と genre を取り出している
```

### オプショナルチェーン と null合体

```js
const genre = body?.genre;            // body が null/undefined ならエラーにせず undefined
const value = input ?? "こだわりなし";  // input が null/undefined のときだけ右側を使う
```

`?.` が無いと、`body` が空のときに「undefinedのプロパティは読めません」というエラーで
アプリが止まります。**外から来たデータを触るときは `?.` を付ける** と覚えてください。

my-recipe の `app/api/generate-recipe/route.ts` がまさにこれです。
外部から送られてくるJSONは何が入っているか分からないので、慎重に取り出しています。

---

## 4.5 関数 — 処理に名前を付ける

```js
// 書き方1: function宣言
function add(a, b) {
  return a + b;
}

// 書き方2: アロー関数(今はこちらが主流)
const add = (a, b) => {
  return a + b;
};

// 中身が return 1行だけなら、さらに短く書ける
const add = (a, b) => a + b;
```

どれも同じです。my-recipeでは両方出てきます。
**コンポーネントは `function`、その場限りの処理はアロー関数**、が何となくの慣習です。

### コールバック関数 — 関数を引数に渡す

```js
ingredients.map((item) => `・${item}`);
//              ↑これが関数。mapに「各要素にこれをやって」と渡している

<button onClick={() => handleSave()}>保存</button>
//               ↑「押されたときにこれをやって」と渡している
```

「関数を値として渡せる」というのがJavaScriptの大きな特徴で、
Reactはこの性質の上に成り立っています。最初は気持ち悪いですが、慣れます。

---

## 4.6 条件分岐

```js
if (ingredients.length === 0) {
  setError("食材を1つ以上入力してください。");
  return;
}

if (count > 10) {
  // ...
} else {
  // ...
}
```

⚠️ **比較は `===`(イコール3つ)を使ってください。**

| 演算子 | 意味 |
|---|---|
| `=` | 代入(入れる) |
| `==` | ゆるい比較 → **使わない** |
| `===` | 厳密な比較 → **これを使う** |
| `!==` | 厳密に等しくない |

`==` は `"1" == 1` が `true` になるなど、直感に反する変換をします。事故の元です。

### 三項演算子

`if` を1行の式にしたものです。JSXの中で多用します。

```js
const label = generating ? "考案中..." : "レシピを考えてもらう";
//            条件        ? 真のとき    : 偽のとき
```

my-recipe のボタンの文字はすべてこれで切り替えています。

### truthy / falsy

JavaScriptは、真偽値以外も条件として使えます。

**falsy(偽として扱われる)は6つだけ**: `false` `0` `""` `null` `undefined` `NaN`
それ以外は全部 truthy です。

```js
if (error) { ... }   // errorが null や "" でなければ実行される
```

これを利用したJSXの定番が「`&&`」です。

```jsx
{error && <p className="form-error">{error}</p>}
// errorが何か入っていれば <p> を表示、null なら何も表示しない
```

⚠️ 数値に `&&` を使うと事故ります。`{count && <p>...</p>}` は
`count` が `0` のとき、画面に `0` という文字が出ます。
数値のときは `{count > 0 && ...}` と明示的に書いてください。

---

## 4.7 非同期処理 — 「待つ」処理の書き方

**ここが最初の山場です。** でも、考え方は単純です。

AIにレシピを聞くと、返事まで1〜3秒かかります。
その間ずっと画面が固まったら最悪です。だからJavaScriptは
「**返事を待っている間、他のことをする**」という仕組みを持っています。

### Promise(約束)

「今は結果が無いけど、あとで必ず結果か失敗を返します」という引換券です。

### async / await

引換券を扱う、読みやすい書き方です。

```js
async function generate() {
  const res = await fetch("/api/generate-recipe");   // 返事が来るまでここで待つ
  const data = await res.json();                     // JSONへの変換も待つ
  console.log(data);
}
```

ルールは2つだけです。

1. `await` を使う関数には、頭に `async` を付ける
2. 時間のかかる処理の前に `await` を付ける

⚠️ `async` を付け忘れると「awaitはasync関数の中でしか使えません」というエラーが出ます。
逆に `await` を忘れると、**中身ではなく引換券そのものが変数に入ります**。
「なぜか `[object Promise]` と表示される」というのは、ほぼこれです。

### try / catch — 失敗に備える

ネットワークは必ず失敗します。失敗してもアプリが死なないようにします。

```js
try {
  const res = await fetch("/api/generate-recipe");
  const data = await res.json();
  setRecipe(data.recipe);
} catch {
  setError("レシピの考案に失敗しました。もう一度お試しください。");
} finally {
  setGenerating(false);   // 成功しても失敗しても、必ず実行される
}
```

| ブロック | いつ動く |
|---|---|
| `try` | 通常の処理 |
| `catch` | `try` の中でエラーが起きたとき |
| `finally` | **どちらの場合も最後に必ず** |

`finally` で「考案中...」の表示を必ず解除しているのがポイントです。
これが無いと、エラーのときボタンが「考案中...」のまま永久に固まります。

### fetch — サーバーにお願いする

```js
const res = await fetch("/api/generate-recipe", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ingredients: ["鶏むね肉"], genre: "和食" }),
});

const data = await res.json();

if (!res.ok) {
  // res.ok は ステータスコードが200番台なら true
  console.log("失敗:", data.error);
}
```

| 項目 | 意味 |
|---|---|
| 第1引数 | 送り先のURL |
| `method` | `GET`(省略時)か `POST` |
| `headers` | 付帯情報。「JSONを送ります」という宣言 |
| `body` | 送る中身。**文字列にする必要がある** |
| `res.ok` | 成功したか(200番台か) |
| `res.json()` | 返ってきた文字列をオブジェクトに戻す |

⚠️ `JSON.stringify()` を忘れるとサーバーが中身を読めません。
- `JSON.stringify(obj)` … オブジェクト → 文字列(送るとき)
- `JSON.parse(str)` / `res.json()` … 文字列 → オブジェクト(受け取るとき)

**送るときは文字列に、受け取ったら戻す。** これはセットで覚えてください。

---

## 4.8 モジュール — ファイルを分ける

1つのファイルに全部書くと読めなくなるので、分けて貸し借りします。

```js
// ファイル: lib/types.ts  (提供する側)
export const GENRES = ["和食", "洋食"];
export type Recipe = { ... };

export default function Header() { ... }   // 1ファイルに1つだけ置ける「主役」
```

```js
// ファイル: app/page.tsx  (使う側)
import Header from "@/components/Header";        // default をもらう(名前は自由)
import { GENRES } from "@/lib/types";            // 名前付きをもらう(名前は一致必須)
import { useState } from "react";                // 部品ライブラリからもらう
```

| 種類 | export側 | import側 |
|---|---|---|
| default | `export default function Header()` | `import Header from "..."` |
| 名前付き | `export const GENRES = ...` | `import { GENRES } from "..."` |

### `@/` とは

プロジェクトのルートを指す **短縮記号** です。`tsconfig.json` の `paths` で設定されています。

```js
import Header from "@/components/Header";    // わかりやすい
import Header from "../../components/Header"; // ↑と同じ意味。深くなると地獄
```

---

## 4.9 この章のまとめ

| やりたいこと | 書き方 |
|---|---|
| 値に名前を付ける | `const`(原則) |
| 文字列に変数を埋める | `` `...${x}...` `` |
| 配列を全部変換 | `.map()` |
| 配列を絞り込む | `.filter()` |
| 文字列を配列に/配列を文字列に | `.split()` / `.join()` |
| 比較 | `===` |
| 1行の条件分岐 | `条件 ? A : B` |
| 「あれば表示」 | `{値 && <タグ/>}` |
| 待つ処理 | `async` / `await` |
| 失敗に備える | `try` / `catch` / `finally` |
| サーバーにお願いする | `fetch` |
| ファイルをまたぐ | `export` / `import` |

🖐 **やってみよう**
ブラウザで F12 → Console を開き、以下を1行ずつ貼って結果を見てください。
**読むだけより、手を動かしたほうが10倍早く覚えます。**

```js
"鶏むね肉, 白菜 , ".split(",").map(s => s.trim()).filter(s => s.length > 0)
["A","B","C"].map((x, i) => `${i + 1}. ${x}`)
const r = { title: "生姜炒め", steps: ["切る","炒める"] }; r.steps.join(" → ")
```

次は、このJavaScriptに「型」を足したTypeScriptです。

→ [05_typescript.md](./05_typescript.md)
