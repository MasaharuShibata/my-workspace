# Step 5. Claude API に繋ぐ

> この章のゴール: ダミーレシピを本物のAI生成に差し替える。
> **変えるのは1か所だけ。** 画面もAPIの入出力も、Step 4 から一切変わりません。

---

## 13.1 変更する範囲を、先に確認する

```
[変わらない] app/page.tsx         ← 画面。fetchの呼び方も同じ
[変わらない] APIの入出力JSONの形   ← 設計で決めた形のまま
[変わらない] バリデーション        ← Step 4 で書いたもの
[新規]      lib/claude.ts        ← Claude APIを呼ぶ処理
[1行だけ変更] route.ts            ← DUMMY_RECIPE を generateRecipe() に差し替え
```

**設計書でAPIの入出力を先に決めておいたおかげで、この差し替えが1行で済みます**(08章)。
これが「先に形を決める」ことの実利です。

---

## 13.2 APIキーを取得する

### Anthropicコンソールでの手順

1. https://console.anthropic.com にアクセスし、アカウントを作成またはログイン
2. **Billing** メニューで支払い方法(クレジットカード)を登録する
3. **API Keys** → 「Create Key」でキーを作成する
4. `sk-ant-...` で始まる文字列をコピーする

⚠️ **キーの全文が表示されるのは作成直後の一度だけです。** 必ずこの時点で控えてください。

### 予算アラートを設定する(強く推奨)

Billing → Usage limits で、月間の利用上限(例: $5)を設定しておきます。
個人利用なら絶対に届かない額ですが、**バグで無限ループしたとき** の保険になります。

💡 実際に起きうる事故: `useEffect` の書き方を間違えて、
ページが表示されるたびにAPIを呼び、それが再描画を起こしてまた呼ぶ…という無限ループ。
上限が無いと、寝ている間に数万円の請求が立ちます。

my-recipe が **「ボタンを押したときだけ呼ぶ」** 設計にしているのは、
この種の事故を構造的に防ぐためでもあります(基本設計書 5.2)。

### .env.local に書く

プロジェクト直下に `.env.local` を作ります。

```
ファイル名: .env.local

ANTHROPIC_API_KEY=sk-ant-ここに自分のキー
```

⚠️⚠️ **`NEXT_PUBLIC_` を付けないでください。** 付けるとブラウザに公開されます(07章)。

そして `.gitignore` に `.env.local` があることを、**もう一度目で確認してください**。

```
ターミナル
git status
```

ここに `.env.local` が出てこなければ正常です。出てきたら、コミットする前に `.gitignore` を直します。

### 例(サンプル)ファイルも作っておく

```
ファイル名: .env.local.example

# Supabase (Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Anthropic(Claude API)。ブラウザには公開されないサーバー専用の環境変数
ANTHROPIC_API_KEY=
```

こちらは **値を空にして、Gitに含めます**。
「このアプリを動かすには何の環境変数が要るか」の一覧として機能します。
自分以外の人(半年後の自分を含む)が環境を作り直すとき、これが無いと詰みます。

---

## 13.3 SDKをインストールする

```
ターミナル
npm install @anthropic-ai/sdk zod
```

| パッケージ | 役割 |
|---|---|
| `@anthropic-ai/sdk` | Claude APIを呼ぶ公式ライブラリ |
| `zod` | データの形を定義し、実際に検証するライブラリ |

💡 SDK(Software Development Kit)は「その会社のAPIを自分の言語から使いやすくした部品」です。
自分で `fetch` して認証ヘッダを組み立てることもできますが、
公式SDKを使うほうが安全で、型も効きます。

### zod とは

TypeScriptの `type` は **書いている間だけの安全装置** で、実行時には消えます。
一方、AIが返してくるJSONは **実行してみないと形が分かりません**。

zod は「実行時に形を検証できる型定義」です。

```ts
import { z } from "zod";

const RecipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
});
```

そして今回の使い方はさらに便利で、**この定義をそのままClaudeへの「この形で返して」という指示に変換** できます。

---

## 13.4 lib/claude.ts を書く

