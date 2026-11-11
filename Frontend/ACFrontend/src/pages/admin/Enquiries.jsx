import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { enquiryApi } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { useListParams } from "../../hooks/useListParams";
import { ClientPicker, TechnicianSelect } from "../../components/Pickers";
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
  ENQUIRY_STATUSES,
  PRIORITIES,
  SERVICE_TYPES,
  clean,
  date,
  dateTime,
  fromInput,
  label,
  toDateInput,
} from "../../utils/format";

// GET /api/enquiries
export function EnquiriesList() {
  const { params, setParam, key, search, setSearch } = useListParams();
  const { data, loading, error, reload } = useApi(
    () => enquiryApi.list({ page: params.page, status: params.status, search: params.search }),
    [key],
  );

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Requests sent from the website contact form" />
      <div className="filters">
        <input
          type="search"
          placeholder="Search name, email, phone, message…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          options={ENQUIRY_STATUSES}
          placeholder="All statuses"
          value={params.status || ""}
          onChange={(e) => setParam("status", e.target.value)}
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
                  <th>Service</th>
                  <th>Preferred</th>
                  <th>Received</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((e) => (
                  <tr key={e._id}>
                    <td>
                      <Link to={`/app/enquiries/${e._id}`}>
                        <strong>{e.name}</strong>
                      </Link>
                      <div className="muted small truncate">{e.message}</div>
                    </td>
                    <td>
                      {e.phone}
                      <div className="muted small">{e.email}</div>
                    </td>
                    <td>{label(e.serviceType)}</td>
                    <td>{date(e.preferredDate)}</td>
                    <td>{dateTime(e.createdAt)}</td>
                    <td>
                      <Badge value={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No enquiries match.</Empty>
        )}
        <Pagination pagination={data?.pagination} onPage={(p) => setParam("page", p)} />
      </Card>
    </>
  );
}

// GET /api/enquiries/:id + status, convert, delete
export function EnquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => enquiryApi.get(id), [id]);
  const [converting, setConverting] = useState(false);
  const e = data?.enquiry;

  const status = useForm({ status: "", adminNotes: "" });
  const [statusInit, setStatusInit] = useState(null);
  if (e && statusInit !== e.updatedAt) {
    setStatusInit(e.updatedAt);
    status.setValues({ status: e.status === "converted" ? "" : e.status, adminNotes: e.adminNotes || "" });
  }

  if (loading && !e) return <Spinner />;
  if (error && !e) return <ErrorBox error={error} onRetry={reload} />;

  const converted = e.status === "converted";

  const saveStatus = status.submit(async (v) => {
    await enquiryApi.updateStatus(id, { status: v.status, adminNotes: v.adminNotes });
    toast("Enquiry updated");
    reload();
  });

  return (
    <>
      <PageHeader
        back={
          <Link to="/app/enquiries" className="back">
            ← Enquiries
          </Link>
        }
        title={e.name}
        subtitle={`Received ${dateTime(e.createdAt)}`}
        actions={
          <>
            <Badge value={e.status} />
            {!converted && (
              <>
                <button className="btn btn-primary" onClick={() => setConverting(true)}>
                  Convert to job
                </button>
                <ActionButton
                  className="btn btn-danger"
                  confirm="Delete this enquiry?"
                  onClick={async () => {
                    const r = await enquiryApi.remove(id);
                    navigate("/app/enquiries");
                    return r;
                  }}
                >
                  Delete
                </ActionButton>
              </>
            )}
          </>
        }
      />
      <div className="grid-2">
        <Card title="Request">
          <DL
            items={[
              ["Email", <a href={`mailto:${e.email}`}>{e.email}</a>],
              ["Phone", <a href={`tel:${e.phone}`}>{e.phone}</a>],
              ["Address", e.address],
              ["Service", label(e.serviceType)],
              ["Preferred date", date(e.preferredDate)],
            ]}
          />
          <h3>Message</h3>
          <p className="prewrap">{e.message}</p>
        </Card>

        {converted ? (
          <Card title="Converted">
            <DL
              items={[
                ["Converted", dateTime(e.convertedAt)],
                ["Client", e.client && <Link to={`/app/clients/${e.client._id}`}>{e.client.name}</Link>],
                [
                  "Job",
                  e.service && (
                    <Link to={`/app/services/${e.service._id}`}>
                      {e.service.serviceNo} · {e.service.title}
                    </Link>
                  ),
                ],
                ["Job status", e.service && <Badge value={e.service.status} />],
                ["Admin notes", e.adminNotes],
              ]}
            />
          </Card>
        ) : (
          <Card title="Follow-up">
            <form className="stack" onSubmit={saveStatus}>
              <ErrorBox error={status.error} />
              <Field label="Status">
                <Select
                  required
                  options={["new", "contacted", "closed"]}
                  value={status.values.status}
                  onChange={status.set("status")}
                />
              </Field>
              <Field label="Admin notes">
                <textarea rows={4} value={status.values.adminNotes} onChange={status.set("adminNotes")} />
              </Field>
              <button className="btn btn-primary" disabled={status.busy}>
                Save
              </button>
            </form>
          </Card>
        )}
      </div>

      <ConvertModal
        open={converting}
        enquiry={e}
        onClose={() => setConverting(false)}
        onDone={(res) => {
          setConverting(false);
          toast(
            res.clientCreated ? "New client and job created" : `Job created for existing client ${res.client.name}`,
          );
          navigate(`/app/services/${res.service._id}`);
        }}
      />
    </>
  );
}

