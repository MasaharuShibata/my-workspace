# 05. TypeScript — なぜ型を書くのか

> この章のゴール: 「TypeScriptとは何か」を自分の言葉で説明でき、
> `lib/types.ts` のような型定義が読める・書けるようになる。

---

## 5.1 TypeScriptとは何か

**JavaScript に「型の注意書き」を足せるようにした言語** です。

- 別の新しい言語ではありません。**JavaScriptの上位互換**です
- `.js` に書けるものは、そのまま `.ts` に書けます
- ブラウザはTypeScriptを実行できないので、**動かす前にJavaScriptへ変換**されます
  (この変換は Next.js が自動でやってくれるので、あなたは意識しません)

```
あなたが書く         自動で変換          実際に動く
  .ts / .tsx   →   (Next.jsが処理)  →   .js
```

### 「型」とは

その変数に **何が入るのか** という宣言です。

```ts
const title: string = "生姜炒め";        // 文字列だけ
const count: number = 3;                // 数値だけ
const isOpen: boolean = false;          // true/false だけ
const items: string[] = ["鶏肉","白菜"]; // 文字列の配列
```

`: string` の部分が型注釈です。

---

## 5.2 なぜ型を書くのか — 実演

型が無いJavaScriptの世界では、こういうバグが **実行するまで分かりません**。

```js
// JavaScript
const recipe = { title: "生姜炒め", cookingTime: "20分" };
console.log(recipe.cookingTimes);   // typo!  → undefined が出るだけ。エラーにならない
```

画面に「調理時間: undefined」と出て、初めて気づきます。
運が悪いと、本番で利用者が気づきます。

TypeScriptなら、**書いた瞬間にエディタが赤い波線で教えてくれます**。

```ts
// TypeScript
type Recipe = { title: string; cookingTime: string };
const recipe: Recipe = { title: "生姜炒め", cookingTime: "20分" };
console.log(recipe.cookingTimes);
//                 ~~~~~~~~~~~~ エラー: プロパティ 'cookingTimes' は型 'Recipe' に存在しません。
//                              'cookingTime' ですか?
```

**修正候補まで出してくれます。** これがTypeScriptの価値です。

### 初心者にとっての本当の価値

「バグが減る」より大きい効果が2つあります。

1. **入力補完が効く** — `recipe.` と打つだけで、使える項目の一覧が出ます。
   何が書けるか覚えなくてよくなるので、**初心者ほど恩恵が大きい**
2. **設計書がコードになる** — 型定義を見れば、そのデータが何を持っているか一目で分かる

⚠️ よくある誤解: 「型を書くのは面倒だから、慣れてからでいい」
実際は逆です。**型が無いほうが、初心者には難しい**です。
何を書けばいいか教えてくれる人がいなくなるからです。

---

## 5.3 基本の型

```ts
let a: string = "文字";
let b: number = 10;          // 整数も小数も number 一つ
let c: boolean = true;
let d: string[] = ["a","b"]; // 文字列の配列
let e: number[] = [1, 2];
let f: null = null;
```

### 型推論 — 実は書かなくていいことが多い

```ts
const title = "生姜炒め";   // 型を書いていないが、TypeScriptは string だと理解している
title = 10;                // ← ちゃんとエラーになる
```

TypeScriptは、代入された値から型を **推論** します。
なので実際のコードでは、型注釈を書く場所は限られます。

**書く場所**:
- 関数の引数と戻り値
- 空の状態から始まる変数(`useState<Recipe | null>(null)` など)
- データの形を定義するとき(`type`)

**書かなくていい場所**: 値を入れると同時に決まるもの

my-recipe のコードを見ると、意外と型注釈が少ないのはこのためです。

---

## 5.4 type — 自分でデータの形を決める

これがTypeScriptの中心です。

```ts
type Recipe = {
  title: string;
  cookingTime: string;
  servings: string;
  ingredients: string[];
  steps: string[];
};
```

これは `lib/types.ts` にある本物のコードです。訳すとこうなります。

> 「Recipe(レシピ)とは、料理名・調理時間・人数(いずれも文字列)と、
> 材料・手順(いずれも文字列の配列)を持つデータのことである」

**この宣言は、設計書の一節そのものです。**
詳細設計書 3.2 の「出力形式」の表と、1対1で対応しています。
つまり型を書くというのは、**設計をコードで表現する行為** です。

使い方:

