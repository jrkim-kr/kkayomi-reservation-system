import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_schedule_availability", {
    p_class_id: id,
    p_from_date: new Date().toISOString().split("T")[0],
  });

  if (error) {
    return NextResponse.json(
      { error: "스케줄 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
