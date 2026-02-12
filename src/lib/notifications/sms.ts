/**
 * SMS 대체 발송 모듈 (알리고 API 기반)
 *
 * 카카오 알림톡 실패 시 SMS로 대체 발송합니다.
 */

import type { AligoCredentials } from "./kakao";

const ALIGO_SMS_URL = "https://apis.aligo.in/send/";

interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms(params: {
  credentials: AligoCredentials;
  recipientPhone: string;
  message: string;
}): Promise<SendSmsResult> {
  const { credentials } = params;

  if (!credentials.apiKey || !credentials.userId || !credentials.senderPhone) {
    console.warn("[SMS] 알리고 API 키가 설정되지 않았습니다.");
    return { success: false, error: "알리고 API 키 미설정" };
  }

  try {
    const phone = params.recipientPhone.replace(/-/g, "");

    const formData = new FormData();
    formData.append("key", credentials.apiKey);
    formData.append("user_id", credentials.userId);
    formData.append("sender", credentials.senderPhone);
    formData.append("receiver", phone);
    formData.append("msg", params.message);
    // LMS (장문) 발송 — 알림톡 메시지는 90바이트 초과가 일반적
    formData.append("msg_type", "LMS");

    const response = await fetch(ALIGO_SMS_URL, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.result_code === "1") {
      return {
        success: true,
        messageId: result.msg_id ?? undefined,
      };
    }

    return {
      success: false,
      error: result.message ?? "SMS 발송 실패",
    };
  } catch (error) {
    console.error("[SMS] 발송 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS 발송 오류",
    };
  }
}
