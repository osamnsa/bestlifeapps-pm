import { useEffect, useState } from "react";
import { User as UserIcon, Lock, ShieldCheck, FolderPlus, Loader2, Check } from "lucide-react";
import {
  useMe, useUpdateProfile, useChangePassword, useSessions, useRevokeSession,
  useWorkspaces, useCreateProject,
} from "../api/resources";
import { format } from "date-fns";

type Tab = "profile" | "password" | "security" | "projects";

const TABS: { id: Tab; label: string; icon: typeof UserIcon }[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "password", label: "Password", icon: Lock },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "projects", label: "Projects", icon: FolderPlus },
];

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-5 text-lg font-semibold text-slate-900 dark:text-white">Settings</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <nav className="space-y-0.5 lg:col-span-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                tab === t.id
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-3">
          {tab === "profile" && <ProfileTab />}
          {tab === "password" && <PasswordTab />}
          {tab === "security" && <SecurityTab />}
          {tab === "projects" && <ProjectsTab />}
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{children}</label>;
}

function ProfileTab() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (me && !initialized) {
      setFirstName(me.first_name ?? "");
      setLastName(me.last_name ?? "");
      setEmail(me.email ?? "");
      setInitialized(true);
    }
  }, [me, initialized]);

  function submit() {
    updateProfile.mutate(
      { first_name: firstName, last_name: lastName, email },
      { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); } }
    );
  }

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Profile</h2>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <Label>First name</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <Label>Last name</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div className="mb-4">
        <Label>Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <button
        onClick={submit}
        disabled={updateProfile.isPending}
        className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {updateProfile.isPending && <Loader2 size={14} className="animate-spin" />}
        {saved ? <Check size={14} /> : null}
        {saved ? "Saved" : "Save changes"}
      </button>
      {updateProfile.isError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {(updateProfile.error as any)?.response?.data?.email?.[0] ?? "Could not save profile."}
        </p>
      )}
    </Card>
  );
}

function PasswordTab() {
  const changePassword = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);

  function submit() {
    setSuccess(false);
    if (next !== confirm) return;
    changePassword.mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => {
          setSuccess(true);
          setCurrent("");
          setNext("");
          setConfirm("");
        },
      }
    );
  }

  const mismatch = confirm.length > 0 && next !== confirm;

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Change password</h2>
      <div className="mb-3">
        <Label>Current password</Label>
        <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="mb-3">
        <Label>New password</Label>
        <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div className="mb-4">
        <Label>Confirm new password</Label>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {mismatch && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords don't match.</p>}
      </div>
      <button
        onClick={submit}
        disabled={changePassword.isPending || !current || !next || mismatch}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {success ? "Password updated" : "Update password"}
      </button>
      {changePassword.isError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {(changePassword.error as any)?.response?.data?.current_password?.[0]
            ?? (changePassword.error as any)?.response?.data?.new_password?.[0]
            ?? "Could not update password."}
        </p>
      )}
    </Card>
  );
}

function SecurityTab() {
  const { data: sessions } = useSessions();
  const revoke = useRevokeSession();

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Active sessions</h2>
      <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
        Revoking a session immediately signs that device out.
      </p>
      <div className="space-y-2">
        {sessions?.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
          >
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <div>Issued {format(new Date(s.created_at), "MMM d, yyyy h:mm a")}</div>
              <div className="text-slate-400 dark:text-slate-500">
                Expires {format(new Date(s.expires_at), "MMM d, yyyy h:mm a")}
              </div>
            </div>
            <button
              onClick={() => revoke.mutate(s.id)}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Revoke
            </button>
          </div>
        ))}
        {(!sessions || sessions.length === 0) && (
          <p className="text-sm text-slate-400 dark:text-slate-500">No active sessions found.</p>
        )}
      </div>
    </Card>
  );
}

function ProjectsTab() {
  const { data: workspaces } = useWorkspaces();
  const createProject = useCreateProject();
  const adminWorkspaces = workspaces?.filter((w) => w.my_role === "admin") ?? [];

  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!workspaceId && adminWorkspaces[0]) setWorkspaceId(adminWorkspaces[0].id);
  }, [adminWorkspaces, workspaceId]);

  if (adminWorkspaces.length === 0) {
    return (
      <Card>
        <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Create a project</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Only workspace admins can create new projects. Ask a workspace admin to either create the
          project or promote your role.
        </p>
      </Card>
    );
  }

  function submit() {
    if (!name.trim() || !identifier.trim() || !workspaceId) return;
    createProject.mutate(
      { workspace: workspaceId, name, identifier: identifier.toUpperCase() },
      { onSuccess: () => { setSuccess(true); setName(""); setIdentifier(""); setTimeout(() => setSuccess(false), 2000); } }
    );
  }

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Create a project</h2>
      {adminWorkspaces.length > 1 && (
        <div className="mb-3">
          <Label>Workspace</Label>
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {adminWorkspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="mb-3">
        <Label>Project name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing Site" />
      </div>
      <div className="mb-4">
        <Label>Identifier prefix</Label>
        <Input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value.toUpperCase().slice(0, 10))}
          placeholder="e.g. MKT"
        />
      </div>
      <button
        onClick={submit}
        disabled={createProject.isPending || !name.trim() || !identifier.trim()}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {success ? "Project created" : "Create project"}
      </button>
      {createProject.isError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {(createProject.error as any)?.response?.data?.detail ?? "Could not create project."}
        </p>
      )}
    </Card>
  );
}
