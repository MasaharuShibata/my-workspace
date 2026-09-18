"use client";

import { useState } from "react";
import { deleteFavorite } from "@/app/actions";
import type { FavoriteRecipe } from "@/lib/types";

export default function FavoriteCard({ favorite }: { favorite: FavoriteRecipe }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingredientList = favorite.ingredients.split("\n");
  const [checked, setChecked] = useState<boolean[]>(() => ingredientList.map(() => false));

  function toggleChecked(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

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
        <button
          type="button"
          className="favorite-card-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="favorite-card-caret">{open ? "▾" : "▸"}</span>
          <h3>{favorite.title}</h3>
          <span className="genre-badge">{favorite.genre}</span>
        </button>
        <button onClick={handleDelete} disabled={deleting} className="favorite-card-delete">
          {deleting ? "削除中..." : "削除"}
        </button>
      </div>

      {open && (
        <div className="favorite-card-body">
          <p className="recipe-meta">
            調理時間: {favorite.cooking_time} ・ {favorite.servings}
          </p>
          <p className="recipe-source">使った食材: {favorite.source_ingredients}</p>

          <h4>材料</h4>
          <ul className="recipe-ingredients recipe-ingredients-checkable">
            {ingredientList.map((item, i) => (
              <li key={i}>
                <label>
                  <input type="checkbox" checked={checked[i]} onChange={() => toggleChecked(i)} />
                  <span className={checked[i] ? "is-checked" : ""}>{item}</span>
                </label>
              </li>
            ))}
          </ul>

          <h4>作り方</h4>
          <ol className="recipe-steps">
            {favorite.steps.split("\n").map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </article>
  );
}
