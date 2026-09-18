import Header from "@/components/Header";
import MonthNav from "@/components/MonthNav";
import SummaryCards from "@/components/SummaryCards";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import ActivityLog from "@/components/ActivityLog";
import TransactionForm from "@/components/TransactionForm";
import TransactionList from "@/components/TransactionList";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonth, monthToDateRange } from "@/lib/format";
import type { Category, CategorySummary, TransactionWithCategory, ActivityLogEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? getCurrentMonth();

  const supabase = createClient();
  const { start, end } = monthToDateRange(month);

  const [{ data: categories }, { data: transactions }, { data: summary }, { data: activity }] =
    await Promise.all([
      supabase.from("categories").select("*").order("type").order("name"),
      supabase
        .from("transactions")
        .select("*, categories(name)")
        .gte("occurred_on", start)
        .lt("occurred_on", end)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.rpc("get_category_summary", { p_month: start }),
      supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const summaryRows = (summary as CategorySummary[]) ?? [];
  const incomeTotal = summaryRows
    .filter((s) => s.type === "income")
    .reduce((sum, s) => sum + Number(s.total), 0);
  const expenseTotal = summaryRows
    .filter((s) => s.type === "expense")
    .reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>家計簿</h1>
          <p>収入・支出を記録して、月ごとの収支とカテゴリ別の内訳を確認できます。</p>
        </div>

        <MonthNav month={month} />
        <SummaryCards income={incomeTotal} expense={expenseTotal} />

        <div className="dashboard-grid">
          <div>
            <TransactionForm categories={(categories as Category[]) ?? []} />
            <TransactionList
              transactions={(transactions as TransactionWithCategory[]) ?? []}
              categories={(categories as Category[]) ?? []}
            />
          </div>
          <div>
            <CategoryBreakdown summary={summaryRows} />
            <ActivityLog entries={(activity as ActivityLogEntry[]) ?? []} />
          </div>
        </div>
      </main>
    </>
  );
}
