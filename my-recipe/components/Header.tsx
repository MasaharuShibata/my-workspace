import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        my-recipe
      </Link>
      <nav className="site-nav">
        <Link href="/">ホーム</Link>
        <Link href="/favorites">お気に入り</Link>
      </nav>
    </header>
  );
}
