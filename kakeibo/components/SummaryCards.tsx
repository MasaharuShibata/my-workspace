import { formatYen } from "@/lib/format";

export default function SummaryCards({ income, expense }: { income: number; expense: number }) {
  const balance = income - expense;

  return (
    <div className="summary-cards">
      <div className="summary-card summary-card-income">
        <p className="summary-label">収入</p>
        <p className="summary-value">{formatYen(income)}</p>
      </div>
      <div className="summary-card summary-card-expense">
        <p className="summary-label">支出</p>
        <p className="summary-value">{formatYen(expense)}</p>
      </div>
      <div className={`summary-card ${balance < 0 ? "summary-card-negative" : ""}`}>
        <p className="summary-label">収支</p>
        <p className="summary-value">{formatYen(balance)}</p>
      </div>
    </div>
  );
}
