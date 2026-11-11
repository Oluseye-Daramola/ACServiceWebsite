import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { reportApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { useListParams } from "../../hooks/useListParams";
import { TechnicianSelect } from "../../components/Pickers";
import SignaturePad from "../../components/SignaturePad";
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
import { REPORT_STATUSES, date, dateTime, label } from "../../utils/format";
import { ReportForm } from "./ReportForm";

// GET /api/reports
export function ReportsList() {
  const { isAdmin } = useAuth();
  const { params, setParam, key } = useListParams();
  const { data, loading, error, reload } = useApi(
    () => reportApi.list({ page: params.page, status: params.status, technician: params.technician }),
    [key],
  );

  return (
    <>
      <PageHeader title={isAdmin ? "Service reports" : "My reports"} subtitle="Reports filed by technicians on site" />
      <div className="filters">
        <Select
          options={REPORT_STATUSES}
          placeholder="All statuses"
          value={params.status || ""}
          onChange={(e) => setParam("status", e.target.value)}
        />
        {isAdmin && (
          <TechnicianSelect
            placeholder="All technicians"
            value={params.technician || ""}
            onChange={(e) => setParam("technician", e.target.value)}
          />
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
                  {isAdmin && <th>Technician</th>}
                  <th>Filed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <Link to={`/app/reports/${r._id}`}>
                        <strong>{r.service?.serviceNo}</strong> {r.service?.title}
                      </Link>
                    </td>
                    <td>{r.client?.name}</td>
                    {isAdmin && <td>{r.technician?.name}</td>}
                    <td>{dateTime(r.createdAt)}</td>
                    <td>
                      <Badge value={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No reports found.</Empty>
        )}
        <Pagination pagination={data?.pagination} onPage={(p) => setParam("page", p)} />
      </Card>
    </>
  );
}

// GET /api/reports/:id + edit, photos, sign, pdf, send-email
export function ReportDetail() {
  const { id } = useParams();
  const { isAdmin, isTechnician } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [signing, setSigning] = useState(null); // "technician" | "client"
  const [emailing, setEmailing] = useState(false);
  const { data, loading, error, reload } = useApi(() => reportApi.get(id), [id]);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  const r = data.report;
  const locked = Boolean(r.technicianSignature || r.clientSignature);
  const fileName = `Service-Report-${r.service?.serviceNo}.pdf`;

  return (
    <>
      <PageHeader
        back={
          <Link to={`/app/services/${r.service?._id}`} className="back">
            ← {r.service?.serviceNo}
          </Link>
        }
        title={`Service report · ${r.service?.serviceNo}`}
        subtitle={`${r.service?.title} · ${r.client?.name}`}
        actions={
          <>
            <Badge value={r.status} />
            <ActionButton className="btn" onClick={() => reportApi.pdf(r._id, fileName, "open")}>
              View PDF
            </ActionButton>
            <ActionButton className="btn" onClick={() => reportApi.pdf(r._id, fileName, "download")}>
              Download
            </ActionButton>
            {isAdmin && (
              <button
                className="btn btn-primary"
                disabled={!r.isFullySigned}
                title={r.isFullySigned ? "" : "Only fully signed reports can be emailed"}
                onClick={() => setEmailing(true)}
              >
                Email to client
              </button>
            )}
            {isTechnician && !locked && (
              <button className="btn" onClick={() => setEditing(true)}>
                Edit report
              </button>
            )}
          </>
        }
      />

      {isTechnician && !r.isFullySigned && (
        <div className="alert alert-warn">
          {locked
            ? "The report is locked for editing. Collect the remaining signature to finish."
            : "Check the report with the client, add photos, then collect both signatures. Signing locks the report."}
        </div>
      )}

      <div className="grid-2">
        <Card title="Visit">
          <DL
            items={[
              ["Technician", r.technician?.name],
              ["Client", r.client?.name],
              ["Address", r.service?.address || r.client?.address],
              ["Arrived", dateTime(r.arrivalTime)],
              ["Departed", dateTime(r.departureTime)],
              ["Service type", label(r.service?.serviceType)],
              ["Scheduled", date(r.service?.scheduledDate)],
            ]}
          />
        </Card>
        <Card title="Signatures">
          <div className="sig-grid">
            <SignatureBox
              title="Technician"
              sig={r.technicianSignature}
              canSign={isTechnician}
              onSign={() => setSigning("technician")}
            />
            <SignatureBox
              title="Client"
              sig={r.clientSignature}
              canSign={isTechnician}
              onSign={() => setSigning("client")}
            />
          </div>
        </Card>
      </div>

      <Card title="Findings">
        <p className="prewrap">{r.findings}</p>
        <h3>Work done</h3>
        <p className="prewrap">{r.workDone}</p>
        {r.recommendations && (
          <>
            <h3>Recommendations</h3>
            <p className="prewrap">{r.recommendations}</p>
          </>
        )}
        <h3>Parts used</h3>
        {r.partsUsed?.length ? (
          <ul>
            {r.partsUsed.map((p, i) => (
              <li key={i}>
                {p.name} × {p.quantity}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">None</p>
        )}
      </Card>

      <Card
        title={`Photos (${r.photos?.length || 0})`}
        actions={isTechnician && !locked && <PhotoUpload id={r._id} onDone={reload} />}
      >
        {r.photos?.length ? (
          <div className="photos">
            {r.photos.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="Site photo" loading="lazy" />
              </a>
            ))}
          </div>
        ) : (
          <Empty>No photos.</Empty>
        )}
      </Card>

      <Modal open={editing} title="Edit report" onClose={() => setEditing(false)} wide>
        <ReportForm
          report={r}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast("Report updated");
            reload();
          }}
        />
      </Modal>
      <SignModal
        signer={signing}
        report={r}
        onClose={() => setSigning(null)}
        onDone={(res) => {
          setSigning(null);
          toast(res.message);
          reload();
        }}
      />
      {isAdmin && <EmailModal open={emailing} report={r} onClose={() => setEmailing(false)} />}
    </>
  );
}

function SignatureBox({ title, sig, canSign, onSign }) {
  return (
    <div className="sig-box">
      <div className="field-label">{title}</div>
      {sig ? (
        <>
          <img src={sig.imageUrl} alt={`${title} signature`} />
          <div>
            <strong>{sig.name}</strong>
            <div className="muted small">{dateTime(sig.signedAt)}</div>
          </div>
        </>
      ) : canSign ? (
        <button className="btn btn-primary" onClick={onSign}>
          Capture {title.toLowerCase()} signature
        </button>
      ) : (
        <span className="muted">Not signed yet</span>
      )}
    </div>
  );
}

// POST /api/reports/:id/sign  { signer, name, signature: dataURL }
function SignModal({ signer, report, onClose, onDone }) {
  const pad = useRef(null);
  const defaultName =
    signer === "technician" ? report.technician?.name : signer === "client" ? report.client?.name : "";
  const f = useForm({ name: "" });
  const [forSigner, setForSigner] = useState(null);
  if (signer !== forSigner) {
    setForSigner(signer);
    f.setValues({ name: defaultName || "" });
  }

  // Built inside the event handler so the pad ref is only read on submit
  const onSubmit = (e) =>
    f.submit(async (v) => {
      if (pad.current.isEmpty()) return f.setError({ message: "Please sign in the box" });
      onDone(await reportApi.sign(report._id, { signer, name: v.name, signature: pad.current.toDataURL() }));
    })(e);

  return (
    <Modal open={Boolean(signer)} title={`${label(signer)} signature`} onClose={onClose} wide>
      <form className="stack" onSubmit={onSubmit}>
        <ErrorBox error={f.error} />
        {signer === "client" && (
          <p className="muted">
            Hand the device to the client. By signing they confirm the work described in this report was carried out.
          </p>
        )}
        <Field label="Full name">
          <input required minLength={2} value={f.values.name} onChange={f.set("name")} />
        </Field>
        <SignaturePad ref={pad} />
        <button className="btn btn-primary btn-lg" disabled={f.busy}>
          {f.busy ? "Saving…" : "Confirm signature"}
        </button>
      </form>
    </Modal>
  );
}

// POST /api/reports/:id/photos (multipart, up to 10 images, 5 MB each)
function PhotoUpload({ id, onDone }) {
  const input = useRef(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const onChange = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setBusy(true);
    try {
      await reportApi.addPhotos(id, files);
      toast(`${files.length} photo(s) uploaded`);
      onDone();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };
  return (
    <>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onChange} />
      <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => input.current.click()}>
        {busy ? "Uploading…" : "+ Add photos"}
      </button>
    </>
  );
}

// POST /api/reports/:id/send-email
function EmailModal({ open, report, onClose }) {
  const toast = useToast();
  const f = useForm({ email: report.client?.email || "" });
  const onSubmit = f.submit(async (v) => {
    const res = await reportApi.sendEmail(report._id, v.email);
    toast(res.message);
    onClose();
  });
  return (
    <Modal open={open} title="Email signed report" onClose={onClose}>
      <form className="stack" onSubmit={onSubmit}>
        <ErrorBox error={f.error} />
        <Field label="Send to" hint="Defaults to the client's email">
          <input type="email" required value={f.values.email} onChange={f.set("email")} />
        </Field>
        <button className="btn btn-primary" disabled={f.busy}>
          {f.busy ? "Sending…" : "Send PDF"}
        </button>
      </form>
    </Modal>
  );
}
