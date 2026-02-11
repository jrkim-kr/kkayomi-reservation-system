import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const body = await request.json();
  const { name, description, duration_minutes, price, max_participants, is_active, sort_order } = body;

  // 수업 존재 여부 확인
  const { data: existing, error: findError } = await supabase
    .from("classes")
    .select("id")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    return NextResponse.json(
      { error: "수업을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 업데이트할 필드 구성
  const updateData: Record<string, unknown> = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (duration_minutes !== undefined) {
    if (duration_minutes <= 0) {
      return NextResponse.json(
        { error: "소요시간은 0보다 커야 합니다." },
        { status: 400 }
      );
    }
    updateData.duration_minutes = duration_minutes;
  }
  if (price !== undefined) {
    if (price < 0) {
      return NextResponse.json(
        { error: "가격은 0 이상이어야 합니다." },
        { status: 400 }
      );
    }
    updateData.price = price;
  }
  if (max_participants !== undefined) {
    if (max_participants <= 0) {
      return NextResponse.json(
        { error: "최대 인원은 0보다 커야 합니다." },
        { status: 400 }
      );
    }
    updateData.max_participants = max_participants;
  }
  if (is_active !== undefined) updateData.is_active = is_active;
  if (sort_order !== undefined) updateData.sort_order = sort_order;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "변경할 내용이 없습니다." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("classes")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "수업 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  // 수업 존재 여부 확인
  const { data: existing, error: findError } = await supabase
    .from("classes")
    .select("id")
    .eq("id", id)
    .single();

  if (findError || !existing) {
    return NextResponse.json(
      { error: "수업을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 예약에서 참조 중인지 확인
  const { count, error: countError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("class_id", id);

  if (countError) {
    return NextResponse.json(
      { error: "예약 참조 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  if (count && count > 0) {
    return NextResponse.json(
      { error: `이 수업에 연결된 예약이 ${count}건 있어 삭제할 수 없습니다. 비활성화를 이용해 주세요.` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "수업 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "수업이 삭제되었습니다." });
}
