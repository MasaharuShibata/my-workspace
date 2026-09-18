-- my-recipe: database schema
-- Supabaseの「SQL Editor」でこのファイルの内容をそのまま実行してください。
-- ログイン機能は無く、個人利用の単一データセットを前提にしています。

-- ================================
-- テーブル
-- ================================

-- お気に入り登録されたレシピ。「お気に入り登録」ボタンが押された時にだけ1行作られる。
create table if not exists favorite_recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_ingredients text not null,
  ingredients text not null,
  steps text not null,
  created_at timestamptz not null default now()
);

create index if not exists favorite_recipes_created_idx
  on favorite_recipes (created_at desc);

-- ================================
-- Row Level Security
-- ================================
-- ログイン機能が無いため、anonロールに対して常に許可するポリシーで統一する
-- (「無効化」ではなく「意図的に開放したポリシー」にすることで、将来ログインを
-- 追加する場合にポリシーの条件式を差し替えるだけで済むようにしている)。

alter table favorite_recipes enable row level security;

create policy "anyone can view favorites"
  on favorite_recipes for select
  using (true);

create policy "anyone can add favorites"
  on favorite_recipes for insert
  with check (true);

create policy "anyone can delete favorites"
  on favorite_recipes for delete
  using (true);
