import * as XLSX from "xlsx";

/**
 * 배열 데이터를 Excel 파일로 변환하여 다운로드합니다.
 */
export function downloadExcel(
  rows: Record<string, string | number>[],
  filename: string,
  sheetName = "Sheet1"
): void {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 컬럼 너비 자동 조정
  const keys = Object.keys(rows[0] ?? {});
  worksheet["!cols"] = keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 30) };
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
