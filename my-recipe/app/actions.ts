"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/lib/types";

export async function addFavorite(recipe: Recipe, sourceIngredients: string) {
  const supabase = createClient();
  const { error } = await supabase.from("favorite_recipes").insert({
    title: recipe.title,
    source_ingredients: sourceIngredients,
    ingredients: recipe.ingredients.join("\n"),
    steps: recipe.steps.join("\n"),
  });

  if (error) return { error: "お気に入りの登録に失敗しました。時間をおいて再度お試しください。" };

  revalidatePath("/favorites");
  return { error: null };
}

export async function deleteFavorite(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("favorite_recipes").delete().eq("id", id);

  if (error) return { error: "削除に失敗しました。時間をおいて再度お試しください。" };

  revalidatePath("/favorites");
  return { error: null };
}
