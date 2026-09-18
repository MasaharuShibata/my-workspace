import Header from "@/components/Header";
import FavoriteList from "@/components/FavoriteList";
import { createClient } from "@/lib/supabase/server";
import type { FavoriteRecipe } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("favorite_recipes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>お気に入り</h1>
          <p>保存したレシピの一覧です。</p>
        </div>

        <FavoriteList favorites={(data as FavoriteRecipe[]) ?? []} />
      </main>
    </>
  );
}
