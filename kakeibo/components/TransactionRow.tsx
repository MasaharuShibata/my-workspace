"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteTransaction, updateTransaction } from "@/app/actions";
import { formatYen } from "@/lib/format";
import type { Category, CategoryType, TransactionWithCategory } from "@/lib/types";

export default function TransactionRow({
  transaction,
  categories,
}: {
  transaction: TransactionWithCategory;
  categories: Category[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [type, setType] = useState<CategoryType>(transaction.type);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  function handleUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateTransaction(transaction.id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsEditing(false);
      }
    });
  }

  function handleDelete() {
    if (!confirm("この記録を削除しますか?")) return;
    startTransition(async () => {
      await deleteTransaction(transaction.id);
    });
  }

  if (isEditing) {
    return (
      <li className="transaction-item transaction-item-editing">
        <form action={handleUpdate} className="transaction-edit-form">
          <div className="transaction-form-type">
            <label className={type === "expense" ? "is-active" : ""}>
              <input
                type="radio"
                name="type"
                value="expense"
                checked={type === "expense"}
                onChange={() => setType("expense")}
              />
              支出
            </label>
            <label className={type === "income" ? "is-active" : ""}>
              <input
                type="radio"
                name="type"
                value="income"
                checked={type === "income"}
                onChange={() => setType("income")}
              />
              収入
            </label>
          </div>
          <input type="date" name="occurred_on" defaultValue={transaction.occurred_on} required />
          <input
            type="number"
            name="amount"
            min={1}
            step={1}
            defaultValue={transaction.amount}
            required
          />
          <select name="category_id" defaultValue={transaction.category_id} required>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input type="text" name="memo" defaultValue={transaction.memo ?? ""} placeholder="メモ" />
          <div className="transaction-edit-actions">
            <button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : "保存"}
            </button>
            <button type="button" onClick={() => setIsEditing(false)}>
              キャンセル
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className="transaction-item">
      <span className={`transaction-badge transaction-badge-${transaction.type}`}>
        {transaction.type === "income" ? "収入" : "支出"}
      </span>
      <span className="transaction-date">{transaction.occurred_on}</span>
      <span className="transaction-category">{transaction.categories?.name ?? "(不明)"}</span>
      <span className="transaction-memo">{transaction.memo}</span>
      <span className={`transaction-amount transaction-amount-${transaction.type}`}>
        {transaction.type === "income" ? "+" : "-"}
        {formatYen(transaction.amount)}
      </span>
      <span className="transaction-actions">
        <button type="button" onClick={() => setIsEditing(true)}>
          編集
        </button>
        <button type="button" onClick={handleDelete} disabled={isPending}>
          削除
        </button>
      </span>
    </li>
  );
}
