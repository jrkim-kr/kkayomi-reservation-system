import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reservation_details")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "예약 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  // reservation_details 뷰에 num_people이 아직 없을 수 있으므로 reservations 테이블에서 보완
  const ids = (data ?? []).map((r: { id: string }) => r.id);
  let numPeopleMap: Record<string, number> = {};

  if (ids.length > 0) {
    const { data: numPeopleRows } = await supabase
      .from("reservations")
      .select("id, num_people")
      .in("id", ids);

    if (numPeopleRows) {
      numPeopleMap = Object.fromEntries(
        numPeopleRows.map((row: { id: string; num_people: number }) => [
          row.id,
          row.num_people,
        ])
      );
    }
  }

  const result = (data ?? []).map((r: { id: string }) => ({
    ...r,
    num_people: numPeopleMap[r.id] ?? 1,
  }));

  return NextResponse.json(result);
}
