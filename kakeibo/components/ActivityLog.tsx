import type { ActivityAction, ActivityLogEntry } from "@/lib/types";

const ACTION_LABEL: Record<ActivityAction, string> = {
  insert: "追加",
  update: "更新",
  delete: "削除",
};

export default function ActivityLog({ entries }: { entries: ActivityLogEntry[] }) {
  return (
    <section className="panel">
      <h2 className="panel-title">データベース操作ログ</h2>
      <p className="panel-desc">
        記録を追加・編集・削除するたびに、データベース側のトリガーが自動でここに書き込んでいます。
      </p>
      {entries.length === 0 ? (
        <p className="panel-empty">まだ操作はありません。</p>
      ) : (
        <ul className="activity-list">
          {entries.map((entry) => (
            <li key={entry.id} className="activity-item">
              <span className={`activity-badge activity-badge-${entry.action}`}>
                {ACTION_LABEL[entry.action]}
              </span>
              <span className="activity-detail">{entry.detail}</span>
              <span className="activity-time">
                {new Date(entry.created_at).toLocaleString("ja-JP", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
