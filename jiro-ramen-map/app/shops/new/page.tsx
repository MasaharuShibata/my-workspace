import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import AddShopForm from "@/components/AddShopForm";

export default async function NewShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      <main className="page">
        <div className="page-intro">
          <h1>お店を追加</h1>
          <p>
            店名と住所を登録すると、次回の「データを更新」実行時にGoogleの評価・口コミ数・地図上の位置が自動的に反映されます。
          </p>
        </div>
        <AddShopForm />
      </main>
    </>
  );
}
