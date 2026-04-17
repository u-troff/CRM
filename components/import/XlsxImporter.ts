import { read, utils } from "xlsx";
import { ParsedRow } from "./CsvParser";

function normalizeHeaderKey(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/[\s_\-]/g, "");
}

/**
 * Parse an XLSX/XLS file buffer into an array of row objects
 * with normalized header keys.
 */
export async function parseXlsx(buffer: ArrayBuffer): Promise<ParsedRow[]> {
  const workbook = read(buffer, { type: "array", cellDates: false, raw: false });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  // Convert to array of arrays
  const rawRows: unknown[][] = utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (rawRows.length < 2) return [];

  const rawHeaders = rawRows[0] as unknown[];
  const headers = rawHeaders.map((h) => normalizeHeaderKey(String(h ?? "")));

  const rows: ParsedRow[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const cells = rawRows[i] as unknown[];
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      const cell = cells[idx];
      // Handle SheetJS error values (#ERROR!, #N/A, etc.)
      if (cell !== null && cell !== undefined && typeof cell === "object" && "error" in (cell as object)) {
        row[h] = "#ERROR!";
      } else {
        row[h] = String(cell ?? "");
      }
    });
    // Skip completely empty rows
    if (headers.some((h) => row[h] && row[h] !== "")) {
      rows.push(row);
    }
  }

  return rows;
}
