import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "家計簿",
  description:
    "収入と支出を記録して、月ごとの収支とカテゴリ別の内訳をひと目で確認できる家計簿アプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSans.variable}>
      <body>{children}</body>
    </html>
  );
}
