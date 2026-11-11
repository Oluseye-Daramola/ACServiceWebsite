import { useEffect, useState } from "react";
import { clientApi, serviceApi, technicianApi } from "../api/endpoints";
import { useDebounced } from "../hooks/useApi";
import { Select } from "./ui";

// Search-as-you-type input for big lists (clients, services)
function SearchPicker({ value, onChange, fetcher, render, placeholder, initialLabel = "" }) {
  const [q, setQ] = useState(initialLabel);
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const dq = useDebounced(q);

  useEffect(() => {
    if (!open) return;
    let live = true;
    fetcher({ search: dq, limit: 10 })
      .then((r) => live && setOptions(r.data))
      .catch(() => live && setOptions([]));
    return () => {
      live = false;
    };
  }, [dq, open, fetcher]);

  return (
    <div className="picker">
      <input
        value={q}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQ(e.target.value);
          if (value) onChange("", null);
        }}
      />
      {open && options.length > 0 && (
        <ul className="picker-menu">
          {options.map((o) => (
            <li key={o._id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o._id, o);
                  setQ(render(o));
                  setOpen(false);
                }}
              >
                {render(o)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const listClients = (p) => clientApi.list(p);
const listServices = (p) => serviceApi.list(p);

export const ClientPicker = (props) => (
  <SearchPicker
    {...props}
    fetcher={listClients}
    placeholder="Search clients by name, phone, email…"
    render={(c) => `${c.name} · ${c.phone}`}
  />
);

export const ServicePicker = (props) => (
  <SearchPicker
    {...props}
    fetcher={listServices}
    placeholder="Search by job no. or title…"
    render={(s) => `${s.serviceNo} · ${s.title} (${s.client?.name || "—"})`}
  />
);

// Active technicians dropdown (small list)
export function TechnicianSelect({ value, onChange, placeholder = "— Not assigned —", ...rest }) {
  const [techs, setTechs] = useState([]);
  useEffect(() => {
    technicianApi
      .list({ isActive: true, limit: 100 })
      .then((r) => setTechs(r.data))
      .catch(() => setTechs([]));
  }, []);
  return (
    <Select
      {...rest}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={techs.map((t) => ({
        value: t._id,
        label: `${t.name}${t.specialization ? ` — ${t.specialization}` : ""}`,
      }))}
    />
  );
}
