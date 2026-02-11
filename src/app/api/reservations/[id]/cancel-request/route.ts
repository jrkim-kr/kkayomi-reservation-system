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
  const { cancel_reason } = body;

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
      { error: "본인의 예약만 취소 요청할 수 있습니다." },
      { status: 403 }
    );
  }

  if (!["pending", "confirmed"].includes(reservation.status)) {
    return NextResponse.json(
      { error: "대기 또는 확정 상태의 예약만 취소 요청이 가능합니다." },
      { status: 400 }
    );
  }

  // pending 상태: 바로 cancelled 처리
  if (reservation.status === "pending") {
    const { data, error } = await supabase
      .from("reservations")
      .update({
        status: "cancelled",
        cancel_reason: cancel_reason || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "취소 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  }

  // confirmed 상태: cancel_reason만 저장 (관리자가 최종 처리)
  // 빈 문자열이라도 저장하여 취소 요청 여부를 감지할 수 있도록 함
  // 이전 취소 반려 사유(reject_reason)가 있으면 클리어
  const { data, error } = await supabase
    .from("reservations")
    .update({
      cancel_reason: cancel_reason || "",
      reject_reason: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "취소 요청 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...data,
    message:
      reservation.status === "confirmed"
        ? "취소 요청이 접수되었습니다. 관리자 확인 후 처리됩니다."
        : "예약이 취소되었습니다.",
  });
}
