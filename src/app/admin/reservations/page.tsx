"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Button, Input, Badge, Card } from "@/components/ui";
import {
  STATUS_LABELS,
  formatDate,
  formatTime,
  formatPrice,
  formatPhone,
} from "@/lib/utils";
import type { ReservationDetail, ReservationStatus, ChangeRequestDetail } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS: {
  key: ReservationStatus | "all" | "cancel_requested" | "change_requested";
  label: string;
}[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "입금 대기" },
  { key: "confirmed", label: "확정(입금 완료)" },
  { key: "change_requested", label: "변경 요청" },
  { key: "cancel_requested", label: "취소 요청" },
  { key: "rejected", label: "반려" },
  { key: "cancelled", label: "취소" },
];

// ---------------------------------------------------------------------------
// Reject Reason Modal
// ---------------------------------------------------------------------------

function RejectModal({
  onConfirm,
  onCancel,
  isLoading,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-bold text-warm-gray-800">
          반려 사유 입력
        </h3>
        <p className="mb-4 text-sm text-warm-gray-500">
          고객에게 전달될 반려 사유를 입력해 주세요.
        </p>

        <Input
          ref={inputRef}
          placeholder="반려 사유를 입력하세요"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && reason.trim()) onConfirm(reason.trim());
          }}
        />

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            취소
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!reason.trim()}
            isLoading={isLoading}
            onClick={() => onConfirm(reason.trim())}
          >
            반려 처리
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Admin Memo Editor
// ---------------------------------------------------------------------------

