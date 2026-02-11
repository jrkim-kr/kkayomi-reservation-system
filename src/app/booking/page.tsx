"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input } from "@/components/ui";
import { formatPhone, formatPrice } from "@/lib/utils";
import type { Class, ScheduleSlot } from "@/types";

type Step = "class" | "datetime" | "info" | "confirm";

export default function BookingPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<Class[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("class");

  // 폼 데이터
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [desiredDate, setDesiredDate] = useState("");
  const [desiredTime, setDesiredTime] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [numPeople, setNumPeople] = useState(1);
  const [customerMemo, setCustomerMemo] = useState("");

  // 캘린더 상태
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  // 유효성 검증 에러
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 수업 목록 로드
  useEffect(() => {
    fetch("/api/classes")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setClasses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setClasses([]);
        setLoading(false);
      });
  }, []);

  // 프로필 자동완성
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.display_name) setCustomerName(data.display_name);
        if (data.phone) setCustomerPhone(data.phone);
        if (data.depositor_name) setDepositorName(data.depositor_name);
      })
      .catch(() => {});
  }, []);

  // 수업 선택 시 스케줄 로드
  useEffect(() => {
    if (!selectedClass) return;
    setSchedulesLoading(true);
    setDesiredDate("");
    setDesiredTime("");
    setSelectedScheduleId("");
    setNumPeople(1);

    fetch(`/api/classes/${selectedClass.id}/schedules`)
      .then((res) => res.json())
      .then((data) => {
        setSchedules(data);
        setSchedulesLoading(false);
      })
      .catch(() => {
        setSchedules([]);
        setSchedulesLoading(false);
      });
  }, [selectedClass]);

  // 스케줄에서 고유 날짜 추출
  const availableDates = useMemo(() => {
    const dates = new Set(schedules.map((s) => s.schedule_date));
    return Array.from(dates).sort();
  }, [schedules]);

  // 선택한 날짜의 시간 슬롯
  const timeSlots = useMemo(() => {
    if (!desiredDate) return [];
    return schedules.filter((s) => s.schedule_date === desiredDate);
  }, [schedules, desiredDate]);

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

  const validateInfo = () => {
    const newErrors: Record<string, string> = {};
    if (!customerName.trim()) newErrors.customerName = "이름을 입력해 주세요.";
    if (!/^010-\d{4}-\d{4}$/.test(customerPhone))
      newErrors.customerPhone = "올바른 전화번호를 입력해 주세요.";
    if (!depositorName.trim())
      newErrors.depositorName = "입금자명을 입력해 주세요.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedClass!.id,
          schedule_id: selectedScheduleId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          depositor_name: depositorName.trim(),
          desired_date: desiredDate,
          desired_time: desiredTime,
          num_people: numPeople,
          customer_memo: customerMemo.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "예약 신청에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      const params = new URLSearchParams({
        class: selectedClass!.name,
        date: desiredDate,
        time: desiredTime.slice(0, 5),
        duration: String(selectedClass!.duration_minutes),
        price: String(selectedClass!.price),
        people: String(numPeople),
        name: customerName.trim(),
        phone: customerPhone.trim(),
        depositor: depositorName.trim(),
      });
      router.push(`/booking/complete?${params.toString()}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  const stepIndex = ["class", "datetime", "info", "confirm"].indexOf(step);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-warm-gray-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <div className="mb-2 flex items-center justify-between">
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
          클래스 예약
        </h1>
        <div className="w-10" />
      </div>

      {/* 스텝 인디케이터 */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {["수업", "일시", "정보", "확인"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i <= stepIndex
                  ? "bg-primary-500 text-white"
                  : "bg-warm-gray-200 text-warm-gray-400"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs ${
                i <= stepIndex ? "text-warm-gray-700" : "text-warm-gray-400"
              }`}
            >
              {label}
            </span>
            {i < 3 && (
              <div
                className={`h-px w-4 ${
                  i < stepIndex ? "bg-primary-300" : "bg-warm-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Step 1: 수업 선택 */}
      {step === "class" && (
        <div className="space-y-3">
          <p className="mb-4 text-sm text-warm-gray-500">
            원하시는 클래스를 선택해 주세요.
          </p>
          {classes.length === 0 ? (
            <p className="text-center text-sm text-warm-gray-400">
              현재 등록된 수업이 없습니다.
            </p>
          ) : (
            classes.map((cls) => (
              <Card
                key={cls.id}
                className={`cursor-pointer transition-all ${
                  selectedClass?.id === cls.id
                    ? "border-primary-400 ring-2 ring-primary-200"
                    : "hover:border-warm-gray-200"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedClass(cls)}
                >
                  <h3 className="font-semibold text-warm-gray-800">
                    {cls.name}
                  </h3>
                  {cls.description && (
                    <p className="mt-1 text-sm text-warm-gray-500">
                      {cls.description}
                    </p>
                  )}
                  <div className="mt-2 flex gap-3 text-xs text-warm-gray-400">
                    <span>약 {cls.duration_minutes}분</span>
                    <span>{formatPrice(cls.price)}</span>
                    <span>정원 {cls.max_participants}명</span>
                  </div>
                </button>
              </Card>
            ))
          )}
          <Button
            className="mt-4 w-full"
            size="lg"
            disabled={!selectedClass}
            onClick={() => setStep("datetime")}
          >
            다음
          </Button>
        </div>
      )}

      {/* Step 2: 날짜/시간 선택 */}
      {step === "datetime" && (
        <div className="space-y-4">
          <Card>
            <p className="mb-1 text-sm font-medium text-warm-gray-700">
              선택한 수업
            </p>
            <p className="text-warm-gray-800">{selectedClass?.name}</p>
          </Card>

          {schedulesLoading ? (
            <p className="text-center text-sm text-warm-gray-400">
              스케줄을 불러오는 중...
            </p>
          ) : availableDates.length === 0 ? (
            <p className="text-center text-sm text-warm-gray-400">
              현재 예약 가능한 일정이 없습니다.
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-warm-gray-700">
                  희망 날짜
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
                    const isSelected = desiredDate === dateStr;
                    const dow = new Date(calYear, calMonth - 1, day).getDay();
                    const isSunday = dow === 0;
                    const isSaturday = dow === 6;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => {
                          setDesiredDate(dateStr);
                          setDesiredTime("");
                          setSelectedScheduleId("");
                          setNumPeople(1);
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

              {desiredDate && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-warm-gray-700">
                    희망 시간
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((slot) => {
                      const isFull = slot.remaining_seats <= 0;
                      const isSelected =
                        selectedScheduleId === slot.schedule_id;

                      return (
                        <button
                          key={slot.schedule_id}
                          type="button"
                          disabled={isFull}
                          onClick={() => {
                            setDesiredTime(slot.start_time);
                            setSelectedScheduleId(slot.schedule_id);
                            setNumPeople(1);
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

              {selectedScheduleId && (() => {
                const selectedSlot = timeSlots.find(
                  (s) => s.schedule_id === selectedScheduleId
                );
                const maxPeople = selectedSlot
                  ? selectedSlot.remaining_seats
                  : 1;

                return (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-warm-gray-700">
                      인원 수
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from(
                        { length: Math.min(maxPeople, 10) },
                        (_, i) => i + 1
                      ).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setNumPeople(n)}
                          className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                            numPeople === n
                              ? "border-primary-400 bg-primary-50 font-medium text-primary-600"
                              : "border-warm-gray-200 text-warm-gray-600 hover:bg-warm-gray-50"
                          }`}
                        >
                          {n}명
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              size="lg"
              onClick={() => setStep("class")}
            >
              이전
            </Button>
            <Button
              className="flex-1"
              size="lg"
              disabled={!desiredDate || !desiredTime || !selectedScheduleId}
              onClick={() => setStep("info")}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: 예약자 정보 */}
      {step === "info" && (
        <div className="space-y-4">
          <Input
            id="customerName"
            label="예약자 이름"
            placeholder="홍길동"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            error={errors.customerName}
          />
          <Input
            id="customerPhone"
            label="연락처"
            placeholder="010-0000-0000"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
            error={errors.customerPhone}
          />
          <Input
            id="depositorName"
            label="입금자명"
            placeholder="계좌이체 시 입금자명"
            value={depositorName}
            onChange={(e) => setDepositorName(e.target.value)}
            error={errors.depositorName}
          />
          <div>
            <label
              htmlFor="customerMemo"
              className="mb-1.5 block text-sm font-medium text-warm-gray-700"
            >
              요청사항 (선택)
            </label>
            <textarea
              id="customerMemo"
              rows={3}
              placeholder="궁금한 점이나 요청사항을 입력해 주세요."
              maxLength={200}
              value={customerMemo}
              onChange={(e) => setCustomerMemo(e.target.value)}
              className="w-full rounded-lg border border-warm-gray-200 px-3 py-2.5 text-sm text-warm-gray-800 placeholder-warm-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              size="lg"
              onClick={() => setStep("datetime")}
            >
              이전
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onClick={() => {
                if (validateInfo()) setStep("confirm");
              }}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: 확인 */}
      {step === "confirm" && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-warm-gray-600">
              예약 내용 확인
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">수업</dt>
                <dd className="font-medium text-warm-gray-800">
                  {selectedClass?.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">날짜</dt>
                <dd className="font-medium text-warm-gray-800">
                  {desiredDate}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">시간</dt>
                <dd className="font-medium text-warm-gray-800">
                  {desiredTime.slice(0, 5)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">소요시간</dt>
                <dd className="font-medium text-warm-gray-800">
                  약 {selectedClass?.duration_minutes}분
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">인원</dt>
                <dd className="font-medium text-warm-gray-800">
                  {numPeople}명
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">가격</dt>
                <dd className="font-medium text-warm-gray-800">
                  {formatPrice((selectedClass?.price ?? 0) * numPeople)}
                  {numPeople > 1 && (
                    <span className="ml-1 text-xs text-warm-gray-400">
                      ({formatPrice(selectedClass?.price ?? 0)} × {numPeople})
                    </span>
                  )}
                </dd>
              </div>
              <hr className="border-warm-gray-100" />
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">예약자</dt>
                <dd className="font-medium text-warm-gray-800">
                  {customerName}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">연락처</dt>
                <dd className="font-medium text-warm-gray-800">
                  {customerPhone}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">입금자명</dt>
                <dd className="font-medium text-warm-gray-800">
                  {depositorName}
                </dd>
              </div>
              {customerMemo && (
                <div className="flex justify-between">
                  <dt className="text-warm-gray-400">요청사항</dt>
                  <dd className="font-medium text-warm-gray-800">
                    {customerMemo}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <p className="text-center text-xs text-warm-gray-400">
            관리자 승인 후 확정됩니다
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              size="lg"
              onClick={() => setStep("info")}
              disabled={submitting}
            >
              이전
            </Button>
            <Button
              className="flex-1"
              size="lg"
              isLoading={submitting}
              onClick={handleSubmit}
            >
              예약 신청하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
