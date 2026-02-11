import { createClient } from "@/lib/supabase/server";
import { resendNotification } from "@/lib/notifications/send";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/notifications/resend
 * 실패한 알림 재발송 API (관리자 전용)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { notificationId } = body as { notificationId: string };

  if (!notificationId) {
    return NextResponse.json(
      { error: "notificationId는 필수입니다." },
      { status: 400 }
    );
  }

  const result = await resendNotification(notificationId);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "재발송에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
