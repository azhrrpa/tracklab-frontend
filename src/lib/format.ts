const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** 400000 -> "Rp 400.000,00" */
export function formatCurrency(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : value;
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "-";
  return currency.format(amount).replace(/ /g, " ");
}

/** "2025-06-20T00:00:00Z" -> "20 Jun 2025" */
export function formatDate(value: string | null | undefined) {
  const date = parseDate(value);
  return date ? dateFormat.format(date) : "-";
}

export function formatDateTime(value: string | null | undefined) {
  const date = parseDate(value);
  return date ? dateTimeFormat.format(date) : "-";
}

/** ISO string -> value for <input type="date"> (yyyy-mm-dd), in local time. */
export function toDateInput(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** yyyy-mm-dd from a date input -> ISO string at midnight UTC, or null when empty. */
export function fromDateInput(value: string | null | undefined) {
  if (!value) return null;
  return `${value}T00:00:00Z`;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function shortId(id: string | null | undefined, length = 18) {
  if (!id) return "-";
  const compact = id.replaceAll("-", "").toUpperCase();
  return compact.length > length ? `${compact.slice(0, length)}…` : compact;
}
