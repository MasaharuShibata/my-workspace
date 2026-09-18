"use client";

import { useMemo, useState, useTransition } from "react";
import { addTransaction } from "@/app/actions";
import { todayString } from "@/lib/format";
import type { Category, CategoryType } from "@/lib/types";

export default function TransactionForm({ categories }: { categories: Category[] }) {
  const [type, setType] = useState<CategoryType>("expense");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addTransaction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setFormKey((k) => k + 1);
      }
    });
  }

  return (
    <section className="panel">
      <h2 className="panel-title">記録する</h2>
      <form key={formKey} action={handleSubmit} className="transaction-form">
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

        <div className="transaction-form-row">
          <label>
            日付
            <input type="date" name="occurred_on" defaultValue={todayString()} required />
          </label>
          <label>
            金額
            <input type="number" name="amount" min={1} step={1} placeholder="1000" required />
          </label>
        </div>

        <label>
          カテゴリ
          <select name="category_id" required>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          メモ(任意)
          <input type="text" name="memo" placeholder="例)スーパーで食材" maxLength={100} />
        </label>

        <button type="submit" disabled={isPending || filteredCategories.length === 0}>
          {isPending ? "登録中..." : "記録する"}
        </button>

        {filteredCategories.length === 0 && (
          <p className="form-hint">
            {type === "expense" ? "支出" : "収入"}
            用のカテゴリがありません。カテゴリ管理から追加してください。
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
      </form>
    </section>
  );
}
