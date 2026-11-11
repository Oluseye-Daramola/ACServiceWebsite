import { reportApi } from "../../api/endpoints";
import { ErrorBox, Field, useForm } from "../../components/ui";
import { fromInput, toDateTimeInput } from "../../utils/format";

// POST /api/reports (new) or PATCH /api/reports/:id (edit, only before signing)
export function ReportForm({ serviceId, report, onSaved, onCancel }) {
  const f = useForm({
    arrivalTime: toDateTimeInput(report?.arrivalTime),
    departureTime: toDateTimeInput(report?.departureTime),
    findings: report?.findings || "",
    workDone: report?.workDone || "",
    recommendations: report?.recommendations || "",
    partsUsed: report?.partsUsed?.length ? report.partsUsed.map((p) => ({ ...p })) : [],
  });
  const { values: v, setValues } = f;

  const setPart = (i, k) => (e) =>
    setValues((s) => ({
      ...s,
      partsUsed: s.partsUsed.map((p, j) =>
        j === i ? { ...p, [k]: k === "quantity" ? e.target.value : e.target.value } : p,
      ),
    }));

  const onSubmit = f.submit(async ({ arrivalTime, departureTime, partsUsed, ...rest }) => {
    const body = {
      ...rest,
      partsUsed: partsUsed
        .filter((p) => p.name.trim())
        .map((p) => ({ name: p.name.trim(), quantity: Number(p.quantity) || 1 })),
    };
    if (arrivalTime) body.arrivalTime = fromInput(arrivalTime);
    if (departureTime) body.departureTime = fromInput(departureTime);
    const res = report ? await reportApi.update(report._id, body) : await reportApi.create({ ...body, serviceId });
    onSaved(res.report);
  });

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <ErrorBox error={f.error} />
      <Field label="Arrival time">
        <input type="datetime-local" value={v.arrivalTime} onChange={f.set("arrivalTime")} />
      </Field>
      <Field label="Departure time">
        <input type="datetime-local" value={v.departureTime} onChange={f.set("departureTime")} />
      </Field>
      <Field label="Findings *" hint="What was wrong / what you observed" full>
        <textarea required minLength={3} rows={4} value={v.findings} onChange={f.set("findings")} />
      </Field>
      <Field label="Work done *" full>
        <textarea required minLength={3} rows={4} value={v.workDone} onChange={f.set("workDone")} />
      </Field>
      <div className="field-full">
        <div className="row-between">
          <span className="field-label">Parts used</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setValues((s) => ({ ...s, partsUsed: [...s.partsUsed, { name: "", quantity: 1 }] }))}
          >
            + Add part
          </button>
        </div>
        {v.partsUsed.map((p, i) => (
          <div key={i} className="part-row">
            <input placeholder="Part name" value={p.name} onChange={setPart(i, "name")} />
            <input
              type="number"
              min={1}
              step={1}
              value={p.quantity}
              onChange={setPart(i, "quantity")}
              aria-label="Quantity"
            />
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove part"
              onClick={() => setValues((s) => ({ ...s, partsUsed: s.partsUsed.filter((_, j) => j !== i) }))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Field label="Recommendations" full>
        <textarea rows={3} value={v.recommendations} onChange={f.set("recommendations")} />
      </Field>
      <div className="field-full actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn btn-primary" disabled={f.busy}>
          {f.busy ? "Saving…" : report ? "Save changes" : "Save report"}
        </button>
      </div>
    </form>
  );
}
