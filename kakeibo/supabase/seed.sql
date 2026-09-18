-- kakeibo: 初期カテゴリ(seed data)
-- schema.sql を実行した後、続けてこの内容を実行してください。

insert into categories (name, type) values
  ('食費', 'expense'),
  ('日用品', 'expense'),
  ('交通費', 'expense'),
  ('住居費', 'expense'),
  ('水道・光熱費', 'expense'),
  ('通信費', 'expense'),
  ('娯楽・趣味', 'expense'),
  ('交際費', 'expense'),
  ('医療費', 'expense'),
  ('その他(支出)', 'expense'),
  ('給与', 'income'),
  ('副業・お小遣い', 'income'),
  ('その他(収入)', 'income')
on conflict (name, type) do nothing;
