# Step 9. CSSで仕上げる

> この章のゴール: 機能が全部動いている状態のアプリに、見た目を与える。
> **「なんとなくAIが作った風」を避ける、デザインの考え方** も扱います。

---

## 17.1 なぜ最後にやるのか

CSSを最初に凝ると、機能追加のたびにHTMLの構造が変わり、**書いたCSSが無駄になります**。

いま構造は確定しています。だから安心して装飾できます。

⚠️ ただし「読める程度」のCSSは、途中でも書いてきました。
**真っ白な画面で開発を続けるのも、それはそれで辛い**からです。バランスの問題です。

---

## 17.2 デザインを決める前に考えること

初心者がやりがちなのは、思いついた色をその場で足していくことです。結果:

- 微妙に違うグレーが7種類
- 角丸が `8px` `10px` `12px` `14px` とバラバラ
- 余白が `13px` `15px` `18px` と意味なく違う

**まとまりが無く、「テンプレートっぽい」「素人っぽい」印象になります。**

対策は1つ。**先にルールを決め、それだけを使う** ことです。
このルールの集まりを **デザイントークン** と呼びます。

### ① 色を決める

my-recipe のテーマは「料理・家庭的・あたたかい」です。そこで:

- ベース: **生成り色**(白ではなく、わずかに黄みのある背景)
- アクセント: **オレンジ系**(食欲・温かみ)
- 文字: **黒ではなく、こげ茶寄り**

⚠️ **真っ黒(`#000`)と真っ白(`#fff`)を背景と文字に使わない** のが、
洗練して見せるコツです。コントラストが強すぎて目が疲れますし、
どこかのテンプレートそのままに見えます。

| 用途 | 色 | 説明 |
|---|---|---|
| 背景 | `#fbf5ec` | 生成り |
| カード面 | `#ffffff` | 白 |
| 面(代替) | `#f8efe0` | 入力欄など |
| 境界線 | `#ecdec4` | 薄いベージュ |
| 文字 | `#2c231a` | こげ茶に近い黒 |
| 補助文字 | `#7c6d59` | グレージュ |
| アクセント | `#cf6a2c` | オレンジ |
| アクセント(濃) | `#a8541f` | ホバー時 |
| アクセント(淡) | `#f7e2cd` | フォーカスリング |
| 危険 | `#b3402c` | 削除・エラー |

💡 **色数は10個前後に抑える。** 多いほど素人っぽくなります。

### ② サイズの段階を決める

余白・角丸・文字サイズは、**決まった段階だけ** を使います。

| 種類 | 使う値 |
|---|---|
| 余白 | 4 / 8 / 12 / 16 / 22 / 28 / 40px |
| 角丸 | 14px(中)/ 20px(大)/ 999px(カプセル) |
| 影 | 弱・中の2種類だけ |

⚠️ この「段階」の考え方(**スケール**)を守るだけで、
見た目の完成度が明確に上がります。

### ③ トークンとしてCSSに書く

```css
ファイル名: app/globals.css (先頭)

:root {
  --color-bg: #fbf5ec;
  --color-surface: #ffffff;
  --color-surface-alt: #f8efe0;
  --color-border: #ecdec4;
  --color-text: #2c231a;
  --color-text-muted: #7c6d59;
  --color-accent: #cf6a2c;
  --color-accent-strong: #a8541f;
  --color-accent-soft: #f7e2cd;
  --color-danger: #b3402c;
  --color-danger-soft: #f9e2dc;
  --shadow-sm: 0 1px 2px rgba(40, 27, 12, 0.06);
  --shadow-md: 0 8px 24px rgba(40, 27, 12, 0.08);
  --radius-lg: 20px;
  --radius-md: 14px;
  --radius-full: 999px;
}
```

以降、**色を直接書かず、必ず `var(--color-xxx)` を使います**(03章)。

こうすると、配色を変えたくなったときに **この十数行だけ書き換えれば全体が変わります**。

---

## 17.3 土台を整える

```css
ファイル名: app/globals.css (続き)

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-noto), "Hiragino Kaku Gothic ProN", "Yu Gothic", "Segoe UI", sans-serif;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
  cursor: pointer;
}

input {
  font-family: inherit;
}

h1, h2, h3, h4 {
  letter-spacing: -0.01em;
}
```

### 地味だが効く4つ

| 指定 | 効果 |
|---|---|
| `line-height: 1.65` | **行間**。日本語は1.6〜1.8が読みやすい。既定の1.2は詰まりすぎ |
| `-webkit-font-smoothing: antialiased` | Macで文字が細く滑らかになる |
| `button { font-family: inherit }` | **ボタンだけ別のフォントになる問題を防ぐ**(ブラウザの既定を上書き) |
| `letter-spacing: -0.01em` | 見出しを少し詰めて引き締める |

⚠️ 3番目は特に忘れがちです。指定しないと、ボタンの中だけ
明朝体やシステムフォントになり、**理由の分からない違和感** の原因になります。

