"use client";

import { useState } from "react";
import { addFavorite } from "@/app/actions";
import type { Genre, Recipe } from "@/lib/types";

export default function RecipeResult({
  recipe,
  sourceIngredients,
  genre,
  generating,
  onRegenerate,
}: {
  recipe: Recipe;
  sourceIngredients: string;
  genre: Genre;
  generating: boolean;
  onRegenerate: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean[]>(() => recipe.ingredients.map(() => false));
  const [lastTitle, setLastTitle] = useState(recipe.title);

  // 「別のレシピを提案してもらう」で内容が変わったら、チェック・保存状態をリセットする
  if (lastTitle !== recipe.title) {
    setLastTitle(recipe.title);
    setChecked(recipe.ingredients.map(() => false));
    setSaved(false);
    setError(null);
  }

  function toggleChecked(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await addFavorite(recipe, sourceIngredients, genre);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <section className="recipe-result">
      <div className="recipe-result-header">
        <h2>{recipe.title}</h2>
        <span className="genre-badge">{genre}</span>
      </div>
      <p className="recipe-meta">
        調理時間: {recipe.cookingTime} ・ {recipe.servings}
      </p>
      <p className="recipe-source">使った食材: {sourceIngredients}</p>

      <h3>材料</h3>
      <ul className="recipe-ingredients recipe-ingredients-checkable">
        {recipe.ingredients.map((item, i) => (
          <li key={i}>
            <label>
              <input type="checkbox" checked={checked[i]} onChange={() => toggleChecked(i)} />
              <span className={checked[i] ? "is-checked" : ""}>{item}</span>
            </label>
          </li>
        ))}
      </ul>

      <h3>作り方</h3>
      <ol className="recipe-steps">
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      {error && <p className="form-error">{error}</p>}

      <div className="recipe-result-actions">
        <button onClick={handleSave} disabled={saving || saved}>
          {saved ? "お気に入りに登録しました" : saving ? "登録中..." : "お気に入り登録"}
        </button>
        <button type="button" className="btn-secondary" onClick={onRegenerate} disabled={generating}>
          {generating ? "考案中..." : "別のレシピを提案してもらう"}
        </button>
      </div>
    </section>
  );
}
