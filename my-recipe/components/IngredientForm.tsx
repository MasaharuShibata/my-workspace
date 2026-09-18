"use client";

import { useState, type FormEvent } from "react";
import type { Recipe } from "@/lib/types";

const MAX_INGREDIENTS = 10;

function parseIngredients(input: string): string[] {
  return input
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function IngredientForm({
  onGenerated,
}: {
  onGenerated: (recipe: Recipe, sourceIngredients: string) => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ingredients = parseIngredients(input);

    if (ingredients.length === 0) {
      setError("食材を1つ以上入力してください。");
      return;
    }
    if (ingredients.length > MAX_INGREDIENTS) {
      setError(`食材は${MAX_INGREDIENTS}個までにしてください。`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "レシピの考案に失敗しました。もう一度お試しください。");
        return;
      }

      onGenerated(data.recipe as Recipe, ingredients.join("、"));
    } catch {
      setError("レシピの考案に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="ingredient-form" onSubmit={handleSubmit}>
      <label htmlFor="ingredients">食材(カンマ区切りで複数入力できます・最大{MAX_INGREDIENTS}個)</label>
      <div className="ingredient-form-row">
        <input
          id="ingredients"
          type="text"
          placeholder="例: 鶏むね肉, 白菜, しょうが"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? "考案中..." : "レシピを考えてもらう"}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