---

## 17.4 ヘッダー

```css
.site-header {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 14px 28px;
  background: rgba(251, 245, 236, 0.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 20;
}

.brand {
  font-size: 1.05rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand::before {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 4px var(--color-accent-soft);
}
```

### position: sticky

```css
position: sticky;
top: 0;
z-index: 20;
```

スクロールしてもヘッダーが上に貼り付きます。
`z-index` は重なり順で、大きいほど手前です。

### 半透明 + ぼかし

```css
background: rgba(251, 245, 236, 0.82);
backdrop-filter: blur(12px);
```

背景が透けつつ、後ろがぼやけます。
スクロールしたときに、下のコンテンツが薄く透けて上品に見えます。

### ::before で装飾を足す

```css
.brand::before {
  content: "";
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 4px var(--color-accent-soft);
}
```

**HTMLを汚さずに、CSSだけで小さな丸を追加** しています。
`box-shadow: 0 0 0 4px` は、ぼかさずに輪を描くテクニックです。

💡 こういう **小さなアクセント** が1つあるだけで、
「ちゃんとデザインされている」印象になります。
ロゴが無くても、ブランドらしさが出ます。

---

## 17.5 ボタン

ボタンの質感は、アプリ全体の印象を大きく左右します。

```css
.ingredient-form button {
  flex-shrink: 0;
  background: var(--color-accent);
  color: #fff;
  border: none;
  padding: 12px 22px;
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.15s ease, transform 0.15s ease;
}

.ingredient-form button:hover:not(:disabled) {
  background: var(--color-accent-strong);
}

.ingredient-form button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
```

### transition

```css
transition: background 0.15s ease;
```

色が **0.15秒かけて滑らかに変わります**。
無いと、ぱっと切り替わって安っぽく見えます。

⚠️ `0.15s`〜`0.2s` が目安です。`0.5s` にすると「もっさり」します。

### `:hover:not(:disabled)`

「マウスが乗っていて、かつ無効化されていないとき」。
無効なボタンが色を変えると、押せそうに見えて紛らわしいからです。

### disabled の見せ方

```css
opacity: 0.55;
cursor: not-allowed;
```

薄くして、カーソルを「禁止」マークにします。
**押せないことが一目で分かる** のが大事です。

### セカンダリボタン

```css
.btn-secondary {
  background: transparent;
  color: var(--color-accent);
  border: 1px solid var(--color-border);
}
```

「別のレシピを提案してもらう」は **主役ではない** ので、
塗りつぶさず枠線だけにします。

💡 **ボタンの見た目に序列を付ける** のは、UIの基本です。
同じ見た目のボタンが並ぶと、利用者はどちらを押すべきか迷います。

---

## 17.6 入力欄とフォーカス

```css
.ingredient-form input {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-alt);
  font-size: 0.95rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.ingredient-form input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px var(--color-accent-soft);
}
```

### ⚠️ `outline: none` の重大な注意

```css
outline: none;                              /* 既定の枠線を消す */
box-shadow: 0 0 0 4px var(--color-accent-soft);  /* 代わりの表示を必ず付ける */
```

`outline: none` だけ書いて **代わりを用意しないのは、やってはいけません**。

キーボードだけで操作している人は、フォーカスの枠線が
「いま自分がどこにいるか」を知る唯一の手がかりです。
それを消すと、**アプリが使えなくなります**。

**消すなら、必ず別の形で示す。** これは守るべきルールです。

### `min-width: 0`

Flexboxの中の要素は、既定では「中身より小さくならない」ため、
長い文字を入れると **はみ出します**。`min-width: 0` で縮めるようにします。

💡 「Flexboxの中身がはみ出す」の9割はこれで直ります。覚えておく価値があります。

### `font-size: 0.95rem` の単位

| 単位 | 意味 |
|---|---|
| `px` | 絶対値 |
| `rem` | **ルート(html)の文字サイズの倍数** |
| `em` | 親要素の文字サイズの倍数 |

`rem` を使うと、利用者がブラウザの文字サイズ設定を変えたとき、
**それに追従して拡大されます**。本文サイズは `rem` が無難です。

⚠️ スマホでは `font-size` が **16px未満の入力欄** にフォーカスすると、
iOSが勝手に画面を拡大します。入力欄だけは `16px`(=`1rem`)以上にすると防げます。

---

## 17.7 カードと影

```css
.recipe-result {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 26px 28px;
  box-shadow: var(--shadow-md);
}
```

### 影の付け方

```css
--shadow-sm: 0 1px 2px rgba(40, 27, 12, 0.06);
--shadow-md: 0 8px 24px rgba(40, 27, 12, 0.08);
```

読み方: `横ずれ 縦ずれ ぼかし 色`

⚠️ **影を黒(`rgba(0,0,0,...)`)にしない** のがコツです。
背景の色味(ここでは茶系)を混ぜた色にすると、浮いて見えません。

