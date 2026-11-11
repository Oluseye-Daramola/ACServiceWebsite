import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { clientApi } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { useListParams } from "../../hooks/useListParams";
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
  Spinner,
  useForm,
  useToast,
} from "../../components/ui";
import { date, dateTime, label, money } from "../../utils/format";

// POST /api/clients and PATCH /api/clients/:id
function ClientForm({ client, onSaved, onCancel }) {
  const f = useForm({
    name: client?.name || "",
    phone: client?.phone || "",
    email: client?.email || "",
    address: client?.address || "",
    city: client?.city || "",
    notes: client?.notes || "",
  });
  const onSubmit = f.submit(async (v) => {
    const res = client ? await clientApi.update(client._id, v) : await clientApi.create(v);
    onSaved(res.client);
  });
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <ErrorBox error={f.error} />
      <Field label="Name *">
        <input required minLength={2} value={f.values.name} onChange={f.set("name")} />
      </Field>
      <Field label="Phone *">
        <input required type="tel" value={f.values.phone} onChange={f.set("phone")} />
      </Field>
      <Field label="Email">
        <input type="email" value={f.values.email} onChange={f.set("email")} />
      </Field>
      <Field label="City">
        <input value={f.values.city} onChange={f.set("city")} />
      </Field>
      <Field label="Address" full>
        <input value={f.values.address} onChange={f.set("address")} />
      </Field>
      <Field label="Notes" full>
        <textarea rows={3} value={f.values.notes} onChange={f.set("notes")} />
      </Field>
      <div className="field-full actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={f.busy}>
          {f.busy ? "Saving…" : client ? "Save changes" : "Create client"}
        </button>
      </div>
    </form>
  );
}

// GET /api/clients
export function ClientsList() {
  const { params, setParam, key, search, setSearch } = useListParams();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(
    () => clientApi.list({ page: params.page, search: params.search }),
    [key],
  );

  return (
    <>
      <PageHeader
        title="Clients"
        actions={
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + New client
          </button>
        }
      />
      <div className="filters">
        <input
          type="search"
          placeholder="Search name, email, phone, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>City</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <Link to={`/app/clients/${c._id}`}>
                        <strong>{c.name}</strong>
                      </Link>
                    </td>
                    <td>{c.phone}</td>
                    <td>{c.email || "—"}</td>
                    <td>{c.city || "—"}</td>
                    <td>{date(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No clients found.</Empty>
        )}
        <Pagination pagination={data?.pagination} onPage={(p) => setParam("page", p)} />
      </Card>
      <Modal open={creating} title="New client" onClose={() => setCreating(false)} wide>
        <ClientForm
          onCancel={() => setCreating(false)}
          onSaved={(c) => {
            toast("Client created");
            navigate(`/app/clients/${c._id}`);
          }}
        />
      </Modal>
    </>
  );
}

// GET /api/clients/:id (with services + invoices), PATCH, DELETE
export function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const { data, loading, error, reload } = useApi(() => clientApi.get(id), [id]);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  const { client, services, invoices } = data;

  return (
    <>
      <PageHeader
        back={
          <Link to="/app/clients" className="back">
            ← Clients
          </Link>
        }
        title={client.name}
        subtitle={`Client since ${date(client.createdAt)}`}
        actions={
          <>
            <Link className="btn btn-primary" to={`/app/services/new?client=${client._id}`}>
              + New job
            </Link>
            <button className="btn" onClick={() => setEditing(true)}>
              Edit
            </button>
            <ActionButton
              className="btn btn-danger"
              disabled={services.length > 0}
              title={services.length ? "Clients with jobs on record cannot be deleted" : ""}
              confirm={`Delete ${client.name}? This cannot be undone.`}
              onClick={async () => {
                const r = await clientApi.remove(id);
                navigate("/app/clients");
                return r;
              }}
            >
              Delete
            </ActionButton>
          </>
        }
      />
      <div className="grid-2">
        <Card title="Details">
          <DL
            items={[
              ["Phone", <a href={`tel:${client.phone}`}>{client.phone}</a>],
              ["Email", client.email && <a href={`mailto:${client.email}`}>{client.email}</a>],
              ["Address", client.address],
              ["City", client.city],
              ["Notes", client.notes && <span className="prewrap">{client.notes}</span>],
              ["Last updated", dateTime(client.updatedAt)],
            ]}
          />
        </Card>
        <Card title={`Invoices (${invoices.length})`}>
          {invoices.length ? (
            <ul className="list">
              {invoices.map((i) => (
                <li key={i._id}>
                  <Link to={`/app/invoices/${i._id}`}>
                    <strong>{i.invoiceNo}</strong> · {money(i.total)}
                    <span className="muted">
                      {" "}
                      · balance {money(i.balance)} · {date(i.issueDate)}
                    </span>
                  </Link>
                  <Badge value={i.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No invoices yet.</Empty>
          )}
        </Card>
      </div>
      <Card title={`Jobs (${services.length})`}>
        {services.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Type</th>
                  <th>Technician</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <Link to={`/app/services/${s._id}`}>
                        <strong>{s.serviceNo}</strong> {s.title}
                      </Link>
                    </td>
                    <td>{label(s.serviceType)}</td>
                    <td>{s.technician?.name || "—"}</td>
                    <td>{date(s.scheduledDate)}</td>
                    <td>
                      <Badge value={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No jobs yet.</Empty>
        )}
      </Card>
      <Modal open={editing} title="Edit client" onClose={() => setEditing(false)} wide>
        <ClientForm
          client={client}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast("Client updated");
            reload();
          }}
        />
      </Modal>
    </>
  );
}
