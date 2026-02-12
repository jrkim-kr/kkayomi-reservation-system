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
  store_name: string;
  store_description: string;
  booking_button_label: string;
  booking_page_title: string;
  booking_step1_label: string;
  notification_sender_name: string;
  calendar_event_prefix: string;
  google_calendar_id: string;
  google_sheets_spreadsheet_id: string;
  bank_info: BankInfo;
  deposit_deadline_hours: string;
  workshop_address: string;
  instagram_handle: string;
  kakao_channel_id: string;
  sms_sender_number: string;
  kakao_enabled: boolean;
  aligo_api_key: string;
  aligo_user_id: string;
  aligo_sender_key: string;
}

const DEFAULT_FORM: SettingsForm = {
  store_name: "",
  store_description: "",
  booking_button_label: "",
  booking_page_title: "",
  booking_step1_label: "",
  notification_sender_name: "",
  calendar_event_prefix: "",
  google_calendar_id: "",
  google_sheets_spreadsheet_id: "",
  bank_info: { bank: "", account_number: "", account_holder: "" },
  deposit_deadline_hours: "72",
  workshop_address: "",
  instagram_handle: "",
  kakao_channel_id: "",
  sms_sender_number: "",
  kakao_enabled: false,
  aligo_api_key: "",
  aligo_user_id: "",
  aligo_sender_key: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function settingsToForm(settings: AdminSetting[]): SettingsForm {
  const form = { ...DEFAULT_FORM };
  for (const s of settings) {
    switch (s.key) {
      case "store_name":
        form.store_name = String(s.value ?? "");
        break;
      case "store_description":
        form.store_description = String(s.value ?? "");
        break;
      case "booking_button_label":
        form.booking_button_label = String(s.value ?? "");
        break;
      case "booking_page_title":
        form.booking_page_title = String(s.value ?? "");
        break;
      case "booking_step1_label":
        form.booking_step1_label = String(s.value ?? "");
        break;
      case "notification_sender_name":
        form.notification_sender_name = String(s.value ?? "");
        break;
      case "calendar_event_prefix":
        form.calendar_event_prefix = String(s.value ?? "");
        break;
      case "google_calendar_id":
        form.google_calendar_id = String(s.value ?? "");
        break;
      case "google_sheets_spreadsheet_id":
        form.google_sheets_spreadsheet_id = String(s.value ?? "");
        break;
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
      case "aligo_api_key":
        form.aligo_api_key = String(s.value ?? "");
        break;
      case "aligo_user_id":
        form.aligo_user_id = String(s.value ?? "");
        break;
      case "aligo_sender_key":
        form.aligo_sender_key = String(s.value ?? "");
        break;
    }
  }
  return form;
}

function formToPayload(form: SettingsForm) {
  return [
    { key: "store_name", value: form.store_name },
    { key: "store_description", value: form.store_description },
    { key: "booking_button_label", value: form.booking_button_label },
    { key: "booking_page_title", value: form.booking_page_title },
    { key: "booking_step1_label", value: form.booking_step1_label },
    { key: "notification_sender_name", value: form.notification_sender_name },
    { key: "calendar_event_prefix", value: form.calendar_event_prefix },
    { key: "google_calendar_id", value: form.google_calendar_id },
    { key: "google_sheets_spreadsheet_id", value: form.google_sheets_spreadsheet_id },
    { key: "bank_info", value: form.bank_info },
    { key: "deposit_deadline_hours", value: Number(form.deposit_deadline_hours) },
    { key: "workshop_address", value: form.workshop_address },
    { key: "instagram_handle", value: form.instagram_handle },
    { key: "kakao_channel_id", value: form.kakao_channel_id },
    { key: "sms_sender_number", value: form.sms_sender_number },
    { key: "kakao_enabled", value: form.kakao_enabled },
    { key: "aligo_api_key", value: form.aligo_api_key },
    { key: "aligo_user_id", value: form.aligo_user_id },
    { key: "aligo_sender_key", value: form.aligo_sender_key },
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
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error ?? "설정 저장에 실패했습니다.");
      }

      const result = await res.json().catch(() => null);
      const sync = result?.sync as { sheets?: number; calendar?: number } | undefined;
      const syncParts: string[] = [];
      if (sync?.sheets) syncParts.push(`Sheets ${sync.sheets}건`);
      if (sync?.calendar) syncParts.push(`Calendar ${sync.calendar}건`);
      const syncMsg = syncParts.length > 0 ? ` (${syncParts.join(", ")} 동기화 완료)` : "";
      setSuccessMessage(`설정이 저장되었습니다.${syncMsg}`);
      setTimeout(() => setSuccessMessage(null), 5000);
      window.dispatchEvent(new Event("settings-updated"));
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
          {/* ---- 스토어 정보 ---- */}
          <Card>
            <SectionTitle
              title="스토어 정보"
              description="홈페이지에 표시되는 스토어 기본 정보입니다."
            />
            <div className="space-y-3">
              <Input
                id="store_name"
                label="스토어명"
                placeholder="예: 나의 스토어"
                value={form.store_name}
                onChange={(e) => updateField("store_name", e.target.value)}
              />
              <Input
                id="store_description"
                label="홈페이지 한줄소개"
                placeholder="예: 간편하게 예약하세요"
                value={form.store_description}
                onChange={(e) =>
                  updateField("store_description", e.target.value)
                }
              />
              <Input
                id="workshop_address"
                label="주소"
                placeholder="예: 서울시 마포구 연남로 1길 23 2층"
                value={form.workshop_address}
                onChange={(e) => updateField("workshop_address", e.target.value)}
              />
            </div>
          </Card>

          {/* ---- 예약 페이지 ---- */}
          <Card>
            <SectionTitle
              title="예약 페이지"
              description="예약 페이지에 표시되는 문구를 설정합니다."
            />
            <div className="space-y-3">
              <Input
                id="booking_button_label"
                label="예약 버튼 문구"
                placeholder="예: 예약하기"
                value={form.booking_button_label}
                onChange={(e) =>
                  updateField("booking_button_label", e.target.value)
                }
              />
              <Input
                id="booking_page_title"
                label="예약 페이지 제목"
                placeholder="예: 예약"
                value={form.booking_page_title}
                onChange={(e) =>
                  updateField("booking_page_title", e.target.value)
                }
              />
              <Input
                id="booking_step1_label"
                label="1단계 안내 문구"
                placeholder="예: 원하시는 항목을 선택해 주세요."
                value={form.booking_step1_label}
                onChange={(e) =>
                  updateField("booking_step1_label", e.target.value)
                }
              />
            </div>
          </Card>

          {/* ---- 알림 / 캘린더 ---- */}
          <Card>
            <SectionTitle
              title="알림 / 캘린더"
              description="알림톡 메시지와 Google Calendar 이벤트에 사용되는 이름입니다."
            />
            <div className="space-y-3">
              <Input
                id="notification_sender_name"
                label="알림 발신자명"
                placeholder="예: 나의 스토어"
                value={form.notification_sender_name}
                onChange={(e) =>
                  updateField("notification_sender_name", e.target.value)
                }
              />
              <Input
                id="calendar_event_prefix"
                label="캘린더 이벤트 접두어"
                placeholder="예: 내스토어"
                value={form.calendar_event_prefix}
                onChange={(e) =>
                  updateField("calendar_event_prefix", e.target.value)
                }
              />
              <Input
                id="google_calendar_id"
                label="Google Calendar ID"
                placeholder="예: abc123@group.calendar.google.com"
                value={form.google_calendar_id}
                onChange={(e) =>
                  updateField("google_calendar_id", e.target.value)
                }
              />
              <Input
                id="google_sheets_spreadsheet_id"
                label="Google Sheets Spreadsheet ID"
                placeholder="예: 1M6bYoL5FMOTVEF6H2OgGrcuG67OrdtvB7S6uuCDp6nQ"
                value={form.google_sheets_spreadsheet_id}
                onChange={(e) =>
                  updateField("google_sheets_spreadsheet_id", e.target.value)
                }
              />
            </div>
          </Card>

          {/* ---- 입금 안내 ---- */}
          <Card>
            <SectionTitle
              title="입금 안내"
              description="고객에게 안내되는 입금 계좌 및 기한 정보입니다."
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
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-warm-gray-600">
                  입금 기한: 신청 후
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
            </div>
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
                placeholder="예: @mystudio"
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

          {/* ---- 카카오 알림톡 / SMS ---- */}
          <Card>
            <SectionTitle
              title="카카오 알림톡 / SMS"
              description="알리고 API를 통한 알림톡·SMS 발송 설정입니다."
            />
            <div className="space-y-4">
              {/* 알림톡 ON/OFF 토글 */}
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

              {/* 알리고 API 설정 */}
              {form.kakao_enabled && (
                <div className="space-y-3 rounded-xl border border-warm-gray-100 bg-warm-gray-50 p-4">
                  <p className="text-xs font-medium text-warm-gray-500">
                    알리고 API 설정
                  </p>
                  <Input
                    id="aligo_api_key"
                    label="API Key"
                    type="password"
                    placeholder="알리고에서 발급받은 API Key"
                    value={form.aligo_api_key}
                    onChange={(e) =>
                      updateField("aligo_api_key", e.target.value)
                    }
                  />
                  <Input
                    id="aligo_user_id"
                    label="User ID"
                    placeholder="알리고 계정 아이디"
                    value={form.aligo_user_id}
                    onChange={(e) =>
                      updateField("aligo_user_id", e.target.value)
                    }
                  />
                  <Input
                    id="aligo_sender_key"
                    label="발신 프로필 키 (Sender Key)"
                    type="password"
                    placeholder="카카오 비즈메시지 발신 프로필 키"
                    value={form.aligo_sender_key}
                    onChange={(e) =>
                      updateField("aligo_sender_key", e.target.value)
                    }
                  />
                  <Input
                    id="sms_sender_number"
                    label="SMS 발신번호"
                    placeholder="예: 010-1234-5678"
                    value={form.sms_sender_number}
                    onChange={(e) =>
                      updateField("sms_sender_number", e.target.value)
                    }
                  />
                </div>
              )}
            </div>
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
