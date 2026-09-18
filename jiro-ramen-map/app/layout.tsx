import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "二郎系ラーメンマップ",
  description: "口コミ数と評価から算出したおすすめ順で二郎系ラーメン店を探せるマップアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
