import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        家計簿
      </Link>
      <nav className="site-nav">
        <Link href="/">ホーム</Link>
        <Link href="/categories">カテゴリ管理</Link>
      </nav>
    </header>
  );
}
