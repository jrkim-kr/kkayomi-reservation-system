"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button, Card } from "@/components/ui";
import type { FAQ } from "@/types";

// ---------------------------------------------------------------------------
// FAQ Form Modal
// ---------------------------------------------------------------------------

function FAQFormModal({
  faq,
  onSave,
  onCancel,
  isLoading,
}: {
  faq: FAQ | null; // null = 신규 등록
  onSave: (data: { question: string; answer: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const questionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    questionRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleSubmit = () => {
    if (!question.trim() || !answer.trim()) return;
    onSave({ question: question.trim(), answer: answer.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-warm-gray-800">
          {faq ? "FAQ 수정" : "FAQ 추가"}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-warm-gray-700">
              질문
            </label>
            <input
              ref={questionRef}
              className="w-full rounded-lg border border-warm-gray-200 px-3 py-2.5 text-sm text-warm-gray-800 placeholder-warm-gray-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="질문을 입력하세요"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-warm-gray-700">
              답변
            </label>
            <textarea
              className="w-full rounded-lg border border-warm-gray-200 px-3 py-2.5 text-sm text-warm-gray-800 placeholder-warm-gray-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              rows={4}
              placeholder="답변을 입력하세요"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!question.trim() || !answer.trim()}
            isLoading={isLoading}
            onClick={handleSubmit}
          >
            {faq ? "수정" : "등록"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  faqQuestion,
  onConfirm,
  onCancel,
  isLoading,
}: {
  faqQuestion: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
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
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-bold text-warm-gray-800">
          FAQ 삭제
        </h3>
        <p className="mb-2 text-sm text-warm-gray-500">
          다음 FAQ를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <p className="mb-4 rounded-lg bg-warm-gray-50 px-3 py-2 text-sm font-medium text-warm-gray-700">
          {faqQuestion}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            삭제
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------

function FAQSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl bg-warm-gray-100"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminFAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [formModal, setFormModal] = useState<{
    open: boolean;
    faq: FAQ | null;
  }>({ open: false, faq: null });
  const [formLoading, setFormLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FAQ | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // sort 변경 중인 FAQ id
  const [sortingId, setSortingId] = useState<string | null>(null);

  // 토글 중인 FAQ id
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ---- Data fetching ----

  const fetchFAQs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/faqs");
      if (!res.ok) throw new Error();
      const data: FAQ[] = await res.json();
      setFaqs(data);
    } catch {
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  // ---- Create / Update ----

  const handleSave = useCallback(
    async (data: { question: string; answer: string }) => {
      setFormLoading(true);
      try {
        const isEdit = formModal.faq !== null;
        const url = isEdit
          ? `/api/admin/faqs/${formModal.faq!.id}`
          : "/api/admin/faqs";
        const method = isEdit ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.error ?? (isEdit ? "수정에 실패했습니다." : "등록에 실패했습니다.")
          );
        }

        setFormModal({ open: false, faq: null });
        await fetchFAQs();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "요청 처리에 실패했습니다."
        );
      } finally {
        setFormLoading(false);
      }
    },
    [formModal.faq, fetchFAQs]
  );

  // ---- Delete ----

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/faqs/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error ?? "삭제에 실패했습니다.");
      }
      setDeleteTarget(null);
      await fetchFAQs();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "삭제 처리에 실패했습니다."
      );
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, fetchFAQs]);

  // ---- Sort order change ----

  const handleSortChange = useCallback(
    async (faqId: string, direction: "up" | "down") => {
      const idx = faqs.findIndex((f) => f.id === faqId);
      if (idx === -1) return;
      if (direction === "up" && idx === 0) return;
      if (direction === "down" && idx === faqs.length - 1) return;

      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      const currentFaq = faqs[idx];
      const swapFaq = faqs[swapIdx];

      setSortingId(faqId);
      try {
        // 두 FAQ의 sort_order를 서로 교환
        const [res1, res2] = await Promise.all([
          fetch(`/api/admin/faqs/${currentFaq.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: swapFaq.sort_order }),
          }),
          fetch(`/api/admin/faqs/${swapFaq.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: currentFaq.sort_order }),
          }),
        ]);

        if (!res1.ok || !res2.ok) {
          throw new Error("순서 변경에 실패했습니다.");
        }

        await fetchFAQs();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "순서 변경에 실패했습니다."
        );
      } finally {
        setSortingId(null);
      }
    },
    [faqs, fetchFAQs]
  );

  // ---- Toggle is_active ----

  const handleToggleActive = useCallback(
    async (faq: FAQ) => {
      setTogglingId(faq.id);
      try {
        const res = await fetch(`/api/admin/faqs/${faq.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !faq.is_active }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? "상태 변경에 실패했습니다.");
        }

        await fetchFAQs();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "상태 변경에 실패했습니다."
        );
      } finally {
        setTogglingId(null);
      }
    },
    [fetchFAQs]
  );

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-warm-gray-800">FAQ 관리</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFAQs}>
            새로고침
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setFormModal({ open: true, faq: null })}
          >
            FAQ 추가
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && <FAQSkeleton />}

      {/* Empty State */}
      {!loading && faqs.length === 0 && (
        <Card className="py-12 text-center">
          <p className="text-warm-gray-400">등록된 FAQ가 없습니다.</p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={() => setFormModal({ open: true, faq: null })}
          >
            첫 FAQ 등록하기
          </Button>
        </Card>
      )}

      {/* Desktop Table */}
      {!loading && faqs.length > 0 && (
        <div className="hidden overflow-x-auto md:block">
          <Card className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-gray-100 text-left">
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-warm-gray-500">
                    순서
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-warm-gray-500">
                    질문
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-warm-gray-500">
                    답변
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-warm-gray-500">
                    공개
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-warm-gray-500">
                    정렬
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-warm-gray-500">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody>
                {faqs.map((faq, idx) => (
                  <tr
                    key={faq.id}
                    className={`border-b border-warm-gray-50 transition-colors hover:bg-warm-gray-50/50 last:border-b-0 ${
                      !faq.is_active ? "opacity-50" : ""
                    }`}
                  >
                    {/* 순서 번호 */}
                    <td className="whitespace-nowrap px-4 py-3 text-center text-warm-gray-400">
                      {faq.sort_order}
                    </td>

                    {/* 질문 */}
                    <td className="max-w-[250px] px-4 py-3">
                      <p className="truncate font-medium text-warm-gray-800">
                        {faq.question}
                      </p>
                    </td>

                    {/* 답변 */}
                    <td className="max-w-[300px] px-4 py-3">
                      <p className="truncate text-warm-gray-600">
                        {faq.answer}
                      </p>
                    </td>

                    {/* 공개 토글 */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(faq)}
                        disabled={togglingId === faq.id}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                          faq.is_active ? "bg-primary-500" : "bg-warm-gray-200"
                        }`}
                        role="switch"
                        aria-checked={faq.is_active}
                        aria-label={faq.is_active ? "공개 상태" : "비공개 상태"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                            faq.is_active ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>

                    {/* 정렬 화살표 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSortChange(faq.id, "up")}
                          disabled={idx === 0 || sortingId === faq.id}
                          className="rounded p-1 text-warm-gray-400 transition-colors hover:bg-warm-gray-100 hover:text-warm-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="위로 이동"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSortChange(faq.id, "down")}
                          disabled={
                            idx === faqs.length - 1 || sortingId === faq.id
                          }
                          className="rounded p-1 text-warm-gray-400 transition-colors hover:bg-warm-gray-100 hover:text-warm-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="아래로 이동"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>

                    {/* 관리 버튼 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFormModal({ open: true, faq })
                          }
                        >
                          수정
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTarget(faq)}
                        >
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Mobile Cards */}
      {!loading && faqs.length > 0 && (
        <div className="space-y-3 md:hidden">
          {faqs.map((faq, idx) => (
            <Card
              key={faq.id}
              className={`space-y-3 ${!faq.is_active ? "opacity-50" : ""}`}
            >
              {/* 상단: 순서 + 공개 토글 */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-warm-gray-400">
                  #{faq.sort_order}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-warm-gray-500">
                    {faq.is_active ? "공개" : "비공개"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(faq)}
                    disabled={togglingId === faq.id}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      faq.is_active ? "bg-primary-500" : "bg-warm-gray-200"
                    }`}
                    role="switch"
                    aria-checked={faq.is_active}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                        faq.is_active ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 질문 & 답변 */}
              <div>
                <p className="text-sm font-semibold text-warm-gray-800">
                  Q. {faq.question}
                </p>
                <p className="mt-1 text-sm text-warm-gray-600 line-clamp-3">
                  A. {faq.answer}
                </p>
              </div>

              {/* 하단 액션 */}
              <div className="flex items-center justify-between border-t border-warm-gray-100 pt-3">
                {/* 정렬 */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSortChange(faq.id, "up")}
                    disabled={idx === 0 || sortingId === faq.id}
                    className="rounded p-1.5 text-warm-gray-400 transition-colors hover:bg-warm-gray-100 hover:text-warm-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="위로 이동"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSortChange(faq.id, "down")}
                    disabled={
                      idx === faqs.length - 1 || sortingId === faq.id
                    }
                    className="rounded p-1.5 text-warm-gray-400 transition-colors hover:bg-warm-gray-100 hover:text-warm-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="아래로 이동"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>

                {/* 수정/삭제 */}
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormModal({ open: true, faq })}
                  >
                    수정
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteTarget(faq)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && faqs.length > 0 && (
        <p className="text-center text-xs text-warm-gray-400">
          총 {faqs.length}건
        </p>
      )}

      {/* FAQ Form Modal */}
      {formModal.open && (
        <FAQFormModal
          faq={formModal.faq}
          onSave={handleSave}
          onCancel={() => setFormModal({ open: false, faq: null })}
          isLoading={formLoading}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          faqQuestion={deleteTarget.question}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteLoading}
        />
      )}
    </div>
  );
}
