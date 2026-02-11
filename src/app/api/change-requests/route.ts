import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: 토큰으로 예약 정보 조회
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();

  // 토큰으로 예약 조회
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("id, desired_date, desired_time, customer_name, status, class_id, schedule_id")
    .eq("change_token", token)
    .single();

  if (error || !reservation) {
    return NextResponse.json(
      { error: "예약을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 수업 정보 조회
  const { data: classInfo } = await supabase
    .from("classes")
    .select("name")
    .eq("id", reservation.class_id)
    .single();

  // 미처리 변경 요청 확인
  const { count } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("reservation_id", reservation.id)
    .eq("status", "pending");

  return NextResponse.json({
    id: reservation.id,
    class_id: reservation.class_id,
    class_name: classInfo?.name ?? "",
    desired_date: reservation.desired_date,
    desired_time: reservation.desired_time,
    customer_name: reservation.customer_name,
    status: reservation.status,
    has_pending_request: (count ?? 0) > 0,
  });
}

// POST: 변경 요청 생성
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, schedule_id, requested_date, requested_time, reason } = body;

  if (!token || !requested_date || !requested_time) {
    return NextResponse.json(
      { error: "필수 항목을 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // 토큰으로 예약 조회
  const { data: reservation, error: findError } = await supabase
    .from("reservations")
    .select("id, status")
    .eq("change_token", token)
    .single();

  if (findError || !reservation) {
    return NextResponse.json(
      { error: "예약을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // confirmed 상태만 변경 가능
  if (reservation.status !== "confirmed") {
    return NextResponse.json(
      { error: "확정된 예약만 변경 요청이 가능합니다." },
      { status: 400 }
    );
  }

  // 미처리 요청 중복 체크
  const { count } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("reservation_id", reservation.id)
    .eq("status", "pending");

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "이미 처리 대기 중인 변경 요청이 있습니다." },
      { status: 409 }
    );
  }

  // 변경 요청 생성
  const { data, error } = await supabase
    .from("change_requests")
    .insert({
      reservation_id: reservation.id,
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
