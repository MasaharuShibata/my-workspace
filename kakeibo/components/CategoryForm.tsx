"use client";

import { useState, useTransition } from "react";
import { addCategory } from "@/app/actions";

export default function CategoryForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addCategory(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setFormKey((k) => k + 1);
      }
    });
  }

  return (
    <form key={formKey} action={handleSubmit} className="category-form">
      <input type="text" name="name" placeholder="カテゴリ名(例: ペット費)" required maxLength={30} />
      <select name="type" required defaultValue="expense">
        <option value="expense">支出</option>
        <option value="income">収入</option>
      </select>
      <button type="submit" disabled={isPending}>
        {isPending ? "追加中..." : "追加"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
