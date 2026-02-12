import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createAdminClient();

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
    .from("classes")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "수업 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createAdminClient();

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
  const { name, description, duration_minutes, price, max_participants, is_active, sort_order } = body;

  // 필수 필드 검증
  if (!name || !duration_minutes || price === undefined || !max_participants) {
    return NextResponse.json(
      { error: "필수 항목을 모두 입력해 주세요. (수업명, 소요시간, 가격, 최대 인원)" },
      { status: 400 }
    );
  }

  if (duration_minutes <= 0 || price < 0 || max_participants <= 0) {
    return NextResponse.json(
      { error: "소요시간, 가격, 최대 인원은 유효한 값이어야 합니다." },
      { status: 400 }
    );
  }

  const insertData: Record<string, unknown> = {
    name,
    duration_minutes,
    price,
    max_participants,
  };

  if (description !== undefined) insertData.description = description;
  if (is_active !== undefined) insertData.is_active = is_active;
  if (sort_order !== undefined) insertData.sort_order = sort_order;

  const { data, error } = await supabase
    .from("classes")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("수업 등록 오류:", error);
    return NextResponse.json(
      { error: `수업 등록 중 오류가 발생했습니다: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
