import * as XLSX from "xlsx";

export interface ParsedGuest {
  name: string | null;
  email: string;
}

export interface ParseResult {
  guests: ParsedGuest[];
  invalidRows: { row: number; reason: string; raw: string }[];
  duplicatesInFile: number;
  totalRows: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const NAME_KEYS = ["nombre", "name", "nombres", "full name", "fullname", "invitado"];
const EMAIL_KEYS = ["email", "correo", "e-mail", "mail", "correo electronico", "correo electrónico"];

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

function pickKey(headers: string[], candidates: string[]): string | null {
  for (const h of headers) {
    if (candidates.includes(norm(h))) return h;
  }
  // fallback: partial match
  for (const h of headers) {
    if (candidates.some((c) => norm(h).includes(c))) return h;
  }
  return null;
}

/** Parse a CSV or XLSX file into a validated, de-duplicated guest list. */
export async function parseGuestFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const result: ParseResult = {
    guests: [],
    invalidRows: [],
    duplicatesInFile: 0,
    totalRows: rows.length,
  };

  if (rows.length === 0) return result;

  const headers = Object.keys(rows[0]);
  const nameKey = pickKey(headers, NAME_KEYS);
  const emailKey = pickKey(headers, EMAIL_KEYS);

  const seen = new Set<string>();

  rows.forEach((row, i) => {
    const rawName = nameKey ? String(row[nameKey] ?? "").trim() : "";
    let rawEmail = emailKey ? String(row[emailKey] ?? "").trim() : "";

    // Headerless fallback: try to detect an email-looking value in any column
    if (!rawEmail) {
      const found = Object.values(row).find((v) => EMAIL_RE.test(String(v ?? "").trim()));
      if (found) rawEmail = String(found).trim();
    }

    const email = rawEmail.toLowerCase();
    const rawLine = [rawName, rawEmail].filter(Boolean).join(" · ") || "(fila vacía)";

    if (!email) {
      result.invalidRows.push({ row: i + 2, reason: "Sin email", raw: rawLine });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      result.invalidRows.push({ row: i + 2, reason: "Email inválido", raw: rawLine });
      return;
    }
    if (seen.has(email)) {
      result.duplicatesInFile++;
      return;
    }

    seen.add(email);
    result.guests.push({ name: rawName || null, email });
  });

  return result;
}

/** Build a CSV export of invites. */
export function buildInvitesCsv(
  rows: { guest_name: string | null; guest_email: string | null; segment: string | null; url: string; status: string }[]
): string {
  const header = ["nombre", "email", "segmento", "enlace", "estado"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.guest_name ?? "", r.guest_email ?? "", r.segment ?? "", r.url, r.status].map(escape).join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
