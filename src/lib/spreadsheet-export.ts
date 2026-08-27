import * as XLSX from "xlsx";

export type SpreadsheetCell = string | number | boolean | null | undefined;

const safeSheetName = (name: string): string =>
  name
    .replace(/[\\/?*[\]:]/g, " ")
    .trim()
    .slice(0, 31) || "Export";

const columnWidth = (rows: SpreadsheetCell[][], columnIndex: number): number => {
  const longest = rows.reduce((width, row) => {
    const value = row[columnIndex];
    const lines = value === null || value === undefined ? [""] : String(value).split(/\r?\n/);
    return Math.max(width, ...lines.map((line) => line.length));
  }, 0);
  return Math.min(60, Math.max(10, longest + 2));
};

/** Build a real Excel workbook with readable columns and preserved UTF-8 text. */
export function createSpreadsheetWorkbook(
  rows: SpreadsheetCell[][],
  sheetName = "Export",
): XLSX.WorkBook {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const columnCount = rows.reduce((count, row) => Math.max(count, row.length), 0);
  worksheet["!cols"] = Array.from({ length: columnCount }, (_, index) => ({
    wch: columnWidth(rows, index),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(sheetName));
  return workbook;
}

export function downloadXlsx(
  filename: string,
  rows: SpreadsheetCell[][],
  sheetName = "Export",
): void {
  const outputName = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(createSpreadsheetWorkbook(rows, sheetName), outputName, {
    compression: true,
  });
}
