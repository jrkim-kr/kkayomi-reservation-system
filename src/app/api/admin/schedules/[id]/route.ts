import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.max_participants !== undefined)
    updateData.max_participants = body.max_participants;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "변경할 내용이 없습니다." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("class_schedules")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "스케줄 수정 중 오류가 발생했습니다." },
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

  // 예약 존재 여부 확인
  const { count } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("schedule_id", id)
    .in("status", ["pending", "approved", "confirmed"]);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `이 슬롯에 ${count}건의 유효 예약이 있어 삭제할 수 없습니다. 비활성 처리를 이용해 주세요.`,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("class_schedules")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "스케줄 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