```ts
ファイル名: lib/claude.ts

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Genre, Recipe } from "@/lib/types";

// レシピ考案という単純なテキスト生成タスクのため、最も安価なモデルを採用する
// (詳細設計書 3.1 参照)。拡張思考(thinking)・ストリーミングも使用しない。
const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `あなたは家庭料理のレシピを考案する料理アシスタントです。
与えられた食材を活かした、家庭で作りやすい料理のレシピを1つ考案してください。
塩・こしょう・醤油・油などの基本的な調味料は、リストに無くても使って構いません。
調理時間(目安)と人数(何人分)も必ず出力してください。
出力は指定された形式のみとし、それ以外の説明文は含めないでください。`;

const RecipeSchema = z.object({
  title: z.string().describe("レシピ名"),
  cookingTime: z.string().describe("調理時間の目安(例: 20分)"),
  servings: z.string().describe("何人分か(例: 2人分)"),
  ingredients: z.array(z.string()).describe("材料。1要素が1つの材料と量(例: 鶏むね肉 200g)"),
  steps: z.array(z.string()).describe("作り方の手順。1要素が1つの手順"),
});

const client = new Anthropic();

export async function generateRecipe(
  ingredients: string[],
  genre: Genre,
  avoidTitle?: string
): Promise<Recipe> {
  const genreInstruction =
    genre === "こだわりなし" ? "" : `ジャンルは「${genre}」の料理にしてください。\n`;
  const avoidInstruction = avoidTitle
    ? `直前に提案した「${avoidTitle}」とは別の料理を考えてください。\n`
    : "";

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${genreInstruction}${avoidInstruction}次の食材を使ったレシピを考えてください: ${ingredients.join("、")}`,
      },
    ],
    output_config: {
      format: zodOutputFormat(RecipeSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("レシピの形式を解析できませんでした。");
  }

  return response.parsed_output;
}
```

**長く見えますが、新しい概念は3つだけです。** 順に見ていきます。

---

## 13.5 ① モデルを選ぶ

```ts
const MODEL = "claude-haiku-4-5";
```

Claudeには複数のモデルがあり、**賢さと料金が違います**。

| モデル | 入力 $/100万トークン | 出力 $/100万トークン | 用途 |
|---|---|---|---|
| Claude Opus 5 | $5.00 | $25.00 | 難しい推論、コーディング |
| Claude Sonnet 5 | $2.00 | $10.00 | バランス型 |
| **Claude Haiku 4.5** | **$1.00** | **$5.00** | 高速・安価。単純なタスク向け |

my-recipe が Haiku を選んだ理由(基本設計書 5.2):

> レシピ考案という単純なテキスト生成タスクであれば十分な性能かつ最も安価

⚠️ **「一番賢いモデルを使えばいい」ではありません。**
レシピを考えるのに高度な推論は要らないので、5倍高いモデルを使う理由がない。
**要件に対して十分な性能のうち、最も安いものを選ぶ**。これが技術選定です。

💡 逆に、コードを書かせる・長い文書を分析するといったタスクなら、
Opus を選ばないと品質が足りません。**タスクの難易度で決める** ものです。

---

## 13.6 ② プロンプトを組み立てる

### システムプロンプトとユーザーメッセージの使い分け

```ts
const SYSTEM_PROMPT = `あなたは家庭料理のレシピを考案する料理アシスタントです。...`;
```

| | 内容 | 変わるか |
|---|---|---|
| **システムプロンプト** | 役割・守るべき制約 | **毎回同じ** |
| **ユーザーメッセージ** | 今回の依頼内容(食材・ジャンル) | 毎回違う |

「あなたは〜です」という **役割の指定** は、AIの出力を安定させます。
これが無いと、丁寧すぎたり、レシピ以外の雑談を足したりします。

### システムプロンプトの中身を1行ずつ見る

| 行 | なぜ書いてあるか |
|---|---|
| あなたは家庭料理のレシピを考案する料理アシスタントです | 役割の設定。「家庭料理」で難易度を下げている |
| 与えられた食材を活かした、家庭で作りやすい料理を1つ | **1つ**と明示。複数返されると画面が対応できない |
| 塩・こしょう・醤油などの基本的な調味料は、リストに無くても使って構いません | **これが無いと「調味料が無いので味付けできません」と返ってくる** |
| 調理時間と人数も必ず出力してください | 出力漏れを防ぐ |
| 出力は指定された形式のみとし、それ以外の説明文は含めないでください | 「はい、こちらがレシピです!」のような前置きを防ぐ |

⚠️ **3行目が実務の勘所です。**
人間なら当たり前に補う前提を、AIは補ってくれないことがあります。
「思っていた答えが返ってこない」ときは、**自分が言語化していない前提が無いか** を疑ってください。

### 動的な部分を組み立てる

```ts
const genreInstruction =
  genre === "こだわりなし" ? "" : `ジャンルは「${genre}」の料理にしてください。\n`;
const avoidInstruction = avoidTitle
  ? `直前に提案した「${avoidTitle}」とは別の料理を考えてください。\n`
  : "";
