import * as XLSX from "xlsx";

export interface ParsedGuest {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface ParseResult {
  guests: ParsedGuest[];
  invalidRows: { row: number; reason: string; raw: string }[];
  duplicatesInFile: number;
  totalRows: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const NAME_KEYS = ["nombre", "name", "nombres", "full name", "fullname", "invitado", "nombre y apellido"];
const EMAIL_KEYS = ["email", "correo", "e-mail", "mail", "correo electronico", "correo electrónico"];
const PHONE_KEYS = ["whatsapp", "telefono", "teléfono", "celular", "phone", "movil", "móvil", "numero", "número", "cel", "wsp"];

/**
 * Normalize a phone to digits-only international format for wa.me.
 * Bolivian 8-digit mobiles (starting with 6 or 7) get the 591 prefix.
 * Returns null when the value cannot be a valid phone.
 */
export function normalizePhone(raw: unknown): string | null {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = `591${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** wa.me click-to-chat link with a prefilled message. */
export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

function pickKey(headers: string[], candidates: string[]): string | null {
  for (const h of headers) {
    if (candidates.includes(norm(h))) return h;
  }
  for (const h of headers) {
    if (candidates.some((c) => norm(h).includes(c))) return h;
  }
  return null;
}

/** Parse a CSV or XLSX file into a validated guest list. Only the name is required. */
export async function parseGuestFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const result: ParseResult = { guests: [], invalidRows: [], duplicatesInFile: 0, totalRows: rows.length };
  if (rows.length === 0) return result;

  const headers = Object.keys(rows[0]);
  const emailKey = pickKey(headers, EMAIL_KEYS);
  const phoneKey = pickKey(headers, PHONE_KEYS);
  let nameKey = pickKey(headers, NAME_KEYS);
  // Single-column list without a recognizable header: treat first column as names
  if (!nameKey) nameKey = headers.find((h) => h !== emailKey && h !== phoneKey) ?? null;

  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();

  rows.forEach((row, i) => {
    const rawName = nameKey ? String(row[nameKey] ?? "").trim() : "";
    const rawEmail = emailKey ? String(row[emailKey] ?? "").trim() : "";
    const rawPhone = phoneKey ? String(row[phoneKey] ?? "").trim() : "";
    const rawLine = [rawName, rawPhone, rawEmail].filter(Boolean).join(" · ") || "(fila vacía)";

    if (!rawName && !rawEmail && !rawPhone) return; // skip fully empty rows silently
    if (!rawName) {
      result.invalidRows.push({ row: i + 2, reason: "Sin nombre", raw: rawLine });
      return;
    }

    let email: string | null = rawEmail ? rawEmail.toLowerCase() : null;
    if (email && !EMAIL_RE.test(email)) {
      result.invalidRows.push({ row: i + 2, reason: "Email inválido", raw: rawLine });
      return;
    }
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    if (rawPhone && !phone) {
      result.invalidRows.push({ row: i + 2, reason: "WhatsApp inválido", raw: rawLine });
      return;
    }

    if ((email && seenEmail.has(email)) || (phone && seenPhone.has(phone))) {
      result.duplicatesInFile++;
      return;
    }
    if (email) seenEmail.add(email);
    if (phone) seenPhone.add(phone);
    if (!email) email = null;

    result.guests.push({ name: rawName, email, phone });
  });

  return result;
}

/** Build a CSV export of invites. */
export function buildInvitesCsv(
  rows: { guest_name: string | null; guest_email: string | null; guest_phone?: string | null; segment: string | null; url: string; status: string }[]
): string {
  const header = ["nombre", "whatsapp", "email", "segmento", "enlace", "estado"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.guest_name ?? "", r.guest_phone ?? "", r.guest_email ?? "", r.segment ?? "", r.url, r.status].map(escape).join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  redeemed: "Usada",
  revoked: "Cancelada",
  not_sent: "Sin enviar",
  queued: "En cola",
  sent: "Enviado",
  failed: "Fallido",
  bounced: "Rebotado",
};

/** Build an XLSX (Excel) export of invites as an ArrayBuffer. */
export function buildInvitesXlsx(
  rows: {
    guest_name: string | null;
    guest_email: string | null;
    guest_phone?: string | null;
    segment: string | null;
    url: string;
    status: string;
    rsvp?: string;
    check_in?: string;
  }[]
): ArrayBuffer {
  const data = rows.map((r) => ({
    Nombre: r.guest_name ?? "",
    WhatsApp: r.guest_phone ? `+${r.guest_phone}` : "",
    Email: r.guest_email ?? "",
    Segmento: r.segment ?? "",
    RSVP: r.rsvp ?? "",
    "Check-in": r.check_in ?? "",
    Enlace: r.url,
    Estado: STATUS_LABEL[r.status] ?? r.status,
  }));
  const ws = XLSX.utils.json_to_sheet(data, {
    header: ["Nombre", "WhatsApp", "Email", "Segmento", "RSVP", "Check-in", "Enlace", "Estado"],
  });
  ws["!cols"] = [
    { wch: 24 }, { wch: 16 }, { wch: 32 }, { wch: 16 },
    { wch: 18 }, { wch: 18 }, { wch: 48 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invitaciones");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
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

export function downloadXlsx(filename: string, buffer: ArrayBuffer) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
