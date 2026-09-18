"use client";

import { useState } from "react";
import { addFavorite } from "@/app/actions";
import type { Recipe } from "@/lib/types";

export default function RecipeResult({
  recipe,
  sourceIngredients,
}: {
  recipe: Recipe;
  sourceIngredients: string;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await addFavorite(recipe, sourceIngredients);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <section className="recipe-result">
      <h2>{recipe.title}</h2>
      <p className="recipe-source">使った食材: {sourceIngredients}</p>

      <h3>材料</h3>
      <ul className="recipe-ingredients">
        {recipe.ingredients.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <h3>作り方</h3>
      <ol className="recipe-steps">
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      {error && <p className="form-error">{error}</p>}

      <button onClick={handleSave} disabled={saving || saved}>
        {saved ? "お気に入りに登録しました" : saving ? "登録中..." : "お気に入り登録"}
      </button>
    </section>
  );
}
