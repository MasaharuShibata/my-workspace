"use client";

import { useState } from "react";
import Header from "@/components/Header";
import IngredientForm from "@/components/IngredientForm";
import RecipeResult from "@/components/RecipeResult";
import type { Genre, Recipe } from "@/lib/types";

export default function HomePage() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [genre, setGenre] = useState<Genre>("こだわりなし");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(nextIngredients: string[], nextGenre: Genre, avoidTitle?: string) {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: nextIngredients, genre: nextGenre, avoidTitle }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "レシピの考案に失敗しました。もう一度お試しください。");
        return;
      }

      setRecipe(data.recipe as Recipe);
      setIngredients(nextIngredients);
      setGenre(nextGenre);
    } catch {
      setError("レシピの考案に失敗しました。もう一度お試しください。");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>my-recipe</h1>
          <p>手元にある食材を入力すると、AIがそれらを活かしたレシピを考案します。</p>
        </div>

        <IngredientForm generating={generating} onSubmit={(ing, g) => generate(ing, g)} />

        {error && <p className="form-error">{error}</p>}

        {recipe && (
          <RecipeResult
            recipe={recipe}
            sourceIngredients={ingredients.join("、")}
            genre={genre}
            generating={generating}
            onRegenerate={() => generate(ingredients, genre, recipe.title)}
          />
        )}
      </main>
    </>
  );
}
