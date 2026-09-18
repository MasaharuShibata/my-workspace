# Step 4. サーバー側の処理を作る(まずは偽レシピで)

> この章のゴール: ブラウザ ⇄ 自分のサーバー の通信を完成させる。
> **返すレシピはまだ偽物。** AIは次のStepで繋ぎます。

---

## 12.1 なぜAIを繋ぐ前に、偽物で通すのか

いきなりAI連携まで書くと、動かなかったときの原因候補がこれだけあります。

```
① fetchのURLが間違っている
② POSTのbodyの形が違う
③ Route Handlerが正しく作れていない
④ 環境変数が読めていない
⑤ APIキーが間違っている
⑥ Claude APIの呼び方が違う
⑦ 返ってきたJSONの形が想定と違う
⑧ 画面側の受け取り方が違う
```

**8個の容疑者を一度に相手にするのは、初心者には無理です。**

偽レシピを返すAPIで先に ①②③⑧ を潰しておけば、
次のStepで動かないときの容疑者は ④⑤⑥⑦ の4つに絞れます。

💡 この「**一度に1つのことだけ変える**」という進め方が、
デバッグの世界では最も強力な武器です。覚えておいてください。

---

## 12.2 Route Handler を作る

```ts
ファイル名: app/api/generate-recipe/route.ts

import { NextResponse } from "next/server";
import type { Recipe } from "@/lib/types";

// Step 5 で Claude API の呼び出しに差し替える
const DUMMY_RECIPE: Recipe = {
  title: "鶏むね肉と白菜の生姜炒め",
  cookingTime: "20分",
  servings: "2人分",
  ingredients: ["鶏むね肉 200g", "白菜 1/4個", "しょうが 1片"],
  steps: ["鶏むね肉を一口大に切る", "白菜をざく切りにする", "炒め合わせる"],
};

export async function POST(request: Request) {
  const body = await request.json();
  console.log("サーバーが受け取った内容:", body);

  return NextResponse.json({ recipe: DUMMY_RECIPE });
}
```

これだけで `/api/generate-recipe` というAPIができました(07章)。

### 確認方法1: ブラウザで直接叩けない

`http://localhost:3000/api/generate-recipe` をブラウザで開くと、
こう出ます。

```
405 Method Not Allowed
```

**これは正常です。** ブラウザでURLを開くのは `GET` ですが、
このファイルには `POST` しか用意していないからです(01章)。

### 確認方法2: curlで叩く

ターミナルから直接POSTしてみます。

```
ターミナル
curl -X POST http://localhost:3000/api/generate-recipe \
  -H "Content-Type: application/json" \
  -d '{"ingredients":["鶏むね肉","白菜"],"genre":"和食"}'
```

レシピのJSONが返ってくれば成功です。
`npm run dev` を動かしているターミナルに
`サーバーが受け取った内容: { ingredients: [...], genre: '和食' }` と出ているはずです。

⚠️ **`console.log` がどこに出るかに注目してください。**

| 場所 | ログの出先 |
|---|---|
| クライアントコンポーネント | **ブラウザのConsole**(F12) |
| Route Handler / Server Actions / サーバーコンポーネント | **ターミナル** |

これを知らないと「ログが出ない!」と何十分も溶かします。
サーバー側のコードはブラウザで動いていないので、当然ブラウザには出ません。

---

## 12.3 サーバー側でもバリデーションする

Step 3 でブラウザ側のチェックは書きました。**サーバー側にも同じものを書きます。**

⚠️ 理由(05章・08章のおさらい): ブラウザのコードは利用者が書き換えられます。
上の `curl` のように、**画面を通さずに直接APIを叩くこともできます**。
つまり「フォームで10個に制限したから安全」は成立しません。

