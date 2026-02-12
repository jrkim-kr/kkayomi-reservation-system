import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: 토큰으로 예약 정보 조회 (비로그인 접근 가능 — service client 사용)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // 토큰으로 예약 조회
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("id, desired_date, desired_time, customer_name, status, class_id, schedule_id, num_people")
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
    schedule_id: reservation.schedule_id,
    class_name: classInfo?.name ?? "",
    desired_date: reservation.desired_date,
    desired_time: reservation.desired_time,
    customer_name: reservation.customer_name,
    num_people: reservation.num_people,
    status: reservation.status,
    has_pending_request: (count ?? 0) > 0,
  });
}

// POST: 변경 요청 생성 (토큰 기반 — 비로그인 접근 가능)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, schedule_id, requested_date, requested_time, reason } = body;

  if (!token || !requested_date || !requested_time) {
    return NextResponse.json(
      { error: "필수 항목을 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // 토큰으로 예약 조회
  const { data: reservation, error: findError } = await supabase
    .from("reservations")
    .select("id, status, desired_date, desired_time, num_people")
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

  // 동일 일시 변경 방지
  if (
    requested_date === reservation.desired_date &&
    requested_time === reservation.desired_time
  ) {
    return NextResponse.json(
      { error: "현재 예약과 동일한 일시로는 변경 요청할 수 없습니다." },
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

  // 변경 대상 스케줄 잔여석 검증
  if (schedule_id) {
    const { data: hasCapacity } = await supabase.rpc("check_schedule_capacity", {
      p_schedule_id: schedule_id,
      p_num_people: reservation.num_people,
    });

    if (hasCapacity === false) {
      return NextResponse.json(
        { error: `변경 희망 시간의 잔여석이 예약 인원(${reservation.num_people}명)보다 부족합니다.` },
        { status: 400 }
      );
    }
  }

  // 변경 요청 생성
  const { data, error } = await supabase
    .from("change_requests")
    .insert({
      reservation_id: reservation.id,
      original_date: reservation.desired_date,
      original_time: reservation.desired_time,
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
