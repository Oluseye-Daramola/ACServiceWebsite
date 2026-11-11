import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { clientApi, serviceApi } from "../../api/endpoints";
import { ClientPicker, TechnicianSelect } from "../../components/Pickers";
import { Card, ErrorBox, Field, PageHeader, Select, useForm, useToast } from "../../components/ui";
import { PRIORITIES, SERVICE_TYPES, fromInput, toDateInput } from "../../utils/format";

const emptyUnit = { brand: "", model: "", type: "", capacity: "", location: "" };

// Shared create/edit form. POST /api/services or PATCH /api/services/:id
export function ServiceForm({ service, initialClient, onSaved, onCancel }) {
  const f = useForm({
    clientId: service?.client?._id || initialClient?._id || "",
    title: service?.title || "",
    serviceType: service?.serviceType || "maintenance",
    priority: service?.priority || "normal",
    scheduledDate: toDateInput(service?.scheduledDate),
    address: service?.address || "",
    description: service?.description || "",
    adminNotes: service?.adminNotes || "",
    technicianId: "",
    acUnits: service?.acUnits?.length ? service.acUnits.map((u) => ({ ...emptyUnit, ...u })) : [],
  });
  const { values: v, setValues } = f;

  const setUnit = (i, k) => (e) =>
    setValues((s) => ({ ...s, acUnits: s.acUnits.map((u, j) => (j === i ? { ...u, [k]: e.target.value } : u)) }));

  const onSubmit = f.submit(async ({ technicianId, scheduledDate, ...rest }) => {
    if (!rest.clientId) return f.setError({ message: "Choose a client" });
    const body = { ...rest };
    if (scheduledDate) body.scheduledDate = fromInput(scheduledDate);
    if (!service && technicianId) body.technicianId = technicianId;
    const res = service ? await serviceApi.update(service._id, body) : await serviceApi.create(body);
    onSaved(res.service);
  });

  const clientLabel = service?.client
    ? `${service.client.name} · ${service.client.phone}`
    : initialClient
      ? `${initialClient.name} · ${initialClient.phone}`
      : "";

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <ErrorBox error={f.error} />
      <Field label="Client *" full>
        <ClientPicker
          value={v.clientId}
          initialLabel={clientLabel}
          onChange={(id, c) => setValues((s) => ({ ...s, clientId: id, address: s.address || c?.address || "" }))}
        />
      </Field>
      <Field label="Title *" full>
        <input
          required
          minLength={3}
          value={v.title}
          onChange={f.set("title")}
          placeholder="e.g. Service 3 split units"
        />
      </Field>
      <Field label="Service type *">
        <Select options={SERVICE_TYPES} value={v.serviceType} onChange={f.set("serviceType")} />
      </Field>
      <Field label="Priority">
        <Select options={PRIORITIES} value={v.priority} onChange={f.set("priority")} />
      </Field>
      <Field label="Scheduled date">
        <input type="date" value={v.scheduledDate} onChange={f.set("scheduledDate")} />
      </Field>
      {!service && (
        <Field label="Assign technician">
          <TechnicianSelect value={v.technicianId} onChange={f.set("technicianId")} />
        </Field>
      )}
      <Field label="Address" hint="Defaults to the client's address" full>
        <input value={v.address} onChange={f.set("address")} />
      </Field>
      <Field label="Description" full>
        <textarea rows={3} value={v.description} onChange={f.set("description")} />
      </Field>
      <Field label="Admin notes" full>
        <textarea rows={2} value={v.adminNotes} onChange={f.set("adminNotes")} />
      </Field>

      <div className="field-full">
        <div className="row-between">
          <span className="field-label">AC units</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setValues((s) => ({ ...s, acUnits: [...s.acUnits, { ...emptyUnit }] }))}
          >
            + Add unit
          </button>
        </div>
        {v.acUnits.map((u, i) => (
          <div key={i} className="unit-row">
            <input placeholder="Brand" value={u.brand} onChange={setUnit(i, "brand")} />
            <input placeholder="Model" value={u.model} onChange={setUnit(i, "model")} />
            <input placeholder="Type (split…)" value={u.type} onChange={setUnit(i, "type")} />
            <input placeholder="Capacity (1.5HP)" value={u.capacity} onChange={setUnit(i, "capacity")} />
            <input placeholder="Location" value={u.location} onChange={setUnit(i, "location")} />
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove unit"
              onClick={() => setValues((s) => ({ ...s, acUnits: s.acUnits.filter((_, j) => j !== i) }))}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="field-full actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn btn-primary" disabled={f.busy}>
          {f.busy ? "Saving…" : service ? "Save changes" : "Create job"}
        </button>
      </div>
    </form>
  );
}

// /app/services/new?client=<id>
export function ServiceNew() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const clientId = sp.get("client");
  const [client, setClient] = useState(null);
  const [ready, setReady] = useState(!clientId);

  useEffect(() => {
    if (!clientId) return;
    clientApi
      .get(clientId)
      .then((r) => setClient(r.client))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [clientId]);

  return (
    <>
      <PageHeader
        back={
          <Link to="/app/services" className="back">
            ← Services
          </Link>
        }
        title="New job"
      />
      <Card>
        {ready && (
          <ServiceForm
            initialClient={client}
            onCancel={() => navigate(-1)}
            onSaved={(s) => {
              toast(`Job ${s.serviceNo} created`);
              navigate(`/app/services/${s._id}`);
            }}
          />
        )}
      </Card>
    </>
  );
}
