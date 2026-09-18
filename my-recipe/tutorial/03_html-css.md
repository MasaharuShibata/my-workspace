# 03. HTML と CSS — 画面はどうやってできているか

> この章のゴール: HTMLで「構造」、CSSで「見た目」を作る、という役割分担を理解し、
> my-recipe の画面がどのタグでできているかを読めるようになる。

---

## 3.1 HTMLは「文書の構造」を書くもの

HTMLはプログラミング言語ではありません。**文書に意味の札を貼る仕組み** です。

```html
<h1>my-recipe</h1>
<p>手元にある食材を入力すると、AIがレシピを考案します。</p>
```

- `<h1>` … `</h1>` で囲むと「これは大見出しです」という意味になる
- `<p>` で囲むと「これは段落です」

この「囲むもの」を **タグ** と呼び、開始タグ `<p>` と終了タグ `</p>` がペアです。
タグで囲まれたまとまりを **要素(element)** と呼びます。

### 入れ子(ネスト)

要素の中に要素を入れられます。これがHTMLの構造です。

```html
<article>
  <h3>鶏むね肉と白菜の生姜炒め</h3>
  <p>調理時間: 20分</p>
</article>
```

⚠️ 入れ子の順番を交差させてはいけません。

```html
<p><strong>だめな例</p></strong>   ← ✕ 閉じる順番が逆
<p><strong>正しい例</strong></p>   ← ○ 内側から閉じる
```

### 属性

タグに追加情報を持たせるものです。`名前="値"` の形で開始タグの中に書きます。

```html
<a href="/favorites">お気に入り</a>
<input type="text" placeholder="例: 鶏むね肉, 白菜">
<img src="photo.jpg" alt="料理の写真">
```

---

## 3.2 my-recipe で実際に使うタグ

覚えるべきタグは、実は10個ちょっとです。以下は全部 my-recipe に登場します。

| タグ | 意味 | my-recipeでの使い所 |
|---|---|---|
| `<h1>`〜`<h4>` | 見出し(1が最上位) | ページタイトル、「材料」「作り方」 |
| `<p>` | 段落 | 説明文、エラーメッセージ |
| `<ul>` / `<li>` | 順序なしリスト | 材料リスト |
| `<ol>` / `<li>` | 順序ありリスト(自動で番号がつく) | 作り方の手順 |
| `<form>` | 入力のまとまり | 食材入力フォーム |
| `<input>` | 1行入力欄・チェックボックス | 食材の入力、材料のチェック |
| `<select>` / `<option>` | 選択肢 | ジャンル選択 |
| `<button>` | ボタン | 「レシピを考えてもらう」 |
| `<label>` | 入力欄の説明ラベル | 「食材(カンマ区切り)」 |
| `<a>` | リンク | ヘッダーのナビゲーション |
| `<div>` | 意味を持たない箱 | レイアウト調整用 |
| `<span>` | 意味を持たない箱(文中用) | バッジなどの装飾 |
| `<header>` / `<main>` / `<section>` / `<article>` | 意味のある箱 | 構造の整理 |

### `<div>` と `<section>` の違い

見た目はどちらも同じ「箱」です。違うのは **意味があるかどうか**。

- `<div>` … 「ただの箱」。見た目を整えるためだけ
- `<section>` `<article>` `<header>` … 「ここは記事」「ここはヘッダー」という意味がある

意味のあるタグを使うことを **セマンティックHTML** と言います。
検索エンジンや、目の見えない人が使う読み上げソフトが内容を理解しやすくなります。

my-recipe の `components/RecipeResult.tsx` が `<section>`、
`components/FavoriteCard.tsx` が `<article>` を使っているのはこの考え方によります。
迷ったら `<div>` で構いません。慣れてから直せばいい話です。

### リストの例(材料と作り方)

```html
<h3>材料</h3>
<ul>
  <li>鶏むね肉 200g</li>
  <li>白菜 1/4個</li>
</ul>

<h3>作り方</h3>
<ol>
  <li>鶏むね肉を一口大に切る</li>
  <li>フライパンで炒める</li>
</ol>
```

`<ul>` は「・」、`<ol>` は「1. 2. 3.」が自動でつきます。
**手順は番号に意味があるので `<ol>`、材料は順不同なので `<ul>`** という使い分けです。

### フォームの例

```html
<form>
  <label for="ingredients">食材(カンマ区切り)</label>
  <input id="ingredients" type="text" placeholder="例: 鶏むね肉, 白菜">

  <select>
    <option value="和食">和食</option>
    <option value="洋食">洋食</option>
  </select>

  <button type="submit">レシピを考えてもらう</button>
</form>
```

💡 `<label for="xxx">` と `<input id="xxx">` の `for` と `id` を揃えると、
ラベルをクリックしたときに入力欄にカーソルが入ります。地味ですが効きます。

### チェックボックス

```html
<label>
  <input type="checkbox"> 鶏むね肉 200g
</label>
```

`type` を変えるだけで `<input>` の姿が変わります(`text` / `checkbox` / `number` / `date` など)。

---

## 3.3 CSSは「見た目」を書くもの

HTMLが「何であるか」なら、CSSは「どう見えるか」です。

```css
h1 {
  font-size: 32px;
  color: #2c231a;
}
```

書式は3つの部分でできています。

```
セレクタ {
  プロパティ: 値;
}
```

- **セレクタ** … どの要素に適用するか(`h1`、`.card` など)
- **プロパティ** … 何を変えるか(`color`、`font-size`)
- **値** … どう変えるか

### セレクタの種類(これだけ知っていればいい)