```ts
const recipe: Recipe = {
  title: "生姜炒め",
  cookingTime: "20分",
  servings: "2人分",
  ingredients: ["鶏むね肉 200g"],
  steps: ["切る", "炒める"],
};
// 項目が1つでも欠けたり、名前を間違えたりすると、その場でエラーになる
```

### 省略可能な項目

`?` を付けると「あってもなくてもいい」になります。

```ts
type Params = {
  ingredients: string[];
  avoidTitle?: string;     // 「別のレシピを提案」のときだけ渡される
};
```

my-recipe の `generateRecipe(ingredients, genre, avoidTitle?)` がこれです。
初回の生成時には渡さず、再提案のときだけ渡します。

---

## 5.5 ユニオン型 — 「これかこれ」

`|` で「どちらか」を表します。**これは非常によく使います。**

```ts
let recipe: Recipe | null = null;   // レシピが入っているか、まだ何も無いか
let status: "idle" | "loading" | "error" = "idle";  // この3つの文字列しか入らない
```

### 文字列リテラル型 — 決まった値しか許さない

```ts
type Genre = "和食" | "洋食" | "中華";

const g: Genre = "和食";      // OK
const h: Genre = "フレンチ";   // エラー: Genre型に代入できません
```

これが効きます。ジャンルを文字列で扱うと `"和食"` と `"日本食"` の
表記ゆれが後で必ず起きますが、リテラル型ならその瞬間に止まります。

### my-recipe の実際のコード

```ts
export const GENRES = [
  "和食", "洋食", "中華", "イタリアン", "韓国料理", "お弁当", "こだわりなし",
] as const;

export type Genre = (typeof GENRES)[number];
```

これは少し高度ですが、意味はこうです。

| 部分 | 意味 |
|---|---|
| `as const` | 「この配列は絶対変えない。中身の文字列も固定」と宣言 |
| `typeof GENRES` | GENRES の型を取り出す |
| `[number]` | 配列の要素の型を取り出す |

結果として `Genre` は `"和食" | "洋食" | ... | "こだわりなし"` になります。

**なぜこう書くのか**: ジャンルを1つ増やすとき、
`GENRES` 配列に1行足すだけで、型も画面の選択肢も **同時に** 更新されるからです。
定数と型を別々に書くと、片方の更新を忘れます。

💡 この「情報源を1か所にする」考え方を **Single Source of Truth** と呼びます。
覚える必要はありませんが、設計の良し悪しを分ける大事な感覚です。

---

## 5.6 関数の型

```ts
function parseIngredients(input: string): string[] {
  return input.split(/[,、]/).map(s => s.trim()).filter(s => s.length > 0);
}
//                    ↑引数の型        ↑戻り値の型
```

戻り値の型は推論されるので省略できますが、**書いたほうが良い**です。
「この関数は文字列の配列を返すつもりだ」という意思表示になり、
実装をミスしたときにその場で気づけます。

### 非同期関数の戻り値

```ts
async function generateRecipe(ingredients: string[]): Promise<Recipe> {
  ...
}
```

`async` を付けた関数は、必ず `Promise<何か>` を返します。
`Promise<Recipe>` は「待てばRecipeが手に入る引換券」という意味です。

### 何も返さない関数

```ts
function toggleChecked(i: number): void { ... }
```

`void` は「戻り値なし」です。

---

## 5.7 unknown と any — 外から来たデータの扱い

**ここは my-recipe のセキュリティに関わる重要な話です。**

```ts
let x: any;      // 何でも入る。型チェックを全部放棄する  → 使わない
let y: unknown;  // 何でも入るが、使う前に確認を強制される  → こちらを使う
```

```ts
const value: unknown = getSomething();
value.toUpperCase();          // エラー: 何か分からないものは触れない

if (typeof value === "string") {
  value.toUpperCase();        // OK: 文字列だと確認できたので触れる
}
```

この「使う前に確認する」を **型ガード** と呼びます。

### なぜこれが重要か

外部から送られてくるデータは、**何が入っているか保証がありません**。
悪意のある人が、こんなものを送ってくるかもしれません。

```json
{ "ingredients": "配列じゃなくて文字列", "genre": 12345 }
```

my-recipe の `app/api/generate-recipe/route.ts` は、
まさにこれを想定して書かれています。

```ts
let body: unknown;                             // 何が来るか分からないので unknown
try {
  body = await request.json();
} catch {
  return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
}

const ingredients = Array.isArray(rawIngredients)          // 配列か?
  ? rawIngredients.filter((v): v is string =>              // 中身が文字列のものだけ残す
      typeof v === "string" && v.trim().length > 0)
  : [];                                                     // 配列でなければ空扱い
```

