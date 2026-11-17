// Money is an integer number of minor units (cents) inside the service. Amounts cross the API as decimal strings with
// exactly two fraction digits ("12.50") and are never held as floating-point numbers.

const AMOUNT_RE = /^(0|[1-9]\d{0,9})\.(\d{2})$/;

export class MoneyError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/** "12.50" -> 1250. Throws MoneyError("amount_invalid") for anything else, including "12.5", "-1.00" and 12.5. */
export function parseMinor(text) {
  if (typeof text !== "string") throw new MoneyError("amount_invalid");
  const m = AMOUNT_RE.exec(text);
  if (!m) throw new MoneyError("amount_invalid");
  return Number(m[1]) * 100 + Number(m[2]);
}

/** 1250 -> "12.50". */
export function formatMinor(minor) {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new MoneyError("amount_invalid");
  const units = Math.floor(minor / 100);
  const cents = minor % 100;
  return `${units}.${String(cents).padStart(2, "0")}`;
}

export function sumMinor(values) {
  return values.reduce((total, v) => total + v, 0);
}
