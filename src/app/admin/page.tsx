"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import {
  STATUS_LABELS,
  formatDate,
  formatTime,
  formatPrice,
  formatPhone,
  getTodayString,
} from "@/lib/utils";
import type { ReservationDetail, ChangeRequestDetail } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

/** Format Date to YYYY-MM-DD string. */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get Mon~Sun date strings for the week containing `date`. */
function getWeekDates(date: Date): string[] {
  const dow = (date.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const monday = new Date(date);
  monday.setDate(date.getDate() - dow);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateStr(d);
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-warm-gray-100"
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-warm-gray-100"
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  accent,
  badge,
  icon,
  href,
}: {
  label: string;
  value: number;
  accent?: "primary" | "warning" | "default";
  badge?: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const accentColors = {
    primary: "text-primary-600",
    warning: "text-warning",
    default: "text-warm-gray-700",
  };

  const content = (
    <Card
      className={`flex items-start gap-3 ${href ? "transition-shadow hover:shadow-md" : ""}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-warm-gray-500">{label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p
            className={`text-2xl font-bold ${accentColors[accent ?? "default"]}`}
          >
            {value}
            <span className="ml-0.5 text-base font-medium text-warm-gray-400">
              건
            </span>
          </p>
          {badge && <Badge variant="pending">{badge}</Badge>}
        </div>
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ---------------------------------------------------------------------------
// Today's Confirmed Reservation Card (mobile)
// ---------------------------------------------------------------------------

function TodayReservationCard({
  reservation,
}: {
  reservation: ReservationDetail;
}) {
  return (
    <div className="rounded-xl border border-warm-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-warm-gray-800">
            {reservation.class_name}
          </p>
          <p className="mt-0.5 text-xs text-warm-gray-500">
            {reservation.customer_name} &middot;{" "}
            {formatPhone(reservation.customer_phone)}
          </p>
        </div>
        <Badge variant="confirmed">{STATUS_LABELS["confirmed"]}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm text-warm-gray-600">
        <span className="flex items-center gap-1">
          <svg
            className="h-4 w-4 text-warm-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {formatTime(reservation.desired_time)}
        </span>
        <span className="text-warm-gray-400">
          {reservation.num_people ?? 1}명
        </span>
        <span className="text-warm-gray-400">
          {formatPrice(reservation.price * (reservation.num_people ?? 1))}
        </span>
        <span className="text-warm-gray-400">
          {reservation.duration_minutes}분
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly Calendar View
// ---------------------------------------------------------------------------

function WeeklyCalendar({
  weekDates,
  reservationsByDate,
  today,
}: {
  weekDates: string[];
  reservationsByDate: Record<string, ReservationDetail[]>;
  today: string;
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {/* Day-of-week header */}
      {DAY_LABELS.map((label, idx) => (
        <div
          key={label}
          className={`pb-1 text-center text-xs font-medium ${
            idx === 6
              ? "text-error"
              : idx === 5
                ? "text-info"
                : "text-warm-gray-400"
          }`}
        >
          {label}
        </div>
      ))}

      {/* Date cells */}
      {weekDates.map((dateStr) => {
        const items = reservationsByDate[dateStr] ?? [];
        const isToday = dateStr === today;
        const date = new Date(dateStr + "T00:00:00");
        const dayNum = date.getDate();
        const dow = (date.getDay() + 6) % 7;
        const isSunday = dow === 6;
        const isSaturday = dow === 5;

        return (
          <div
            key={dateStr}
            className={`flex min-h-[5.5rem] flex-col rounded-xl p-2 transition-colors ${
              isToday
                ? "bg-primary-50 ring-2 ring-primary-200"
                : "bg-warm-gray-50/60"
            }`}
          >
            {/* Date number + count */}
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-semibold ${
                  isToday
                    ? "text-primary-600"
                    : isSunday
                      ? "text-error"
                      : isSaturday
                        ? "text-info"
                        : "text-warm-gray-700"
                }`}
              >
                {dayNum}
              </span>
              {items.length > 0 && (
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isToday
                      ? "bg-primary-500 text-white"
                      : "bg-primary-100 text-primary-700"
                  }`}
                >
                  {items.length}
                </span>
              )}
            </div>

            {/* Reservation details */}
            <div className="mt-1 flex flex-col gap-0.5 overflow-hidden">
              {items.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="truncate rounded bg-white/70 px-1 py-0.5 text-[10px] leading-tight text-warm-gray-600"
                  title={`${formatTime(r.desired_time)} ${r.class_name} - ${r.customer_name} (${r.num_people ?? 1}명)`}
                >
                  <span className="font-medium text-primary-600">
                    {formatTime(r.desired_time)}
                  </span>{" "}
                  {r.class_name}
                  {(r.num_people ?? 1) > 1 && (
                    <span className="ml-0.5 text-warm-gray-400">
                      {r.num_people}명
                    </span>
                  )}
                </div>
              ))}
              {items.length > 3 && (
                <span className="text-[10px] text-warm-gray-400">
                  +{items.length - 3}건
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDetail[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Data fetching ----

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [resReservations, resChangeRequests] = await Promise.all([
        fetch("/api/admin/reservations"),
        fetch("/api/admin/change-requests"),
      ]);
      if (!resReservations.ok)
        throw new Error("예약 목록을 불러오지 못했습니다.");
      if (!resChangeRequests.ok)
        throw new Error("변경 요청 목록을 불러오지 못했습니다.");
      const [reservationsData, changeRequestsData] = await Promise.all([
        resReservations.json() as Promise<ReservationDetail[]>,
        resChangeRequests.json() as Promise<ChangeRequestDetail[]>,
      ]);
      setReservations(reservationsData);
      setChangeRequests(changeRequestsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Computed data ----

  const today = getTodayString();
  const now = useMemo(() => new Date(), []);
  const weekDates = useMemo(() => getWeekDates(now), [now]);

  const todayConfirmed = useMemo(
    () =>
      reservations.filter(
        (r) => r.desired_date === today && r.status === "confirmed",
      ),
    [reservations, today],
  );

  const pendingCount = useMemo(
    () => reservations.filter((r) => r.status === "pending").length,
    [reservations],
  );

  const weekConfirmedByDate = useMemo(() => {
    const set = new Set(weekDates);
    const map: Record<string, ReservationDetail[]> = {};
    for (const r of reservations) {
      if (r.status === "confirmed" && set.has(r.desired_date)) {
        (map[r.desired_date] ??= []).push(r);
      }
    }
    // Sort each day's reservations by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.desired_time.localeCompare(b.desired_time));
    }
    return map;
  }, [reservations, weekDates]);

  const pendingChangeRequests = useMemo(
    () => changeRequests.filter((r) => r.status === "pending"),
    [changeRequests],
  );

  const cancelRequests = useMemo(
    () =>
      reservations.filter(
        (r) => r.status === "confirmed" && r.cancel_reason != null,
      ),
    [reservations],
  );

  // Sort today's confirmed by time
  const todayConfirmedSorted = useMemo(
    () =>
      [...todayConfirmed].sort((a, b) =>
        a.desired_time.localeCompare(b.desired_time),
      ),
    [todayConfirmed],
  );

  // Week label (e.g. "2/10 (월) ~ 2/16 (일)")
  const weekLabel = useMemo(() => {
    const first = new Date(weekDates[0] + "T00:00:00");
    const last = new Date(weekDates[6] + "T00:00:00");
    return `${first.getMonth() + 1}/${first.getDate()} (${DAY_LABELS[0]}) ~ ${last.getMonth() + 1}/${last.getDate()} (${DAY_LABELS[6]})`;
  }, [weekDates]);

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-gray-800">대시보드</h1>
          <p className="mt-1 text-sm text-warm-gray-500">
            오늘은{" "}
            <span className="font-medium text-warm-gray-700">
              {formatDate(today)} ({DAY_LABELS[(now.getDay() + 6) % 7]})
            </span>
            입니다
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-warm-gray-200 bg-white px-3 py-1.5 text-sm text-warm-gray-600 transition-colors hover:bg-warm-gray-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          새로고침
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-error">
          <p className="font-medium">데이터를 불러올 수 없습니다</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            className="mt-3 rounded-lg border border-warm-gray-200 bg-white px-3 py-1.5 text-sm text-warm-gray-600 transition-colors hover:bg-warm-gray-50"
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && <DashboardSkeleton />}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* ---- Summary Stats ---- */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="오늘 확정 예약"
              value={todayConfirmed.length}
              accent="primary"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <StatCard
              label="신규 신청"
              value={pendingCount}
              accent={pendingCount > 0 ? "warning" : "default"}
              badge={pendingCount > 0 ? "처리 필요" : undefined}
              href="/admin/reservations"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <StatCard
              label="변경 요청"
              value={pendingChangeRequests.length}
              accent={pendingChangeRequests.length > 0 ? "warning" : "default"}
              badge={
                pendingChangeRequests.length > 0 ? "처리 필요" : undefined
              }
              href="/admin/change-requests"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              }
            />
            <StatCard
              label="취소 요청"
              value={cancelRequests.length}
              accent={cancelRequests.length > 0 ? "warning" : "default"}
              badge={cancelRequests.length > 0 ? "처리 필요" : undefined}
              href="/admin/reservations"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
          </div>

          {/* ---- Today's Confirmed Reservations ---- */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-warm-gray-800">
                오늘 확정 예약
              </h2>
              <Link
                href="/admin/reservations"
                className="text-sm text-primary-500 transition-colors hover:text-primary-600"
              >
                전체 보기 &rarr;
              </Link>
            </div>

            {todayConfirmedSorted.length === 0 ? (
              <div className="rounded-xl bg-warm-gray-50 py-10 text-center">
                <p className="text-sm text-warm-gray-400">
                  오늘 확정된 예약이 없습니다
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-warm-gray-100 text-left">
                        <th className="whitespace-nowrap pb-3 pr-4 font-semibold text-warm-gray-500">
                          시간
                        </th>
                        <th className="whitespace-nowrap pb-3 pr-4 font-semibold text-warm-gray-500">
                          수업
                        </th>
                        <th className="whitespace-nowrap pb-3 pr-4 font-semibold text-warm-gray-500">
                          예약자
                        </th>
                        <th className="whitespace-nowrap pb-3 pr-4 font-semibold text-warm-gray-500">
                          연락처
                        </th>
                        <th className="whitespace-nowrap pb-3 pr-4 font-semibold text-warm-gray-500">
                          인원
                        </th>
                        <th className="whitespace-nowrap pb-3 pr-4 font-semibold text-warm-gray-500">
                          금액
                        </th>
                        <th className="whitespace-nowrap pb-3 font-semibold text-warm-gray-500">
                          소요시간
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayConfirmedSorted.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-warm-gray-50 last:border-b-0"
                        >
                          <td className="whitespace-nowrap py-3 pr-4 font-medium text-primary-600">
                            {formatTime(r.desired_time)}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4 font-medium text-warm-gray-700">
                            {r.class_name}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4 text-warm-gray-700">
                            {r.customer_name}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4 text-warm-gray-600">
                            {formatPhone(r.customer_phone)}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4 text-warm-gray-600">
                            {r.num_people ?? 1}명
                          </td>
                          <td className="whitespace-nowrap py-3 pr-4 text-warm-gray-600">
                            {formatPrice(r.price * (r.num_people ?? 1))}
                          </td>
                          <td className="whitespace-nowrap py-3 text-warm-gray-500">
                            {r.duration_minutes}분
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 lg:hidden">
                  {todayConfirmedSorted.map((r) => (
                    <TodayReservationCard key={r.id} reservation={r} />
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* ---- Weekly Calendar ---- */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-warm-gray-800">
                  이번 주 예약 캘린더
                </h2>
                <p className="mt-0.5 text-xs text-warm-gray-400">
                  {weekLabel} &middot; 확정 예약 기준
                </p>
              </div>
              <Link
                href="/admin/reservations"
                className="text-sm text-primary-500 transition-colors hover:text-primary-600"
              >
                전체 보기 &rarr;
              </Link>
            </div>
            <WeeklyCalendar
              weekDates={weekDates}
              reservationsByDate={weekConfirmedByDate}
              today={today}
            />
          </Card>
        </>
      )}
    </div>
  );
}