// POST /api/enquiries/:id/convert
function ConvertModal({ open, enquiry, onClose, onDone }) {
  const [clientMode, setClientMode] = useState("auto");
  const f = useForm({
    clientId: "",
    title: "",
    serviceType: enquiry.serviceType,
    description: enquiry.message,
    address: enquiry.address || "",
    scheduledDate: toDateInput(enquiry.preferredDate),
    priority: "normal",
    technicianId: "",
    adminNotes: "",
  });

  const onSubmit = f.submit(async (v) => {
    const body = clean({ ...v, scheduledDate: fromInput(v.scheduledDate) });
    if (clientMode === "auto") delete body.clientId;
    else if (!body.clientId) return f.setError({ message: "Pick a client or choose 'match automatically'" });
    onDone(await enquiryApi.convert(enquiry._id, body));
  });

  return (
    <Modal open={open} onClose={onClose} title="Convert enquiry to a job" wide>
      <form className="form-grid" onSubmit={onSubmit}>
        <ErrorBox error={f.error} />
        <Field label="Client" full>
          <div className="radio-row">
            <label>
              <input type="radio" checked={clientMode === "auto"} onChange={() => setClientMode("auto")} /> Match by
              email/phone, or create a new client
            </label>
            <label>
              <input type="radio" checked={clientMode === "pick"} onChange={() => setClientMode("pick")} /> Use an
              existing client
            </label>
          </div>
          {clientMode === "pick" && <ClientPicker value={f.values.clientId} onChange={(id) => f.set("clientId")(id)} />}
        </Field>
        <Field label="Job title" hint="Leave blank to generate one" full>
          <input value={f.values.title} onChange={f.set("title")} />
        </Field>
        <Field label="Service type">
          <Select options={SERVICE_TYPES} value={f.values.serviceType} onChange={f.set("serviceType")} />
        </Field>
        <Field label="Priority">
          <Select options={PRIORITIES} value={f.values.priority} onChange={f.set("priority")} />
        </Field>
        <Field label="Scheduled date">
          <input type="date" value={f.values.scheduledDate} onChange={f.set("scheduledDate")} />
        </Field>
        <Field label="Assign technician">
          <TechnicianSelect value={f.values.technicianId} onChange={f.set("technicianId")} />
        </Field>
        <Field label="Address" full>
          <input value={f.values.address} onChange={f.set("address")} />
        </Field>
        <Field label="Description" full>
          <textarea rows={3} value={f.values.description} onChange={f.set("description")} />
        </Field>
        <Field label="Admin notes" full>
          <textarea rows={2} value={f.values.adminNotes} onChange={f.set("adminNotes")} />
        </Field>
        <div className="field-full actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={f.busy}>
            {f.busy ? "Converting…" : "Create job"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
