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
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

const SPREADSHEET_ID = () => process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = "예약목록";

/** 기존 행의 특정 셀 업데이트 (상태·날짜/시간 변경 등) */
export async function updateReservationRow(
  rowNumber: number,
  updates: { status?: string; date?: string; time?: string }
): Promise<boolean> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const requests: { range: string; values: string[][] }[] = [];

    // H열: 상태
    if (updates.status) {
      requests.push({
        range: `${SHEET_NAME}!H${rowNumber}`,
        values: [[updates.status]],
      });
    }

    // F열: 날짜/시간
    if (updates.date && updates.time) {
      const formattedDate = updates.date.replace(/-/g, ".");
      const formattedTime = updates.time.slice(0, 5);
      requests.push({
        range: `${SHEET_NAME}!F${rowNumber}`,
        values: [[`${formattedDate} ${formattedTime}`]],
      });
    }

    if (requests.length === 0) return true;

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID(),
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: requests,
      },
    });

    return true;
  } catch (error) {
    console.error("[Google Sheets] 행 업데이트 실패:", error);
    return false;
  }
}

/** confirmed 시 스프레드시트에 행 추가 */
export async function appendReservationRow(params: {
  createdAt: string;
  confirmedAt: string;
  className: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  price: number;
  status: string;
  memo: string | null;
}): Promise<number | null> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const formattedDate = params.date.replace(/-/g, ".");
    const formattedTime = params.time.slice(0, 5);
    const formattedPrice = params.price.toLocaleString("ko-KR") + "원";

    const row = [
      new Date(params.createdAt).toLocaleDateString("ko-KR"),
      new Date(params.confirmedAt).toLocaleDateString("ko-KR"),
      params.className,
      params.customerName,
      params.customerPhone,
      `${formattedDate} ${formattedTime}`,
      formattedPrice,
      "확정",
      params.memo ?? "",
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID(),
      range: `${SHEET_NAME}!A:I`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    const updatedRange = response.data.updates?.updatedRange;
    if (updatedRange) {
      const match = updatedRange.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    }
    return null;
  } catch (error) {
    console.error("[Google Sheets] 행 추가 실패:", error);
    return null;
  }
}
