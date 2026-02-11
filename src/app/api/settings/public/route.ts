import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// 공개 설정 조회 (인증 불필요)
const PUBLIC_KEYS = ["bank_info", "deposit_deadline_hours", "workshop_address", "instagram_handle", "kakao_channel_id"];

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", PUBLIC_KEYS);

  if (error) {
    return NextResponse.json(
      { error: "설정을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  const settings: Record<string, unknown> = {};
  for (const item of data ?? []) {
    settings[item.key] = item.value;
  }

  return NextResponse.json(settings);
}