function AdminMemoEditor({
  reservationId,
  initialValue,
}: {
  reservationId: string;
  initialValue: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local state in sync when parent data refreshes
  useEffect(() => {
    if (!editing) setValue(initialValue ?? "");
  }, [initialValue, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = useCallback(async () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed === (initialValue ?? "")) return;

    setSaving(true);
    try {
      await fetch(`/api/admin/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_memo: trimmed || null }),
      });
    } catch {
      // Silently revert on error
      setValue(initialValue ?? "");
    } finally {
      setSaving(false);
    }
  }, [reservationId, value, initialValue]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-full min-w-[120px] rounded border border-primary-300 px-2 py-1 text-xs text-warm-gray-700 outline-none focus:ring-2 focus:ring-primary-200"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setValue(initialValue ?? "");
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="w-full min-w-[120px] cursor-pointer rounded px-2 py-1 text-left text-xs text-warm-gray-500 hover:bg-warm-gray-50"
      onClick={() => setEditing(true)}
    >
      {saving ? (
        <span className="italic text-warm-gray-400">저장 중...</span>
      ) : value ? (
        <span className="text-warm-gray-700">{value}</span>
      ) : (
        <span className="italic">메모 추가...</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Action Buttons (per row)
// ---------------------------------------------------------------------------

function ActionButtons({
  reservation,
  onAction,
  loadingAction,
  hasChangeRequest,
}: {
  reservation: ReservationDetail;
  onAction: (
    id: string,
    action: "reject" | "confirm" | "cancel" | "cancel_reject"
  ) => void;
  loadingAction: { id: string; action: string } | null;
  hasChangeRequest?: boolean;
}) {
  const isLoading = (action: string) =>
    loadingAction?.id === reservation.id &&
    loadingAction?.action === action;

  switch (reservation.status) {
    case "pending":
      return (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="primary"
            isLoading={isLoading("confirm")}
            onClick={() => onAction(reservation.id, "confirm")}
          >
            입금 확인
          </Button>
          <Button
            size="sm"
            variant="danger"
            isLoading={isLoading("reject")}
            onClick={() => onAction(reservation.id, "reject")}
          >
            반려
          </Button>
        </div>
      );
    case "confirmed":
      if (reservation.cancel_reason != null) {
        return (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="danger"
              isLoading={isLoading("cancel")}
              onClick={() => onAction(reservation.id, "cancel")}
            >
              취소 승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              isLoading={isLoading("cancel_reject")}
              onClick={() => onAction(reservation.id, "cancel_reject")}
            >
              취소 반려
            </Button>
          </div>
        );
      }
      return (
        <div className="flex gap-1.5">
          {hasChangeRequest && (
            <Link href="/admin/change-requests">
              <Button size="sm" variant="primary">
                변경 요청 관리
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            variant="outline"
            isLoading={isLoading("cancel")}
            onClick={() => onAction(reservation.id, "cancel")}
          >
            취소 처리
          </Button>
        </div>
      );
    default:
      return <span className="text-xs text-warm-gray-400">-</span>;
  }
}

// ---------------------------------------------------------------------------
// Mobile Card
// ---------------------------------------------------------------------------

function ReservationCard({
  reservation,
  onAction,
  loadingAction,
  hasChangeRequest,
}: {
  reservation: ReservationDetail;
  onAction: (
    id: string,
    action: "reject" | "confirm" | "cancel" | "cancel_reject"
  ) => void;
  loadingAction: { id: string; action: string } | null;
  hasChangeRequest?: boolean;
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Badge variant={reservation.status}>
              {STATUS_LABELS[reservation.status]}
            </Badge>
            {hasChangeRequest && (
              <Badge variant="pending">변경 요청</Badge>
            )}
            {reservation.status === "confirmed" &&
              reservation.cancel_reason != null && (
                <Badge variant="rejected">취소 요청</Badge>
              )}
          </div>
          <p className="text-sm font-semibold text-warm-gray-800">
            {reservation.class_name}
          </p>
        </div>
        <p className="shrink-0 text-xs text-warm-gray-400">
          {formatDate(reservation.created_at.slice(0, 10))}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div>
          <span className="text-warm-gray-400">예약자</span>
          <p className="font-medium text-warm-gray-700">
            {reservation.customer_name}
          </p>
        </div>
        <div>
          <span className="text-warm-gray-400">연락처</span>
          <p className="font-medium text-warm-gray-700">
            {formatPhone(reservation.customer_phone)}
          </p>
        </div>
        <div>
          <span className="text-warm-gray-400">입금자명</span>
          <p className="font-medium text-warm-gray-700">
            {reservation.depositor_name}
          </p>
        </div>
        <div>
          <span className="text-warm-gray-400">희망일시</span>
          <p className="font-medium text-warm-gray-700">
            {formatDate(reservation.desired_date)}{" "}
            {formatTime(reservation.desired_time)}
          </p>
        </div>
        <div>
          <span className="text-warm-gray-400">인원</span>
          <p className="font-medium text-warm-gray-700">
            {reservation.num_people ?? 1}명
          </p>
        </div>
        <div>
          <span className="text-warm-gray-400">금액</span>
          <p className="font-medium text-warm-gray-700">
            {formatPrice(reservation.price * (reservation.num_people ?? 1))}
          </p>
        </div>
        <div>
          <span className="text-warm-gray-400">소요시간</span>
          <p className="font-medium text-warm-gray-700">
            {reservation.duration_minutes}분
          </p>
        </div>
      </div>

      {reservation.customer_memo && (
        <div className="text-sm">
          <span className="text-warm-gray-400">고객 메모</span>
          <p className="text-warm-gray-600">{reservation.customer_memo}</p>
        </div>
      )}

      {reservation.reject_reason && (
        <div className="text-sm">
          <span className="text-warm-gray-400">반려 사유</span>
          <p className="text-error">{reservation.reject_reason}</p>
        </div>
      )}

      {reservation.status === "confirmed" &&
        reservation.cancel_reason != null && (
          <div className="rounded-lg bg-red-50 p-3 text-sm">
            <span className="font-semibold text-error">취소 요청</span>
            {reservation.cancel_reason && (
              <p className="mt-1 text-error">{reservation.cancel_reason}</p>
            )}
          </div>
        )}

      <div className="text-sm">
        <span className="text-warm-gray-400">관리자 메모</span>
        <AdminMemoEditor
          reservationId={reservation.id}
          initialValue={reservation.admin_memo}
        />
      </div>

      <div className="flex justify-end border-t border-warm-gray-100 pt-3">
        <ActionButtons
          reservation={reservation}
          onAction={onAction}
          loadingAction={loadingAction}
          hasChangeRequest={hasChangeRequest}
        />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loaders
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg bg-warm-gray-100"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    ReservationStatus | "all" | "cancel_requested" | "change_requested"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingAction, setLoadingAction] = useState<{
    id: string;
    action: string;
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  // 변경 요청 데이터
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDetail[]>([]);

  // ---- Data fetching ----

  const fetchReservations = useCallback(async () => {
    try {
      setError(null);
      const [resReservations, resChangeRequests] = await Promise.all([
        fetch("/api/admin/reservations"),
        fetch("/api/admin/change-requests"),
      ]);
      if (!resReservations.ok) throw new Error("예약 목록을 불러오지 못했습니다.");
      const data: ReservationDetail[] = await resReservations.json();
      setReservations(data);

      if (resChangeRequests.ok) {
        const crData: ChangeRequestDetail[] = await resChangeRequests.json();
        setChangeRequests(crData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // ---- 변경 요청 중인 예약 ID Set ----

  const pendingChangeReservationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const cr of changeRequests) {
      if (cr.status === "pending") ids.add(cr.reservation_id);
    }
    return ids;
  }, [changeRequests]);

  // ---- Filtering ----

  const filtered = reservations.filter((r) => {
    if (statusFilter === "change_requested") {
      if (!pendingChangeReservationIds.has(r.id)) return false;
    } else if (statusFilter === "cancel_requested") {
      if (!(r.status === "confirmed" && r.cancel_reason != null)) return false;
    } else if (statusFilter !== "all" && r.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const phoneDigits = r.customer_phone.replace(/\D/g, "");
      const queryDigits = q.replace(/\D/g, "");
      return (
        r.customer_name.toLowerCase().includes(q) ||
        (queryDigits && phoneDigits.includes(queryDigits)) ||
        r.customer_phone.includes(q)
      );
    }
    return true;
  });

  // ---- PATCH helper ----

  const patchReservation = useCallback(
    async (
      id: string,
      body: {
        status?: ReservationStatus;
        admin_memo?: string | null;
        reject_reason?: string | null;
        cancel_reason?: string | null;
      }
    ) => {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "요청 처리에 실패했습니다.");
      }
      return res.json();
    },
    []
  );

  // ---- Actions ----

  const handleAction = useCallback(
    async (
      id: string,
      action: "reject" | "confirm" | "cancel" | "cancel_reject"
    ) => {
      if (action === "reject") {
        setRejectTarget(id);
        return;
      }

      if (action === "cancel_reject") {
        if (!confirm("취소 요청을 반려하시겠습니까? 예약은 확정 상태로 유지됩니다.")) return;
        setLoadingAction({ id, action });
        try {
          await patchReservation(id, { cancel_reason: null });
          await fetchReservations();
        } catch (err) {
          alert(
            err instanceof Error ? err.message : "취소 반려 처리에 실패했습니다."
          );
        } finally {
          setLoadingAction(null);
        }
        return;
      }

      const statusMap: Record<string, ReservationStatus> = {
        confirm: "confirmed",
        cancel: "cancelled",
      };

      setLoadingAction({ id, action });
      try {
        const body: Record<string, unknown> = { status: statusMap[action] };
        // 취소 승인 시 이전 취소 반려 사유 클리어
        if (action === "cancel") body.reject_reason = null;
        await patchReservation(id, body);
        await fetchReservations();
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "요청 처리에 실패했습니다."
        );
      } finally {
        setLoadingAction(null);
      }
    },
    [patchReservation, fetchReservations]
  );

  const handleReject = useCallback(
    async (reason: string) => {
      if (!rejectTarget) return;
      setRejectLoading(true);
      try {
        await patchReservation(rejectTarget, {
          status: "rejected",
          reject_reason: reason,
        });
        setRejectTarget(null);
        await fetchReservations();
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "반려 처리에 실패했습니다."
        );
      } finally {
        setRejectLoading(false);
      }
    },
    [rejectTarget, patchReservation, fetchReservations]
  );

  // ---- Sorting ----

  type SortKey =
    | "status"
    | "class_name"
    | "customer_name"
    | "customer_phone"
    | "depositor_name"
    | "desired_date"
    | "created_at";
  type SortDirection = "asc" | "desc";

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else {
          // desc → clear sort
          setSortKey(null);
          setSortDirection("asc");
        }
      } else {
        setSortKey(key);
        setSortDirection("asc");
      }
    },
    [sortKey, sortDirection]
  );

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string;
      let bVal: string;
      switch (sortKey) {
        case "desired_date":
          aVal = `${a.desired_date} ${a.desired_time}`;
          bVal = `${b.desired_date} ${b.desired_time}`;
          break;
        case "created_at":
          aVal = a.created_at;
          bVal = b.created_at;
          break;
        default:
          aVal = a[sortKey] ?? "";
          bVal = b[sortKey] ?? "";
      }
      const cmp = aVal.localeCompare(bVal, "ko");
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDirection]);

  // ---- Status tab counts ----

  const counts: Record<ReservationStatus | "all" | "cancel_requested" | "change_requested", number> =
    {
      all: reservations.length,
      pending: reservations.filter((r) => r.status === "pending").length,
      confirmed: reservations.filter((r) => r.status === "confirmed").length,
      change_requested: pendingChangeReservationIds.size,
      cancel_requested: reservations.filter(
        (r) => r.status === "confirmed" && r.cancel_reason != null
      ).length,
      rejected: reservations.filter((r) => r.status === "rejected").length,
      cancelled: reservations.filter((r) => r.status === "cancelled").length,
    };

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-warm-gray-800">예약 관리</h1>
        <Button variant="outline" size="sm" onClick={fetchReservations}>
          새로고침
        </Button>
      </div>

      {/* Filters */}
      <Card className="space-y-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary-500 text-white"
                  : "bg-warm-gray-100 text-warm-gray-600 hover:bg-warm-gray-200"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs ${
                  statusFilter === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-warm-gray-200 text-warm-gray-500"
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="max-w-sm">
          <Input
            placeholder="이름 / 연락처 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-error">
          <p className="font-medium">오류가 발생했습니다</p>
          <p className="mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={fetchReservations}
          >
            다시 시도
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && <TableSkeleton />}

      {/* Empty State */}
      {!loading && !error && sorted.length === 0 && (
        <Card className="py-12 text-center">
          <p className="text-warm-gray-400">
            {reservations.length === 0
              ? "아직 예약이 없습니다."
              : "검색 조건에 맞는 예약이 없습니다."}
          </p>
        </Card>
      )}

      {/* Desktop Table */}
      {!loading && sorted.length > 0 && (
        <div className="hidden lg:block">
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-gray-100 text-left">
                  {(
                    [
                      { key: "status", label: "상태" },
                      { key: "class_name", label: "수업" },
                      { key: "customer_name", label: "예약자" },
                      { key: "customer_phone", label: "연락처" },
                      { key: "depositor_name", label: "입금자명" },
                      { key: null, label: "인원" },
                      { key: "desired_date", label: "희망일시" },
                      { key: "created_at", label: "신청일" },
                      { key: null, label: "관리자 메모" },
                      { key: null, label: "액션" },
                    ] as const
                  ).map((col) =>
                    col.key ? (
                      <th
                        key={col.label}
                        className="whitespace-nowrap px-4 py-3 font-semibold text-warm-gray-500 cursor-pointer select-none hover:text-warm-gray-700 transition-colors"
                        onClick={() => handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key ? (
                            <span className="text-primary-500">
                              {sortDirection === "asc" ? "▼" : "▲"}
                            </span>
                          ) : (
                            <span className="text-warm-gray-300">▼</span>
                          )}
                        </span>
                      </th>
                    ) : (
                      <th
                        key={col.label}
                        className="whitespace-nowrap px-4 py-3 font-semibold text-warm-gray-500"
                      >
                        {col.label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-warm-gray-50 transition-colors hover:bg-warm-gray-50/50 last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={r.status}>
                          {STATUS_LABELS[r.status]}
                        </Badge>
                        {pendingChangeReservationIds.has(r.id) && (
                          <Badge variant="pending">변경 요청</Badge>
                        )}
                        {r.status === "confirmed" &&
                          r.cancel_reason != null && (
                            <Badge variant="rejected">취소 요청</Badge>
                          )}
                      </div>
                      {r.status === "confirmed" &&
                        r.cancel_reason != null &&
                        r.cancel_reason && (
                          <p className="mt-1 max-w-[200px] truncate text-xs text-error">
                            사유: {r.cancel_reason}
                          </p>
                        )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-warm-gray-700">
                      {r.class_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-warm-gray-700">
                      {r.customer_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-warm-gray-600">
                      {formatPhone(r.customer_phone)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-warm-gray-600">
                      {r.depositor_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-warm-gray-700">
                      {r.num_people ?? 1}명
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-warm-gray-700">
                      {formatDate(r.desired_date)}{" "}
                      <span className="text-warm-gray-400">
                        {formatTime(r.desired_time)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-warm-gray-400">
                      {formatDate(r.created_at.slice(0, 10))}
                    </td>
                    <td className="px-4 py-3">
                      <AdminMemoEditor
                        reservationId={r.id}
                        initialValue={r.admin_memo}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActionButtons
                        reservation={r}
                        onAction={handleAction}
                        loadingAction={loadingAction}
                        hasChangeRequest={pendingChangeReservationIds.has(r.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        </div>
      )}

      {/* Mobile Cards */}
      {!loading && sorted.length > 0 && (
        <div className="space-y-3 lg:hidden">
          {sorted.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onAction={handleAction}
              loadingAction={loadingAction}
              hasChangeRequest={pendingChangeReservationIds.has(r.id)}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && sorted.length > 0 && (
        <p className="text-center text-xs text-warm-gray-400">
          총 {sorted.length}건
        </p>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          onConfirm={handleReject}
          onCancel={() => setRejectTarget(null)}
          isLoading={rejectLoading}
        />
      )}
    </div>
  );
}
