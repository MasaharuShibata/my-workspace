import Header from "@/components/Header";
import FavoriteList from "@/components/FavoriteList";
import GenreFilter from "@/components/GenreFilter";
import { createClient } from "@/lib/supabase/server";
import { GENRES } from "@/lib/types";
import type { FavoriteRecipe } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre: genreParam } = await searchParams;
  const genre =
    genreParam && (GENRES as readonly string[]).includes(genreParam) ? genreParam : null;

  const supabase = createClient();
  let query = supabase.from("favorite_recipes").select("*").order("created_at", { ascending: false });
  if (genre) {
    query = query.eq("genre", genre);
  }
  const { data } = await query;

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>お気に入り</h1>
          <p>保存したレシピの一覧です。タイトルを押すと詳細が開きます。</p>
        </div>

        <GenreFilter selected={genre} />

        <FavoriteList favorites={(data as FavoriteRecipe[]) ?? []} filtered={genre !== null} />
      </main>
    </>
  );
}