```

三項演算子(04章)で、**条件によって指示文を足したり足さなかったり** しています。

- ジャンルが「こだわりなし」なら、ジャンル指定の文は入れない
  (「ジャンルはこだわりなしの料理にしてください」は意味不明な指示になる)
- `avoidTitle` があるときだけ、「別の料理を」という指示を足す

結果として、こういう文が組み上がります。

```
ジャンルは「和食」の料理にしてください。
直前に提案した「鶏むね肉と白菜の生姜炒め」とは別の料理を考えてください。
次の食材を使ったレシピを考えてください: 鶏むね肉、白菜
```

💡 **プロンプトは「文字列を組み立てる処理」でしかありません。**
魔法ではなく、04章でやったテンプレートリテラルの応用です。

---

## 13.7 ③ 構造化出力 — 形を保証させる

**ここが最も重要なテクニックです。**

### 素朴にやると何が起きるか

「JSONで返して」と文章でお願いするだけだと、こういう返事が来ることがあります。

```
はい、承知しました。以下のレシピはいかがでしょうか。

```json
{ "title": "生姜炒め", ... }
```

お好みで調整してくださいね!
```

これを `JSON.parse()` すると失敗します。
前後の文章を正規表現で除去する…といった、脆いコードを書く羽目になります。

### 構造化出力を使うと

```ts
const response = await client.messages.parse({
  ...
  output_config: {
    format: zodOutputFormat(RecipeSchema),
  },
});
```

**APIレベルで「この形以外は返せない」ように強制されます。**
返ってきた結果は `response.parsed_output` に、
**すでにパース済み・検証済みのオブジェクト** として入っています。

| 従来のやり方 | 構造化出力 |
|---|---|
| 「JSONで返して」と頼む | スキーマを渡して形を強制する |
| 余計な文章が混じる | 混じらない |
| 自分で `JSON.parse` して検証 | 済んだものが返る |
| 型が `any` | **`Recipe` 型として扱える** |

### .describe() が効く

```ts
title: z.string().describe("レシピ名"),
cookingTime: z.string().describe("調理時間の目安(例: 20分)"),
```

`.describe()` に書いた説明は、**AIへの指示としてそのまま渡ります**。
「例: 20分」と書いておくことで、`"約20〜25分程度かかります"` のような
冗長な返事ではなく `"20分"` という簡潔な値が返りやすくなります。

⚠️ ここに書く説明は「仕様書」として機能します。丁寧に書く価値があります。

### 失敗のチェック

```ts
if (!response.parsed_output) {
  throw new Error("レシピの形式を解析できませんでした。");
}
```

構造化出力でも、100%成功するとは限りません(生成がトークン上限で途中で切れた場合など)。
`parsed_output` が空のときは、**エラーとして扱って呼び出し元に伝えます**。

💡 `throw` は「失敗したことを、呼び出し元の `try/catch` に伝える」命令です(04章)。
この関数の中でエラーメッセージを画面に出そうとしないのがポイントです。
**「画面に何を出すか」は、画面を知っている層の責任** です。

---

## 13.8 APIキーはどこで読まれているのか

```ts
const client = new Anthropic();
```

引数が空です。キーはどこから来ているのか?

**SDKが自動的に `process.env.ANTHROPIC_API_KEY` を読んでいます。**
だから `.env.local` の変数名を、この名前にしておく必要があります。

⚠️ もし違う名前にしたい場合は明示的に渡します。

```ts
const client = new Anthropic({ apiKey: process.env.MY_KEY });
```

ただし、特別な理由がなければ **標準の名前に合わせるほうが安全** です。

---

## 13.9 Route Handler を差し替える

```ts
ファイル名: app/api/generate-recipe/route.ts

import { NextResponse } from "next/server";
import { generateRecipe } from "@/lib/claude";           // ← 追加
import { GENRES, type Genre } from "@/lib/types";

const MAX_INGREDIENTS = 10;

function parseGenre(value: unknown): Genre { /* Step 4 と同じ */ }

