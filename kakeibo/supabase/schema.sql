-- kakeibo: database schema
-- Supabaseの「SQL Editor」でこのファイルの内容をそのまま実行してください。
-- ログイン機能は無く、個人利用の単一データセットを前提にしています。

-- ================================
-- テーブル
-- ================================

-- カテゴリ(食費・交通費・給与など)
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
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

-- ================================
-- Row Level Security
-- ================================
-- ログイン機能がなく個人利用専用のため、誰でも(anonキーで)読み書きできる
-- ポリシーにしています。URLとanonキーを他人に共有しないよう注意してください。

alter table categories enable row level security;
alter table transactions enable row level security;
alter table activity_log enable row level security;

create policy "anyone can view categories"
  on categories for select
  using (true);

create policy "anyone can add categories"
  on categories for insert
  with check (true);

create policy "anyone can view transactions"
  on transactions for select
  using (true);

create policy "anyone can add transactions"
  on transactions for insert
  with check (true);

create policy "anyone can update transactions"
  on transactions for update
  using (true)
  with check (true);

create policy "anyone can delete transactions"
  on transactions for delete
  using (true);

create policy "anyone can view activity log"
  on activity_log for select
  using (true);

create index if not exists transactions_occurred_idx on transactions (occurred_on desc);
create index if not exists activity_log_created_idx on activity_log (created_at desc);

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
    insert into activity_log (action, table_name, detail)
      values ('delete', 'transactions', v_detail);
    return old;
  elsif tg_op = 'UPDATE' then
    select name into v_category_name from categories where id = new.category_id;
    v_detail := format(
      '%s / %s / %s円 の記録を更新しました',
      new.occurred_on, coalesce(v_category_name, '(不明なカテゴリ)'), to_char(new.amount, 'FM999,999,999')
    );
    insert into activity_log (action, table_name, detail)
      values ('update', 'transactions', v_detail);
    return new;
  else
    select name into v_category_name from categories where id = new.category_id;
    v_detail := format(
      '%s / %s / %s円 を記録しました',
      new.occurred_on, coalesce(v_category_name, '(不明なカテゴリ)'), to_char(new.amount, 'FM999,999,999')
    );
    insert into activity_log (action, table_name, detail)
      values ('insert', 'transactions', v_detail);
    return new;
  end if;
end;
$$;

drop trigger if exists trg_log_transaction_activity on transactions;
create trigger trg_log_transaction_activity
after insert or update or delete on transactions
for each row execute function log_transaction_activity();

-- トリガー専用の関数なので、API経由での直接実行は禁止する
revoke execute on function log_transaction_activity() from public, anon, authenticated;

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
set search_path = public
as $$
  select c.id, c.name, t.type, sum(t.amount) as total
  from transactions t
  join categories c on c.id = t.category_id
  where t.occurred_on >= p_month
    and t.occurred_on < (p_month + interval '1 month')
  group by c.id, c.name, t.type
  order by total desc;
$$;
