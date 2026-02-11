import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "까요미 공방 | 클래스 예약",
  description: "까요미 공방 클래스 예약 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
