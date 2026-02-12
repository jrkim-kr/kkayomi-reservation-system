/**
 * 카카오 알림톡 발송 모듈 (알리고 API 기반)
 *
 * 알리고(https://smartsms.aligo.in) 알림톡 API를 사용합니다.
 * 실서비스 전 카카오톡 채널 개설 + 비즈메시지 프로필 등록 + 템플릿 검수가 필요합니다.
 */

const ALIGO_API_URL = "https://kakaoapi.aligo.in/akv10/alimtalk/send/";

interface SendKakaoResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface AligoCredentials {
  apiKey: string;
  userId: string;
  senderKey: string;
  senderPhone: string;
}

export async function sendKakaoAlimtalk(params: {
  credentials: AligoCredentials;
  recipientPhone: string;
  templateCode: string;
  message: string;
  senderName?: string;
}): Promise<SendKakaoResult> {
  const { credentials } = params;

  if (!credentials.apiKey || !credentials.userId || !credentials.senderKey) {
    console.warn("[Kakao] 알리고 API 키가 설정되지 않았습니다.");
    return { success: false, error: "알리고 API 키 미설정" };
  }

  try {
    const phone = params.recipientPhone.replace(/-/g, "");

    const formData = new FormData();
    formData.append("apikey", credentials.apiKey);
    formData.append("userid", credentials.userId);
    formData.append("senderkey", credentials.senderKey);
    formData.append("tpl_code", params.templateCode);
    formData.append("sender", credentials.senderPhone ?? "");
    formData.append("receiver_1", phone);
    formData.append("subject_1", `${params.senderName || "알림"}`);

    formData.append("message_1", params.message);

    const response = await fetch(ALIGO_API_URL, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.code === 0) {
      return {
        success: true,
        messageId: result.info?.mid ?? undefined,
      };
    }

    return {
      success: false,
      error: result.message ?? "알림톡 발송 실패",
    };
  } catch (error) {
    console.error("[Kakao] 알림톡 발송 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "알림톡 발송 오류",
    };
  }
}

/** 알림 유형 → 알리고 템플릿 코드 매핑 */
export const TEMPLATE_CODES: Record<string, string> = {
  approval: "TP_APPROVAL",
  confirmation: "TP_CONFIRMATION",
  rejection: "TP_REJECTION",
  cancellation: "TP_CANCELLATION",
  change_approved: "TP_CHANGE_APPROVED",
  change_rejected: "TP_CHANGE_REJECTED",
};
