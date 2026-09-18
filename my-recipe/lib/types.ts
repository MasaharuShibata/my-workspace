export const GENRES = [
  "和食",
  "洋食",
  "中華",
  "イタリアン",
  "韓国料理",
  "お弁当",
  "こだわりなし",
] as const;

export type Genre = (typeof GENRES)[number];

export type Recipe = {
  title: string;
  cookingTime: string;
  servings: string;
  ingredients: string[];
  steps: string[];
};

export type FavoriteRecipe = {
  id: string;
  title: string;
  genre: string;
  cooking_time: string;
  servings: string;
  source_ingredients: string;
  ingredients: string;
  steps: string;
  created_at: string;
};
