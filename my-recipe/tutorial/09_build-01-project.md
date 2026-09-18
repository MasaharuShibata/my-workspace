# Step 1. プロジェクトを作る

> この章のゴール: 空のNext.jsプロジェクトを作り、
> 中の不要なものを片付けて、自分のアプリの土台にする。

---

## 9.1 作る順番を、もう一度確認する

これから9つのステップで作ります。**この順番には理由があります。**

| Step | やること | なぜこの順番か |
|---|---|---|
| 1 | プロジェクト作成 | 土台 |
| 2 | **動かない画面** | 見た目が見えると、以降の作業が想像できる |
| 3 | フォームを動かす | まだサーバーは不要。ブラウザ内で完結する |
| 4 | **偽レシピを返すAPI** | 通信の仕組みを、AIのエラーと切り離して確認する |
| 5 | Claude APIに差し替え | 通信が動いている前提なので、AIだけに集中できる |
| 6 | DB保存 | ここまでで MUST機能が完成している |
| 7 | お気に入り一覧 | 保存できてから、読み出しを作る |
| 8 | 残りの機能 | WANT機能をまとめて |
| 9 | CSS仕上げ | 最後。早く着手すると、構造変更で無駄になる |

⚠️ **一番やってはいけないのは、Step 5 から始めることです。**
「AIに繋ぐのが本体だから」と最初にやると、
「画面も無い・通信も確認できない・エラーがどこか分からない」状態でハマります。

**動く状態を保ったまま、少しずつ機能を足す。** これが鉄則です。

---

## 9.2 プロジェクトを作る

作業したいフォルダに移動して、次を実行します。

```
ターミナル
npx create-next-app@latest my-recipe
```

💡 `npx` は「そのパッケージを、インストールせずに1回だけ実行する」コマンドです。

### 質問への回答

```
✔ Would you like to use TypeScript?                    … Yes
✔ Would you like to use ESLint?                        … Yes
✔ Would you like to use Tailwind CSS?                  … No
✔ Would you like your code inside a `src/` directory?  … No
✔ Would you like to use App Router?                    … Yes
✔ Would you like to use Turbopack?                     … No
✔ Would you like to customize the import alias?        … No
```

理由を説明します。

| 質問 | 回答 | 理由 |
|---|---|---|
| TypeScript | **Yes** | 05章の通り。初心者ほど型の恩恵が大きい |
| ESLint | Yes | 書き方のミスを自動で指摘してくれる |
| **Tailwind CSS** | **No** | CSSを学ぶのが目的なので、素のCSSで書く |
| `src/` ディレクトリ | No | 階層が1つ増えるだけ。今回は不要 |
| App Router | **Yes** | 07章で学んだ新しい方式。必須 |
| Turbopack | No | 速いが、まだ挙動が変わることがある。安定重視 |
| import alias | No | デフォルトの `@/` をそのまま使う |

⚠️ Tailwind CSS は実務ではよく使われますが、
**CSSを知らないままTailwindを使うと、何も理解できずに終わります。**
まず素のCSSで作り、必要になったら乗り換えるのが健全です。

### 起動確認

```
ターミナル
cd my-recipe
npm run dev
```

`http://localhost:3000` でNext.jsの初期画面が出れば成功です。

---

## 9.3 できたファイルを理解する

```
my-recipe/
├── app/
│   ├── favicon.ico
│   ├── globals.css        ← 全体のCSS
│   ├── layout.tsx         ← 全ページ共通の枠
│   └── page.tsx           ← トップページ("/")
├── public/                ← 画像などの置き場
├── node_modules/          ← 部品の実体(触らない・Gitに入れない)
├── .gitignore
├── next.config.mjs        ← Next.jsの設定(今回は空のまま)
├── package.json           ← 使う部品の一覧
├── package-lock.json      ← 部品の正確なバージョン記録
├── tsconfig.json          ← TypeScriptの設定
└── README.md
```

### package.json を見る

```json
{
  "scripts": {
    "dev": "next dev",       ← npm run dev で開発サーバー起動
    "build": "next build",   ← 公開用に固める
    "start": "next start",   ← 固めたものを動かす
    "lint": "next lint"      ← コードの書き方チェック
  },
  "dependencies": { ... },   ← アプリが動くのに必要な部品
  "devDependencies": { ... } ← 開発中だけ必要な部品(TypeScriptなど)
}
```

`scripts` に書いた名前が、`npm run 名前` で実行できるコマンドになります。

### tsconfig.json の重要な2行

```json
"strict": true,
"paths": { "@/*": ["./*"] }
```

- `strict: true` … 型チェックを厳しくする。**必ずtrueのままにしてください**。
  緩めると、TypeScriptを使う意味が半減します
- `paths` … 04章で出てきた `@/` の設定。`@/lib/types` が `./lib/types` を指します

### .gitignore を確認する

```
ファイル名: .gitignore
```

中に `node_modules` と `.env*` (または `.env.local`)があることを **目で確認** してください。
無ければ追記します。02章で説明した通り、ここは事故ると取り返しがつきません。

---

## 9.4 初期ファイルを片付ける

`create-next-app` が作るサンプルは、自分のアプリには不要です。消します。

### ① app/page.tsx を空にする

```tsx
ファイル名: app/page.tsx

export default function HomePage() {
  return (
    <main>
      <h1>my-recipe</h1>
      <p>手元にある食材を入力すると、AIがそれらを活かしたレシピを考案します。</p>
    </main>
  );
}
```

元の中身は全部消して、これに置き換えます。

### ② app/globals.css を空にする

