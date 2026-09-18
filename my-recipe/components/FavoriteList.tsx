import FavoriteCard from "@/components/FavoriteCard";
import type { FavoriteRecipe } from "@/lib/types";

export default function FavoriteList({
  favorites,
  filtered = false,
}: {
  favorites: FavoriteRecipe[];
  filtered?: boolean;
}) {
  if (favorites.length === 0) {
    return (
      <p className="panel-empty">
        {filtered ? "このジャンルのお気に入りはありません。" : "まだお気に入りがありません。"}
      </p>
    );
  }

  return (
    <div className="favorite-list">
      {favorites.map((favorite) => (
        <FavoriteCard key={favorite.id} favorite={favorite} />
      ))}
    </div>
  );
}
