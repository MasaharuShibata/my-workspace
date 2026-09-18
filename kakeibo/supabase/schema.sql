-- kakeibo: database schema
-- Supabaseの「SQL Editor」でこのファイルの内容をそのまま実行してください。

-- ================================
-- テーブル
-- ================================

-- カテゴリ(食費・交通費・給与など)。ログインユーザーなら誰でも閲覧・追加できる。
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz not null default now(),
  unique (name, type)
);

-- 収入・支出の記録本体。1件が1つのカテゴリに属する(多対1のリレーション)。
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  type text not null check (type in ('income', 'expense')),
  amount integer not null check (amount > 0),
  memo text,
  occurred_on date not null,
  created_at timestamptz not null default now()
);

-- transactionsへの変更を自動で記録する操作ログ(下部のトリガーから書き込まれる)。
create table if not exists activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

-- ================================
-- Row Level Security
-- ================================

alter table categories enable row level security;
alter table transactions enable row level security;
alter table activity_log enable row level security;

-- categories: 誰でも閲覧可能、ログインユーザーは追加可能
create policy "categories are viewable by everyone"
  on categories for select
  using (true);

create policy "authenticated users can add categories"
  on categories for insert
  to authenticated
  with check (true);

-- transactions: 自分の記録のみ閲覧・追加・更新・削除可能
create policy "users can view their own transactions"
  on transactions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can add their own transactions"
  on transactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own transactions"
  on transactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own transactions"
  on transactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- activity_log: 自分の操作ログのみ閲覧可能(書き込みはトリガー経由のみ)
create policy "users can view their own activity log"
  on activity_log for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists transactions_user_occurred_idx on transactions (user_id, occurred_on desc);
create index if not exists activity_log_user_created_idx on activity_log (user_id, created_at desc);

-- ================================
-- トリガー: transactionsへのINSERT/UPDATE/DELETEを自動でactivity_logに記録する
-- ================================

create or replace function log_transaction_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_name text;
  v_detail text;
begin
  if tg_op = 'DELETE' then
    select name into v_category_name from categories where id = old.category_id;
    v_detail := format(
      '%s / %s / %s円 の記録を削除しました',
      old.occurred_on, coalesce(v_category_name, '(不明なカテゴリ)'), to_char(old.amount, 'FM999,999,999')
    );
    insert into activity_log (user_id, action, table_name, detail)
      values (old.user_id, 'delete', 'transactions', v_detail);
    return old;
  elsif tg_op = 'UPDATE' then
    select name into v_category_name from categories where id = new.category_id;
    v_detail := format(
      '%s / %s / %s円 の記録を更新しました',
      new.occurred_on, coalesce(v_category_name, '(不明なカテゴリ)'), to_char(new.amount, 'FM999,999,999')
    );
    insert into activity_log (user_id, action, table_name, detail)
      values (new.user_id, 'update', 'transactions', v_detail);
    return new;
  else
    select name into v_category_name from categories where id = new.category_id;
    v_detail := format(
      '%s / %s / %s円 を記録しました',
      new.occurred_on, coalesce(v_category_name, '(不明なカテゴリ)'), to_char(new.amount, 'FM999,999,999')
    );
    insert into activity_log (user_id, action, table_name, detail)
      values (new.user_id, 'insert', 'transactions', v_detail);
    return new;
  end if;
end;
$$;

drop trigger if exists trg_log_transaction_activity on transactions;
create trigger trg_log_transaction_activity
after insert or update or delete on transactions
for each row execute function log_transaction_activity();

-- ================================
-- RPC関数: 指定した月の「カテゴリ別合計」をJOIN + GROUP BYで集計して返す
-- ================================

create or replace function get_category_summary(p_month date)
returns table (
  category_id uuid,
  category_name text,
  type text,
  total numeric
)
language sql
stable
as $$
  select c.id, c.name, t.type, sum(t.amount) as total
  from transactions t
  join categories c on c.id = t.category_id
  where t.user_id = auth.uid()
    and t.occurred_on >= p_month
    and t.occurred_on < (p_month + interval '1 month')
  group by c.id, c.name, t.type
  order by total desc;
$$;
