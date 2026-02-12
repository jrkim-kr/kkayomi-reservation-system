"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Badge, Card, ConfirmModal } from "@/components/ui";
import { useRealtimeRefetch, notifyChange } from "@/hooks/useRealtimeRefetch";
import { formatDate, formatTime } from "@/lib/utils";
import type { ChangeRequestDetail, ChangeRequestStatus } from "@/types";

const STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
};

const STATUS_BADGE_VARIANT: Record<ChangeRequestStatus, "pending" | "approved" | "rejected"> = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
};

type FilterStatus = "all" | ChangeRequestStatus;

export default function AdminChangeRequestsPage() {
  const [requests, setRequests] = useState<ChangeRequestDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 거절 모달
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/change-requests");
      if (!res.ok) throw new Error("데이터를 불러올 수 없습니다.");
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useRealtimeRefetch({
    tables: ["change_requests"],
    onChange: fetchRequests,
  });

  const filteredRequests =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  // 승인 확인 모달
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);

  const handleApproveConfirm = async () => {
    if (!approveTargetId) return;
    setProcessingId(approveTargetId);
    setApproveTargetId(null);
    try {
      const res = await fetch(`/api/admin/change-requests/${approveTargetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("승인 처리에 실패했습니다.");
      notifyChange("change_requests");
      notifyChange("reservations");
      await fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectTargetId(id);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setRejectTargetId(null);
    setRejectReason("");
  };

  const handleReject = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      toast.error("거절 사유를 입력해주세요.");
      return;
    }

    setRejectLoading(true);
    try {
      const res = await fetch(`/api/admin/change-requests/${rejectTargetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reject_reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error("거절 처리에 실패했습니다.");
      closeRejectModal();
      notifyChange("change_requests");
      await fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setRejectLoading(false);
    }
  };

  const filters: { label: string; value: FilterStatus }[] = [
    { label: "전체", value: "all" },
    { label: "대기", value: "pending" },
    { label: "승인", value: "approved" },
    { label: "거절", value: "rejected" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-warm-gray-800">변경 요청 관리</h1>

      {/* 필터 */}
      <div className="mb-4 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-primary-500 text-white"
                : "bg-white text-warm-gray-600 hover:bg-warm-gray-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-error">{error}</div>
      )}

      {loading ? (
        <Card>
          <p className="py-8 text-center text-sm text-warm-gray-500">불러오는 중...</p>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-warm-gray-500">
            변경 요청이 없습니다.
          </p>
        </Card>
      ) : (
        <>
          {/* 데스크탑 테이블 */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-gray-100 bg-warm-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">상태</th>
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">수업</th>
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">예약자</th>
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">현재 일시</th>
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">변경 희망 일시</th>
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">변경 사유</th>
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">요청일</th>
                    <th className="px-4 py-3 text-left font-medium text-warm-gray-600">처리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b border-warm-gray-50 last:border-b-0 hover:bg-warm-gray-50/50"
                    >
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[req.status]}>
                          {STATUS_LABELS[req.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-warm-gray-700">{req.class_name}</td>
                      <td className="px-4 py-3">
                        <div className="text-warm-gray-800">{req.customer_name}</div>
                        <div className="text-xs text-warm-gray-500">{req.customer_phone}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-warm-gray-700">
                        {formatDate(req.current_date_)} {formatTime(req.current_time_)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-warm-gray-700">
                        {formatDate(req.requested_date)} {formatTime(req.requested_time)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-warm-gray-600">
                        {req.reason || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-warm-gray-500">
                        {formatDate(req.created_at.slice(0, 10))}
                      </td>
                      <td className="px-4 py-3">
                        {req.status === "pending" ? (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setApproveTargetId(req.id)}
                              isLoading={processingId === req.id}
                              disabled={processingId === req.id}
                            >
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => openRejectModal(req.id)}
                              disabled={processingId === req.id}
                            >
                              거절
                            </Button>
                          </div>
                        ) : req.status === "rejected" && req.reject_reason ? (
                          <span className="text-xs text-warm-gray-500" title={req.reject_reason}>
                            사유: {req.reject_reason.length > 15
                              ? req.reject_reason.slice(0, 15) + "..."
                              : req.reject_reason}
                          </span>
                        ) : (
                          <span className="text-xs text-warm-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 모바일 카드 리스트 */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredRequests.map((req) => (
              <Card key={req.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={STATUS_BADGE_VARIANT[req.status]}>
                    {STATUS_LABELS[req.status]}
                  </Badge>
                  <span className="text-xs text-warm-gray-500">
                    {formatDate(req.created_at.slice(0, 10))}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-warm-gray-800">{req.class_name}</p>
                  <p className="text-sm text-warm-gray-600">
                    {req.customer_name} ({req.customer_phone})
                  </p>
                </div>

                <div className="space-y-1 rounded-lg bg-warm-gray-50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-warm-gray-500">현재 일시</span>
                    <span className="text-warm-gray-700">
                      {formatDate(req.current_date_)} {formatTime(req.current_time_)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warm-gray-500">변경 희망</span>
                    <span className="font-medium text-warm-gray-800">
                      {formatDate(req.requested_date)} {formatTime(req.requested_time)}
                    </span>
                  </div>
                </div>

                {req.reason && (
                  <p className="text-sm text-warm-gray-600">
                    <span className="text-warm-gray-500">사유:</span> {req.reason}
                  </p>
                )}

                {req.status === "rejected" && req.reject_reason && (
                  <p className="text-sm text-error">
                    <span className="font-medium">거절 사유:</span> {req.reject_reason}
                  </p>
                )}

                {req.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1"
                      onClick={() => setApproveTargetId(req.id)}
                      isLoading={processingId === req.id}
                      disabled={processingId === req.id}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="flex-1"
                      onClick={() => openRejectModal(req.id)}
                      disabled={processingId === req.id}
                    >
                      거절
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 거절 사유 모달 */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeRejectModal} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-warm-gray-800">거절 사유 입력</h2>
            <textarea
              className="w-full rounded-lg border border-warm-gray-200 px-3 py-2.5 text-sm text-warm-gray-800 placeholder-warm-gray-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              rows={3}
              placeholder="거절 사유를 입력해주세요"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={closeRejectModal}
                disabled={rejectLoading}
              >
                취소
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleReject}
                isLoading={rejectLoading}
              >
                거절하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 승인 확인 모달 */}
      <ConfirmModal
        open={approveTargetId !== null}
        title="변경 요청 승인"
        message="이 변경 요청을 승인하시겠습니까?"
        confirmLabel="승인"
        onConfirm={handleApproveConfirm}
        onCancel={() => setApproveTargetId(null)}
      />
    </div>
  );
}
