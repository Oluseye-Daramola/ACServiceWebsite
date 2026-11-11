import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { serviceApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { useListParams } from "../../hooks/useListParams";
import { TechnicianSelect } from "../../components/Pickers";
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
import { PRIORITIES, SERVICE_STATUSES, SERVICE_TYPES, date, dateTime, label, money } from "../../utils/format";
import { ServiceForm } from "./ServiceForm";
import { ReportForm } from "../reports/ReportForm";

// GET /api/services (technicians only see their own)
export function ServicesList() {
  const { isAdmin } = useAuth();
  const { params, setParam, key, search, setSearch } = useListParams();
  const { data, loading, error, reload } = useApi(
    () =>
      serviceApi.list({
        page: params.page,
        search: params.search,
        status: params.status,
        serviceType: params.serviceType,
        priority: params.priority,
        technician: params.technician,
        client: params.client,
      }),
    [key],
  );

  return (
    <>
      <PageHeader
        title={isAdmin ? "Services" : "My jobs"}
        subtitle={isAdmin ? "All service jobs" : "Jobs assigned to you"}
        actions={
          isAdmin && (
            <Link to="/app/services/new" className="btn btn-primary">
              + New job
            </Link>
          )
        }
      />
      <div className="filters">
        <input
          type="search"
          placeholder="Search job no., title, address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          options={SERVICE_STATUSES}
          placeholder="All statuses"
          value={params.status || ""}
          onChange={(e) => setParam("status", e.target.value)}
        />
        <Select
          options={SERVICE_TYPES}
          placeholder="All types"
          value={params.serviceType || ""}
          onChange={(e) => setParam("serviceType", e.target.value)}
        />
        <Select
          options={PRIORITIES}
          placeholder="Any priority"
          value={params.priority || ""}
          onChange={(e) => setParam("priority", e.target.value)}
        />
        {isAdmin && (
          <TechnicianSelect
            placeholder="All technicians"
            value={params.technician || ""}
            onChange={(e) => setParam("technician", e.target.value)}
          />
        )}
        {params.client && (
          <button className="btn btn-sm" onClick={() => setParam("client", "")}>
            Client filter ×
          </button>
        )}
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
                  <th>Job</th>
                  <th>Client</th>
                  <th>Type</th>
                  {isAdmin && <th>Technician</th>}
                  <th>Scheduled</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <Link to={`/app/services/${s._id}`}>
                        <strong>{s.serviceNo}</strong>
                        <div>{s.title}</div>
                      </Link>
                    </td>
                    <td>
                      {s.client?.name}
                      <div className="muted small">{s.client?.phone}</div>
                    </td>
                    <td>{label(s.serviceType)}</td>
                    {isAdmin && <td>{s.technician?.name || <span className="muted">Unassigned</span>}</td>}
                    <td>{date(s.scheduledDate)}</td>
                    <td>
                      <Badge value={s.priority} />
                    </td>
                    <td>
                      <Badge value={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No jobs match.</Empty>
        )}
        <Pagination pagination={data?.pagination} onPage={(p) => setParam("page", p)} />
      </Card>
    </>
  );
}

