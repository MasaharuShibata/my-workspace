"use client";

import { useTransition } from "react";
import { syncShopData } from "@/app/actions";

export default function SyncButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="sync-btn"
      disabled={isPending}
      onClick={() => startTransition(() => syncShopData())}
    >
      {isPending ? "更新中..." : "データを更新(Googleから評価を取得)"}
    </button>
  );
}
