"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CategoryType } from "@/lib/types";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}

function parseAmount(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function parseType(value: FormDataEntryValue | null): CategoryType | null {
  return value === "income" || value === "expense" ? value : null;
}

export async function addTransaction(formData: FormData) {
  const type = parseType(formData.get("type"));
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const occurredOn = String(formData.get("occurred_on") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim() || null;

  if (!type || !categoryId || !amount || !occurredOn) {
    return { error: "入力内容を確認してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    category_id: categoryId,
    type,
    amount,
    occurred_on: occurredOn,
    memo,
  });

  if (error) return { error: "登録に失敗しました。時間をおいて再度お試しください。" };

  revalidatePath("/");
  return { error: null };
}

export async function updateTransaction(id: string, formData: FormData) {
  const type = parseType(formData.get("type"));
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const occurredOn = String(formData.get("occurred_on") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim() || null;

  if (!type || !categoryId || !amount || !occurredOn) {
    return { error: "入力内容を確認してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      type,
      amount,
      occurred_on: occurredOn,
      memo,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "更新に失敗しました。時間をおいて再度お試しください。" };

  revalidatePath("/");
  return { error: null };
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "削除に失敗しました。時間をおいて再度お試しください。" };

  revalidatePath("/");
  return { error: null };
}

export async function addCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = parseType(formData.get("type"));

  if (!name || !type) {
    return { error: "カテゴリ名と種別を入力してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const { error } = await supabase.from("categories").insert({ name, type });

  if (error) return { error: "追加に失敗しました。同じ名前のカテゴリが既にあるかもしれません。" };

  revalidatePath("/categories");
  revalidatePath("/");
  return { error: null };
}
