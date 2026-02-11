"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, Card } from "@/components/ui";
import type { AdminSetting } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BankInfo {
  bank: string;
  account_number: string;
  account_holder: string;
}

interface SettingsForm {
  bank_info: BankInfo;
  deposit_deadline_hours: string;
  workshop_address: string;
  instagram_handle: string;
  kakao_channel_id: string;
  sms_sender_number: string;
  kakao_enabled: boolean;
}

const DEFAULT_FORM: SettingsForm = {
  bank_info: { bank: "", account_number: "", account_holder: "" },
  deposit_deadline_hours: "72",
  workshop_address: "",
  instagram_handle: "",
  kakao_channel_id: "",
  sms_sender_number: "",
  kakao_enabled: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function settingsToForm(settings: AdminSetting[]): SettingsForm {
  const form = { ...DEFAULT_FORM };
  for (const s of settings) {
    switch (s.key) {
      case "bank_info":
        form.bank_info = s.value as BankInfo;
        break;
      case "deposit_deadline_hours":
        form.deposit_deadline_hours = String(s.value ?? "72");
        break;
      case "workshop_address":
        form.workshop_address = String(s.value ?? "");
        break;
      case "instagram_handle":
        form.instagram_handle = String(s.value ?? "");
        break;
      case "kakao_channel_id":
        form.kakao_channel_id = String(s.value ?? "");
        break;
      case "sms_sender_number":
        form.sms_sender_number = String(s.value ?? "");
        break;
      case "kakao_enabled":
        form.kakao_enabled = s.value === true;
        break;
    }
  }
  return form;
}

function formToPayload(form: SettingsForm) {
  return [
    { key: "bank_info", value: form.bank_info },
    { key: "deposit_deadline_hours", value: Number(form.deposit_deadline_hours) },
    { key: "workshop_address", value: form.workshop_address },
    { key: "instagram_handle", value: form.instagram_handle },
    { key: "kakao_channel_id", value: form.kakao_channel_id },
    { key: "sms_sender_number", value: form.sms_sender_number },
    { key: "kakao_enabled", value: form.kakao_enabled },
  ];
}

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-warm-gray-800">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-warm-gray-400">{description}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl bg-warm-gray-100"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ---- Fetch settings ----

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error();
      const data: AdminSetting[] = await res.json();
      setForm(settingsToForm(data));
    } catch {
      setForm(DEFAULT_FORM);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ---- Save settings ----

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: formToPayload(form) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "설정 저장에 실패했습니다.");
      }

      setSuccessMessage("설정이 저장되었습니다.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "설정 저장에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---- Form helpers ----

  const updateField = <K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateBankInfo = <K extends keyof BankInfo>(
    field: K,
    value: BankInfo[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      bank_info: { ...prev.bank_info, [field]: value },
    }));
  };

  // ---- Render ----

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-warm-gray-800">환경 설정</h1>
        <p className="mt-1 text-sm text-warm-gray-400">
          예약 시스템의 기본 설정을 관리합니다.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-error">
          <p className="font-medium">오류가 발생했습니다</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Success */}
      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-success">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* Loading */}
      {loading && <SettingsSkeleton />}

      {/* Form */}
      {!loading && (
        <div className="space-y-6">
          {/* ---- 입금 정보 ---- */}
          <Card>
            <SectionTitle
              title="입금 정보"
              description="고객에게 안내되는 입금 계좌 정보입니다."
            />
            <div className="space-y-3">
              <Input
                id="bank"
                label="은행명"
                placeholder="예: 카카오뱅크"
                value={form.bank_info.bank}
                onChange={(e) => updateBankInfo("bank", e.target.value)}
              />
              <Input
                id="account_number"
                label="계좌번호"
                placeholder="예: 3333-01-1234567"
                value={form.bank_info.account_number}
                onChange={(e) =>
                  updateBankInfo("account_number", e.target.value)
                }
              />
              <Input
                id="account_holder"
                label="예금주"
                placeholder="예: 홍길동"
                value={form.bank_info.account_holder}
                onChange={(e) =>
                  updateBankInfo("account_holder", e.target.value)
                }
              />
            </div>
          </Card>

          {/* ---- 입금 기한 ---- */}
          <Card>
            <SectionTitle
              title="입금 기한"
              description="예약 신청 후 입금 기한을 설정합니다."
            />
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-warm-gray-600">
                신청 후
              </span>
              <Input
                id="deposit_deadline_hours"
                type="number"
                min={1}
                max={720}
                className="max-w-[80px] text-center"
                value={form.deposit_deadline_hours}
                onChange={(e) =>
                  updateField("deposit_deadline_hours", e.target.value)
                }
              />
              <span className="shrink-0 text-sm text-warm-gray-600">
                시간 이내
              </span>
            </div>
          </Card>

          {/* ---- 공방 정보 ---- */}
          <Card>
            <SectionTitle
              title="공방 정보"
              description="공방 위치 정보입니다."
            />
            <Input
              id="workshop_address"
              label="주소"
              placeholder="예: 서울시 마포구 연남로 1길 23 2층"
              value={form.workshop_address}
              onChange={(e) => updateField("workshop_address", e.target.value)}
            />
          </Card>

          {/* ---- SNS ---- */}
          <Card>
            <SectionTitle
              title="SNS"
              description="고객에게 안내되는 SNS 채널 정보입니다."
            />
            <div className="space-y-3">
              <Input
                id="instagram_handle"
                label="인스타그램 핸들"
                placeholder="예: @kkayomi_studio"
                value={form.instagram_handle}
                onChange={(e) =>
                  updateField("instagram_handle", e.target.value)
                }
              />
              <Input
                id="kakao_channel_id"
                label="카카오톡 채널 ID"
                placeholder="예: _xkABcd"
                value={form.kakao_channel_id}
                onChange={(e) =>
                  updateField("kakao_channel_id", e.target.value)
                }
              />
            </div>
          </Card>

          {/* ---- 카카오 알림톡 ---- */}
          <Card>
            <SectionTitle
              title="카카오 알림톡"
              description="예약 상태 변경 시 알림톡 발송 여부를 설정합니다."
            />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-warm-gray-700">
                  알림톡 발송
                </p>
                {!form.kakao_enabled && (
                  <p className="mt-0.5 text-xs text-warm-gray-400">
                    비활성화 시 예약 상태 변경은 정상 처리되지만 알림톡은
                    발송되지 않습니다.
                  </p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.kakao_enabled}
                onClick={() =>
                  updateField("kakao_enabled", !form.kakao_enabled)
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  form.kakao_enabled ? "bg-primary-500" : "bg-warm-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    form.kakao_enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </Card>

          {/* ---- SMS ---- */}
          <Card>
            <SectionTitle
              title="SMS"
              description="문자 발송 시 사용되는 발신 번호입니다."
            />
            <Input
              id="sms_sender_number"
              label="발신번호"
              placeholder="예: 010-1234-5678"
              value={form.sms_sender_number}
              onChange={(e) =>
                updateField("sms_sender_number", e.target.value)
              }
            />
          </Card>

          {/* ---- Save Button ---- */}
          <div className="flex justify-end">
            <Button size="lg" isLoading={saving} onClick={handleSave}>
              저장
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
