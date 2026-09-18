"use client";

import { useState } from "react";
import { deleteFavorite } from "@/app/actions";
import type { FavoriteRecipe } from "@/lib/types";

export default function FavoriteCard({ favorite }: { favorite: FavoriteRecipe }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteFavorite(favorite.id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
    }
    // 成功時は revalidatePath により一覧側が再描画されるため、ここでの状態更新は不要
  }

  return (
    <article className="favorite-card">
      <div className="favorite-card-header">
        <h3>{favorite.title}</h3>
        <button onClick={handleDelete} disabled={deleting}>
          {deleting ? "削除中..." : "削除"}
        </button>
      </div>
      <p className="recipe-source">使った食材: {favorite.source_ingredients}</p>

      <h4>材料</h4>
      <ul className="recipe-ingredients">
        {favorite.ingredients.split("\n").map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <h4>作り方</h4>
      <ol className="recipe-steps">
        {favorite.steps.split("\n").map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      {error && <p className="form-error">{error}</p>}
    </article>
  );
}
