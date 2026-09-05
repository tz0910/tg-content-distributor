import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TG 自动发布中心",
  description: "网站文章自动采集并发布 Telegram 频道平台"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
