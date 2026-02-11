import { google } from "googleapis";

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
      ),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

const CALENDAR_ID = () => process.env.GOOGLE_CALENDAR_ID!;

/** confirmed 시 캘린더 이벤트 생성 */
export async function createCalendarEvent(params: {
  reservationId: string;
  className: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or HH:MM:SS
  durationMinutes: number;
  numPeople: number;
  memo?: string | null;
}): Promise<string | null> {
  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    const startTime = params.time.slice(0, 5); // HH:MM
    const startDateTime = `${params.date}T${startTime}:00+09:00`;

    const [h, m] = startTime.split(":").map(Number);
    const endMinutes = h * 60 + m + params.durationMinutes;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const endDateTime = `${params.date}T${endH}:${endM}:00+09:00`;

    const description = [
      `예약자: ${params.customerName}`,
      `연락처: ${params.customerPhone}`,
      `인원: ${params.numPeople}명`,
      params.memo ? `요청사항: ${params.memo}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const event = await calendar.events.insert({
      calendarId: CALENDAR_ID(),
      requestBody: {
        summary: `[까요미] ${params.className} - ${params.customerName}(${params.numPeople}명)`,
        start: { dateTime: startDateTime, timeZone: "Asia/Seoul" },
        end: { dateTime: endDateTime, timeZone: "Asia/Seoul" },
        description,
      },
    });

    return event.data.id ?? null;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: unknown }; message?: string };
    console.error("[Google Calendar] 이벤트 생성 실패:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    return null;
  }
}

/** 변경 요청 승인 시 이벤트 일시 업데이트 */
export async function updateCalendarEvent(params: {
  eventId: string;
  date: string;
  time: string;
  durationMinutes: number;
}): Promise<boolean> {
  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    const startTime = params.time.slice(0, 5);
    const startDateTime = `${params.date}T${startTime}:00+09:00`;

    const [h, m] = startTime.split(":").map(Number);
    const endMinutes = h * 60 + m + params.durationMinutes;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const endDateTime = `${params.date}T${endH}:${endM}:00+09:00`;

    await calendar.events.patch({
      calendarId: CALENDAR_ID(),
      eventId: params.eventId,
      requestBody: {
        start: { dateTime: startDateTime, timeZone: "Asia/Seoul" },
        end: { dateTime: endDateTime, timeZone: "Asia/Seoul" },
      },
    });

    return true;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: unknown }; message?: string };
    console.error("[Google Calendar] 이벤트 업데이트 실패:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    return false;
  }
}

/** cancelled 시 이벤트 삭제 */
export async function deleteCalendarEvent(
  eventId: string
): Promise<boolean> {
  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId: CALENDAR_ID(),
      eventId,
    });

    return true;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: unknown }; message?: string };
    console.error("[Google Calendar] 이벤트 삭제 실패:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    return false;
  }
}
