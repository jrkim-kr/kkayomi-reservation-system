import { google, sheets_v4 } from "googleapis";

let cachedSheets: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (!cachedSheets) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n"
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    cachedSheets = google.sheets({ version: "v4", auth });
  }
  return cachedSheets;
}

/** 시트/헤더 존재 여부 캐시 (spreadsheetId 기준) */
const sheetReady = new Set<string>();

const SHEET_NAME = "예약목록";
const HEADER_ROW = [
  "신청일",
  "확정일",
  "수업명",
  "예약자명",
  "연락처",
  "인원",
  "수업일시",
  "총금액",
  "상태",
  "메모",
];

/** "예약목록" 시트 탭이 없으면 자동 생성 + 헤더 보장 (캐시 적용) */
async function ensureSheetReady(spreadsheetId: string): Promise<void> {
  if (sheetReady.has(spreadsheetId)) return;

  const sheets = getSheetsClient();

  const { data: spreadsheet } = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const exists = spreadsheet.sheets?.some(
    (s) => s.properties?.title === SHEET_NAME
  );

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    });
  }

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:J1`,
  });

  const firstRow = data.values?.[0];
  if (!firstRow || firstRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:J1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [HEADER_ROW] },
    });
  }

  sheetReady.add(spreadsheetId);
}

/** 하위 호환을 위한 alias */
export const ensureSheetHeader = ensureSheetReady;

/** 예약 데이터를 시트 행 배열로 변환 */
export type ReservationRowParams = {
  createdAt: string;
  confirmedAt: string;
  className: string;
  customerName: string;
  customerPhone: string;
  numPeople: number;
  date: string;
  time: string;
  price: number;
  status: string;
  memo: string | null;
};

function toRow(params: ReservationRowParams): string[] {
  const formattedDate = params.date.replace(/-/g, ".");
  const formattedTime = params.time.slice(0, 5);
  const totalPrice = params.price * params.numPeople;
  const formattedPrice = totalPrice.toLocaleString("ko-KR") + "원";

  return [
    new Date(params.createdAt).toLocaleDateString("ko-KR"),
    new Date(params.confirmedAt).toLocaleDateString("ko-KR"),
    params.className,
    params.customerName,
    params.customerPhone,
    `${params.numPeople}명`,
    `${formattedDate} ${formattedTime}`,
    formattedPrice,
    params.status,
    params.memo ?? "",
  ];
}

/** 시트 탭의 내부 sheetId 조회 */
async function getSheetId(spreadsheetId: string): Promise<number | null> {
  try {
    const sheets = getSheetsClient();
    const { data } = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    const sheet = data.sheets?.find(
      (s) => s.properties?.title === SHEET_NAME
    );
    return sheet?.properties?.sheetId ?? null;
  } catch {
    return null;
  }
}

/** 행 삭제 (취소 시 사용) */
export async function deleteReservationRow(
  spreadsheetId: string,
  rowNumber: number
): Promise<boolean> {
  try {
    const sheets = getSheetsClient();
    const sheetId = await getSheetId(spreadsheetId);
    if (sheetId === null) return false;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1, // 0-based
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });

    return true;
  } catch (error) {
    console.error("[Google Sheets] 행 삭제 실패:", error);
    return false;
  }
}

/** 기존 행의 특정 셀 업데이트 (상태·날짜/시간 변경 등) */
export async function updateReservationRow(
  spreadsheetId: string,
  rowNumber: number,
  updates: { status?: string; date?: string; time?: string }
): Promise<boolean> {
  try {
    const sheets = getSheetsClient();

    const requests: { range: string; values: string[][] }[] = [];

    // I열: 상태
    if (updates.status) {
      requests.push({
        range: `${SHEET_NAME}!I${rowNumber}`,
        values: [[updates.status]],
      });
    }

    // G열: 날짜/시간
    if (updates.date && updates.time) {
      const formattedDate = updates.date.replace(/-/g, ".");
      const formattedTime = updates.time.slice(0, 5);
      requests.push({
        range: `${SHEET_NAME}!G${rowNumber}`,
        values: [[`${formattedDate} ${formattedTime}`]],
      });
    }

    if (requests.length === 0) return true;

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
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

/** confirmed 시 스프레드시트에 행 추가 (헤더 자동 보장) */
export async function appendReservationRow(
  spreadsheetId: string,
  params: ReservationRowParams
): Promise<number | null> {
  try {
    const sheets = getSheetsClient();

    await ensureSheetReady(spreadsheetId);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:J`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [toRow(params)] },
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

/** 일괄 재동기화: 기존 데이터 클리어 후 전체 예약 다시 추가 */
export async function syncAllReservationRows(
  spreadsheetId: string,
  paramsList: (ReservationRowParams & { reservationId: string })[]
): Promise<{ reservationId: string; row: number }[]> {
  const sheets = getSheetsClient();

  // 1. 헤더 보장
  await ensureSheetReady(spreadsheetId);

  // 2. 기존 데이터 클리어 (헤더 아래)
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:J`,
  });

  if (paramsList.length === 0) return [];

  // 3. 전체 예약 일괄 추가
  const rows = paramsList.map((p) => toRow(p));

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:J`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });

  // 4. 시작 row 추출 후 순서대로 매핑
  const updatedRange = response.data.updates?.updatedRange;
  if (!updatedRange) return [];

  const match = updatedRange.match(/!A(\d+):/);
  const startRow = match ? parseInt(match[1], 10) : 2;

  return paramsList.map((p, i) => ({
    reservationId: p.reservationId,
    row: startRow + i,
  }));
}
