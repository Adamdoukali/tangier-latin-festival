export type CsvCell = string | number | boolean | null | undefined;

// Excel follows the computer's regional list separator when opening CSV files.
// Festival admins commonly use French/Moroccan settings, where that separator
// is a semicolon rather than a comma.
const CSV_DELIMITER = ";";

const csvValue = (value: CsvCell): string => {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/\r\n?/g, "\n");
  return `"${text.replace(/"/g, '""')}"`;
};

/** Serialize rows using the Excel-friendly French/Moroccan CSV delimiter. */
export const serializeCsv = (rows: CsvCell[][]): string =>
  rows.map((row) => row.map(csvValue).join(CSV_DELIMITER)).join("\r\n");

export function downloadCsv(filename: string, rows: CsvCell[][]): void {
  const csv = serializeCsv(rows);
  // `sep=;` makes Excel use readable columns regardless of the computer's
  // locale. The BOM keeps French accents and other UTF-8 text intact.
  const blob = new Blob(["\uFEFF", `sep=${CSV_DELIMITER}\r\n`, csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
