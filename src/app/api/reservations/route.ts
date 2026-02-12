import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications/send";

export async function POST(request: NextRequest) {
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

  const body = await request.json();

  const {
    class_id,
    schedule_id,
    customer_name,
    customer_phone,
    depositor_name,
    desired_date,
    desired_time,
    num_people = 1,
    customer_memo,
  } = body;

  // 필수 필드 검증
  if (
    !class_id ||
    !schedule_id ||
    !customer_name ||
    !customer_phone ||
    !depositor_name ||
    !desired_date ||
    !desired_time
  ) {
    return NextResponse.json(
      { error: "필수 항목을 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  const safeNumPeople = Math.max(1, Math.floor(Number(num_people) || 1));

  // 스케줄 슬롯 정원 초과 체크 (요청 인원 포함)
  const { data: capacityCheck, error: capacityError } = await supabase.rpc(
    "check_schedule_capacity",
    {
      p_schedule_id: schedule_id,
      p_num_people: safeNumPeople,
    }
  );

  if (capacityError) {
    return NextResponse.json(
      { error: "정원 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  if (!capacityCheck) {
    return NextResponse.json(
      { error: "해당 시간대의 잔여석이 부족합니다." },
      { status: 409 }
    );
  }

  // 예약 생성
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      user_id: user.id,
      class_id,
      schedule_id,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      depositor_name: depositor_name.trim(),
      desired_date,
      desired_time,
      customer_memo: customer_memo?.trim() || null,
      num_people: safeNumPeople,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "예약 신청 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  // 프로필 정보 자동 저장 (최초 예약 시)
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, phone, depositor_name")
    .eq("id", user.id)
    .single();

  if (profile && (!profile.display_name || !profile.phone)) {
    await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name || customer_name.trim(),
        phone: profile.phone || customer_phone.trim(),
        depositor_name: profile.depositor_name || depositor_name.trim(),
      })
      .eq("id", user.id);
  }

  // 입금 안내 알림 발송 (실패해도 예약 생성은 유지)
  try {
    const { data: classInfo } = await supabase
      .from("classes")
      .select("name, price")
      .eq("id", class_id)
      .single();

    const serviceClient = await createServiceClient();
    const { data: settings } = await serviceClient
      .from("admin_settings")
      .select("key, value")
      .in("key", ["bank_info", "deposit_deadline_hours", "notification_sender_name"]);

    const settingsMap = Object.fromEntries(
      (settings ?? []).map((s: { key: string; value: unknown }) => [s.key, s.value])
    );

    await sendNotification({
      reservationId: data.id,
      type: "approval",
      recipientPhone: customer_phone.trim(),
      customerName: customer_name.trim(),
      className: classInfo?.name ?? "",
      date: desired_date,
      time: desired_time,
      price: classInfo?.price ?? 0,
      bankInfo: settingsMap.bank_info as string | null,
      depositDeadlineHours: settingsMap.deposit_deadline_hours as number | null,
      storeName: settingsMap.notification_sender_name as string | undefined,
    });
  } catch {
    // 알림 발송 실패는 무시 — 예약 자체는 정상 생성됨
  }

  return NextResponse.json(data, { status: 201 });
}
