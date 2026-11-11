import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { ErrorBox, Field, useForm } from "../../components/ui";

const AuthCard = ({ title, subtitle, children }) => (
  <section className="section container auth-wrap">
    <div className="card auth-card">
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
      {children}
    </div>
  </section>
);

// POST /api/auth/login
export function Login() {
  const { user, login, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { values, set, submit, busy, error } = useForm({ email: "", password: "" });

  if (user) return <Navigate to="/app" replace />;

  const onSubmit = submit(async (v) => {
    await login(v.email, v.password);
    navigate(location.state?.from || "/app", { replace: true });
  });

  return (
    <AuthCard title="Staff login" subtitle="Admins and technicians sign in here.">
      {sessionMessage && <div className="alert alert-warn">{sessionMessage}</div>}
      <form className="stack" onSubmit={onSubmit}>
        <ErrorBox error={error} />
        <Field label="Email">
          <input type="email" required autoComplete="username" value={values.email} onChange={set("email")} />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={values.password}
            onChange={set("password")}
          />
        </Field>
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <Link to="/forgot-password" className="link center">
          Forgot your password?
        </Link>
      </form>
    </AuthCard>
  );
}

// POST /api/auth/forgot-password
export function ForgotPassword() {
  const [sent, setSent] = useState("");
  const { values, set, submit, busy, error } = useForm({ email: "" });
  const onSubmit = submit(async (v) => {
    const res = await authApi.forgotPassword(v.email);
    setSent(res.message);
  });
  return (
    <AuthCard title="Reset your password" subtitle="We will email you a link that is valid for 30 minutes.">
      {sent ? (
        <div className="stack">
          <div className="alert alert-ok">{sent}</div>
          <Link to="/login" className="btn">
            Back to login
          </Link>
        </div>
      ) : (
        <form className="stack" onSubmit={onSubmit}>
          <ErrorBox error={error} />
          <Field label="Email">
            <input type="email" required value={values.email} onChange={set("email")} />
          </Field>
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <Link to="/login" className="link center">
            Back to login
          </Link>
        </form>
      )}
    </AuthCard>
  );
}

// /reset-password?token=…  → POST /api/auth/reset-password (logs the user in)
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const { values, set, submit, busy, error, setError } = useForm({ password: "", confirm: "" });

  const onSubmit = submit(async (v) => {
    if (v.password !== v.confirm) {
      setError({ message: "Passwords do not match" });
      return;
    }
    const res = await authApi.resetPassword(token, v.password);
    startSession(res);
    navigate("/app", { replace: true });
  });

  if (!token)
    return (
      <AuthCard title="Invalid link" subtitle="This reset link is missing its token.">
        <Link to="/forgot-password" className="btn btn-primary">
          Request a new link
        </Link>
      </AuthCard>
    );

  return (
    <AuthCard title="Choose a new password" subtitle="This signs you out on every other device.">
      <form className="stack" onSubmit={onSubmit}>
        <ErrorBox error={error} />
        <Field label="New password" hint="At least 8 characters">
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={values.password}
            onChange={set("password")}
          />
        </Field>
        <Field label="Confirm password">
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={values.confirm}
            onChange={set("confirm")}
          />
        </Field>
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? "Saving…" : "Set password and sign in"}
        </button>
      </form>
    </AuthCard>
  );
}

export function NotFound() {
  return (
    <AuthCard title="Page not found" subtitle="The page you are looking for does not exist.">
      <Link to="/" className="btn btn-primary">
        Go home
      </Link>
    </AuthCard>
  );
}
