import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "store_name")
    .single();

  const storeName = (data?.value as string) || "관리자";

  return {
    title: `${storeName} 관리자`,
  };
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-auto bg-warm-gray-50 p-6">
        {children}
      </main>
    </div>
  );
}
