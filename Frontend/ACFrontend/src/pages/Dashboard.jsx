import { Link } from "react-router-dom";
import { dashboardApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Badge, Card, Empty, ErrorBox, PageHeader, Spinner, Stat } from "../components/ui";
import { date, dateTime, label, money } from "../utils/format";

const sum = (obj = {}) => Object.values(obj).reduce((a, b) => a + b, 0);

// GET /api/dashboard (shape depends on the role)
export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(() => dashboardApi.get(), []);

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} subtitle={new Date().toDateString()} />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Spinner /> : data?.role === "admin" ? <AdminDash d={data} /> : data && <TechDash d={data} />}
    </>
  );
}

function AdminDash({ d }) {
  const { counts, revenue } = d;
  return (
    <>
      <div className="stats">
        <Stat label="Revenue this month" value={money(revenue.thisMonth)} tone="ok" />
        <Stat label="Outstanding" value={money(revenue.outstanding)} tone="danger" hint="Unpaid invoice balances" />
        <Stat label="All-time revenue" value={money(revenue.allTime)} />
        <Stat label="New enquiries" value={counts.enquiries.new || 0} tone="info" />
      </div>
      <div className="stats">
        <Stat label="Clients" value={counts.clients} />
        <Stat label="Active technicians" value={counts.activeTechnicians} />
        <Stat label="Jobs in progress" value={(counts.services.assigned || 0) + (counts.services.in_progress || 0)} />
        <Stat label="Unpaid invoices" value={(counts.invoices.unpaid || 0) + (counts.invoices.partially_paid || 0)} />
      </div>

      <div className="grid-2">
        <Card
          title="New enquiries"
          actions={
            <Link to="/app/enquiries?status=new" className="link">
              View all
            </Link>
          }
        >
          {d.recentEnquiries.length ? (
            <ul className="list">
              {d.recentEnquiries.map((e) => (
                <li key={e._id}>
                  <Link to={`/app/enquiries/${e._id}`}>
                    <strong>{e.name}</strong> · {label(e.serviceType)}
                    <span className="muted"> — {dateTime(e.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No new enquiries.</Empty>
          )}
        </Card>

        <Card
          title="Unassigned jobs"
          actions={
            <Link to="/app/services?status=pending" className="link">
              View all
            </Link>
          }
        >
          {d.unassignedServices.length ? (
            <ul className="list">
              {d.unassignedServices.map((s) => (
                <li key={s._id}>
                  <Link to={`/app/services/${s._id}`}>
                    <strong>{s.serviceNo}</strong> {s.title}
                    <span className="muted"> — {s.client?.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Every job has a technician.</Empty>
          )}
        </Card>

        <Card title="Jobs by status">
          <Breakdown counts={counts.services} />
        </Card>
        <Card title="Invoices by status">
          <Breakdown counts={counts.invoices} />
        </Card>
      </div>
    </>
  );
}

function TechDash({ d }) {
  return (
    <>
      <div className="stats">
        <Stat label="Assigned" value={d.jobs.assigned || 0} tone="info" />
        <Stat label="In progress" value={d.jobs.in_progress || 0} tone="warn" />
        <Stat label="Completed" value={d.jobs.completed || 0} tone="ok" />
        <Stat label="Reports awaiting signatures" value={d.pendingSignatures} tone="danger" />
      </div>
      <Card
        title="Upcoming jobs"
        actions={
          <Link to="/app/services" className="link">
            All my jobs
          </Link>
        }
      >
        {d.upcoming.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Client</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {d.upcoming.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <Link to={`/app/services/${s._id}`}>
                        <strong>{s.serviceNo}</strong> {s.title}
                      </Link>
                    </td>
                    <td>
                      {s.client?.name}
                      <div className="muted small">{s.client?.phone}</div>
                    </td>
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
          <Empty>No upcoming scheduled jobs.</Empty>
        )}
      </Card>
    </>
  );
}

function Breakdown({ counts = {} }) {
  const total = sum(counts) || 1;
  const entries = Object.entries(counts);
  if (!entries.length) return <Empty>No data yet.</Empty>;
  return (
    <ul className="bars">
      {entries.map(([k, v]) => (
        <li key={k}>
          <span className="bar-label">
            <Badge value={k} /> <strong>{v}</strong>
          </span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(v / total) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
