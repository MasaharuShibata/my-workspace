export type Recipe = {
  title: string;
  ingredients: string[];
  steps: string[];
};

export type FavoriteRecipe = {
  id: string;
  title: string;
  source_ingredients: string;
  ingredients: string;
  steps: string;
  created_at: string;
};