export async function POST(request: Request) {
  // ...(バリデーションは Step 4 のまま、一切変更なし)...

  const avoidTitle = typeof parsedBody?.avoidTitle === "string" ? parsedBody.avoidTitle : undefined;

  try {
    const recipe = await generateRecipe(ingredients, genre, avoidTitle);
    return NextResponse.json({ recipe });
  } catch {
    return NextResponse.json(
      { error: "レシピの考案に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
```

### 変更点は実質2つだけ

1. `DUMMY_RECIPE` を返していたところを `await generateRecipe(...)` に変える
2. **`try/catch` で囲む**

### なぜ try/catch が要るのか

Claude APIの呼び出しは、いろいろな理由で失敗します。

| 失敗の原因 | 起きること |
|---|---|
| APIキーが間違っている | 認証エラー |
| 残高不足 | エラー |
| Anthropic側の一時的な障害 | エラー |
| ネットワークが不安定 | タイムアウト |
| レート制限(短時間に呼びすぎ) | 429エラー |

`try/catch` が無いと、これらのときに **サーバーが例外を投げて500を返します**。
それ自体は「500が返る」という意味では同じですが、
**利用者に見せるメッセージを自分で決められません**。

```ts
catch {
  return NextResponse.json({ error: "レシピの考案に失敗しました。もう一度お試しください。" }, { status: 500 });
}
```

こうすることで、画面には日本語の分かりやすいメッセージが出ます(08章の設計通り)。

⚠️ **エラーの詳細を利用者に見せない** のも意図的です。
`error.message` をそのまま返すと、APIキーの一部や内部のファイルパスが
漏れることがあります。**詳細はサーバーのログへ、利用者には親切な文言を。**

デバッグ中は、ログに出すといいでしょう。

```ts
} catch (e) {
  console.error("レシピ生成に失敗:", e);   // ターミナルに出る(利用者には見えない)
  return NextResponse.json({ error: "..." }, { status: 500 });
}
```

### avoidTitle の受け取り

```ts
const avoidTitle = typeof parsedBody?.avoidTitle === "string" ? parsedBody.avoidTitle : undefined;
```

「別のレシピを提案してもらう」機能(Step 8で画面側を作ります)のために、
今のうちに受け取れるようにしておきます。
文字列でなければ `undefined` にする、という型ガードです(05章)。

---

## 13.10 動かしてみる

⚠️ **`.env.local` を作った直後は、開発サーバーを再起動してください。**
環境変数は起動時に読み込まれるので、起動中に追加しても反映されません。

```
ターミナル
Ctrl + C        (止める)
npm run dev     (起動し直す)
```

画面で「鶏むね肉, 白菜」と入力して送信します。

- 3秒ほど「考案中...」になる
- 本物のレシピが表示される
- もう一度同じ食材で送ると、**違うレシピが出る**

**これが「AIアプリを作った」瞬間です。**

### 確認すべきこと

| 確認 | 期待 |
|---|---|
| 同じ食材で2回試す | 内容が変わる(再現性が無いのは仕様。詳細設計書 8節) |
| ジャンルを「イタリアン」にする | 出てくる料理の傾向が変わる |
| 食材を1つだけにする | それでもレシピが出る |
| Networkタブの Timing | 2〜4秒程度かかっている |
| ターミナル | エラーが出ていない |

---

## 13.11 うまくいかないときの切り分け

Step 4 で通信を確認済みなので、**容疑者は4つ**です(12章の狙い通り)。

| 症状 | 原因 | 確認方法 |
|---|---|---|
| 500エラー。ターミナルに `Could not resolve authentication method` | APIキーが読めていない | `.env.local` の変数名、サーバー再起動 |
| 500エラー。`401` や `authentication_error` | キーが間違っている | キーをコピーし直す |
| 500エラー。`credit balance is too low` | 残高不足 | Billingで支払い方法を登録 |
| 500エラー。`model: ... not found` | モデル名のtypo | `claude-haiku-4-5` を確認 |
| ずっと「考案中...」 | `finally` の書き忘れ | `app/page.tsx` を確認 |
| 400エラー | 食材が送れていない | Networkタブの Payload を確認 |

💡 **ターミナルに出るエラーメッセージを必ず読んでください。**
`console.error` を入れておくと、原因がほぼ書いてあります。
「エラーが出た」で思考停止せず、**英語でもいいので読む**。
分からない単語は検索する。ここを乗り越えると、独力で進めるようになります。

---

## 13.12 使った分の料金を確認する

Anthropicコンソールの **Usage** 画面で、実際の使用量と金額が見られます。

10回ほど試した後に見ると、$0.05(約8円)といった数字になっているはずです。
**設計時の見積もり(1回0.8円)と合っているか** を確認してください。

⚠️ 見積もりと大きくずれていたら、原因を調べる価値があります。
- `max_tokens` が大きすぎて長文が返っている
- システムプロンプトが長すぎる
- 意図せず複数回呼ばれている(二重送信の防止が効いていない)

---

## 13.13 コミット

```
ターミナル
git status          ← .env.local が出ないことを確認!
git add .
git commit -m "Claude APIによるレシピ生成を実装"
```

---

## 13.14 Step 5 のまとめ

- APIキーは `.env.local` に置き、**`NEXT_PUBLIC_` を付けない**
- 予算アラートを設定しておく(事故の保険)
- モデルは **要件に対して十分な中で最も安いもの** を選ぶ
- **システムプロンプト = 役割と制約、ユーザーメッセージ = 今回の依頼**
- **人間が暗黙に補う前提を、明文化する**(調味料の件)
- **構造化出力**で形を強制すると、パース処理が消える
- 外部API呼び出しは必ず `try/catch`。**詳細はログへ、利用者には親切な文言へ**
- `.env.local` を変えたら **サーバーを再起動**

ここまでで、要件定義の MUST(F1〜F3)が全部動きました。
**いったん、アプリとして成立しています。** ここから WANT を足していきます。

→ [14_build-06-database.md](./14_build-06-database.md)
