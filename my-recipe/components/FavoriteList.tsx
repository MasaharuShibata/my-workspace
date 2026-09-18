import FavoriteCard from "@/components/FavoriteCard";
import type { FavoriteRecipe } from "@/lib/types";

export default function FavoriteList({ favorites }: { favorites: FavoriteRecipe[] }) {
  if (favorites.length === 0) {
    return <p className="panel-empty">まだお気に入りがありません。</p>;
  }

  return (
    <div className="favorite-list">
      {favorites.map((favorite) => (
        <FavoriteCard key={favorite.id} favorite={favorite} />
      ))}
    </div>
  );
}
