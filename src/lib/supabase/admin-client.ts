import { createBrowserClient } from "@supabase/ssr";

const ADMIN_COOKIE_NAME = "sb-admin-auth-token";

let adminClient: ReturnType<typeof createBrowserClient> | null = null;

export function createAdminBrowserClient() {
  if (!adminClient) {
    adminClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        isSingleton: false,
        cookieOptions: {
          name: ADMIN_COOKIE_NAME,
        },
      }
    );
  }
  return adminClient;
}
