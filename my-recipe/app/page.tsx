"use client";

import { useState } from "react";
import Header from "@/components/Header";
import IngredientForm from "@/components/IngredientForm";
import RecipeResult from "@/components/RecipeResult";
import type { Recipe } from "@/lib/types";

export default function HomePage() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [sourceIngredients, setSourceIngredients] = useState("");

  function handleGenerated(newRecipe: Recipe, ingredientsText: string) {
    setRecipe(newRecipe);
    setSourceIngredients(ingredientsText);
  }

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>my-recipe</h1>
          <p>手元にある食材を入力すると、AIがそれらを活かしたレシピを考案します。</p>
        </div>

        <IngredientForm onGenerated={handleGenerated} />

        {recipe && <RecipeResult recipe={recipe} sourceIngredients={sourceIngredients} />}
      </main>
    </>
  );
}
