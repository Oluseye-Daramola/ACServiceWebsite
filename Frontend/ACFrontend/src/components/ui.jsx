/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { label } from "../utils/format";

// ---------- Toasts ----------
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------- Status badges ----------
const TONES = {
  new: "info",
  contacted: "warn",
  converted: "ok",
  closed: "muted",
  pending: "warn",
  assigned: "info",
  in_progress: "accent",
  completed: "ok",
  cancelled: "muted",
  draft: "muted",
  awaiting_signatures: "warn",
  signed: "ok",
  unpaid: "danger",
  partially_paid: "warn",
  paid: "ok",
  successful: "ok",
  reversed: "danger",
  low: "muted",
  normal: "info",
  high: "warn",
  urgent: "danger",
  active: "ok",
  inactive: "muted",
};
export const Badge = ({ value, children }) => (
  <span className={`badge badge-${TONES[value] || "muted"}`}>{children || label(value)}</span>
);

// ---------- Layout bits ----------
export const PageHeader = ({ title, subtitle, actions, back }) => (
  <div className="page-header">
    <div>
      {back}
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </div>
    {actions && <div className="actions">{actions}</div>}
  </div>
);

export const Card = ({ title, actions, children, className = "" }) => (
  <section className={`card ${className}`}>
    {(title || actions) && (
      <div className="card-head">
        {title && <h2>{title}</h2>}
        {actions && <div className="actions">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export const Spinner = ({ text = "Loading…" }) => (
  <div className="spinner-wrap">
    <span className="spinner" aria-hidden /> {text}
  </div>
);

export const ErrorBox = ({ error, onRetry }) =>
  error ? (
    <div className="alert alert-danger" role="alert">
      <div>
        <strong>{error.message || String(error)}</strong>
        {error.details?.length > 0 && (
          <ul>
            {error.details.map((d, i) => (
              <li key={i}>{d.message}</li>
            ))}
          </ul>
        )}
      </div>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  ) : null;

export const Empty = ({ children = "Nothing here yet." }) => <div className="empty">{children}</div>;

export const DL = ({ items }) => (
  <dl className="dl">
    {items.filter(Boolean).map(([k, v]) => (
      <div key={k}>
        <dt>{k}</dt>
        <dd>{v === undefined || v === null || v === "" ? "—" : v}</dd>
      </div>
    ))}
  </dl>
);

export const Stat = ({ label: l, value, hint, tone }) => (
  <div className={`stat ${tone ? `stat-${tone}` : ""}`}>
    <div className="stat-label">{l}</div>
    <div className="stat-value">{value}</div>
    {hint && <div className="stat-hint">{hint}</div>}
  </div>
);

// ---------- Forms ----------
export const Field = ({ label: l, hint, children, full }) => (
  <label className={`field ${full ? "field-full" : ""}`}>
    <span className="field-label">{l}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
);

export const Select = ({ options, placeholder, ...props }) => (
  <select {...props}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map((o) =>
      typeof o === "string" ? (
        <option key={o} value={o}>
          {label(o)}
        </option>
      ) : (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ),
    )}
  </select>
);

// Handles submit state + error display for any form
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => {
    const v = e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setValues((s) => ({ ...s, [key]: v }));
  };
  const submit = (fn) => async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fn(values);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return { values, setValues, set, error, setError, busy, submit };
}

// ---------- Modal ----------
export function Modal({ open, title, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------- Pagination ----------
export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;
  return (
    <div className="pagination">
      <span className="muted">
        Page {page} of {pages} · {total} total
      </span>
      <div className="actions">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Prev
        </button>
        <button className="btn btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}

// Button that runs an async action, shows busy state and reports errors as toasts
export function ActionButton({ onClick, confirm, children, className = "btn", successMessage, disabled, ...rest }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const handle = async () => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    try {
      const res = await onClick();
      const msg = typeof successMessage === "function" ? successMessage(res) : successMessage || res?.message;
      if (msg) toast(msg);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" {...rest} className={className} disabled={busy || disabled} onClick={handle}>
      {busy ? "Working…" : children}
    </button>
  );
}
