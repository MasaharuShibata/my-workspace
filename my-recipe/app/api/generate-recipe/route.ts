import { NextResponse } from "next/server";
import { generateRecipe } from "@/lib/claude";
import { GENRES, type Genre } from "@/lib/types";

const MAX_INGREDIENTS = 10;

function parseGenre(value: unknown): Genre {
  return typeof value === "string" && (GENRES as readonly string[]).includes(value)
    ? (value as Genre)
    : "こだわりなし";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsedBody = body as { ingredients?: unknown; genre?: unknown; avoidTitle?: unknown };
  const rawIngredients = parsedBody?.ingredients;
  const ingredients = Array.isArray(rawIngredients)
    ? rawIngredients.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  const genre = parseGenre(parsedBody?.genre);
  const avoidTitle = typeof parsedBody?.avoidTitle === "string" ? parsedBody.avoidTitle : undefined;

  if (ingredients.length === 0) {
    return NextResponse.json({ error: "食材を1つ以上入力してください。" }, { status: 400 });
  }
  if (ingredients.length > MAX_INGREDIENTS) {
    return NextResponse.json(
      { error: `食材は${MAX_INGREDIENTS}個までにしてください。` },
      { status: 400 }
    );
  }

  try {
    const recipe = await generateRecipe(ingredients, genre, avoidTitle);
    return NextResponse.json({ recipe });
  } catch {
    return NextResponse.json(
      { error: "レシピの考案に失敗しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
