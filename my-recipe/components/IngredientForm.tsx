"use client";

import { useState, type FormEvent } from "react";
import { GENRES, type Genre } from "@/lib/types";

const MAX_INGREDIENTS = 10;

function parseIngredients(input: string): string[] {
  return input
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function IngredientForm({
  generating,
  onSubmit,
}: {
  generating: boolean;
  onSubmit: (ingredients: string[], genre: Genre) => void;
}) {
  const [input, setInput] = useState("");
  const [genre, setGenre] = useState<Genre>("こだわりなし");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
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

    setError(null);
    onSubmit(ingredients, genre);
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
          disabled={generating}
        />
        <select
          id="genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value as Genre)}
          disabled={generating}
          aria-label="ジャンル"
        >
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button type="submit" disabled={generating}>
          {generating ? "考案中..." : "レシピを考えてもらう"}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
