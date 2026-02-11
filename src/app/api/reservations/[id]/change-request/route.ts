import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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
  const { schedule_id, requested_date, requested_time, reason } = body;

  if (!requested_date || !requested_time) {
    return NextResponse.json(
      { error: "변경 희망 날짜와 시간을 입력해 주세요." },
      { status: 400 }
    );
  }

  // 예약 조회 + 본인 예약 확인
  const { data: reservation, error: findError } = await supabase
    .from("reservations")
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  if (findError || !reservation) {
    return NextResponse.json(
      { error: "예약을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (reservation.user_id !== user.id) {
    return NextResponse.json(
      { error: "본인의 예약만 변경 요청할 수 있습니다." },
      { status: 403 }
    );
  }

  if (reservation.status !== "confirmed") {
    return NextResponse.json(
      { error: "확정된 예약만 변경 요청이 가능합니다." },
      { status: 400 }
    );
  }

  // 미처리 변경 요청 중복 체크
  const { count } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("reservation_id", id)
    .eq("status", "pending");

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "이미 처리 대기 중인 변경 요청이 있습니다." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("change_requests")
    .insert({
      reservation_id: id,
      schedule_id: schedule_id || null,
      requested_date,
      requested_time,
      reason: reason || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "변경 요청 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