元のファイルには大量のサンプルCSSが入っています。**全部消して**、
最低限だけ書きます。デザインは Step 9 でやるので、今は土台だけです。

```css
ファイル名: app/globals.css

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Segoe UI", sans-serif;
  line-height: 1.65;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
  cursor: pointer;
}
```

💡 `box-sizing: border-box` は、**最初に必ず書く1行** です。
これが無いと、`width: 100px` に `padding: 10px` を足したとき、
実際の幅が120pxになります(直感に反する)。これを書くと100pxのまま収まります。

### ③ app/layout.tsx を整える

```tsx
ファイル名: app/layout.tsx

import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "my-recipe",
  description: "手元にある食材からAIがレシピを考案するレシピ提案アプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSans.variable}>
      <body>{children}</body>
    </html>
  );
}
```

1つずつ説明します。

| 行 | 意味 |
|---|---|
| `import "./globals.css"` | ここで読み込むと、全ページに適用される |
| `Noto_Sans_JP({...})` | Googleフォントを **Next.jsが自動でダウンロードして同梱** する仕組み。表示が速くなる |
| `variable: "--font-noto"` | CSS変数としてフォントを使えるようにする |
| `display: "swap"` | フォント読み込み中も文字を表示する(真っ白にならない) |
| `metadata` | ブラウザのタブに出るタイトルと、検索結果に出る説明 |
| `lang="ja"` | 日本語ページだと宣言。読み上げソフトや翻訳が正しく働く |
| `{children}` | 各ページの中身がここに入る |

そして `globals.css` の `body` のフォント指定を、変数を使う形に変えます。

```css
body {
  font-family: var(--font-noto), "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
  ...
}
```

💡 カンマ区切りは「上から順に、使えるものを使う」という意味です。
Noto Sansが読めなければヒラギノ、それも無ければ游ゴシック…と下がっていきます。

### ④ 不要なファイルを消す

`public/` の中のサンプル画像(`next.svg`、`vercel.svg` など)は消して構いません。

---

## 9.5 フォルダを先に作る

詳細設計書で決めたディレクトリ構成(08章)を、先に空で作ります。

```
ターミナル
mkdir components
mkdir lib
mkdir lib/supabase
mkdir supabase
mkdir -p app/api/generate-recipe
mkdir app/favorites
```

💡 **先に器を作っておくと、迷いません。**
「このファイルどこに置こう」と毎回考えるのは、地味に集中力を削ります。

---

## 9.6 型定義を先に書く

**設計で決めたデータの形を、最初にコードにします。**
これがあると、以降のコードで補完が効き、書くのが一気に楽になります。

```ts
ファイル名: lib/types.ts

export const GENRES = [
  "和食",
  "洋食",
  "中華",
  "イタリアン",
  "韓国料理",
  "お弁当",
  "こだわりなし",
] as const;

export type Genre = (typeof GENRES)[number];

export type Recipe = {
  title: string;
  cookingTime: string;
  servings: string;
  ingredients: string[];
  steps: string[];
};

export type FavoriteRecipe = {
  id: string;
  title: string;
  genre: string;
  cooking_time: string;
  servings: string;
  source_ingredients: string;
  ingredients: string;
  steps: string;
  created_at: string;
};
```

05章で学んだ内容がそのまま出ています。復習すると:

- `GENRES` … ジャンルの一覧。`as const` で「この7つで固定」と宣言
- `Genre` … `GENRES` から自動で作られる型。増やすときは配列に足すだけ
- `Recipe` … AIが返すレシピ。**`ingredients` と `steps` は配列**
- `FavoriteRecipe` … DBに保存されている形。**`ingredients` と `steps` は文字列**

⚠️ `Recipe` と `FavoriteRecipe` で材料の型が違うのが、この設計の要です。
- AI・画面では扱いやすい **配列**
- DBには単純に **改行区切りの文字列**

**境界で形が変わる。** その変換場所(`join` / `split`)を意識してください。

### 命名の違いも意図的です

| | 命名 | 理由 |
|---|---|---|
| `Recipe` | `cookingTime`(キャメルケース) | JavaScript/TypeScriptの慣習 |
| `FavoriteRecipe` | `cooking_time`(スネークケース) | **データベースの慣習** |

`FavoriteRecipe` はDBから返ってくるものをそのまま表しているので、
**DBの列名に合わせています**。変換して揃えることもできますが、
「DBの形をそのまま持ってきている」と一目で分かるほうが、今回は分かりやすい。

---

## 9.7 Gitで最初のコミット

```
ターミナル
git init
git add .
git commit -m "Next.jsプロジェクトの初期セットアップ"
```

`git status` で `node_modules` が出てこないことを確認してください。
出てくるなら `.gitignore` が効いていません。

💡 **キリのいいところで毎回コミットしてください。**
この教材では各Stepの終わりにコミットする前提で進めます。
「動いていたところまで戻れる」という安心感が、挑戦する勇気になります。

---

## 9.8 Step 1 のまとめ

- `npx create-next-app@latest` で作る。Tailwindは**No**、App Routerは**Yes**
- 初期サンプルは **全部消してから** 自分のコードを書く
- `layout.tsx` に共通の枠・フォント・metadata
- `globals.css` に `box-sizing: border-box` と土台のスタイル
- **設計で決めた型を `lib/types.ts` に先に書く**
- `.gitignore` の確認は毎回やる

**現時点の状態**: `http://localhost:3000` に「my-recipe」と説明文が表示される。
これだけです。でも、土台としては完璧です。

→ [10_build-02-ui.md](./10_build-02-ui.md)
