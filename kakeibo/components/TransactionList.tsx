import type { Category, TransactionWithCategory } from "@/lib/types";
import TransactionRow from "./TransactionRow";

export default function TransactionList({
  transactions,
  categories,
}: {
  transactions: TransactionWithCategory[];
  categories: Category[];
}) {
  return (
    <section className="panel">
      <h2 className="panel-title">この月の記録</h2>
      {transactions.length === 0 ? (
        <p className="panel-empty">まだ記録がありません。上のフォームから追加してみましょう。</p>
      ) : (
        <ul className="transaction-list">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} categories={categories} />
          ))}
        </ul>
      )}
    </section>
  );
}
