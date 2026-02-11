"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge, Card, Button } from "@/components/ui";

interface NotificationItem {
  id: string;
  type: string;
  channel: string;
  recipient_phone: string;
  message: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  reservations: {
    customer_name: string;
    customer_phone: string;
  } | null;
}

const TYPE_LABELS: Record<string, string> = {
  approval: "승인(입금대기) 안내",
  confirmation: "확정(입금완료) 안내",
  rejection: "반려 안내",
  cancellation: "취소 안내",
  change_approved: "변경 승인",
  change_rejected: "변경 거절",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  sent: "발송 완료",
  failed: "발송 실패",
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleResend = async (notificationId: string) => {
    if (resendingId) return;
    setResendingId(notificationId);
    try {
      const res = await fetch("/api/admin/notifications/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "재발송에 실패했습니다.");
      } else {
        alert("재발송되었습니다.");
        fetchNotifications();
      }
    } catch {
      alert("재발송 중 오류가 발생했습니다.");
    } finally {
      setResendingId(null);
    }
  };

  const filtered =
    statusFilter === "all"
      ? notifications
      : notifications.filter((n) => n.status === statusFilter);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "sent":
        return "confirmed" as const;
      case "failed":
        return "rejected" as const;
      default:
        return "pending" as const;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-warm-gray-800">알림 로그</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-warm-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-warm-gray-800">알림 로그</h1>
        <button
          onClick={fetchNotifications}
          className="text-sm text-warm-gray-500 hover:text-warm-gray-700"
        >
          새로고침
        </button>
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "전체" },
          { key: "pending", label: "대기" },
          { key: "sent", label: "발송 완료" },
          { key: "failed", label: "실패" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-primary-500 text-white"
                : "bg-warm-gray-100 text-warm-gray-600 hover:bg-warm-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-warm-gray-400">
            알림 발송 내역이 없습니다.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* 데스크탑 테이블 */}
          <Card className="hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-gray-100 text-left text-xs text-warm-gray-500">
                    <th className="px-4 py-3 font-medium">상태</th>
                    <th className="px-4 py-3 font-medium">유형</th>
                    <th className="px-4 py-3 font-medium">채널</th>
                    <th className="px-4 py-3 font-medium">수신자</th>
                    <th className="px-4 py-3 font-medium">메시지</th>
                    <th className="px-4 py-3 font-medium">시각</th>
                    <th className="px-4 py-3 font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((n) => (
                    <tr
                      key={n.id}
                      className="border-b border-warm-gray-50 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(n.status)}>
                          {STATUS_LABELS[n.status] ?? n.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-warm-gray-700">
                        {TYPE_LABELS[n.type] ?? n.type}
                      </td>
                      <td className="px-4 py-3 text-warm-gray-600">
                        {n.channel === "kakao" ? "카카오" : "SMS"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-warm-gray-700">
                          {n.reservations?.customer_name}
                        </div>
                        <div className="text-xs text-warm-gray-400">
                          {n.recipient_phone}
                        </div>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-warm-gray-600">
                        {n.message}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-warm-gray-400">
                        {new Date(n.created_at).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3">
                        {n.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={resendingId === n.id}
                            onClick={() => handleResend(n.id)}
                          >
                            재발송
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 모바일 카드 */}
          <div className="space-y-3 md:hidden">
            {filtered.map((n) => (
              <Card key={n.id}>
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant={getStatusBadgeVariant(n.status)}>
                    {STATUS_LABELS[n.status] ?? n.status}
                  </Badge>
                  <span className="text-xs text-warm-gray-400">
                    {new Date(n.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>
                <div className="mb-1 text-sm font-medium text-warm-gray-700">
                  {TYPE_LABELS[n.type] ?? n.type} ·{" "}
                  {n.channel === "kakao" ? "카카오" : "SMS"}
                </div>
                <div className="mb-2 text-xs text-warm-gray-500">
                  {n.reservations?.customer_name} ({n.recipient_phone})
                </div>
                <p className="text-xs text-warm-gray-600 line-clamp-2">
                  {n.message}
                </p>
                {n.error_message && (
                  <p className="mt-1 text-xs text-error">{n.error_message}</p>
                )}
                {n.status === "failed" && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={resendingId === n.id}
                      onClick={() => handleResend(n.id)}
                    >
                      재발송
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-warm-gray-400">
        총 {filtered.length}건
      </p>
    </div>
  );
}
