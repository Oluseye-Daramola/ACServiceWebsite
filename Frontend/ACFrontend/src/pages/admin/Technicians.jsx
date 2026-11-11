import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { technicianApi } from "../../api/endpoints";
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
  Select,
  Spinner,
  Stat,
  useForm,
  useToast,
} from "../../components/ui";
import { date, dateTime } from "../../utils/format";

// POST /api/technicians and PATCH /api/technicians/:id
function TechnicianForm({ tech, onSaved, onCancel }) {
  const f = useForm({
    name: tech?.name || "",
    email: tech?.email || "",
    phone: tech?.phone || "",
    specialization: tech?.specialization || "",
    password: "",
  });
  const onSubmit = f.submit(async ({ password, ...v }) => {
    if (!v.phone) delete v.phone;
    const res = tech ? await technicianApi.update(tech._id, v) : await technicianApi.create({ ...v, password });
    onSaved(res.technician);
  });
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <ErrorBox error={f.error} />
      <Field label="Full name *">
        <input required minLength={2} value={f.values.name} onChange={f.set("name")} />
      </Field>
      <Field label="Phone *">
        <input required={!tech} type="tel" value={f.values.phone} onChange={f.set("phone")} />
      </Field>
      <Field label="Email (login) *">
        <input required type="email" value={f.values.email} onChange={f.set("email")} />
      </Field>
      <Field label="Specialization">
        <input placeholder="e.g. Split units, VRF" value={f.values.specialization} onChange={f.set("specialization")} />
      </Field>
      {!tech && (
        <Field label="Initial password *" hint="At least 8 characters. Share it with the technician securely." full>
          <input
            required
            minLength={8}
            type="text"
            autoComplete="off"
            value={f.values.password}
            onChange={f.set("password")}
          />
        </Field>
      )}
      <div className="field-full actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={f.busy}>
          {f.busy ? "Saving…" : tech ? "Save changes" : "Create technician"}
        </button>
      </div>
    </form>
  );
}

// GET /api/technicians
export function TechniciansList() {
  const { params, setParam, key, search, setSearch } = useListParams();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(
    () => technicianApi.list({ page: params.page, search: params.search, isActive: params.isActive }),
    [key],
  );

  return (
    <>
      <PageHeader
        title="Technicians"
        subtitle="Staff accounts that receive and complete jobs"
        actions={
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + New technician
          </button>
        }
      />
      <div className="filters">
        <input
          type="search"
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          placeholder="All accounts"
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Deactivated" },
          ]}
          value={params.isActive || ""}
          onChange={(e) => setParam("isActive", e.target.value)}
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
                  <th>Contact</th>
                  <th>Specialization</th>
                  <th>Last login</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <Link to={`/app/technicians/${t._id}`}>
                        <strong>{t.name}</strong>
                      </Link>
                    </td>
                    <td>
                      {t.phone}
                      <div className="muted small">{t.email}</div>
                    </td>
                    <td>{t.specialization || "—"}</td>
                    <td>{dateTime(t.lastLogin)}</td>
                    <td>
                      <Badge value={t.isActive ? "active" : "inactive"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No technicians found.</Empty>
        )}
        <Pagination pagination={data?.pagination} onPage={(p) => setParam("page", p)} />
      </Card>
      <Modal open={creating} title="New technician" onClose={() => setCreating(false)} wide>
        <TechnicianForm
          onCancel={() => setCreating(false)}
          onSaved={(t) => {
            toast("Technician account created");
            navigate(`/app/technicians/${t._id}`);
          }}
        />
      </Modal>
    </>
  );
}

// GET /api/technicians/:id, PATCH, reset-password, DELETE (deactivate)
export function TechnicianDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { data, loading, error, reload } = useApi(() => technicianApi.get(id), [id]);
  const pw = useForm({ password: "" });

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  const { technician: t, jobs } = data;

  const resetPassword = pw.submit(async (v) => {
    await technicianApi.resetPassword(id, v.password);
    setResetting(false);
    pw.setValues({ password: "" });
    toast("Password reset. The technician has been signed out everywhere.");
  });

  return (
    <>
      <PageHeader
        back={
          <Link to="/app/technicians" className="back">
            ← Technicians
          </Link>
        }
        title={t.name}
        subtitle={t.specialization}
        actions={
          <>
            <Badge value={t.isActive ? "active" : "inactive"} />
            <Link className="btn" to={`/app/services?technician=${t._id}`}>
              View jobs
            </Link>
            <button className="btn" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button className="btn" onClick={() => setResetting(true)}>
              Reset password
            </button>
            {t.isActive ? (
              <ActionButton
                className="btn btn-danger"
                confirm={`Deactivate ${t.name}? They will no longer be able to log in.`}
                onClick={async () => {
                  const r = await technicianApi.deactivate(id);
                  reload();
                  return r;
                }}
              >
                Deactivate
              </ActionButton>
            ) : (
              <ActionButton
                className="btn btn-primary"
                successMessage="Technician reactivated"
                onClick={async () => {
                  await technicianApi.update(id, { isActive: true });
                  reload();
                }}
              >
                Reactivate
              </ActionButton>
            )}
          </>
        }
      />
      <div className="stats">
        {["assigned", "in_progress", "completed", "cancelled"].map((s) => (
          <Stat key={s} label={s.replace("_", " ")} value={jobs[s] || 0} />
        ))}
      </div>
      <Card title="Account">
        <DL
          items={[
            ["Email", t.email],
            ["Phone", t.phone],
            ["Specialization", t.specialization],
            ["Last login", dateTime(t.lastLogin)],
            ["Created", date(t.createdAt)],
          ]}
        />
      </Card>
      <Modal open={editing} title="Edit technician" onClose={() => setEditing(false)} wide>
        <TechnicianForm
          tech={t}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast("Technician updated");
            reload();
          }}
        />
      </Modal>
      <Modal open={resetting} title={`Reset password for ${t.name}`} onClose={() => setResetting(false)}>
        <form className="stack" onSubmit={resetPassword}>
          <ErrorBox error={pw.error} />
          <Field label="New password" hint="At least 8 characters">
            <input required minLength={8} autoComplete="off" value={pw.values.password} onChange={pw.set("password")} />
          </Field>
          <button className="btn btn-primary" disabled={pw.busy}>
            Reset password
          </button>
        </form>
      </Modal>
    </>
  );
}
