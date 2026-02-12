import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET  – 전체 설정 조회
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("admin_settings")
    .select("*")
    .order("key");

  if (error) {
    return NextResponse.json(
      { error: "설정을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// PATCH – 설정 일괄 업데이트 (upsert)
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();

    // body: { settings: Array<{ key: string; value: unknown }> }
    const settings: { key: string; value: unknown }[] = body.settings;

    if (!Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json(
        { error: "변경할 설정이 없습니다." },
        { status: 400 }
      );
    }

    // 허용된 키 목록
    const ALLOWED_KEYS = [
      "store_name",
      "store_description",
      "booking_button_label",
      "booking_page_title",
      "booking_step1_label",
      "notification_sender_name",
      "calendar_event_prefix",
      "bank_info",
      "deposit_deadline_hours",
      "workshop_address",
      "instagram_handle",
      "kakao_channel_id",
      "sms_sender_number",
      "kakao_enabled",
      "google_calendar_id",
      "aligo_api_key",
      "aligo_user_id",
      "aligo_sender_key",
    ];

    const invalidKeys = settings
      .map((s) => s.key)
      .filter((k) => !ALLOWED_KEYS.includes(k));

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `허용되지 않는 설정 키: ${invalidKeys.join(", ")}` },
        { status: 400 }
      );
    }

    // 관리자 권한 확인 (service role로 RLS 우회)
    const serviceClient = await createServiceClient();

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const { data, error } = await serviceClient
      .from("admin_settings")
      .upsert(
        settings.map((s) => ({
          key: s.key,
          value: s.value,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "key" }
      )
      .select();

    if (error) {
      console.error("[PATCH /api/admin/settings] Supabase error:", error);
      return NextResponse.json(
        { error: `설정 저장 중 오류가 발생했습니다: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[PATCH /api/admin/settings] Unexpected error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
