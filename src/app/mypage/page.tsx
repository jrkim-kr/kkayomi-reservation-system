"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input, Badge } from "@/components/ui";
import {
  formatDate,
  formatTime,
  formatPrice,
  formatPhone,
  STATUS_LABELS,
} from "@/lib/utils";
import type { ScheduleSlot } from "@/types";

type Tab = "reservations" | "profile";

export default function MyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-warm-gray-400">불러오는 중...</p>
        </div>
      }
    >
      <MyPageContent />
    </Suspense>
  );
}

interface MyReservation {
  id: string;
  class_id: string;
  class_name: string;
  desired_date: string;
  desired_time: string;
  customer_name: string;
  customer_phone: string;
  depositor_name: string;
  num_people: number;
  customer_memo: string | null;
  status: string;
  reject_reason: string | null;
  cancel_reason: string | null;
  price: number;
  duration_minutes: number;
  created_at: string;
  has_pending_change: boolean;
}

interface ProfileData {
  email: string | null;
  display_name: string | null;
  phone: string | null;
  depositor_name: string | null;
}

interface BankInfo {
  bank: string;
  account_number: string;
  account_holder: string;
}

function MyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("reservations");

  // 예약 목록
  const [reservations, setReservations] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 입금 안내
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [depositDeadlineHours, setDepositDeadlineHours] = useState(72);

  // 프로필
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    display_name: "",
    phone: "",
    depositor_name: "",
  });
  const [profileMessage, setProfileMessage] = useState("");

  // 변경 요청 모달
  const [changeModal, setChangeModal] = useState<MyReservation | null>(null);
  const [changeSchedules, setChangeSchedules] = useState<ScheduleSlot[]>([]);
  const [changeSchedulesLoading, setChangeSchedulesLoading] = useState(false);
  const [changeDate, setChangeDate] = useState("");
  const [changeTime, setChangeTime] = useState("");
  const [changeScheduleId, setChangeScheduleId] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [changeSubmitting, setChangeSubmitting] = useState(false);
  const [changeError, setChangeError] = useState("");

  // 변경 요청 캘린더 상태
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  // 취소 요청 모달
  const [cancelModal, setCancelModal] = useState<MyReservation | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // 토스트
  const [toast, setToast] = useState("");

  const loadReservations = useCallback(async () => {
    try {
      const res = await fetch("/api/mypage/reservations");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReservations(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // 설정 로드 (입금 계좌)
  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.bank_info) setBankInfo(data.bank_info);
        if (data.deposit_deadline_hours)
          setDepositDeadlineHours(Number(data.deposit_deadline_hours));
      })
      .catch(() => {});
  }, []);

  // toast 파라미터 처리
  useEffect(() => {
    const toastParam = searchParams.get("toast");
    if (toastParam === "reservation_created") {
      setToast("예약이 신청되었습니다! 입금 안내를 확인해 주세요.");
      // URL에서 toast 파라미터 제거
      window.history.replaceState({}, "", "/mypage");
    }
  }, [searchParams]);

  // 토스트 자동 숨김
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // 프로필 로드
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data);
      setProfileForm({
        display_name: data.display_name || "",
        phone: data.phone || "",
        depositor_name: data.depositor_name || "",
      });
    } catch {
      // ignore
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "profile" && !profile) {
      loadProfile();
    }
  }, [tab, profile, loadProfile]);

  // 변경 요청 모달: 스케줄 로드
  useEffect(() => {
    if (!changeModal) return;
    setChangeSchedulesLoading(true);
    setChangeDate("");
    setChangeTime("");
    setChangeScheduleId("");
    setChangeReason("");
    setChangeError("");

    fetch(`/api/classes/${changeModal.class_id}/schedules`)
      .then((res) => res.json())
      .then((data) => {
        setChangeSchedules(data);
        setChangeSchedulesLoading(false);
      })
      .catch(() => {
        setChangeSchedules([]);
        setChangeSchedulesLoading(false);
      });
  }, [changeModal]);

  const changeDates = useMemo(() => {
    const dates = new Set(changeSchedules.map((s) => s.schedule_date));
    return Array.from(dates).sort();
  }, [changeSchedules]);

  const changeDateSet = useMemo(
    () => new Set(changeDates),
    [changeDates]
  );

  const changeTimeSlots = useMemo(() => {
    if (!changeDate) return [];
    return changeSchedules.filter((s) => s.schedule_date === changeDate);
  }, [changeSchedules, changeDate]);

  // 첫 번째 가능 날짜로 캘린더 이동
  useEffect(() => {
    if (changeDates.length > 0) {
      const d = new Date(changeDates[0] + "T00:00:00");
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth() + 1);
    }
  }, [changeDates]);

  // 캘린더 날짜 계산
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [calYear, calMonth]);

  // 변경 요청 제출
  const handleChangeSubmit = async () => {
    if (!changeModal || !changeDate || !changeTime) return;
    setChangeSubmitting(true);
    setChangeError("");

    try {
      const res = await fetch(
        `/api/reservations/${changeModal.id}/change-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schedule_id: changeScheduleId || null,
            requested_date: changeDate,
            requested_time: changeTime,
            reason: changeReason.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setChangeError(data.error || "변경 요청에 실패했습니다.");
        setChangeSubmitting(false);
        return;
      }

      setChangeModal(null);
      setChangeSubmitting(false);
      setToast("일정 변경 요청이 접수되었습니다.");
      loadReservations();
    } catch {
      setChangeError("네트워크 오류가 발생했습니다.");
      setChangeSubmitting(false);
    }
  };

  // 취소 요청 제출
  const handleCancelSubmit = async () => {
    if (!cancelModal) return;
    setCancelSubmitting(true);
    setCancelError("");

    try {
      const res = await fetch(
        `/api/reservations/${cancelModal.id}/cancel-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cancel_reason: cancelReason.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setCancelError(data.error || "취소 요청에 실패했습니다.");
        setCancelSubmitting(false);
        return;
      }

      setCancelModal(null);
      setCancelSubmitting(false);
      setToast(
        cancelModal.status === "pending"
          ? "예약이 취소되었습니다."
          : "취소 요청이 접수되었습니다. 관리자 확인 후 처리됩니다."
      );
      loadReservations();
    } catch {
      setCancelError("네트워크 오류가 발생했습니다.");
      setCancelSubmitting(false);
    }
  };

  // 프로필 저장
  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMessage("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: profileForm.display_name.trim() || null,
          phone: profileForm.phone.trim() || null,
          depositor_name: profileForm.depositor_name.trim() || null,
        }),
      });

      if (!res.ok) {
        setProfileMessage("저장에 실패했습니다.");
        setProfileSaving(false);
        return;
      }

      const data = await res.json();
      setProfile(data);
      setProfileMessage("저장되었습니다.");
      setProfileSaving(false);
    } catch {
      setProfileMessage("네트워크 오류가 발생했습니다.");
      setProfileSaving(false);
    }
  };

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      {/* 토스트 */}
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center text-sm text-warm-gray-400 hover:text-warm-gray-600"
        >
          <svg className="mr-0.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          홈
        </Link>
        <h1 className="text-xl font-bold text-warm-gray-800">
          마이페이지
        </h1>
        <button
          type="button"
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/login");
            router.refresh();
          }}
          className="text-sm text-warm-gray-400 hover:text-warm-gray-600"
        >
          로그아웃
        </button>
      </div>

      {/* 탭 */}
      <div className="mb-6 flex rounded-lg border border-warm-gray-200 p-1">
        <button
          type="button"
          onClick={() => setTab("reservations")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            tab === "reservations"
              ? "bg-primary-500 text-white"
              : "text-warm-gray-500 hover:text-warm-gray-700"
          }`}
        >
          예약 현황
        </button>
        <button
          type="button"
          onClick={() => setTab("profile")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            tab === "profile"
              ? "bg-primary-500 text-white"
              : "text-warm-gray-500 hover:text-warm-gray-700"
          }`}
        >
          프로필 수정
        </button>
      </div>

      {/* 예약 현황 탭 */}
      {tab === "reservations" && (
        <div className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-warm-gray-400">
              불러오는 중...
            </p>
          ) : reservations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-warm-gray-400">
                아직 예약 내역이 없습니다.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => (window.location.href = "/booking")}
              >
                클래스 예약하기
              </Button>
            </div>
          ) : (
            reservations.map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <Card key={r.id} className="overflow-hidden !p-0">
                  {/* 요약 */}
                  <button
                    type="button"
                    className="w-full p-4 text-left"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : r.id)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              r.status as
                                | "pending"
                                | "confirmed"
                                | "rejected"
                                | "cancelled"
                            }
                          >
                            {STATUS_LABELS[r.status] || r.status}
                          </Badge>
                          {r.status === "confirmed" &&
                            r.cancel_reason != null && (
                              <span className="text-xs font-medium text-error">
                                취소 요청 중
                              </span>
                            )}
                          {r.status === "confirmed" &&
                            r.cancel_reason == null &&
                            r.reject_reason != null && (
                              <span className="text-xs font-medium text-orange-500">
                                취소 반려됨
                              </span>
                            )}
                          {r.has_pending_change && (
                            <span className="text-xs text-warning">
                              변경 요청 처리 중
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 font-medium text-warm-gray-800">
                          {r.class_name}
                        </h3>
                        <p className="mt-0.5 text-sm text-warm-gray-500">
                          {formatDate(r.desired_date)}{" "}
                          {formatTime(r.desired_time)}
                          <span className="ml-1.5 text-warm-gray-400">
                            · {r.num_people ?? 1}명
                          </span>
                        </p>
                      </div>
                      <svg
                        className={`mt-1 h-5 w-5 flex-shrink-0 text-warm-gray-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* 상세 */}
                  {isExpanded && (
                    <div className="border-t border-warm-gray-100 bg-warm-gray-50/50 px-4 pb-4 pt-3">
                      <dl className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-warm-gray-400">인원</dt>
                          <dd className="text-warm-gray-700">
                            {r.num_people ?? 1}명
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-warm-gray-400">가격</dt>
                          <dd className="text-warm-gray-700">
                            {formatPrice(r.price * (r.num_people ?? 1))}
                            {(r.num_people ?? 1) > 1 && (
                              <span className="ml-1 text-xs text-warm-gray-400">
                                ({formatPrice(r.price)} × {r.num_people})
                              </span>
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-warm-gray-400">소요시간</dt>
                          <dd className="text-warm-gray-700">
                            약 {r.duration_minutes}분
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-warm-gray-400">예약자</dt>
                          <dd className="text-warm-gray-700">
                            {r.customer_name}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-warm-gray-400">연락처</dt>
                          <dd className="text-warm-gray-700">
                            {r.customer_phone}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-warm-gray-400">입금자명</dt>
                          <dd className="text-warm-gray-700">
                            {r.depositor_name}
                          </dd>
                        </div>
                        {r.customer_memo && (
                          <div className="flex justify-between">
                            <dt className="text-warm-gray-400">요청사항</dt>
                            <dd className="text-warm-gray-700">
                              {r.customer_memo}
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-warm-gray-400">신청일</dt>
                          <dd className="text-warm-gray-700">
                            {new Date(r.created_at).toLocaleDateString("ko-KR")}
                          </dd>
                        </div>
                      </dl>

                      {/* pending 상태: 입금 안내 */}
                      {r.status === "pending" && bankInfo && (
                        <div className="mt-3 rounded-lg bg-blue-50 p-3">
                          <p className="text-xs font-semibold text-blue-800">
                            입금 안내
                          </p>
                          <p className="mt-1 text-sm text-blue-700">
                            {bankInfo.bank} {bankInfo.account_number} ({bankInfo.account_holder}
                            )
                          </p>
                          <p className="mt-0.5 text-xs text-blue-600">
                            신청 후 {depositDeadlineHours}시간 이내 입금해 주세요.
                          </p>
                        </div>
                      )}

                      {/* rejected 상태: 반려 사유 */}
                      {r.status === "rejected" && r.reject_reason && (
                        <div className="mt-3 rounded-lg bg-red-50 p-3">
                          <p className="text-xs font-semibold text-red-800">
                            반려 사유
                          </p>
                          <p className="mt-1 text-sm text-red-700">
                            {r.reject_reason}
                          </p>
                        </div>
                      )}

                      {/* confirmed 상태: 취소 반려 사유 */}
                      {r.status === "confirmed" &&
                        r.cancel_reason == null &&
                        r.reject_reason && (
                          <div className="mt-3 rounded-lg bg-orange-50 p-3">
                            <p className="text-xs font-semibold text-orange-700">
                              취소 반려 사유
                            </p>
                            <p className="mt-1 text-sm text-orange-600">
                              {r.reject_reason}
                            </p>
                          </div>
                        )}

                      {/* cancelled 상태: 취소 사유 */}
                      {r.status === "cancelled" && r.cancel_reason && (
                        <div className="mt-3 rounded-lg bg-warm-gray-100 p-3">
                          <p className="text-xs font-semibold text-warm-gray-600">
                            취소 사유
                          </p>
                          <p className="mt-1 text-sm text-warm-gray-500">
                            {r.cancel_reason}
                          </p>
                        </div>
                      )}

                      {/* 액션 버튼 */}
                      <div className="mt-3 flex gap-2">
                        {r.status === "confirmed" &&
                          !r.has_pending_change && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setChangeModal(r)}
                            >
                              일정 변경 요청
                            </Button>
                          )}
                        {r.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error"
                            onClick={() => {
                              setCancelReason("");
                              setCancelError("");
                              setCancelModal(r);
                            }}
                          >
                            예약 취소
                          </Button>
                        )}
                        {r.status === "confirmed" &&
                          r.cancel_reason == null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-error"
                              onClick={() => {
                                setCancelReason("");
                                setCancelError("");
                                setCancelModal(r);
                              }}
                            >
                              취소 요청
                            </Button>
                          )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 프로필 수정 탭 */}
      {tab === "profile" && (
        <div className="space-y-4">
          {profileLoading ? (
            <p className="py-8 text-center text-sm text-warm-gray-400">
              불러오는 중...
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-warm-gray-700">
                  Google 이메일
                </label>
                <p className="rounded-lg border border-warm-gray-100 bg-warm-gray-50 px-3 py-2.5 text-sm text-warm-gray-500">
                  {profile?.email || "-"}
                </p>
              </div>

              <Input
                id="displayName"
                label="이름"
                placeholder="이름을 입력해 주세요."
                value={profileForm.display_name}
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    display_name: e.target.value,
                  }))
                }
              />
              <Input
                id="phone"
                label="연락처"
                placeholder="010-0000-0000"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    phone: formatPhone(e.target.value),
                  }))
                }
              />
              <Input
                id="depositorName"
                label="입금자명"
                placeholder="계좌이체 시 입금자명"
                value={profileForm.depositor_name}
                onChange={(e) =>
                  setProfileForm((f) => ({
                    ...f,
                    depositor_name: e.target.value,
                  }))
                }
              />

              {profileMessage && (
                <p
                  className={`text-sm ${
                    profileMessage === "저장되었습니다."
                      ? "text-success"
                      : "text-error"
                  }`}
                >
                  {profileMessage}
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                isLoading={profileSaving}
                onClick={handleProfileSave}
              >
                저장
              </Button>
            </>
          )}
        </div>
      )}

      {/* 변경 요청 모달 */}
      {changeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-warm-gray-800">
                일정 변경 요청
              </h2>
              <button
                type="button"
                onClick={() => setChangeModal(null)}
                className="text-warm-gray-400 hover:text-warm-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-warm-gray-50 p-3 text-sm">
              <p className="text-warm-gray-500">현재 예약</p>
              <p className="mt-1 font-medium text-warm-gray-800">
                {changeModal.class_name} | {formatDate(changeModal.desired_date)}{" "}
                {formatTime(changeModal.desired_time)}
              </p>
            </div>

            {changeError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-error">
                {changeError}
              </div>
            )}

            {changeSchedulesLoading ? (
              <p className="py-4 text-center text-sm text-warm-gray-400">
                스케줄을 불러오는 중...
              </p>
            ) : changeDates.length === 0 ? (
              <p className="py-4 text-center text-sm text-warm-gray-400">
                현재 변경 가능한 일정이 없습니다.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-warm-gray-700">
                    변경 희망 날짜
                  </label>
                  {/* 월 네비게이션 */}
                  <div className="mb-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 1) {
                          setCalYear((y) => y - 1);
                          setCalMonth(12);
                        } else {
                          setCalMonth((m) => m - 1);
                        }
                      }}
                      className="rounded-lg p-1.5 text-warm-gray-400 hover:bg-warm-gray-50 hover:text-warm-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-sm font-semibold text-warm-gray-700">
                      {calYear}년 {calMonth}월
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 12) {
                          setCalYear((y) => y + 1);
                          setCalMonth(1);
                        } else {
                          setCalMonth((m) => m + 1);
                        }
                      }}
                      className="rounded-lg p-1.5 text-warm-gray-400 hover:bg-warm-gray-50 hover:text-warm-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  {/* 요일 헤더 */}
                  <div className="mb-1 grid grid-cols-7 text-center text-xs text-warm-gray-400">
                    {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                      <div
                        key={d}
                        className={`py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : ""}`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* 날짜 그리드 */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, i) => {
                      if (day === null) return <div key={`empty-${i}`} />;
                      const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isAvailable = changeDateSet.has(dateStr);
                      const isSelected = changeDate === dateStr;
                      const dow = new Date(calYear, calMonth - 1, day).getDay();
                      const isSunday = dow === 0;
                      const isSaturday = dow === 6;

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => {
                            setChangeDate(dateStr);
                            setChangeTime("");
                            setChangeScheduleId("");
                          }}
                          className={`rounded-lg py-2 text-sm transition-colors ${
                            isSelected
                              ? "bg-primary-500 font-semibold text-white"
                              : isAvailable
                                ? `bg-primary-50 font-medium hover:bg-primary-100 ${
                                    isSunday
                                      ? "text-red-500"
                                      : isSaturday
                                        ? "text-blue-500"
                                        : "text-primary-700"
                                  }`
                                : `cursor-default ${
                                    isSunday
                                      ? "text-red-200"
                                      : isSaturday
                                        ? "text-blue-200"
                                        : "text-warm-gray-300"
                                  }`
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {changeDate && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-warm-gray-700">
                      변경 희망 시간
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {changeTimeSlots.map((slot) => {
                        const isFull = slot.remaining_seats <= 0;
                        const isSelected = changeScheduleId === slot.schedule_id;

                        return (
                          <button
                            key={slot.schedule_id}
                            type="button"
                            disabled={isFull}
                            onClick={() => {
                              setChangeTime(slot.start_time);
                              setChangeScheduleId(slot.schedule_id);
                            }}
                            className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                              isFull
                                ? "cursor-not-allowed border-warm-gray-100 bg-warm-gray-50 text-warm-gray-300"
                                : isSelected
                                  ? "border-primary-400 bg-primary-50 font-medium text-primary-600"
                                  : "border-warm-gray-200 text-warm-gray-600 hover:bg-warm-gray-50"
                            }`}
                          >
                            {slot.start_time.slice(0, 5)}
                            <span className="ml-1.5 text-xs">
                              {isFull
                                ? "마감"
                                : `(${slot.remaining_seats}/${slot.max_seats}석)`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Input
                  id="changeReason"
                  label="변경 사유 (선택)"
                  placeholder="변경 사유를 입력해 주세요."
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                />

                <Button
                  className="w-full"
                  size="lg"
                  isLoading={changeSubmitting}
                  disabled={!changeDate || !changeTime}
                  onClick={handleChangeSubmit}
                >
                  변경 요청
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 취소 요청 모달 */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-warm-gray-800">
                {cancelModal.status === "pending"
                  ? "예약 취소"
                  : "취소 요청"}
              </h2>
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="text-warm-gray-400 hover:text-warm-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-warm-gray-50 p-3 text-sm">
              <p className="font-medium text-warm-gray-800">
                {cancelModal.class_name}
              </p>
              <p className="mt-0.5 text-warm-gray-500">
                {formatDate(cancelModal.desired_date)}{" "}
                {formatTime(cancelModal.desired_time)}
              </p>
            </div>

            {cancelModal.status === "confirmed" && (
              <p className="mb-4 text-xs text-warm-gray-500">
                확정된 예약의 취소는 관리자 확인 후 처리됩니다.
              </p>
            )}

            {cancelError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-error">
                {cancelError}
              </div>
            )}

            <Input
              id="cancelReason"
              label="취소 사유 (선택)"
              placeholder="취소 사유를 입력해 주세요."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />

            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                size="lg"
                onClick={() => setCancelModal(null)}
                disabled={cancelSubmitting}
              >
                돌아가기
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                size="lg"
                isLoading={cancelSubmitting}
                onClick={handleCancelSubmit}
              >
                {cancelModal.status === "pending"
                  ? "예약 취소"
                  : "취소 요청"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
