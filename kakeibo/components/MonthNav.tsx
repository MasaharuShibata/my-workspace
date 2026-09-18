import Link from "next/link";
import { formatMonthLabel, shiftMonth } from "@/lib/format";

export default function MonthNav({ month }: { month: string }) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <div className="month-nav">
      <Link href={`/?month=${prev}`} className="month-nav-btn" aria-label="前の月">
        ‹
      </Link>
      <span className="month-nav-label">{formatMonthLabel(month)}</span>
      <Link href={`/?month=${next}`} className="month-nav-btn" aria-label="次の月">
        ›
      </Link>
    </div>
  );
}
