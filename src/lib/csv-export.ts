export type CsvCell = string | number | boolean | null | undefined;

const csvValue = (value: CsvCell): string => {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/\r\n?/g, "\n");
  return `"${text.replace(/"/g, '""')}"`;
};

/** Download a UTF-8 CSV that preserves accents and safely escapes every cell. */
export const serializeCsv = (rows: CsvCell[][]): string =>
  rows.map((row) => row.map(csvValue).join(",")).join("\r\n");

export function downloadCsv(filename: string, rows: CsvCell[][]): void {
  const csv = serializeCsv(rows);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
