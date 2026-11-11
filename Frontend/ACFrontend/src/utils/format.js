// Formatting helpers and the enum values used by the backend

export const CURRENCY = import.meta.env.VITE_CURRENCY || "NGN";
export const COMPANY = import.meta.env.VITE_COMPANY_NAME || "Haycon Solutions Limited";

export const SERVICE_TYPES = ["installation", "repair", "maintenance", "gas_refill", "inspection", "other"];
export const ENQUIRY_STATUSES = ["new", "contacted", "converted", "closed"];
export const SERVICE_STATUSES = ["pending", "assigned", "in_progress", "completed", "cancelled"];
export const PRIORITIES = ["low", "normal", "high", "urgent"];
export const REPORT_STATUSES = ["draft", "awaiting_signatures", "signed"];
export const INVOICE_STATUSES = ["unpaid", "partially_paid", "paid", "cancelled"];
export const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "pos", "other"];

export const label = (value) => {
  if (!value) return "—";
  const s = String(value).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const moneyFmt = new Intl.NumberFormat(undefined, { style: "currency", currency: CURRENCY, minimumFractionDigits: 2 });
export const money = (n) => moneyFmt.format(Number(n) || 0);

export const date = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export const dateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "—";

// Value for <input type="date"> / "datetime-local"
export const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
export const toDateTimeInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};
// Back to ISO for the API (empty → undefined so Joi ignores it)
export const fromInput = (v) => (v ? new Date(v).toISOString() : undefined);

// Removes "" / undefined so optional Joi fields that don't allow "" aren't sent
export const clean = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export const monthName = (m) => new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "short" });
