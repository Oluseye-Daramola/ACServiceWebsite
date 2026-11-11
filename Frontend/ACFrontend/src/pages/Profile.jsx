import { authApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { Card, DL, ErrorBox, Field, PageHeader, useForm, useToast } from "../components/ui";
import { dateTime, label } from "../utils/format";

// GET/PATCH /api/auth/me and PATCH /api/auth/change-password
export default function Profile() {
  const { user, setUser, replaceToken } = useAuth();
  const toast = useToast();

  const profile = useForm({ name: user.name || "", phone: user.phone || "" });
  const pw = useForm({ currentPassword: "", newPassword: "", confirm: "" });

  const saveProfile = profile.submit(async (v) => {
    const body = { name: v.name };
    if (v.phone) body.phone = v.phone;
    const res = await authApi.updateProfile(body);
    setUser(res.user);
    toast("Profile updated");
  });

  const changePassword = pw.submit(async (v) => {
    if (v.newPassword !== v.confirm) return pw.setError({ message: "New passwords do not match" });
    const res = await authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword });
    replaceToken(res.token);
    pw.setValues({ currentPassword: "", newPassword: "", confirm: "" });
    toast("Password changed. Other devices have been signed out.");
  });

  return (
    <>
      <PageHeader title="My profile" />
      <div className="grid-2">
        <Card title="Account">
          <DL
            items={[
              ["Email", user.email],
              ["Role", label(user.role)],
              user.specialization && ["Specialization", user.specialization],
              ["Last login", dateTime(user.lastLogin)],
            ]}
          />
          <form className="stack" onSubmit={saveProfile}>
            <ErrorBox error={profile.error} />
            <Field label="Name">
              <input required minLength={2} value={profile.values.name} onChange={profile.set("name")} />
            </Field>
            <Field label="Phone">
              <input type="tel" value={profile.values.phone} onChange={profile.set("phone")} />
            </Field>
            <button className="btn btn-primary" disabled={profile.busy}>
              {profile.busy ? "Saving…" : "Save profile"}
            </button>
          </form>
        </Card>

        <Card title="Change password">
          <form className="stack" onSubmit={changePassword}>
            <ErrorBox error={pw.error} />
            <Field label="Current password">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={pw.values.currentPassword}
                onChange={pw.set("currentPassword")}
              />
            </Field>
            <Field label="New password" hint="At least 8 characters">
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={pw.values.newPassword}
                onChange={pw.set("newPassword")}
              />
            </Field>
            <Field label="Confirm new password">
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={pw.values.confirm}
                onChange={pw.set("confirm")}
              />
            </Field>
            <button className="btn btn-primary" disabled={pw.busy}>
              {pw.busy ? "Updating…" : "Change password"}
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
