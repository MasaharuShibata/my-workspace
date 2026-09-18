import { formatYen } from "@/lib/format";
import type { CategorySummary } from "@/lib/types";

function Breakdown({
  title,
  items,
  barClass,
}: {
  title: string;
  items: CategorySummary[];
  barClass: string;
}) {
  if (items.length === 0) return null;
  const totals = items.map((item) => Number(item.total));
  const max = Math.max(...totals);

  return (
    <div className="breakdown-group">
      <p className="breakdown-title">{title}</p>
      <div className="breakdown-bars">
        {items.map((item, index) => (
          <div key={item.category_id} className="breakdown-row">
            <span className="breakdown-name">{item.category_name}</span>
            <div className="breakdown-track">
              <div
                className={`breakdown-bar ${barClass}`}
                style={{ width: `${max > 0 ? (totals[index] / max) * 100 : 0}%` }}
              />
            </div>
            <span className="breakdown-amount">{formatYen(totals[index])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CategoryBreakdown({ summary }: { summary: CategorySummary[] }) {
  const expense = summary.filter((s) => s.type === "expense");
  const income = summary.filter((s) => s.type === "income");

  return (
    <section className="panel">
      <h2 className="panel-title">カテゴリ別の内訳</h2>
      <p className="panel-desc">
        JOINとGROUP BYで集計したSQL関数(get_category_summary)の結果をそのまま表示しています。
      </p>
      {expense.length === 0 && income.length === 0 ? (
        <p className="panel-empty">この月の記録はまだありません。</p>
      ) : (
        <>
          <Breakdown title="支出" items={expense} barClass="breakdown-bar-expense" />
          <Breakdown title="収入" items={income} barClass="breakdown-bar-income" />
        </>
      )}
    </section>
  );
}