```ts
ファイル名: app/api/generate-recipe/route.ts

import { NextResponse } from "next/server";
import { GENRES, type Genre, type Recipe } from "@/lib/types";

const MAX_INGREDIENTS = 10;

const DUMMY_RECIPE: Recipe = { /* 略 */ };

function parseGenre(value: unknown): Genre {
  return typeof value === "string" && (GENRES as readonly string[]).includes(value)
    ? (value as Genre)
    : "こだわりなし";
}

export async function POST(request: Request) {
  // ① JSONとして読めるか
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  // ② 中身を安全に取り出す
  const parsedBody = body as { ingredients?: unknown; genre?: unknown };
  const rawIngredients = parsedBody?.ingredients;
  const ingredients = Array.isArray(rawIngredients)
    ? rawIngredients.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  const genre = parseGenre(parsedBody?.genre);

  // ③ 業務ルールのチェック
  if (ingredients.length === 0) {
    return NextResponse.json({ error: "食材を1つ以上入力してください。" }, { status: 400 });
  }
  if (ingredients.length > MAX_INGREDIENTS) {
    return NextResponse.json(
      { error: `食材は${MAX_INGREDIENTS}個までにしてください。` },
      { status: 400 }
    );
  }

  return NextResponse.json({ recipe: DUMMY_RECIPE });
}
```

### ここは丁寧に読む価値があります

**① JSONとして読めるか**

```ts
let body: unknown;
try {
  body = await request.json();
} catch {
  return NextResponse.json({ error: "..." }, { status: 400 });
}
```

`request.json()` は、送られてきたのがJSONでないと **例外を投げます**。
`try/catch` で囲まないと、サーバーが500エラーを返します。
「壊れたリクエストが来た」のはクライアントのミスなので、**400を返すのが正しい**(01章)。

型を `unknown` にしているのは、**何が入っているか保証が無い** からです(05章)。

**② 配列かどうか確認してから中身を絞る**

```ts
const ingredients = Array.isArray(rawIngredients)
  ? rawIngredients.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
  : [];
```

読み方:

```
rawIngredients が配列なら
  → 中身のうち「文字列で、空白だけでないもの」だけ残す
配列でなければ
  → 空の配列として扱う(次のチェックで400になる)
```

`{"ingredients": "これは文字列"}` のような変なリクエストが来ても、
**エラーで落ちずに、きちんと400を返せます**。

**③ ジャンルはホワイトリスト方式**

```ts
function parseGenre(value: unknown): Genre {
  return typeof value === "string" && (GENRES as readonly string[]).includes(value)
    ? (value as Genre)
    : "こだわりなし";
}
```

「7つのジャンルに含まれているか」を確認し、含まれなければ
エラーにせず **「こだわりなし」に倒します**。

⚠️ ここが設計判断です。ジャンルが変な値でも、
レシピ生成自体は問題なくできるので、エラーにする価値がありません。
一方、食材が空なら生成のしようがないのでエラーにします。

**「エラーにするか、安全な既定値に倒すか」** は、
処理を続けられるかどうかで決めます。

💡 **ホワイトリスト方式**(許可するものを列挙する)は、
セキュリティの基本形です。逆の「ブラックリスト方式」(禁止するものを列挙)は
必ず漏れが出ます。

---

## 12.4 画面からAPIを呼ぶ

`app/page.tsx` の `generate` 関数を、本物の通信に差し替えます。

```tsx
ファイル名: app/page.tsx (generate関数の部分)

async function generate(nextIngredients: string[], nextGenre: Genre) {
  setGenerating(true);
  setError(null);

  try {
    const res = await fetch("/api/generate-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: nextIngredients, genre: nextGenre }),
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

`error` state も追加します。

```tsx
const [error, setError] = useState<string | null>(null);
```

そして表示します。

```tsx
<IngredientForm generating={generating} onSubmit={(ing, g) => generate(ing, g)} />

{error && <p className="form-error">{error}</p>}

{recipe && (
  <RecipeResult ... />
)}
```

### 1行ずつ確認する(04章の総復習です)

```tsx
async function generate(...)          // await を使うので async
setGenerating(true);                  // ボタンを「考案中...」にする
setError(null);                       // 前回のエラーを消す

const res = await fetch("/api/...", { // 返事が来るまで待つ
  method: "POST",                     // POSTで送る
  headers: {"Content-Type":"application/json"},  // JSONを送りますという宣言
  body: JSON.stringify({...}),        // オブジェクト → 文字列に変換
});
const data = await res.json();        // 返事の文字列 → オブジェクトに変換

if (!res.ok) {                        // 200番台でなければ
  setError(data.error ?? "...");      // サーバーのメッセージを表示(無ければ既定文言)
  return;                             // 早期リターン
}

