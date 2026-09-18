import { redirect } from "next/navigation";
import Header from "@/components/Header";
import CategoryForm from "@/components/CategoryForm";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("type")
    .order("name");

  const rows = (categories as Category[]) ?? [];
  const expense = rows.filter((c) => c.type === "expense");
  const income = rows.filter((c) => c.type === "income");

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>カテゴリ管理</h1>
          <p>収入・支出の記録に使うカテゴリの一覧です。必要に応じて追加できます。</p>
        </div>

        <section className="panel">
          <h2 className="panel-title">新しいカテゴリを追加</h2>
          <CategoryForm />
        </section>

        <div className="category-columns">
          <section className="panel">
            <h2 className="panel-title">支出カテゴリ</h2>
            <ul className="category-list">
              {expense.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2 className="panel-title">収入カテゴリ</h2>
            <ul className="category-list">
              {income.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
