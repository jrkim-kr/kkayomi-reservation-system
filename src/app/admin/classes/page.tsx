"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Button, Input, Badge, Card } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import type { Class, ClassSchedule } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClassFormData {
  name: string;
  description: string;
  duration_minutes: string;
  price: string;
  max_participants: string;
  is_active: boolean;
  sort_order: string;
}

const EMPTY_FORM: ClassFormData = {
  name: "",
  description: "",
  duration_minutes: "",
  price: "",
  max_participants: "",
  is_active: true,
  sort_order: "0",
};

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary-500" : "bg-warm-gray-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Class Form Modal
// ---------------------------------------------------------------------------

function ClassFormModal({
  editingClass,
  onSave,
  onClose,
  isSaving,
}: {
  editingClass: Class | null;
  onSave: (data: ClassFormData) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<ClassFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ClassFormData, string>>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingClass) {
      setForm({
        name: editingClass.name,
        description: editingClass.description ?? "",
        duration_minutes: String(editingClass.duration_minutes),
        price: String(editingClass.price),
        max_participants: String(editingClass.max_participants),
        is_active: editingClass.is_active,
        sort_order: String(editingClass.sort_order),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [editingClass]);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ClassFormData, string>> = {};

    if (!form.name.trim()) newErrors.name = "수업명을 입력해 주세요.";
    if (!form.duration_minutes || Number(form.duration_minutes) <= 0)
      newErrors.duration_minutes = "유효한 소요시간을 입력해 주세요.";
    if (form.price === "" || Number(form.price) < 0)
      newErrors.price = "유효한 가격을 입력해 주세요.";
    if (!form.max_participants || Number(form.max_participants) <= 0)
      newErrors.max_participants = "유효한 최대 인원을 입력해 주세요.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSave(form);
  };

  const updateField = (field: keyof ClassFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-bold text-warm-gray-800">
          {editingClass ? "수업 수정" : "수업 추가"}
        </h3>
        <p className="mb-5 text-sm text-warm-gray-500">
          {editingClass
            ? "수업 정보를 수정합니다."
            : "새로운 수업을 등록합니다."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={nameRef}
            id="class-name"
            label="수업명 *"
            placeholder="예: 원데이 체험"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            error={errors.name}
          />

          <div className="w-full">
            <label
              htmlFor="class-description"
              className="mb-1.5 block text-sm font-medium text-warm-gray-700"
            >
              설명
            </label>
            <textarea
              id="class-description"
              rows={3}
              placeholder="수업에 대한 간단한 설명을 입력해 주세요."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="w-full rounded-lg border border-warm-gray-200 px-3 py-2.5 text-sm text-warm-gray-800 placeholder-warm-gray-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="class-duration"
              label="소요시간 (분) *"
              type="number"
              min="1"
              placeholder="90"
              value={form.duration_minutes}
              onChange={(e) => updateField("duration_minutes", e.target.value)}
              error={errors.duration_minutes}
            />
            <Input
              id="class-price"
              label="가격 (원) *"
              type="number"
              min="0"
              step="1000"
              placeholder="50000"
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              error={errors.price}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="class-max"
              label="최대 인원 *"
              type="number"
              min="1"
              placeholder="4"
              value={form.max_participants}
              onChange={(e) => updateField("max_participants", e.target.value)}
              error={errors.max_participants}
            />
            <Input
              id="class-sort"
              label="정렬 순서"
              type="number"
              min="0"
              placeholder="0"
              value={form.sort_order}
              onChange={(e) => updateField("sort_order", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={form.is_active}
              onChange={(val) => updateField("is_active", val)}
            />
            <span className="text-sm text-warm-gray-700">
              {form.is_active ? "활성화" : "비활성화"}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              취소
            </Button>
            <Button type="submit" size="sm" isLoading={isSaving}>
              {editingClass ? "수정하기" : "등록하기"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  className: classNameText,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  className: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-bold text-warm-gray-800">
          수업 삭제
        </h3>
        <p className="mb-5 text-sm text-warm-gray-600">
          <strong className="text-warm-gray-800">{classNameText}</strong> 수업을
          삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            isLoading={isDeleting}
          >
            삭제하기
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time Options (08:00 ~ 22:00, 30분 간격)
// ---------------------------------------------------------------------------

const TIME_OPTIONS = Array.from({ length: 29 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

// ---------------------------------------------------------------------------
// Schedule Modal
// ---------------------------------------------------------------------------

function ScheduleModal({
  classItem,
  onClose,
}: {
  classItem: Class;
  onClose: () => void;
}) {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Add slot form
  const [newTime, setNewTime] = useState("10:00");
  const [newMax, setNewMax] = useState(String(classItem.max_participants));
  const [adding, setAdding] = useState(false);

  // Bulk add
  const [showBulk, setShowBulk] = useState(false);
  const [bulkDays, setBulkDays] = useState<number[]>([]);
  const [bulkTime, setBulkTime] = useState("10:00");
  const [bulkMax, setBulkMax] = useState(String(classItem.max_participants));
  const [bulkAdding, setBulkAdding] = useState(false);

  const [error, setError] = useState("");

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/classes/${classItem.id}/schedules?year=${year}&month=${month}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSchedules(data);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [classItem.id, year, month]);

  useEffect(() => {
    setLoading(true);
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // 달력 데이터
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [year, month]);

  // 날짜별 스케줄 수
  const scheduleDateMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of schedules) {
      map[s.schedule_date] = (map[s.schedule_date] || 0) + 1;
    }
    return map;
  }, [schedules]);

  // 선택한 날짜의 스케줄
  const selectedSchedules = useMemo(() => {
    if (!selectedDate) return [];
    return schedules
      .filter((s) => s.schedule_date === selectedDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [schedules, selectedDate]);

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const handleAddSlot = async () => {
    if (!selectedDate || !newTime) return;
    setAdding(true);
    setError("");

    try {
      const res = await fetch(
        `/api/admin/classes/${classItem.id}/schedules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schedules: [
              {
                schedule_date: selectedDate,
                start_time: newTime,
                max_participants: Number(newMax) || null,
              },
            ],
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "슬롯 추가에 실패했습니다.");
        setAdding(false);
        return;
      }

      await fetchSchedules();
      setAdding(false);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setAdding(false);
    }
  };

  const handleDeleteSlot = async (scheduleId: string) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "슬롯 삭제에 실패했습니다.");
        return;
      }

      await fetchSchedules();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
  };

  const handleToggleSlot = async (scheduleId: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      await fetchSchedules();
    } catch {
      // ignore
    }
  };

  const handleBulkAdd = async () => {
    if (bulkDays.length === 0 || !bulkTime) return;
    setBulkAdding(true);
    setError("");

    // 해당 월의 선택된 요일들의 날짜 계산
    const daysInMonth = new Date(year, month, 0).getDate();
    const slots: { schedule_date: string; start_time: string; max_participants?: number }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      if (bulkDays.includes(date.getDay())) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        slots.push({
          schedule_date: dateStr,
          start_time: bulkTime,
          max_participants: Number(bulkMax) || undefined,
        });
      }
    }

    if (slots.length === 0) {
      setError("선택한 요일에 해당하는 날짜가 없습니다.");
      setBulkAdding(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/classes/${classItem.id}/schedules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedules: slots }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "일괄 등록에 실패했습니다.");
        setBulkAdding(false);
        return;
      }

      await fetchSchedules();
      setShowBulk(false);
      setBulkDays([]);
      setBulkAdding(false);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBulkAdding(false);
    }
  };

  const toggleBulkDay = (day: number) => {
    setBulkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-warm-gray-800">
              스케줄 관리
            </h3>
            <p className="text-sm text-warm-gray-500">{classItem.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-warm-gray-400 hover:text-warm-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* 월 네비게이션 */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg p-2 hover:bg-warm-gray-50"
          >
            <svg className="h-5 w-5 text-warm-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h4 className="text-base font-semibold text-warm-gray-800">
            {year}년 {month}월
          </h4>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg p-2 hover:bg-warm-gray-50"
          >
            <svg className="h-5 w-5 text-warm-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 달력 */}
        {loading ? (
          <div className="h-60 animate-pulse rounded-lg bg-warm-gray-100" />
        ) : (
          <div className="mb-4">
            <div className="mb-1 grid grid-cols-7 text-center text-xs text-warm-gray-400">
              {dayLabels.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} />;
                }
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const count = scheduleDateMap[dateStr] || 0;
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`flex min-h-[2.75rem] flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                      isSelected
                        ? "bg-primary-500 font-medium text-white"
                        : count > 0
                          ? "bg-primary-50 text-primary-700 hover:bg-primary-100"
                          : "text-warm-gray-600 hover:bg-warm-gray-50"
                    }`}
                  >
                    <span>{day}</span>
                    {count > 0 && (
                      <span
                        className={`mt-0.5 text-[10px] leading-none ${
                          isSelected ? "text-white/70" : "text-primary-400"
                        }`}
                      >
                        {count}건
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 선택한 날짜 스케줄 */}
        {selectedDate && (
          <div className="mb-4 rounded-lg border border-warm-gray-100 p-4">
            <h5 className="mb-3 text-sm font-semibold text-warm-gray-700">
              {selectedDate} 스케줄
            </h5>

            {selectedSchedules.length === 0 ? (
              <p className="text-sm text-warm-gray-400">등록된 스케줄이 없습니다.</p>
            ) : (
              <div className="mb-3 space-y-2">
                {selectedSchedules.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg bg-warm-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-warm-gray-800">
                        {s.start_time.slice(0, 5)}
                      </span>
                      <span className="text-xs text-warm-gray-400">
                        정원 {s.max_participants ?? classItem.max_participants}명
                      </span>
                      {!s.is_active && (
                        <Badge variant="cancelled">비활성</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSlot(s.id, s.is_active)}
                        className="text-xs text-warm-gray-400 hover:text-warm-gray-600"
                      >
                        {s.is_active ? "비활성" : "활성"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(s.id)}
                        className="text-xs text-error hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 슬롯 추가 */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-warm-gray-500">
                  시간
                </label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full rounded-lg border border-warm-gray-200 px-3 py-2 text-sm text-warm-gray-800 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs text-warm-gray-500">
                  정원
                </label>
                <input
                  type="number"
                  min="1"
                  value={newMax}
                  onChange={(e) => setNewMax(e.target.value)}
                  className="w-full rounded-lg border border-warm-gray-200 px-3 py-2 text-sm text-warm-gray-800 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <Button size="sm" onClick={handleAddSlot} isLoading={adding}>
                추가
              </Button>
            </div>
          </div>
        )}

        {/* 일괄 등록 */}
        <div className="border-t border-warm-gray-100 pt-4">
          {!showBulk ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulk(true)}
            >
              일괄 등록
            </Button>
          ) : (
            <div className="space-y-3">
              <h5 className="text-sm font-semibold text-warm-gray-700">
                {year}년 {month}월 일괄 등록
              </h5>
              <div>
                <label className="mb-1 block text-xs text-warm-gray-500">
                  요일 선택
                </label>
                <div className="flex gap-1.5">
                  {dayLabels.map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleBulkDay(i)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        bulkDays.includes(i)
                          ? "border-primary-400 bg-primary-50 font-medium text-primary-600"
                          : "border-warm-gray-200 text-warm-gray-500 hover:bg-warm-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-warm-gray-500">
                    시간
                  </label>
                  <select
                    value={bulkTime}
                    onChange={(e) => setBulkTime(e.target.value)}
                    className="w-full rounded-lg border border-warm-gray-200 px-3 py-2 text-sm text-warm-gray-800 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-xs text-warm-gray-500">
                    정원
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bulkMax}
                    onChange={(e) => setBulkMax(e.target.value)}
                    className="w-full rounded-lg border border-warm-gray-200 px-3 py-2 text-sm text-warm-gray-800 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowBulk(false);
                    setBulkDays([]);
                  }}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkAdd}
                  isLoading={bulkAdding}
                  disabled={bulkDays.length === 0}
                >
                  일괄 등록
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Class Card (individual list item)
// ---------------------------------------------------------------------------

function ClassCard({
  classItem,
  onEdit,
  onDelete,
  onToggleActive,
  onSchedule,
  togglingId,
}: {
  classItem: Class;
  onEdit: (c: Class) => void;
  onDelete: (c: Class) => void;
  onToggleActive: (c: Class) => void;
  onSchedule: (c: Class) => void;
  togglingId: string | null;
}) {
  return (
    <Card
      className={`transition-opacity ${
        !classItem.is_active ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Info */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-warm-gray-800">
              {classItem.name}
            </h3>
            <Badge variant={classItem.is_active ? "confirmed" : "cancelled"}>
              {classItem.is_active ? "활성" : "비활성"}
            </Badge>
          </div>

          {classItem.description && (
            <p className="text-sm text-warm-gray-500 line-clamp-2">
              {classItem.description}
            </p>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            <div>
              <span className="text-warm-gray-400">소요시간</span>{" "}
              <span className="font-medium text-warm-gray-700">
                {classItem.duration_minutes}분
              </span>
            </div>
            <div>
              <span className="text-warm-gray-400">가격</span>{" "}
              <span className="font-medium text-warm-gray-700">
                {formatPrice(classItem.price)}
              </span>
            </div>
            <div>
              <span className="text-warm-gray-400">최대 인원</span>{" "}
              <span className="font-medium text-warm-gray-700">
                {classItem.max_participants}명
              </span>
            </div>
            <div>
              <span className="text-warm-gray-400">정렬</span>{" "}
              <span className="font-medium text-warm-gray-700">
                {classItem.sort_order}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-warm-gray-500">
              {classItem.is_active ? "활성" : "비활성"}
            </span>
            <ToggleSwitch
              checked={classItem.is_active}
              onChange={() => onToggleActive(classItem)}
              disabled={togglingId === classItem.id}
            />
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSchedule(classItem)}
            >
              스케줄
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(classItem)}
            >
              수정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-error hover:bg-red-50"
              onClick={() => onDelete(classItem)}
            >
              삭제
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------

function ClassListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl bg-warm-gray-100"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle active state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Schedule modal state
  const [scheduleTarget, setScheduleTarget] = useState<Class | null>(null);

  // ---- Data fetching ----

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/classes");
      if (!res.ok) throw new Error();
      const data: Class[] = await res.json();
      setClasses(data);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // ---- Create / Edit ----

  const openCreateForm = () => {
    setEditingClass(null);
    setShowForm(true);
  };

  const openEditForm = (c: Class) => {
    setEditingClass(c);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClass(null);
  };

  const handleSave = async (formData: ClassFormData) => {
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        duration_minutes: Number(formData.duration_minutes),
        price: Number(formData.price),
        max_participants: Number(formData.max_participants),
        is_active: formData.is_active,
        sort_order: Number(formData.sort_order) || 0,
      };

      const url = editingClass
        ? `/api/admin/classes/${editingClass.id}`
        : "/api/admin/classes";
      const method = editingClass ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "요청 처리에 실패했습니다.");
      }

      closeForm();
      await fetchClasses();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "요청 처리에 실패했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Toggle Active ----

  const handleToggleActive = async (classItem: Class) => {
    setTogglingId(classItem.id);
    try {
      const res = await fetch(`/api/admin/classes/${classItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !classItem.is_active }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "상태 변경에 실패했습니다.");
      }

      // Optimistic update
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classItem.id ? { ...c, is_active: !c.is_active } : c
        )
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "상태 변경에 실패했습니다."
      );
    } finally {
      setTogglingId(null);
    }
  };

  // ---- Delete ----

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/classes/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "삭제에 실패했습니다.");
      }

      setDeleteTarget(null);
      await fetchClasses();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "삭제에 실패했습니다."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- Counts ----

  const activeCount = classes.filter((c) => c.is_active).length;
  const inactiveCount = classes.filter((c) => !c.is_active).length;

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-gray-800">수업 관리</h1>
          {!loading && classes.length > 0 && (
            <p className="mt-1 text-sm text-warm-gray-500">
              총 {classes.length}개 (활성 {activeCount} / 비활성 {inactiveCount})
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchClasses}>
            새로고침
          </Button>
          <Button size="sm" onClick={openCreateForm}>
            수업 추가
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && <ClassListSkeleton />}

      {/* Empty State */}
      {!loading && classes.length === 0 && (
        <Card className="py-12 text-center">
          <p className="text-warm-gray-400">등록된 수업이 없습니다.</p>
          <Button size="sm" className="mt-4" onClick={openCreateForm}>
            첫 수업 등록하기
          </Button>
        </Card>
      )}

      {/* Class List */}
      {!loading && classes.length > 0 && (
        <div className="space-y-3">
          {classes.map((c) => (
            <ClassCard
              key={c.id}
              classItem={c}
              onEdit={openEditForm}
              onDelete={setDeleteTarget}
              onToggleActive={handleToggleActive}
              onSchedule={setScheduleTarget}
              togglingId={togglingId}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && classes.length > 0 && (
        <p className="text-center text-xs text-warm-gray-400">
          총 {classes.length}개 수업
        </p>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <ClassFormModal
          editingClass={editingClass}
          onSave={handleSave}
          onClose={closeForm}
          isSaving={isSaving}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          className={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Schedule Modal */}
      {scheduleTarget && (
        <ScheduleModal
          classItem={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
        />
      )}
    </div>
  );
}
