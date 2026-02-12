import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  // 내 예약 목록 (최신순) — reservation_details 뷰 + reservations 테이블에서 num_people 보완
  const { data: reservations, error } = await supabase
    .from("reservation_details")
    .select(
      "id, class_id, class_name, desired_date, desired_time, customer_name, customer_phone, depositor_name, customer_memo, status, reject_reason, cancel_reason, price, duration_minutes, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "예약 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  // 각 예약별 미처리 변경 요청 여부 + num_people 보완
  const reservationIds = (reservations ?? []).map((r) => r.id);

  let pendingChangeMap: Record<string, boolean> = {};
  let numPeopleMap: Record<string, number> = {};
  let scheduleIdMap: Record<string, string | null> = {};
  let latestChangeMap: Record<
    string,
    {
      status: string;
      original_date: string | null;
      original_time: string | null;
      requested_date: string;
      requested_time: string;
      reject_reason: string | null;
      processed_at: string;
    }
  > = {};

  if (reservationIds.length > 0) {
    const [
      { data: pendingChanges },
      { data: numPeopleRows },
      { data: processedChanges },
    ] = await Promise.all([
      supabase
        .from("change_requests")
        .select("reservation_id")
        .in("reservation_id", reservationIds)
        .eq("status", "pending"),
      supabase
        .from("reservations")
        .select("id, num_people, schedule_id")
        .in("id", reservationIds),
      supabase
        .from("change_requests")
        .select(
          "reservation_id, status, original_date, original_time, requested_date, requested_time, reject_reason, processed_at"
        )
        .in("reservation_id", reservationIds)
        .neq("status", "pending")
        .order("processed_at", { ascending: false }),
    ]);

    if (pendingChanges) {
      const pendingSet = new Set(pendingChanges.map((c) => c.reservation_id));
      pendingChangeMap = Object.fromEntries(
        reservationIds.map((id) => [id, pendingSet.has(id)])
      );
    }

    if (numPeopleRows) {
      numPeopleMap = Object.fromEntries(
        numPeopleRows.map(
          (row: { id: string; num_people: number; schedule_id: string | null }) => [
            row.id,
            row.num_people,
          ]
        )
      );
      scheduleIdMap = Object.fromEntries(
        numPeopleRows.map(
          (row: { id: string; num_people: number; schedule_id: string | null }) => [
            row.id,
            row.schedule_id,
          ]
        )
      );
    }

    if (processedChanges) {
      for (const c of processedChanges) {
        // 예약별 가장 최근 처리된 변경 요청만 저장 (이미 processed_at DESC 정렬)
        if (!latestChangeMap[c.reservation_id]) {
          latestChangeMap[c.reservation_id] = {
            status: c.status,
            original_date: c.original_date,
            original_time: c.original_time,
            requested_date: c.requested_date,
            requested_time: c.requested_time,
            reject_reason: c.reject_reason,
            processed_at: c.processed_at,
          };
        }
      }
    }
  }

  const result = (reservations ?? []).map((r) => ({
    ...r,
    num_people: numPeopleMap[r.id] ?? 1,
    schedule_id: scheduleIdMap[r.id] ?? null,
    has_pending_change: pendingChangeMap[r.id] ?? false,
    latest_change: latestChangeMap[r.id] ?? null,
  }));

  return NextResponse.json(result);
}
