export type CategoryType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  created_at: string;
};

export type Transaction = {
  id: string;
  category_id: string;
  type: CategoryType;
  amount: number;
  memo: string | null;
  occurred_on: string;
  created_at: string;
};

export type TransactionWithCategory = Transaction & {
  categories: { name: string } | null;
};

export type CategorySummary = {
  category_id: string;
  category_name: string;
  type: CategoryType;
  total: number | string;
};

export type ActivityAction = "insert" | "update" | "delete";

export type ActivityLogEntry = {
  id: number;
  action: ActivityAction;
  table_name: string;
  detail: string;
  created_at: string;
};
