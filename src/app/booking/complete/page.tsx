"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { Suspense, useEffect, useState } from "react";

interface BankInfo {
  bank: string;
  account_number: string;
  account_holder: string;
}

function CompleteContent() {
  const params = useSearchParams();
  const className = params.get("class") ?? "";
  const date = params.get("date") ?? "";
  const time = params.get("time") ?? "";
  const duration = params.get("duration") ?? "";
  const price = params.get("price") ?? "";
  const name = params.get("name") ?? "";
  const phone = params.get("phone") ?? "";
  const people = params.get("people") ?? "1";
  const depositor = params.get("depositor") ?? "";

  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [depositDeadlineHours, setDepositDeadlineHours] = useState(72);

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

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-16">
      <div className="mb-6 text-center">
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
          예약 신청이 완료되었습니다
        </h1>
        <p className="mt-2 text-sm text-warm-gray-500">
          아래 계좌로 입금해 주시면 확정 안내를 드립니다.
        </p>
      </div>

      {/* 입금 안내 */}
      {bankInfo && (
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800">입금 안내</p>
          <p className="mt-2 text-sm font-medium text-blue-700">
            {bankInfo.bank} {bankInfo.account_number} ({bankInfo.account_holder})
          </p>
          {price && (
            <p className="mt-1 text-sm font-medium text-blue-700">
              입금 금액: {formatPrice(Number(price) * Number(people))}
            </p>
          )}
          <p className="mt-1 text-xs text-blue-600">
            신청 후 {depositDeadlineHours}시간 이내 입금해 주세요.
          </p>
        </div>
      )}

      {/* 예약 내용 확인 */}
      {className && (
        <Card className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-warm-gray-600">
            예약 내용 확인
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-warm-gray-400">수업</dt>
              <dd className="font-medium text-warm-gray-800">{className}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-warm-gray-400">날짜</dt>
              <dd className="font-medium text-warm-gray-800">{date}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-warm-gray-400">시간</dt>
              <dd className="font-medium text-warm-gray-800">{time}</dd>
            </div>
            {duration && (
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">소요시간</dt>
                <dd className="font-medium text-warm-gray-800">
                  약 {duration}분
                </dd>
              </div>
            )}
            {Number(people) > 1 && (
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">인원</dt>
                <dd className="font-medium text-warm-gray-800">
                  {people}명
                </dd>
              </div>
            )}
            {price && (
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">가격</dt>
                <dd className="font-medium text-warm-gray-800">
                  {formatPrice(Number(price) * Number(people))}
                  {Number(people) > 1 && (
                    <span className="ml-1 text-xs text-warm-gray-400">
                      ({formatPrice(Number(price))} × {people})
                    </span>
                  )}
                </dd>
              </div>
            )}
            <hr className="border-warm-gray-100" />
            <div className="flex justify-between">
              <dt className="text-warm-gray-400">예약자</dt>
              <dd className="font-medium text-warm-gray-800">{name}</dd>
            </div>
            {phone && (
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">연락처</dt>
                <dd className="font-medium text-warm-gray-800">{phone}</dd>
              </div>
            )}
            {depositor && (
              <div className="flex justify-between">
                <dt className="text-warm-gray-400">입금자명</dt>
                <dd className="font-medium text-warm-gray-800">{depositor}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      <div className="flex gap-3">
        <Link href="/" className="flex-1">
          <Button variant="outline" size="lg" className="w-full">
            홈으로 돌아가기
          </Button>
        </Link>
        <Link href="/mypage" className="flex-1">
          <Button size="lg" className="w-full">
            예약 현황 보러가기
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function BookingCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-warm-gray-400">불러오는 중...</p>
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
