import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { transactionApi } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { useListParams } from "../../hooks/useListParams";
import {
  Badge,
  Card,
  DL,
  Empty,
  ErrorBox,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  Stat,
  useToast,
} from "../../components/ui";
import { PAYMENT_METHODS, dateTime, label, money, monthName } from "../../utils/format";
import { PaymentsTable, ReverseModal } from "./Invoices";

// End-of-day "to" so a date filter includes the whole day
const endOfDay = (d) => (d ? `${d}T23:59:59` : undefined);

// GET /api/transactions + GET /api/transactions/summary
export function PaymentsList() {
  const { params, setParam, key } = useListParams();
  const toast = useToast();
  const [reversing, setReversing] = useState(null);
  const range = { from: params.from, to: endOfDay(params.to) };

  const list = useApi(
    () => transactionApi.list({ page: params.page, method: params.method, status: params.status, ...range }),
    [key],
  );
  const summary = useApi(() => transactionApi.summary(range), [params.from, params.to]);
  const s = summary.data;
  const maxMonth = Math.max(...(s?.byMonth.map((m) => m.amount) || [0]), 1);

  return (
    <>
      <PageHeader title="Payments" subtitle="Money received against invoices" />
      <div className="filters">
        <label className="inline-label">
          From <input type="date" value={params.from || ""} onChange={(e) => setParam("from", e.target.value)} />
        </label>
        <label className="inline-label">
          To <input type="date" value={params.to || ""} onChange={(e) => setParam("to", e.target.value)} />
        </label>
        <Select
          options={PAYMENT_METHODS}
          placeholder="All methods"
          value={params.method || ""}
          onChange={(e) => setParam("method", e.target.value)}
        />
        <Select
          options={["successful", "reversed"]}
          placeholder="Successful"
          value={params.status || ""}
          onChange={(e) => setParam("status", e.target.value)}
        />
      </div>

      <ErrorBox error={summary.error} onRetry={summary.reload} />
      {s && (
        <>
          <div className="stats">
            <Stat label="Received (period)" value={money(s.totalReceived)} tone="ok" />
            <Stat
              label="Outstanding"
              value={money(s.outstanding.amount)}
              hint={`${s.outstanding.count} open invoice(s)`}
              tone="danger"
            />
            {s.byMethod.slice(0, 2).map((m) => (
              <Stat key={m._id} label={label(m._id)} value={money(m.amount)} hint={`${m.count} payment(s)`} />
            ))}
          </div>
          <div className="grid-2">
            <Card title="By month">
              {s.byMonth.length ? (
                <ul className="bars">
                  {s.byMonth.map((m) => (
                    <li key={`${m._id.year}-${m._id.month}`}>
                      <span className="bar-label">
                        {monthName(m._id.month)} {m._id.year} <strong>{money(m.amount)}</strong>
                      </span>
                      <span className="bar-track">
                        <span className="bar-fill" style={{ width: `${(m.amount / maxMonth) * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No payments in this period.</Empty>
              )}
            </Card>
            <Card title="By method">
              {s.byMethod.length ? (
                <ul className="list">
                  {s.byMethod.map((m) => (
                    <li key={m._id}>
                      <span>
                        {label(m._id)} <span className="muted">· {m.count}</span>
                      </span>
                      <strong>{money(m.amount)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No payments in this period.</Empty>
              )}
            </Card>
          </div>
        </>
      )}

      <ErrorBox error={list.error} onRetry={list.reload} />
      <Card
        title="Transactions"
        actions={
          list.data && (
            <span className="muted">
              Total: <strong>{money(list.data.totalAmount)}</strong>
            </span>
          )
        }
      >
        {list.loading && !list.data ? (
          <Spinner />
        ) : list.data?.data.length ? (
          <PaymentsTable rows={list.data.data} showInvoice onReverse={setReversing} />
        ) : (
          <Empty>No transactions match.</Empty>
        )}
        <Pagination pagination={list.data?.pagination} onPage={(p) => setParam("page", p)} />
      </Card>
      <ReverseModal
        transaction={reversing}
        onClose={() => setReversing(null)}
        onDone={() => {
          setReversing(null);
          toast("Payment reversed");
          list.reload();
          summary.reload();
        }}
      />
    </>
  );
}

// GET /api/transactions/:id
export function PaymentDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [reversing, setReversing] = useState(null);
  const { data, loading, error, reload } = useApi(() => transactionApi.get(id), [id]);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  const t = data.transaction;

  return (
    <>
      <PageHeader
        back={
          <Link to="/app/payments" className="back">
            ← Payments
          </Link>
        }
        title={`Receipt ${t.reference}`}
        subtitle={`${money(t.amount)} · ${label(t.method)}`}
        actions={
          <>
            <Badge value={t.status} />
            {t.status === "successful" && (
              <button className="btn btn-danger" onClick={() => setReversing(t)}>
                Reverse
              </button>
            )}
          </>
        }
      />
      <div className="grid-2">
        <Card title="Payment">
          <DL
            items={[
              ["Amount", money(t.amount)],
              ["Method", label(t.method)],
              ["Payer's reference", t.paymentRef],
              ["Paid at", dateTime(t.paidAt)],
              ["Recorded by", t.recordedBy?.name],
              ["Recorded", dateTime(t.createdAt)],
              ["Notes", t.notes],
            ]}
          />
        </Card>
        <div className="stack">
          <Card title="Invoice">
            <DL
              items={[
                ["Invoice", <Link to={`/app/invoices/${t.invoice?._id}`}>{t.invoice?.invoiceNo}</Link>],
                ["Status", <Badge value={t.invoice?.status} />],
                ["Total", money(t.invoice?.total)],
                ["Balance", money(t.invoice?.balance)],
                ["Client", <Link to={`/app/clients/${t.client?._id}`}>{t.client?.name}</Link>],
                ["Client phone", t.client?.phone],
              ]}
            />
          </Card>
          {t.status === "reversed" && (
            <Card title="Reversal">
              <DL
                items={[
                  ["Reversed by", t.reversedBy?.name],
                  ["Reversed at", dateTime(t.reversedAt)],
                  ["Reason", t.reversalReason],
                ]}
              />
            </Card>
          )}
        </div>
      </div>
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
