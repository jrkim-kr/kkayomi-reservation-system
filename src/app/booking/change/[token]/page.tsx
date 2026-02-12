"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Input } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/utils";
import type { ScheduleSlot } from "@/types";

interface ReservationInfo {
  id: string;
  class_id: string;
  schedule_id: string | null;
  class_name: string;
  desired_date: string;
  desired_time: string;
  customer_name: string;
  num_people: number;
  status: string;
  has_pending_request: boolean;
}

export default function ChangeRequestPage() {
  const params = useParams();
  const token = params.token as string;

  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [reason, setReason] = useState("");

  // 캘린더 상태
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetch(`/api/change-requests?token=${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: ReservationInfo) => {
        setReservation(data);
        setLoading(false);

        // 스케줄 로드
        if (data.class_id && data.status === "confirmed" && !data.has_pending_request) {
          setSchedulesLoading(true);
          fetch(`/api/classes/${data.class_id}/schedules`)
            .then((res) => res.json())
            .then((slots: ScheduleSlot[]) => {
              setSchedules(slots);
              setSchedulesLoading(false);
            })
            .catch(() => setSchedulesLoading(false));
        }
      })
      .catch(() => {
        setError("유효하지 않은 링크이거나 예약 정보를 찾을 수 없습니다.");
        setLoading(false);
      });
  }, [token]);

  const availableDates = useMemo(() => {
    const dates = new Set(schedules.map((s) => s.schedule_date));
    return Array.from(dates).sort();
  }, [schedules]);

  const timeSlots = useMemo(() => {
    if (!requestedDate) return [];
    return schedules.filter((s) => s.schedule_date === requestedDate);
  }, [schedules, requestedDate]);

  // 첫 번째 가능 날짜로 캘린더 이동
  useEffect(() => {
    if (availableDates.length > 0) {
      const d = new Date(availableDates[0] + "T00:00:00");
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth() + 1);
    }
  }, [availableDates]);

  // 캘린더에서 빠른 조회를 위한 Set
  const availableDateSet = useMemo(
    () => new Set(availableDates),
    [availableDates]
  );

  // 캘린더 날짜 계산
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [calYear, calMonth]);

  const handleSubmit = async () => {
    if (!requestedDate || !requestedTime) {
      setError("변경 희망 날짜와 시간을 선택해 주세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          schedule_id: selectedScheduleId || null,
          requested_date: requestedDate,
          requested_time: requestedTime,
          reason: reason.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "변경 요청에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-warm-gray-400">불러오는 중...</p>
      </div>
    );
  }

  if (!reservation && error) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-16 text-center">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-warm-gray-800">
          변경 요청이 접수되었습니다
        </h1>
        <p className="mt-2 text-sm text-warm-gray-500">
          관리자 확인 후 결과를 안내드리겠습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <h1 className="mb-6 text-center text-xl font-bold text-warm-gray-800">
        일정 변경 요청
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-error">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-warm-gray-600">
          현재 예약 정보
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-warm-gray-400">수업</dt>
            <dd className="font-medium text-warm-gray-800">
              {reservation?.class_name}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-warm-gray-400">날짜</dt>
            <dd className="font-medium text-warm-gray-800">
              {formatDate(reservation?.desired_date ?? "")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-warm-gray-400">시간</dt>
            <dd className="font-medium text-warm-gray-800">
              {formatTime(reservation?.desired_time ?? "")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-warm-gray-400">예약자</dt>
            <dd className="font-medium text-warm-gray-800">
              {reservation?.customer_name}
            </dd>
          </div>
        </dl>
      </Card>

      {reservation?.has_pending_request ? (
        <Card>
          <p className="text-center text-sm text-warning">
            이미 처리 대기 중인 변경 요청이 있습니다.
            <br />
            기존 요청이 처리된 후 다시 신청해 주세요.
          </p>
        </Card>
      ) : reservation?.status !== "confirmed" ? (
        <Card>
          <p className="text-center text-sm text-warm-gray-500">
            확정된 예약만 일정 변경을 요청할 수 있습니다.
          </p>
        </Card>
      ) : schedulesLoading ? (
        <p className="text-center text-sm text-warm-gray-400">
          스케줄을 불러오는 중...
        </p>
      ) : (
        <div className="space-y-4">
          {availableDates.length === 0 ? (
            <p className="text-center text-sm text-warm-gray-400">
              현재 변경 가능한 일정이 없습니다.
            </p>
          ) : (
            <>
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
                    const isAvailable = availableDateSet.has(dateStr);
                    const isSelected = requestedDate === dateStr;
                    const dow = new Date(calYear, calMonth - 1, day).getDay();
                    const isSunday = dow === 0;
                    const isSaturday = dow === 6;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => {
                          setRequestedDate(dateStr);
                          setRequestedTime("");
                          setSelectedScheduleId("");
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

              {requestedDate && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-warm-gray-700">
                    변경 희망 시간
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((slot) => {
                      const numPeople = reservation?.num_people ?? 1;
                      const isFull = slot.remaining_seats <= 0;
                      const isOverCapacity = slot.remaining_seats < numPeople;
                      const isCurrent =
                        reservation?.schedule_id != null &&
                        slot.schedule_id === reservation.schedule_id;
                      const isDisabled = isFull || isOverCapacity || isCurrent;
                      const isSelected = selectedScheduleId === slot.schedule_id;

                      return (
                        <button
                          key={slot.schedule_id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setRequestedTime(slot.start_time);
                            setSelectedScheduleId(slot.schedule_id);
                          }}
                          className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                            isDisabled
                              ? "cursor-not-allowed border-warm-gray-100 bg-warm-gray-50 text-warm-gray-300"
                              : isSelected
                                ? "border-primary-400 bg-primary-50 font-medium text-primary-600"
                                : "border-warm-gray-200 text-warm-gray-600 hover:bg-warm-gray-50"
                          }`}
                        >
                          {slot.start_time.slice(0, 5)}
                          <span className="ml-1.5 text-xs">
                            {isCurrent
                              ? "(현재 예약)"
                              : isFull
                                ? "마감"
                                : isOverCapacity
                                  ? `(${slot.remaining_seats}/${slot.max_seats}석 · 인원초과)`
                                  : `(${slot.remaining_seats}/${slot.max_seats}석)`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <Input
            id="reason"
            label="변경 사유 (선택)"
            placeholder="변경 사유를 입력해 주세요."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <Button
            className="w-full"
            size="lg"
            isLoading={submitting}
            disabled={!requestedDate || !requestedTime}
            onClick={handleSubmit}
          >
            변경 요청
          </Button>
        </div>
      )}
    </div>
  );
}
