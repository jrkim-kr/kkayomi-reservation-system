import AdminSidebar from "@/components/admin/AdminSidebar";

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
