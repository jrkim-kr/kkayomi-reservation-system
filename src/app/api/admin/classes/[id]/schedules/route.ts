import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createAdminClient();

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
  const year = request.nextUrl.searchParams.get("year");
  const month = request.nextUrl.searchParams.get("month");

  let query = supabase
    .from("class_schedules")
    .select("*")
    .eq("class_id", id)
    .order("schedule_date")
    .order("start_time");

  if (year && month) {
    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    const nextMonth = Number(month) === 12 ? 1 : Number(month) + 1;
    const nextYear = Number(month) === 12 ? Number(year) + 1 : Number(year);
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    query = query.gte("schedule_date", startDate).lt("schedule_date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "스케줄 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  // 각 슬롯의 예약 건수 조회
  const scheduleIds = (data ?? []).map((s: { id: string }) => s.id);
  let reservationCounts: Record<string, number> = {};

  if (scheduleIds.length > 0) {
    const { data: reservations } = await supabase
      .from("reservations")
      .select("schedule_id")
      .in("schedule_id", scheduleIds)
      .in("status", ["pending", "approved", "confirmed"]);

    reservationCounts = (reservations ?? []).reduce(
      (acc: Record<string, number>, r: { schedule_id: string }) => {
        acc[r.schedule_id] = (acc[r.schedule_id] || 0) + 1;
        return acc;
      },
      {}
    );
  }

  const result = (data ?? []).map((s: { id: string }) => ({
    ...s,
    reservation_count: reservationCounts[s.id] || 0,
  }));

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createAdminClient();

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
  const { schedules } = body;

  if (!Array.isArray(schedules) || schedules.length === 0) {
    return NextResponse.json(
      { error: "등록할 스케줄이 없습니다." },
      { status: 400 }
    );
  }

  const rows = schedules.map(
    (s: {
      schedule_date: string;
      start_time: string;
      max_participants?: number;
    }) => ({
      class_id: id,
      schedule_date: s.schedule_date,
      start_time: s.start_time,
      max_participants: s.max_participants ?? null,
    })
  );

  const { data, error } = await supabase
    .from("class_schedules")
    .insert(rows)
    .select();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "이미 등록된 스케줄이 포함되어 있습니다." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "스케줄 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
