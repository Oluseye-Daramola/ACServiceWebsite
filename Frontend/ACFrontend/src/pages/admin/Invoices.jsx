import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { invoiceApi, serviceApi, transactionApi } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { useListParams } from "../../hooks/useListParams";
import { ServicePicker } from "../../components/Pickers";
import {
  ActionButton,
  Badge,
  Card,
  DL,
  Empty,
  ErrorBox,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  useForm,
  useToast,
} from "../../components/ui";
import {
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  date,
  dateTime,
  fromInput,
  label,
  money,
  toDateInput,
  toDateTimeInput,
} from "../../utils/format";

const round = (n) => Math.round(n * 100) / 100;

// GET /api/invoices
export function InvoicesList() {
  const { params, setParam, key, search, setSearch } = useListParams();
  const { data, loading, error, reload } = useApi(
    () =>
      invoiceApi.list({
        page: params.page,
        status: params.status,
        search: params.search,
        client: params.client,
        from: params.from,
        to: params.to ? `${params.to}T23:59:59` : undefined,
      }),
    [key],
  );

  return (
    <>
      <PageHeader
        title="Invoices"
        actions={
          <Link to="/app/invoices/new" className="btn btn-primary">
            + New invoice
          </Link>
        }
      />
      <div className="filters">
        <input type="search" placeholder="Invoice number…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          options={INVOICE_STATUSES}
          placeholder="All statuses"
          value={params.status || ""}
          onChange={(e) => setParam("status", e.target.value)}
        />
        <label className="inline-label">
          From <input type="date" value={params.from || ""} onChange={(e) => setParam("from", e.target.value)} />
        </label>
        <label className="inline-label">
          To <input type="date" value={params.to || ""} onChange={(e) => setParam("to", e.target.value)} />
        </label>
      </div>
      <ErrorBox error={error} onRetry={reload} />
      <Card>
        {loading && !data ? (
          <Spinner />
        ) : data?.data.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Job</th>
                  <th>Issued</th>
                  <th className="num">Total</th>
                  <th className="num">Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((i) => (
                  <tr key={i._id}>
                    <td>
                      <Link to={`/app/invoices/${i._id}`}>
                        <strong>{i.invoiceNo}</strong>
                      </Link>
                    </td>
                    <td>{i.client?.name}</td>
                    <td>{i.service?.serviceNo}</td>
                    <td>{date(i.issueDate)}</td>
                    <td className="num">{money(i.total)}</td>
                    <td className="num">{money(i.balance)}</td>
                    <td>
                      <Badge value={i.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No invoices found.</Empty>
        )}
        <Pagination pagination={data?.pagination} onPage={(p) => setParam("page", p)} />
      </Card>
    </>
  );
}

// Line items + tax/discount with a live preview (server recalculates the real totals)
function InvoiceForm({ invoice, initialService, onSaved, onCancel }) {
  const f = useForm({
    serviceId: initialService?._id || "",
    items: invoice?.items?.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })) || [
      { description: "", quantity: 1, unitPrice: "" },
    ],
    taxRate: invoice?.taxRate ?? 0,
    discount: invoice?.discount ?? 0,
    dueDate: toDateInput(invoice?.dueDate),
    notes: invoice?.notes || "",
  });
  const { values: v, setValues } = f;

  const setItem = (i, k) => (e) =>
    setValues((s) => ({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, [k]: e.target.value } : it)) }));

  const subtotal = round(v.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0));
  const discount = Number(v.discount) || 0;
  const tax = round(((subtotal - discount) * (Number(v.taxRate) || 0)) / 100);
  const total = Math.max(round(subtotal - discount + tax), 0);

  const onSubmit = f.submit(async ({ serviceId, dueDate, items, taxRate, discount: disc, notes }) => {
    if (!invoice && !serviceId) return f.setError({ message: "Choose the job this invoice is for" });
    const body = {
      items: items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      })),
      taxRate: Number(taxRate) || 0,
      discount: Number(disc) || 0,
      notes,
    };
    if (dueDate) body.dueDate = fromInput(dueDate);
    const res = invoice ? await invoiceApi.update(invoice._id, body) : await invoiceApi.create({ ...body, serviceId });
    onSaved(res.invoice);
  });

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <ErrorBox error={f.error} />
      {!invoice && (
        <Field label="Job *" full>
          <ServicePicker
            value={v.serviceId}
            initialLabel={
              initialService
                ? `${initialService.serviceNo} · ${initialService.title} (${initialService.client?.name || "—"})`
                : ""
            }
            onChange={(id) => f.set("serviceId")(id)}
          />
        </Field>
      )}
      <div className="field-full">
        <div className="row-between">
          <span className="field-label">Items</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              setValues((s) => ({ ...s, items: [...s.items, { description: "", quantity: 1, unitPrice: "" }] }))
            }
          >
            + Add item
          </button>
        </div>
        <div className="item-head muted small">
          <span>Description</span>
          <span>Qty</span>
          <span>Unit price</span>
          <span className="num">Amount</span>
          <span />
        </div>
        {v.items.map((it, i) => (
          <div key={i} className="item-row">
            <input
              required
              minLength={2}
              placeholder="e.g. Gas refill R410A"
              value={it.description}
              onChange={setItem(i, "description")}
            />
            <input
              required
              type="number"
              min={1}
              step={1}
              value={it.quantity}
              onChange={setItem(i, "quantity")}
              aria-label="Quantity"
            />
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={it.unitPrice}
              onChange={setItem(i, "unitPrice")}
              aria-label="Unit price"
            />
            <span className="num">{money((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}</span>
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove item"
              disabled={v.items.length === 1}
              onClick={() => setValues((s) => ({ ...s, items: s.items.filter((_, j) => j !== i) }))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Field label="Discount">
        <input type="number" min={0} step="0.01" value={v.discount} onChange={f.set("discount")} />
      </Field>
      <Field label="Tax rate (%)" hint="Applied after the discount, e.g. 7.5">
        <input type="number" min={0} max={100} step="0.01" value={v.taxRate} onChange={f.set("taxRate")} />
      </Field>
      <Field label="Due date">
        <input type="date" value={v.dueDate} onChange={f.set("dueDate")} />
      </Field>
      <div className="totals">
        <div>
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        <div>
          <span>Discount</span>
          <span>−{money(discount)}</span>
        </div>
        <div>
          <span>Tax</span>
          <span>{money(tax)}</span>
        </div>
        <div className="grand">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
      </div>
      <Field label="Notes" full>
        <textarea rows={2} value={v.notes} onChange={f.set("notes")} placeholder="Payment details, warranty terms…" />
      </Field>
      <div className="field-full actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn btn-primary" disabled={f.busy}>
          {f.busy ? "Saving…" : invoice ? "Save changes" : "Create invoice"}
        </button>
      </div>
    </form>
  );
}

// /app/invoices/new?service=<id>
export function InvoiceNew() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const serviceId = sp.get("service");
  const [service, setService] = useState(null);
  const [ready, setReady] = useState(!serviceId);

  useEffect(() => {
    if (!serviceId) return;
    serviceApi
      .get(serviceId)
      .then((r) => setService(r.service))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [serviceId]);

  return (
    <>
      <PageHeader
        back={
          <Link to="/app/invoices" className="back">
            ← Invoices
          </Link>
        }
        title="New invoice"
      />
      <Card>
        {ready && (
          <InvoiceForm
            initialService={service}
            onCancel={() => navigate(-1)}
            onSaved={(inv) => {
              toast(`Invoice ${inv.invoiceNo} created`);
              navigate(`/app/invoices/${inv._id}`);
            }}
          />
        )}
      </Card>
    </>
  );
}

// GET /api/invoices/:id (+ transactions) and all invoice actions
export function InvoiceDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [modal, setModal] = useState(null); // edit | pay | email | whatsapp | reverse
  const [reversing, setReversing] = useState(null);
  const { data, loading, error, reload } = useApi(() => invoiceApi.get(id), [id]);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  const { invoice: inv, transactions } = data;
  const cancelled = inv.status === "cancelled";
  const editable = !cancelled && inv.amountPaid === 0;
  const fileName = `${inv.invoiceNo}.pdf`;
  const close = () => setModal(null);

  return (
    <>
      <PageHeader
        back={
          <Link to="/app/invoices" className="back">
            ← Invoices
          </Link>
        }
        title={inv.invoiceNo}
        subtitle={`Issued ${date(inv.issueDate)}${inv.dueDate ? ` · due ${date(inv.dueDate)}` : ""}`}
        actions={
          <>
            <Badge value={inv.status} />
            <ActionButton className="btn" onClick={() => invoiceApi.pdf(inv._id, fileName, "open")}>
              View PDF
            </ActionButton>
            <ActionButton className="btn" onClick={() => invoiceApi.pdf(inv._id, fileName, "download")}>
              Download
            </ActionButton>
          </>
        }
      />

      {!cancelled && (
        <Card className="toolbar">
          <div className="actions">
            {inv.status !== "paid" && (
              <button className="btn btn-primary" onClick={() => setModal("pay")}>
                Record payment
              </button>
            )}
            <button className="btn" onClick={() => setModal("email")}>
              Send by email
            </button>
            <button className="btn" onClick={() => setModal("whatsapp")}>
              Share on WhatsApp
            </button>
            <button
              className="btn"
              disabled={!editable}
              title={editable ? "" : "Invoices with payments cannot be edited"}
              onClick={() => setModal("edit")}
            >
              Edit
            </button>
            <ActionButton
              className="btn btn-danger"
              disabled={inv.amountPaid > 0}
              title={inv.amountPaid > 0 ? "Reverse the payments first" : ""}
              confirm={`Cancel invoice ${inv.invoiceNo}?`}
              successMessage="Invoice cancelled"
              onClick={async () => {
                await invoiceApi.cancel(inv._id);
                reload();
              }}
            >
              Cancel invoice
            </ActionButton>
          </div>
        </Card>
      )}

      <div className="grid-2">
        <Card title="Bill to">
          <DL
            items={[
              ["Client", <Link to={`/app/clients/${inv.client?._id}`}>{inv.client?.name}</Link>],
              ["Email", inv.client?.email],
              ["Phone", inv.client?.phone],
              ["Address", inv.client?.address],
              [
                "Job",
                <Link
                  to={`/app/services/${inv.service?._id}`}
                >{`${inv.service?.serviceNo} · ${inv.service?.title}`}</Link>,
              ],
              ["Created by", inv.createdBy?.name],
            ]}
          />
        </Card>
        <Card title="Balance">
          <div className="totals totals-static">
            <div>
              <span>Total</span>
              <span>{money(inv.total)}</span>
            </div>
            <div>
              <span>Paid</span>
              <span>{money(inv.amountPaid)}</span>
            </div>
            <div className="grand">
              <span>Balance due</span>
              <span>{money(inv.balance)}</span>
            </div>
          </div>
          {inv.paidAt && <p className="muted">Fully paid on {dateTime(inv.paidAt)}</p>}
          {inv.sentLog?.length > 0 && (
            <>
              <h3>Sent</h3>
              <ul className="list small">
                {inv.sentLog.map((s, i) => (
                  <li key={i}>
                    {label(s.channel)} → {s.to} <span className="muted">{dateTime(s.sentAt)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card title="Items">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.description}</td>
                  <td className="num">{it.quantity}</td>
                  <td className="num">{money(it.unitPrice)}</td>
                  <td className="num">{money(it.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="num">
                  Subtotal
                </td>
                <td className="num">{money(inv.subtotal)}</td>
              </tr>
              {inv.discount > 0 && (
                <tr>
                  <td colSpan={3} className="num">
                    Discount
                  </td>
                  <td className="num">−{money(inv.discount)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={3} className="num">
                  Tax ({inv.taxRate}%)
                </td>
                <td className="num">{money(inv.taxAmount)}</td>
              </tr>
              <tr className="grand">
                <td colSpan={3} className="num">
                  Total
                </td>
                <td className="num">{money(inv.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {inv.notes && <p className="prewrap muted">{inv.notes}</p>}
      </Card>

      <Card title="Payments">
        {transactions.length ? (
          <PaymentsTable rows={transactions} onReverse={setReversing} />
        ) : (
          <Empty>No payments recorded.</Empty>
        )}
      </Card>

      <Modal open={modal === "edit"} title={`Edit ${inv.invoiceNo}`} onClose={close} wide>
        <InvoiceForm
          invoice={inv}
          onCancel={close}
          onSaved={() => {
            close();
            toast("Invoice updated");
            reload();
          }}
        />
      </Modal>
      <PaymentModal
        open={modal === "pay"}
        invoice={inv}
        onClose={close}
        onDone={(res) => {
          close();
          toast(res.message);
          reload();
        }}
      />
      <SendModal open={modal === "email"} invoice={inv} channel="email" onClose={close} onDone={reload} />
      <SendModal open={modal === "whatsapp"} invoice={inv} channel="whatsapp" onClose={close} onDone={reload} />
      <ReverseModal
        transaction={reversing}
        onClose={() => setReversing(null)}
        onDone={() => {
          setReversing(null);
          toast("Payment reversed");
          reload();
        }}
      />
    </>
  );
}

export function PaymentsTable({ rows, onReverse, showInvoice }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Receipt</th>
            {showInvoice && <th>Invoice</th>}
            {showInvoice && <th>Client</th>}
            <th>Paid</th>
            <th>Method</th>
            <th className="num">Amount</th>
            <th>Status</th>
            {onReverse && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t._id} className={t.status === "reversed" ? "row-muted" : ""}>
              <td>
                <Link to={`/app/payments/${t._id}`}>
                  <strong>{t.reference}</strong>
                </Link>
                {t.paymentRef && <div className="muted small">Ref: {t.paymentRef}</div>}
              </td>
              {showInvoice && (
                <td>
                  <Link to={`/app/invoices/${t.invoice?._id}`}>{t.invoice?.invoiceNo}</Link>
                </td>
              )}
              {showInvoice && <td>{t.client?.name}</td>}
              <td>{dateTime(t.paidAt)}</td>
              <td>{label(t.method)}</td>
              <td className="num">{money(t.amount)}</td>
              <td>
                <Badge value={t.status} />
              </td>
              {onReverse && (
                <td>
                  {t.status === "successful" && (
                    <button className="btn btn-sm btn-ghost" onClick={() => onReverse(t)}>
                      Reverse
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// POST /api/transactions
function PaymentModal({ open, invoice, onClose, onDone }) {
  const f = useForm({
    amount: "",
    method: "bank_transfer",
    paymentRef: "",
    paidAt: toDateTimeInput(new Date()),
    notes: "",
  });
  const [forOpen, setForOpen] = useState(false);
  if (open !== forOpen) {
    setForOpen(open);
    if (open) f.setValues((s) => ({ ...s, amount: invoice.balance, paidAt: toDateTimeInput(new Date()) }));
  }
  const onSubmit = f.submit(async (v) => {
    onDone(
      await transactionApi.record({
        invoiceId: invoice._id,
        amount: Number(v.amount),
        method: v.method,
        paymentRef: v.paymentRef,
        notes: v.notes,
        ...(v.paidAt && { paidAt: fromInput(v.paidAt) }),
      }),
    );
  });
  return (
    <Modal open={open} title={`Record payment · balance ${money(invoice.balance)}`} onClose={onClose}>
      <form className="stack" onSubmit={onSubmit}>
        <ErrorBox error={f.error} />
        <Field label="Amount">
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            max={invoice.balance}
            value={f.values.amount}
            onChange={f.set("amount")}
          />
        </Field>
        <Field label="Method">
          <Select options={PAYMENT_METHODS} value={f.values.method} onChange={f.set("method")} />
        </Field>
        <Field label="Payer's reference" hint="Bank / POS transaction reference">
          <input value={f.values.paymentRef} onChange={f.set("paymentRef")} />
        </Field>
        <Field label="Paid at">
          <input type="datetime-local" value={f.values.paidAt} onChange={f.set("paidAt")} />
        </Field>
        <Field label="Notes">
          <textarea rows={2} value={f.values.notes} onChange={f.set("notes")} />
        </Field>
        <button className="btn btn-primary" disabled={f.busy}>
          {f.busy ? "Saving…" : "Record payment"}
        </button>
      </form>
    </Modal>
  );
}

// POST /api/invoices/:id/send-email or /share-whatsapp
function SendModal({ open, invoice, channel, onClose, onDone }) {
  const toast = useToast();
  const isEmail = channel === "email";
  const f = useForm({ to: (isEmail ? invoice.client?.email : invoice.client?.phone) || "" });
  const [result, setResult] = useState(null);

  const onSubmit = f.submit(async (v) => {
    if (isEmail) {
      const res = await invoiceApi.sendEmail(invoice._id, v.to);
      toast(res.message);
      onDone();
      onClose();
    } else {
      const res = await invoiceApi.shareWhatsapp(invoice._id, v.to);
      setResult(res);
      window.open(res.whatsappUrl, "_blank", "noopener");
      onDone();
    }
  });

  return (
    <Modal
      open={open}
      title={isEmail ? "Email invoice" : "Share on WhatsApp"}
      onClose={() => {
        setResult(null);
        onClose();
      }}
    >
      {result ? (
        <div className="stack">
          <div className="alert alert-ok">WhatsApp should have opened with the message ready to send.</div>
          <a className="btn btn-primary" href={result.whatsappUrl} target="_blank" rel="noreferrer">
            Open WhatsApp again
          </a>
          <Field label="Public PDF link (valid 7 days)">
            <input readOnly value={result.pdfLink} onFocus={(e) => e.target.select()} />
          </Field>
          <button
            className="btn"
            onClick={() => navigator.clipboard?.writeText(result.pdfLink).then(() => toast("Link copied"))}
          >
            Copy link
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={onSubmit}>
          <ErrorBox error={f.error} />
          <Field
            label={isEmail ? "Email address" : "WhatsApp number"}
            hint={isEmail ? "The PDF is attached" : "Local numbers like 0803… are converted automatically"}
          >
            <input required type={isEmail ? "email" : "tel"} value={f.values.to} onChange={f.set("to")} />
          </Field>
          <button className="btn btn-primary" disabled={f.busy}>
            {f.busy ? "Working…" : isEmail ? "Send invoice" : "Create WhatsApp message"}
          </button>
        </form>
      )}
    </Modal>
  );
}

// PATCH /api/transactions/:id/reverse
export function ReverseModal({ transaction, onClose, onDone }) {
  const f = useForm({ reason: "" });
  const onSubmit = f.submit(async (v) => {
    const res = await transactionApi.reverse(transaction._id, v.reason);
    f.setValues({ reason: "" });
    onDone(res);
  });
  return (
    <Modal
      open={Boolean(transaction)}
      title={`Reverse ${transaction?.reference} · ${money(transaction?.amount)}`}
      onClose={onClose}
    >
      <form className="stack" onSubmit={onSubmit}>
        <ErrorBox error={f.error} />
        <p className="muted">
          The amount is removed from the invoice's paid total. This is recorded for audit and cannot be undone.
        </p>
        <Field label="Reason *">
          <textarea required minLength={3} rows={3} value={f.values.reason} onChange={f.set("reason")} />
        </Field>
        <button className="btn btn-danger" disabled={f.busy}>
          {f.busy ? "Reversing…" : "Reverse payment"}
        </button>
      </form>
    </Modal>
  );
}
