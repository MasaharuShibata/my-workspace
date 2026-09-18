import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import MapExplorer from "@/components/MapExplorer";
import SyncButton from "@/components/SyncButton";
import LoginToast from "@/components/LoginToast";
import type { Shop } from "@/lib/types";

export const maxDuration = 60;

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: shops } = await supabase
    .from("shops")
    .select("*")
    .order("score", { ascending: false, nullsFirst: false });

  let favoritedIds = new Set<string>();
  if (user) {
    const { data: favorites } = await supabase
      .from("favorites")
      .select("shop_id")
      .eq("user_id", user.id);
    favoritedIds = new Set((favorites ?? []).map((f) => f.shop_id));
  }

  return (
    <>
      <Header />
      <LoginToast />
      <main className="page">
        <div className="page-intro">
          <h1>二郎系ラーメンマップ</h1>
          <p>口コミ数と評価から算出したおすすめ順で、二郎系ラーメン店を紹介します。</p>
          {user && <SyncButton />}
        </div>
        <MapExplorer shops={(shops as Shop[]) ?? []} favoritedIds={favoritedIds} isLoggedIn={!!user} />
      </main>
    </>
  );
}