// GET /api/services/:id (includes report; admins also get invoice)
export function ServiceDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { data, loading, error, reload } = useApi(() => serviceApi.get(id), [id]);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  const { service: s, report, invoice } = data;

  return (
    <>
      <PageHeader
        back={
          <Link to="/app/services" className="back">
            ← {isAdmin ? "Services" : "My jobs"}
          </Link>
        }
        title={`${s.serviceNo} · ${s.title}`}
        subtitle={`${label(s.serviceType)} · created ${date(s.createdAt)}`}
        actions={
          <>
            <Badge value={s.priority} />
            <Badge value={s.status} />
          </>
        }
      />
      {isAdmin ? <AdminActions s={s} reload={reload} /> : <TechActions s={s} report={report} reload={reload} />}

      <div className="grid-2">
        <Card title="Job details">
          <DL
            items={[
              ["Client", isAdmin ? <Link to={`/app/clients/${s.client?._id}`}>{s.client?.name}</Link> : s.client?.name],
              ["Phone", s.client?.phone && <a href={`tel:${s.client.phone}`}>{s.client.phone}</a>],
              ["Address", s.address || s.client?.address],
              ["Scheduled", date(s.scheduledDate)],
              [
                "Technician",
                s.technician ? `${s.technician.name} (${s.technician.phone || s.technician.email})` : "Not assigned",
              ],
              ["Assigned", dateTime(s.assignedAt)],
              ["Started", dateTime(s.startedAt)],
              ["Completed", dateTime(s.completedAt)],
            ]}
          />
          {s.description && (
            <>
              <h3>Description</h3>
              <p className="prewrap">{s.description}</p>
            </>
          )}
          {isAdmin && s.adminNotes && (
            <>
              <h3>Admin notes</h3>
              <p className="prewrap">{s.adminNotes}</p>
            </>
          )}
          {s.technicianNotes && (
            <>
              <h3>Technician notes</h3>
              <p className="prewrap">{s.technicianNotes}</p>
            </>
          )}
        </Card>

        <div className="stack">
          <Card title="AC units">
            {s.acUnits?.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Brand / model</th>
                      <th>Type</th>
                      <th>Capacity</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.acUnits.map((u, i) => (
                      <tr key={i}>
                        <td>{[u.brand, u.model].filter(Boolean).join(" ") || "—"}</td>
                        <td>{u.type || "—"}</td>
                        <td>{u.capacity || "—"}</td>
                        <td>{u.location || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No units recorded.</Empty>
            )}
          </Card>

          <Card title="Service report">
            {report ? (
              <div className="row-between">
                <span>
                  <Badge value={report.status} /> <span className="muted">updated {dateTime(report.updatedAt)}</span>
                </span>
                <Link className="btn btn-primary btn-sm" to={`/app/reports/${report._id}`}>
                  Open report
                </Link>
              </div>
            ) : (
              <Empty>No report filed yet.</Empty>
            )}
          </Card>

          {isAdmin && (
            <Card title="Invoice">
              {invoice ? (
                <div className="row-between">
                  <span>
                    <strong>{invoice.invoiceNo}</strong> · {money(invoice.total)} <Badge value={invoice.status} />
                  </span>
                  <Link className="btn btn-sm" to={`/app/invoices/${invoice._id}`}>
                    Open invoice
                  </Link>
                </div>
              ) : s.status === "cancelled" ? (
                <Empty>Cancelled jobs cannot be invoiced.</Empty>
              ) : (
                <div className="row-between">
                  <span className="muted">Not invoiced yet.</span>
                  <Link className="btn btn-primary btn-sm" to={`/app/invoices/new?service=${s._id}`}>
                    Create invoice
                  </Link>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

// Admin: edit, assign, status override, delete
function AdminActions({ s, reload }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [techId, setTechId] = useState("");
  const [status, setStatus] = useState(s.status);

  return (
    <Card className="toolbar">
      <div className="toolbar-row">
        <div className="inline-form">
          <TechnicianSelect
            value={techId}
            onChange={(e) => setTechId(e.target.value)}
            placeholder={s.technician ? `Reassign (now: ${s.technician.name})` : "Choose technician"}
          />
          <ActionButton
            className="btn btn-primary"
            disabled={!techId}
            successMessage="Technician assigned and notified by email"
            onClick={async () => {
              await serviceApi.assign(s._id, techId);
              setTechId("");
              reload();
            }}
          >
            {s.technician ? "Reassign" : "Assign"}
          </ActionButton>
        </div>
        <div className="inline-form">
          <Select options={SERVICE_STATUSES} value={status} onChange={(e) => setStatus(e.target.value)} />
          <ActionButton
            className="btn"
            disabled={status === s.status}
            confirm={
              status === "completed" ? "Mark completed as an admin override (no signed report required)?" : undefined
            }
            successMessage="Status updated"
            onClick={async () => {
              await serviceApi.setStatus(s._id, status);
              reload();
            }}
          >
            Set status
          </ActionButton>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setEditing(true)}>
            Edit
          </button>
          <ActionButton
            className="btn btn-danger"
            confirm="Delete this job? Jobs with a report or invoice must be cancelled instead."
            onClick={async () => {
              const r = await serviceApi.remove(s._id);
              navigate("/app/services");
              return r;
            }}
          >
            Delete
          </ActionButton>
        </div>
      </div>
      <Modal open={editing} title={`Edit ${s.serviceNo}`} onClose={() => setEditing(false)} wide>
        <ServiceForm
          service={s}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast("Job updated");
            reload();
          }}
        />
      </Modal>
    </Card>
  );
}

// Technician: start → file report → sign → complete (PATCH /progress)
function TechActions({ s, report, reload }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [completing, setCompleting] = useState(false);
  const [filing, setFiling] = useState(false);
  const notes = useForm({ technicianNotes: s.technicianNotes || "" });

  const canFile = !report && ["assigned", "in_progress"].includes(s.status);
  const signed = report?.status === "signed";

  const complete = notes.submit(async (v) => {
    await serviceApi.progress(s._id, { status: "completed", technicianNotes: v.technicianNotes });
    setCompleting(false);
    toast("Job completed. Well done!");
    reload();
  });

  return (
    <Card className="toolbar">
      <ol className="progress-steps">
        <li className={s.status !== "assigned" ? "done" : "current"}>Start job</li>
        <li className={report ? "done" : s.status === "in_progress" ? "current" : ""}>File report</li>
        <li className={signed ? "done" : report ? "current" : ""}>Both signatures</li>
        <li className={s.status === "completed" ? "done" : signed ? "current" : ""}>Complete</li>
      </ol>
      <div className="actions">
        {s.status === "assigned" && (
          <ActionButton
            className="btn btn-primary"
            successMessage="Job started"
            onClick={async () => {
              await serviceApi.progress(s._id, { status: "in_progress" });
              reload();
            }}
          >
            Start job
          </ActionButton>
        )}
        {canFile && (
          <button className="btn btn-primary" onClick={() => setFiling(true)}>
            File service report
          </button>
        )}
        {report && (
          <Link className="btn" to={`/app/reports/${report._id}`}>
            {signed ? "View report" : "Continue report & signatures"}
          </Link>
        )}
        {s.status === "in_progress" && (
          <button
            className="btn btn-primary"
            disabled={!signed}
            title={signed ? "" : "The report must be signed by you and the client first"}
            onClick={() => setCompleting(true)}
          >
            Complete job
          </button>
        )}
      </div>

      <Modal open={filing} title="Service report" onClose={() => setFiling(false)} wide>
        <ReportForm
          serviceId={s._id}
          onCancel={() => setFiling(false)}
          onSaved={(r) => {
            toast("Report saved. Next: collect signatures.");
            navigate(`/app/reports/${r._id}`);
          }}
        />
      </Modal>
      <Modal open={completing} title="Complete job" onClose={() => setCompleting(false)}>
        <form className="stack" onSubmit={complete}>
          <ErrorBox error={notes.error} />
          <Field label="Notes for the office (optional)">
            <textarea rows={4} value={notes.values.technicianNotes} onChange={notes.set("technicianNotes")} />
          </Field>
          <button className="btn btn-primary" disabled={notes.busy}>
            Mark as completed
          </button>
        </form>
      </Modal>
    </Card>
  );
}
