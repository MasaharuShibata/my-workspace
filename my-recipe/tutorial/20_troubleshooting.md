# 20. エラーの読み方と、詰まりどころ集

> この章は通読せず、**詰まったときに引く辞書** として使ってください。

---

## 20.1 まず、これをやる

エラーが出たら、順番に確認します。**この順番が大事です。**

```
1. エラーメッセージを、最後まで読む(英語でも)
2. 「どこで」起きているか特定する
   ブラウザのConsole? ターミナル? Vercelのログ?
3. 直前に自分が何を変えたか思い出す
4. 1つだけ元に戻して、直るか確かめる
```

⚠️ **やってはいけないこと**: 心当たりのある場所を、同時に何か所も書き換える。
直っても原因が分からず、次に同じ目に遭います。

💡 「動いていた時点」に戻れるのがGitの価値です。
`git stash`(変更を一時退避)や `git diff`(何を変えたか表示)を使ってください。

---

## 20.2 どこを見ればいいのか

| コードの場所 | エラーの出先 |
|---|---|
| クライアントコンポーネント(`"use client"`) | **ブラウザのConsole**(F12) |
| サーバーコンポーネント | ターミナル(本番はVercelのLogs) |
| Route Handler(`route.ts`) | ターミナル(本番はVercelのLogs) |
| Server Actions(`"use server"`) | ターミナル(本番はVercelのLogs) |
| ビルド時 | `npm run build` の出力 |

⚠️ **「ログが出ない」の原因のほとんどは、見る場所が違うだけです。**

---

## 20.3 Next.js / React でよく出るエラー

### `You're importing a component that needs useState`

```
Error: You're importing a component that needs useState.
This React hook only works in a client component.
```

**原因**: `useState` を使っているのに `"use client"` が無い。
**対処**: ファイルの1行目に `"use client";` を追加。

⚠️ import文より上です。

---

### `Objects are not valid as a React child`

**原因**: オブジェクトや配列をそのまま表示しようとした。

```tsx
<p>{recipe}</p>                 // ✕ オブジェクトは表示できない
<p>{recipe.title}</p>           // ○
<p>{recipe.ingredients.join("、")}</p>  // ○
```

---

### `Each child in a list should have a unique "key" prop`

**原因**: `map` で作った要素に `key` が無い。

```tsx
{items.map((item, i) => <li key={i}>{item}</li>)}
```

追加・削除があるリストなら、`key={item.id}` のように安定したIDを使います。

---

### `Cannot read properties of undefined (reading 'xxx')`

**最頻出のエラーです。** 「無いものの中身を読もうとした」という意味。

```tsx
recipe.title        // recipe が undefined だと落ちる
recipe?.title       // ○ undefined なら undefined を返す
data?.recipe?.title // ○ 何段でも書ける
```

**原因の多く**:
- データがまだ読み込まれていない(非同期の途中)
- APIが期待した形を返していない
- typo(`recipe.ingredient` ← 正しくは `ingredients`)

**調べ方**: 落ちる直前に `console.log(recipe)` を入れて、中身を見る。

---

### `Hydration failed` / `Text content does not match`

**原因**: サーバーで作ったHTMLと、ブラウザで作ったHTMLが食い違った。

よくある犯人:
- `new Date()` や `Math.random()` を描画中に使っている(サーバーとブラウザで値が違う)
- `localStorage` を描画中に読んでいる(サーバーには存在しない)

**対処**: 時刻や乱数を使う処理は、`useEffect` の中か、イベントハンドラの中で行う。

---

### 画面が更新されない / クリックしても何も起きない

**原因のほとんどは、stateを直接書き換えている**(06章)。

```tsx
checked[0] = true; setChecked(checked);                    // ✕
setChecked(checked.map((v, i) => i === 0 ? true : v));     // ○

items.push(newItem); setItems(items);                      // ✕
setItems([...items, newItem]);                             // ○
```

もう1つの原因: `"use client"` を書き忘れていて、そもそもイベントが動いていない。

---

### ボタンが勝手に実行される / 無限ループする

```tsx
onClick={handleSave()}          // ✕ 描画時に即実行される
onClick={handleSave}            // ○
onClick={() => handleSave(id)}  // ○ 引数を渡したいとき
```

---

### ページが再読み込みされて入力が消える

`<form>` の `onSubmit` で `e.preventDefault()` を忘れています(06章)。

---

### `searchParams` でエラーになる

Next.js 15 から `searchParams` は Promise です。

```tsx
// ✕ 古い書き方
searchParams.genre

// ○
const { genre } = await searchParams;
```

⚠️ Next.jsはバージョンによる違いが大きいので、
**検索して見つけた記事の日付を必ず確認してください。**

---

## 20.4 TypeScript のエラー

### `Type 'X' is not assignable to type 'Y'`

**読み方**: 「Xを入れようとしたが、Yでなければいけない」

```tsx
const genre: Genre = "フレンチ";   // Genre型に "フレンチ" は無い
```

**対処**: 型定義を見直すか、値を正しいものにする。

---

### `Property 'xxx' does not exist on type 'Yyy'`

**原因**: typo か、型定義に足りていない。

```tsx
recipe.cookingTimes   // ✕ 正しくは cookingTime
```