setRecipe(data.recipe as Recipe);     // 成功。レシピをstateに入れる → 画面が更新される
```

### `finally` が効く理由

```tsx
} finally {
  setGenerating(false);
}
```

成功しても、失敗しても、途中でreturnしても **必ず実行されます**。

⚠️ これを `try` の最後に書くと、エラー時に実行されず、
**ボタンが「考案中...」のまま永久に固まります**。
初心者が必ず一度は作るバグです。

### `??` の使い所

```tsx
setError(data.error ?? "レシピの考案に失敗しました。もう一度お試しください。");
```

サーバーが `{error: "食材を1つ以上..."}` を返してきたらそれを表示し、
何も返してこなかった場合は既定の文言を出します(04章)。

### catch が捕まえるもの

```tsx
} catch {
```

ここに来るのは「**そもそも通信ができなかった**」ときです。
ネットが切れている、サーバーが落ちている、など。

**サーバーが400や500を返した場合は catch に入りません。**
`fetch` は「返事が返ってきた」時点で成功扱いだからです。
だから `if (!res.ok)` のチェックが別に必要になります。

⚠️ これは非常によくある誤解です。
**「fetchは、返事が返ってくれば内容がエラーでも成功扱い」** と覚えてください。

---

## 12.5 二重のバリデーションを、実際に確かめる

ブラウザ側のチェックをすり抜けても、サーバーが止めることを確認します。

```
ターミナル
# 食材が空
curl -X POST http://localhost:3000/api/generate-recipe \
  -H "Content-Type: application/json" -d '{"ingredients":[]}'
# → {"error":"食材を1つ以上入力してください。"}

# 11個
curl -X POST http://localhost:3000/api/generate-recipe \
  -H "Content-Type: application/json" \
  -d '{"ingredients":["1","2","3","4","5","6","7","8","9","10","11"]}'
# → {"error":"食材は10個までにしてください。"}

# JSONですらない
curl -X POST http://localhost:3000/api/generate-recipe \
  -H "Content-Type: application/json" -d 'これはJSONじゃない'
# → {"error":"リクエストの形式が正しくありません。"}

# 配列じゃない
curl -X POST http://localhost:3000/api/generate-recipe \
  -H "Content-Type: application/json" -d '{"ingredients":"文字列"}'
# → {"error":"食材を1つ以上入力してください。"}
```

**4つとも、サーバーが落ちずにきちんとメッセージを返せば合格です。**

💡 これは立派なテストです。19章の「試験」では、こういう
「異常な入力を与えて、期待通りのエラーが返るか」を確認します。

---

## 12.6 Network タブで通信を見る

F12 → Network タブを開いたまま、画面から送信してみてください。

| 見るところ | 確認内容 |
|---|---|
| `generate-recipe` という行 | リクエストが飛んでいるか |
| Status | 200 か 400 か |
| Payload / Request | 送った内容が正しいか |
| Response | 返ってきたJSON |
| Timing | どれくらい時間がかかったか |

⚠️ **「動かない」と思ったら、まずここを見てください。**
- そもそも行が出ない → fetchが呼ばれていない(ボタンの繋ぎ忘れ)
- 404 → URLが間違っている
- 400 → 送っている中身が想定と違う
- 500 → サーバー側のコードが落ちている(ターミナルを見る)

**この切り分けができるようになると、独力で進める速度が何倍にもなります。**

---

## 12.7 コミット

```
ターミナル
git add .
git commit -m "レシピ生成APIの雛形(ダミー応答)とフロントからの呼び出しを実装"
```

---

## 12.8 Step 4 のまとめ

- **AIを繋ぐ前に、通信だけを先に完成させる**(容疑者を減らす)
- `app/api/○○/route.ts` + `export async function POST` でAPIができる
- `console.log` は、サーバー側なら **ターミナル** に出る
- **バリデーションはブラウザとサーバーの両方に書く**。サーバー側が本命
- 外から来たデータは `unknown` で受け、**確認してから使う**
- エラーにするか既定値に倒すかは、**処理を続けられるかで決める**
- `fetch` は返事が返れば成功扱い。**`res.ok` を必ず確認する**
- `finally` で処理中フラグを必ず戻す
- 詰まったら **Network タブ** と **ターミナル** を見る

現時点で、アプリは「食材を送ると、いつも同じレシピが返ってくる」状態です。
次のStepで、この最後の1か所を本物にします。

→ [13_build-05-claude.md](./13_build-05-claude.md)
