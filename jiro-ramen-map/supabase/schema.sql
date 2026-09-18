-- jiro-ramen-map: database schema
-- Supabaseの「SQL Editor」でこのファイルの内容をそのまま実行してください。

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  prefecture text,
  lat double precision,
  lng double precision,
  google_place_id text unique,
  rating numeric(2, 1),
  review_count integer,
  score numeric(5, 4),
  synced_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

alter table shops enable row level security;
alter table favorites enable row level security;

-- shops: 誰でも閲覧可能、ログインユーザーは追加可能、更新・削除はサーバー(service role)経由のみ
create policy "shops are viewable by everyone"
  on shops for select
  using (true);

create policy "authenticated users can add shops"
  on shops for insert
  to authenticated
  with check (true);

-- favorites: 自分のお気に入りのみ閲覧・追加・削除可能
create policy "users can view their own favorites"
  on favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can add their own favorites"
  on favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can remove their own favorites"
  on favorites for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists shops_score_idx on shops (score desc nulls last);
create index if not exists favorites_user_id_idx on favorites (user_id);
