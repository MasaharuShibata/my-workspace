"use client";

import { useTransition } from "react";
import { toggleFavorite } from "@/app/actions";

type Props = {
  shopId: string;
  initialFavorited: boolean;
  isLoggedIn: boolean;
};

export default function FavoriteButton({ shopId, initialFavorited, isLoggedIn }: Props) {
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) return null;

  return (
    <button
      type="button"
      className={`favorite-btn${initialFavorited ? " is-active" : ""}`}
      disabled={isPending}
      onClick={() => startTransition(() => toggleFavorite(shopId, initialFavorited))}
      aria-label={initialFavorited ? "お気に入りから削除" : "お気に入りに追加"}
    >
      {initialFavorited ? "★" : "☆"}
    </button>
  );
}
