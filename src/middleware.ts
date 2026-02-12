import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_COOKIE_NAME = "sb-admin-auth-token";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      ...(isAdminRoute ? { cookieOptions: { name: ADMIN_COOKIE_NAME } } : {}),
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 어드민 페이지 접근 시 인증 확인
  if (
    !user &&
    isAdminRoute &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/auth/callback")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // 토큰 기반 변경 요청 페이지는 인증 제외
  if (pathname.startsWith("/booking/change/")) {
    return supabaseResponse;
  }

  // 예약 페이지, 마이페이지 접근 시 인증 확인
  if (
    !user &&
    (pathname.startsWith("/booking") || pathname.startsWith("/mypage"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/booking/:path*", "/mypage/:path*"],
};
