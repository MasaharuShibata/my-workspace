import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        家計簿
      </Link>
      <nav className="site-nav">
        <Link href="/">ホーム</Link>
        {user && <Link href="/categories">カテゴリ管理</Link>}
      </nav>
      <div className="site-auth">
        {user ? (
          <form action={signOut}>
            <span className="auth-email">{user.email}</span>
            <button type="submit" className="link-btn">
              ログアウト
            </button>
          </form>
        ) : (
          <Link href="/login" className="link-btn">
            ログイン
          </Link>
        )}
      </div>
    </header>
  );
}
