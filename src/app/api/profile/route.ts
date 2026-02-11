import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, phone, depositor_name, is_admin")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

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
  const { display_name, phone, depositor_name } = body;

  const updateData: Record<string, string> = {};
  if (display_name !== undefined) updateData.display_name = display_name.trim();
  if (phone !== undefined) updateData.phone = phone.trim();
  if (depositor_name !== undefined)
    updateData.depositor_name = depositor_name.trim();

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "변경할 내용이 없습니다." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select("id, email, display_name, phone, depositor_name, is_admin")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "프로필 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