| 書き方 | 意味 |
|---|---|
| `h1` | すべての `<h1>` |
| `.card` | `class="card"` が付いた要素 |
| `#header` | `id="header"` が付いた要素 |
| `.card h3` | `.card` の中にある `<h3>` |
| `.card:hover` | `.card` にマウスが乗っているとき |

実務では **ほぼ `.クラス名` だけ** 使います。my-recipe も `app/globals.css` を見ると
`.recipe-result` `.favorite-card` のようにクラス指定ばかりです。

HTML側:
```html
<article class="favorite-card">...</article>
```
CSS側:
```css
.favorite-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 16px;
}
```

### よく使うプロパティ

| プロパティ | 何をする |
|---|---|
| `color` | 文字色 |
| `background` | 背景 |
| `font-size` / `font-weight` | 文字の大きさ/太さ |
| `padding` | **枠の内側**の余白 |
| `margin` | **枠の外側**の余白 |
| `border` | 枠線 |
| `border-radius` | 角丸 |
| `display` | 並べ方(後述) |
| `gap` | 要素同士の間隔 |

### padding と margin の違い(超頻出)

```
┌──────────────────────────┐
│        margin(外側)       │
│  ┌────────────────────┐  │
│  │  border(枠線)       │  │
│  │  ┌──────────────┐  │  │
│  │  │ padding(内側) │  │  │
│  │  │  ┌────────┐  │  │  │
│  │  │  │ 中身    │  │  │  │
│  │  │  └────────┘  │  │  │
│  │  └──────────────┘  │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

- **padding** = 箱の中の余白。背景色が付く範囲に含まれる
- **margin** = 箱と箱の間の距離。背景色は付かない

「文字と枠線が近すぎる」→ padding を増やす。
「カード同士がくっついている」→ margin(または親のgap)を増やす。

### 色の書き方

```css
color: #cf6a2c;                 /* 16進数。よく使う */
color: rgb(207, 106, 44);       /* 赤緑青を0〜255で */
color: rgba(207, 106, 44, 0.5); /* 最後は透明度 */
```

`#cf6a2c` は `#RRGGBB` で、赤 `cf`、緑 `6a`、青 `2c` の強さを16進数で書いたものです。
自分で計算する必要はありません。カラーピッカーで選んで貼るだけです。

---

## 3.4 レイアウト — Flexbox

「横に並べたい」の答えは、ほぼ Flexbox です。

```css
.ingredient-form-row {
  display: flex;   /* 中身を横一列に並べる */
  gap: 12px;       /* 間隔 */
}
```

これだけで、中の `<input>` `<select>` `<button>` が横に並びます。

よく使う追加指定:

| 指定 | 効果 |
|---|---|
| `justify-content: space-between` | 両端に寄せて間を空ける(ヘッダーのロゴとナビ) |
| `align-items: center` | 縦方向の中央揃え |
| `flex-direction: column` | 横ではなく縦に並べる |
| `flex-wrap: wrap` | はみ出したら折り返す |
| `flex: 1` | 余った幅を、その要素に吸わせる |

my-recipe のヘッダーは、実質これだけでできています。

```css
.site-header {
  display: flex;
  justify-content: space-between;  /* 左にロゴ、右にナビ */
  align-items: center;
}
```

💡 昔は `float` という難解な方法を使っていました。今は忘れて大丈夫です。
**横並びはFlexbox、格子状はGrid** の2つだけ覚えれば、まず困りません。

---

## 3.5 CSS変数(カスタムプロパティ)

同じ色をあちこちに書くと、変更するとき全部直すことになります。
そこで、色に名前を付けて一箇所で管理します。

```css
:root {
  --color-accent: #cf6a2c;
  --color-text: #2c231a;
  --radius-md: 14px;
}

button {
  background: var(--color-accent);
  border-radius: var(--radius-md);
}
```

- `:root` は「ページ全体」を指す特別なセレクタ
- `--名前` で定義し、`var(--名前)` で使う

my-recipe の `app/globals.css` は、冒頭でこの定義をまとめています。
**アプリの配色を変えたければ、この十数行を書き換えるだけで全体が変わります。**
これは「デザインの統一」という設計判断です。

---

## 3.6 スマホ対応(レスポンシブ)

画面幅によってCSSを切り替えます。

```css
/* 通常(PC)は横並び */
.ingredient-form-row {
  display: flex;
}

/* 画面幅が600px以下のときだけ、縦並びにする */
@media (max-width: 600px) {
  .ingredient-form-row {
    flex-direction: column;
  }
}
```

`@media` を **メディアクエリ** と呼びます。
my-recipe はスマホで使うことを想定しているので、この切り替えが要ります。

---

## 3.7 この章のまとめ

- HTMLは **構造**、CSSは **見た目**。役割を混ぜない
- タグは10個ちょっと覚えれば、このアプリは作れる
- リストは `<ul>`(順不同)と `<ol>`(順番に意味あり)を使い分ける
- CSSは **クラスセレクタ** がほぼ全て
- **padding=内側、margin=外側**
- 横並びは **Flexbox**、色やサイズは **CSS変数** で一元管理
- スマホ対応は **メディアクエリ**

🖐 **やってみよう**
テキストエディタで `test.html` を作り、以下を書いてブラウザで開いてください。
`<style>` タグの中に自由にCSSを足して、見た目が変わるのを体験してください。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    .card { background: #fff; padding: 16px; border-radius: 14px; }
  </style>
</head>
<body style="background:#fbf5ec">
  <article class="card">
    <h3>鶏むね肉と白菜の生姜炒め</h3>
    <ul><li>鶏むね肉 200g</li><li>白菜 1/4個</li></ul>
  </article>
</body>
</html>
```

→ [04_javascript.md](./04_javascript.md)
