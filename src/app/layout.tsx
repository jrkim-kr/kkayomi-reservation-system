import type { Metadata } from "next";
import { Toaster } from "sonner";
import { createServiceClient } from "@/lib/supabase/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["store_name", "store_description"]);

  const storeName =
    (data?.find((s: { key: string; value: unknown }) => s.key === "store_name")?.value as string) || "예약 시스템";
  const storeDescription =
    (data?.find((s: { key: string; value: unknown }) => s.key === "store_description")?.value as string) || "예약";

  return {
    title: {
      default: `${storeName} | ${storeDescription}`,
      template: `%s | ${storeName}`,
    },
    description: `${storeName} ${storeDescription}`,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
