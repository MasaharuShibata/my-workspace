import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "二郎系ラーメンマップ",
  description: "口コミ数と評価から算出したおすすめ順で二郎系ラーメン店を探せるマップアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
