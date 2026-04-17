/**
 * Hand-written CSV parser — no dependencies.
 * Handles quoted fields, escaped quotes, and embedded newlines.
 */
export interface ParsedRow {
  [key: string]: string;
}

function parseField(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith('"')) {
    // Quoted field — strip surrounding quotes, unescape doubled quotes
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

function parseLine(line: string, delim: string): string[] {
  const fields: string[] = [];
  let i = 0;
  let current = "";
  let inQuotes = false;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (line.startsWith(delim, i)) {
        fields.push(current);
        current = "";
        i += delim.length;
      } else {
        current += ch;
        i++;
      }
    }
  }
  fields.push(current);
  return fields;
}

function detectDelimiter(header: string): string {
  // Prefer tab over comma over semicolon
  const counts = {
    "\t": (header.match(/\t/g) ?? []).length,
    ",": (header.match(/,/g) ?? []).length,
    ";": (header.match(/;/g) ?? []).length,
  };
  if (counts["\t"] > counts[","] && counts["\t"] > counts[";"]) return "\t";
  if (counts[";"] > counts[","]) return ";";
  return ",";
}

function normalizeHeaderKey(raw: string): string {
  return raw.toLowerCase().replace(/[\s_\-]/g, "");
}

export function parseCsv(text: string): ParsedRow[] {
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Collect logical lines (respecting quoted newlines)
  const logicalLines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if (ch === "\n" && !inQuotes) {
      logicalLines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) logicalLines.push(current);

  if (logicalLines.length < 2) return [];

  const delim = detectDelimiter(logicalLines[0]);
  const rawHeaders = parseLine(logicalLines[0], delim);
  const headers = rawHeaders.map(parseField).map(normalizeHeaderKey);

  const rows: ParsedRow[] = [];
  for (let i = 1; i < logicalLines.length; i++) {
    const line = logicalLines[i];
    if (!line.trim()) continue;
    const fields = parseLine(line, delim).map(parseField);
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = fields[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}