⚠️ **鉄則: ブラウザ側で行ったチェックは、サーバー側でもう一度やる。**
ブラウザのコードは利用者が自由に書き換えられるので、
「フォームで10個までにしたから大丈夫」は成り立ちません。

`(v): v is string` という書き方は **型述語** といって、
「この関数が true を返したら、v は string だと思ってよい」と
TypeScriptに教えるものです。最初は丸暗記で構いません。

---

## 5.8 ジェネリクス — 型を引数として渡す

`<>` が出てきたら、これです。

```ts
const [recipe, setRecipe] = useState<Recipe | null>(null);
//                                  ↑「この箱には Recipe か null が入る」と指定
```

`useState` は「どんな型でも入れられる箱」を作る関数です。
何の型を入れるかを `<>` で指定します。

```ts
const [checked, setChecked] = useState<boolean[]>([]);  // true/falseの配列
const [error, setError] = useState<string | null>(null); // エラー文字列か、null
```

自分でジェネリクスを定義する機会は当面ありません。
**使う側として `<>` に型を書く** ことだけ覚えてください。

---

## 5.9 型アサーション(as)— 最後の手段

```ts
const recipe = data.recipe as Recipe;
```

「TypeScriptくん、これはRecipeだと信じてくれ」という宣言です。

⚠️ **これは型チェックを黙らせるだけで、実際の中身は確認していません。**
本当にRecipeでなければ、実行時に壊れます。

my-recipe でも `setRecipe(data.recipe as Recipe)` と書かれています。
自分のサーバーから返ってくる値なので信用している、という判断です。
外部のAPIに対してこれをやるのは危険です。

`as` を書きたくなったら、まず「型ガードで確認できないか」を考えてください。

---

## 5.10 エラーメッセージの読み方

TypeScriptのエラーは長くて怖いですが、**読む場所は決まっています**。

```
Type 'string' is not assignable to type 'Genre'.
型 'string' を型 'Genre' に割り当てることはできません。
```

読み方: 「**左が実際に入れようとしたもの**、**右が入るべきもの**」

| よく出るエラー | 意味 | 対処 |
|---|---|---|
| `Type 'X' is not assignable to type 'Y'` | XをYに入れようとした | 型が合うよう変換するか、型定義を直す |
| `Property 'x' does not exist on type 'Y'` | Y型に x という項目は無い | typo か、型定義に足りない |
| `Object is possibly 'null'` | nullかもしれないものを触った | `if (x) { ... }` で確認してから触る |
| `Cannot find module '@/...'` | importのパスが違う | ファイル名・パスを確認 |

⚠️ エラーは **上から順に1つずつ** 直してください。
1つ直すと、下の5個が連鎖的に消えることがよくあります。

---

## 5.11 この章のまとめ

- TypeScriptは **JavaScript + 型の注意書き**。別言語ではない
- 価値は「バグが減る」だけでなく **「補完が効いて、書き方を教えてくれる」**
- `type` でデータの形を定義する。これは **設計そのもの**
- `|` のユニオン型、特に **文字列リテラル型** が強力
- 外から来たデータは `any` でなく **`unknown` + 型ガード** で扱う
- `as` は最後の手段
- エラーは「左が実際、右が期待」と読む

🖐 **考えてみよう**
お気に入り1件を表す `FavoriteRecipe` 型を、自分で書いてみてください。
DBのテーブル定義(`supabase/schema.sql`)を見ながら、
`id` `title` `genre` `cooking_time` `servings` `source_ingredients`
`ingredients` `steps` `created_at` の型を決めます。

<details>
<summary>答えと、ひとつの落とし穴</summary>

```ts
export type FavoriteRecipe = {
  id: string;
  title: string;
  genre: string;
  cooking_time: string;
  servings: string;
  source_ingredients: string;
  ingredients: string;   // ← 配列ではない!
  steps: string;         // ← 配列ではない!
  created_at: string;
};
```

落とし穴は `ingredients` と `steps` です。
`Recipe` 型では `string[]`(配列)なのに、`FavoriteRecipe` では `string` です。

これは設計判断で、**DBには改行区切りの1つのテキストとして保存している**からです
(詳細設計書 4節)。だから表示するときは `.split("\n")` で配列に戻します。

**同じ「材料」でも、場所によって形が違う。** この差を型で明示できるのが、
TypeScriptの一番ありがたいところです。
</details>

→ [06_react.md](./06_react.md)
