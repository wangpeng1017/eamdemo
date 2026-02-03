import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EAM系统 - 企业资产管理",
  description: "企业资产管理系统Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
