import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import type { Shop } from "@/lib/types";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: favorites } = await supabase
    .from("favorites")
    .select("shop_id, shops(*)")
    .eq("user_id", user.id);

  const shops = (favorites ?? [])
    .map((f) => f.shops as unknown as Shop)
    .filter((s): s is Shop => !!s);

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>お気に入り</h1>
        </div>
        <div className="shop-list shop-list-standalone">
          {shops.length === 0 && <p className="shop-list-empty">お気に入り登録したお店はまだありません。</p>}
          {shops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              isFavorited
              isLoggedIn
              isSelected={false}
              onSelect={() => {}}
            />
          ))}
        </div>
      </main>
    </>
  );
}
