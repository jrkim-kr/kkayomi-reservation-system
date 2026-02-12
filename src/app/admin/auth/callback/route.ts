import { createAdminClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createAdminClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const serviceClient = await createServiceClient();
        const { data: profile } = await serviceClient
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (profile?.is_admin) {
          return NextResponse.redirect(`${origin}/admin`);
        }
      }

      // 관리자 권한이 없으면 세션 제거 후 로그인 페이지로
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/admin/login?error=not_admin`);
    }

    console.error("[admin/auth/callback] exchangeCodeForSession error:", error.message);
  } else {
    console.error("[admin/auth/callback] No code parameter in URL.");
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth_failed`);
}