そして **透明度は 0.05〜0.1 程度** で十分です。
濃い影は古くさく、素人っぽく見えます。

---

## 17.8 スマホ対応

```css
@media (max-width: 640px) {
  .page {
    padding: 28px 16px 56px;
  }

  .ingredient-form-row {
    flex-direction: column;
  }

  .ingredient-form button,
  .ingredient-form select {
    width: 100%;
  }

  .site-header {
    padding: 12px 16px;
    gap: 16px;
  }
}
```

画面幅640px以下で、入力欄・選択・ボタンが縦並びになります(03章)。

### 確認方法

F12 → 左上のスマホアイコン(Toggle device toolbar)で、
実際のスマホ幅で確認できます。

| 確認 | 内容 |
|---|---|
| 横スクロールが出ないか | **最重要**。出たらどこかが画面幅を超えている |
| ボタンが押せる大きさか | 目安は44px四方以上 |
| 文字が小さすぎないか | 本文14px以上 |
| 入力欄が16px以上か | 勝手なズームの防止 |

⚠️ **横スクロールは絶対に潰してください。** 使い勝手が一気に悪くなります。
原因はたいてい、`width: 100%` に `padding` が足されている(= `box-sizing` 忘れ)か、
長い文字列が折り返されていないかです。

---

## 17.9 「AIが作った風」を避けるために

CLAUDE.mdにも書かれている観点です。意識的に避けるポイントを挙げます。

| よくある特徴 | 代わりにどうするか |
|---|---|
| 紫〜青のグラデーション | **単色**。題材に合った色を選ぶ |
| 真っ黒な文字・真っ白な背景 | わずかに色味を含ませる |
| 絵文字を大量に散らす | 使わないか、1か所だけ |
| すべてのカードに強い影 | 影は弱く、必要なところだけ |
| 角丸がバラバラ | **2〜3種類に統一** |
| 中央揃えを多用 | 本文は **左揃え**(日本語は特に読みにくくなる) |
| 「〜しましょう!」調の文言 | **淡々と、必要なことだけ** |

my-recipe の文言を見てください。

> 手元にある食材を入力すると、AIがそれらを活かしたレシピを考案します。
> 保存したレシピの一覧です。タイトルを押すと詳細が開きます。

**説明的で、余計な装飾がありません。** これでいいのです。

💡 デザインで迷ったら **「引く」** ほうを選んでください。
足した装飾より、揃った余白のほうが、完成度に効きます。

---

## 17.10 CSSの整理

500行近くになるので、コメントで区切ります。

```css
/* ---------- Header ---------- */
/* ---------- Page shell ---------- */
/* ---------- Ingredient form ---------- */
/* ---------- Recipe result ---------- */
/* ---------- Favorites ---------- */
/* ---------- Responsive ---------- */
```

💡 クラス名も、**どの部品のものか分かる名前** にします。

```
.recipe-result            部品のルート
.recipe-result-header     その中の要素
.recipe-result-actions
```

`.title` `.header` のような一般的すぎる名前は、
他の場所と衝突して「なぜかここも変わった」という事故を起こします。

---

## 17.11 最終確認

```
ターミナル
npm run build
```

**本番と同じ形で固められるか** を確認します。
ここでエラーが出ると、デプロイも失敗します。

| よく出るエラー | 原因 |
|---|---|
| Type error: ... | TypeScriptの型エラー。開発中は警告でも、buildでは止まる |
| `useState` only works in a Client Component | `"use client"` の書き忘れ |
| Dynamic server usage | `export const dynamic = "force-dynamic"` の書き忘れ |

⚠️ **`npm run dev` で動いていても `npm run build` で落ちることがあります。**
デプロイ前に必ず一度は実行してください。

成功したら、こうなります。

```
✓ Compiled successfully
✓ Generating static pages
Route (app)
┌ ○ /
├ ƒ /api/generate-recipe
└ ƒ /favorites
```

`○` は静的、`ƒ` は毎回サーバーで動くページです。
`/favorites` が `ƒ` になっていれば、`force-dynamic` が効いています。

---

## 17.12 コミット

```
ターミナル
git add .
git commit -m "全体のスタイリングとレスポンシブ対応"
```

---

## 17.13 Step 9 のまとめ

- **先にデザイントークン(色・角丸・影)を決めて、それだけを使う**
- 真っ黒・真っ白を避け、**色味を少し含ませる**
- `button { font-family: inherit }` を忘れない
- `transition` を0.15秒付けるだけで質感が上がる
- ⚠️ `outline: none` を書いたら、**必ず代わりのフォーカス表示を付ける**
- 影は **薄く、背景の色味を混ぜて**
- スマホで **横スクロールが出ないこと** を必ず確認
- 迷ったら **引く**。装飾より余白の統一
- デプロイ前に **`npm run build`** を通す

アプリが完成しました。次は世に出します。

→ [18_deploy.md](./18_deploy.md)
