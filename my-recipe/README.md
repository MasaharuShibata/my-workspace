# my-recipe

食材をいくつか入力すると、AI(Claude API)がそれらを活かしたレシピを考案してくれるレシピ提案Webアプリです。
気に入ったレシピはお気に入りとして保存できます。

個人利用(自分だけが使う)を前提にしています。

現在は要件定義中です。詳しい要件・設計は [`docs/00_index.md`](./docs/00_index.md) を参照してください。

## 構成(予定)

- Next.js(App Router) + TypeScript
- Supabase(お気に入りレシピの保存)
- Claude API(Anthropic) によるレシピ考案
- Vercel でホスティング