💡 **エディタの補完を使ってください。** `recipe.` と打てば候補が出ます。
手打ちしなければ、そもそもtypoしません。

---

### `Object is possibly 'null'`

nullかもしれない値を触っています。

```tsx
if (recipe) {
  console.log(recipe.title);   // ここでは null でないと確定している
}
```

---

### `Cannot find module '@/lib/types'`

パスの誤りか、ファイル名の誤り。

- `tsconfig.json` に `"paths": { "@/*": ["./*"] }` があるか
- ファイル名の大文字小文字は合っているか(**Macは区別しないがLinuxは区別する**
  → ローカルで動いてVercelで落ちる原因になります)

---

## 20.5 API・環境変数まわり

### `Could not resolve authentication method` / 401

**原因**: APIキーが読めていない。

**チェックリスト**:
- [ ] `.env.local` がプロジェクト直下にあるか(`app/` の中ではない)
- [ ] 変数名が `ANTHROPIC_API_KEY` と完全に一致しているか
- [ ] `=` の前後に空白が無いか
- [ ] **開発サーバーを再起動したか** ← 最頻出
- [ ] (本番)Vercelの環境変数に登録したか

⚠️ 環境変数は **起動時に読み込まれます**。編集したら必ず再起動。

---

### `credit balance is too low`

Anthropicアカウントに支払い方法が登録されていない、または残高不足。
コンソールの Billing を確認します。

---

### ローカルでは動くのに、本番で動かない

**ほぼ100%、環境変数の登録漏れです。**

Vercel → Project Settings → Environment Variables で、3つ全部あるか確認。
**追加した後は、再デプロイが必要です**(Deployments → 最新のものを Redeploy)。

---

### Supabaseで `new row violates row-level security policy`

RLSポリシーが足りていません。
`supabase/schema.sql` の `create policy` 部分を実行したか確認します。

---

### Supabaseに接続できない

- 1週間アクセスが無いと **無料プランのDBは自動で一時停止** します。
  ダッシュボードから手動で再開してください(データは消えていません)
- URLとキーが正しいか確認

---

## 20.6 環境・ツールまわり

### `npm run dev` が動かない

```
ターミナル
pwd          # 今どこにいるか
ls           # package.json があるか
```

**プロジェクトフォルダの中にいない** のが最頻出の原因です。

---

### `npm install` が失敗する

```
ターミナル
rm -rf node_modules package-lock.json
npm install
```

これで直ることが多いです(依存関係のキャッシュがおかしくなった場合)。

---

### `npm run dev` は通るのに `npm run build` で落ちる

開発モードは型エラーを警告で済ませますが、ビルドは止めます。
**デプロイ前に必ず `npm run build` を通してください。**

---

### ポート3000が使われている

前回の `npm run dev` が残っています。
ターミナルで `Ctrl + C` するか、別のポートを使います。

```
ターミナル
npm run dev -- -p 3001
```

---

## 20.7 見た目の問題

| 症状 | よくある原因 |
|---|---|
| 横スクロールが出る | `box-sizing: border-box` 忘れ、または要素が画面幅を超えている |
| Flexboxの中身がはみ出す | `min-width: 0` を付ける |
| ボタンだけフォントが違う | `button { font-family: inherit }` を書く |
| CSSが効かない | `class` ではなく `className` になっているか確認 |
| CSSが効かない(2) | クラス名のtypo。F12 → Elements で実際のクラス名を見る |
| スマホで勝手に拡大する | 入力欄の `font-size` を16px以上に |

---

## 20.8 エラーの調べ方

### ① エラーメッセージで検索する

```
"You're importing a component that needs useState" next.js
```

⚠️ **自分のファイル名や変数名は検索語から外します**。
一般的な部分だけで検索するのがコツです。

### ② 記事の日付を見る

Next.jsは変化が速いので、**2年前の記事は別物** のことがあります。
App Router か Pages Router かも確認してください(`app/` を使うのが App Router)。

### ③ 公式ドキュメントを見る

| 対象 | URL |
|---|---|
| Next.js | https://nextjs.org/docs |
| React | https://react.dev/ |
| TypeScript | https://www.typescriptlang.org/docs/ |
| Supabase | https://supabase.com/docs |
| Anthropic | https://docs.anthropic.com/ |

💡 最初は読みにくいですが、**公式が最も正確で、最も新しい** です。
ブログ記事で概要を掴んで、公式で確認する、という使い分けが効率的です。

### ④ 最小の再現を作る

原因が分からないときは、**問題が起きる最小のコード** を作ります。

関係ない部分を削っていくと、たいてい途中で
「あ、これが原因だった」と自分で気づきます。
これは **デバッグの最も確実な手法** です。

---

## 20.9 デバッグの心構え

- **エラーメッセージは、あなたを助けようとしています。** 読んでください
- 「動かない」で止まらず、**「どこまで動いているか」** を確認する
- `console.log` を惜しまない。変数の中身を見るのが最短
- **一度に1つだけ変える**
- 詰まったら休憩する。翌朝に一瞬で気づくことは本当に多い

⚠️ 初心者と経験者の差は、**知識量より「切り分けの速さ」** です。
エラーを恐れず、1つずつ潰す習慣が、そのまま実力になります。

→ [21_next-steps.md](./21_next-steps.md)
