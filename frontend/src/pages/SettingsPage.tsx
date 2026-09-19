import { useEffect, useState } from "react";
import {
  User as UserIcon, Lock, ShieldCheck, FolderPlus, Loader2, Check, Users, Copy, RotateCw, XCircle,
  CheckCircle2, Trash2, X,
} from "lucide-react";
import {
  useMe, useUpdateProfile, useChangePassword, useSessions, useRevokeSession,
  useWorkspaces, useCreateProject, useCompleteProject, useReopenProject, useDeleteProject,
  useWorkspaceMembers, useInvites, useCreateInvite, useRevokeInvite, useResendInvite,
} from "../api/resources";
import type { MemberRole, Project } from "../types";
import { format } from "date-fns";

type Tab = "profile" | "password" | "security" | "projects" | "team";

const TABS: { id: Tab; label: string; icon: typeof UserIcon }[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "password", label: "Password", icon: Lock },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "projects", label: "Projects", icon: FolderPlus },
  { id: "team", label: "Team", icon: Users },
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
          {tab === "team" && <TeamTab />}
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
  const completeProject = useCompleteProject();
  const reopenProject = useReopenProject();
  const deleteProject = useDeleteProject();
  const adminWorkspaces = workspaces?.filter((w) => w.my_role === "admin") ?? [];

  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [success, setSuccess] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  useEffect(() => {
    if (!workspaceId && adminWorkspaces[0]) setWorkspaceId(adminWorkspaces[0].id);
  }, [adminWorkspaces, workspaceId]);

  if (adminWorkspaces.length === 0) {
    return (
      <Card>
        <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Projects</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Only workspace admins can create, complete, or delete projects. Ask a workspace admin to
          make changes or promote your role.
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

  const allProjects = adminWorkspaces.flatMap((w) => w.projects ?? []);
  const activeProjects = allProjects.filter((p) => p.status === "active");
  const completedProjects = allProjects.filter((p) => p.status === "completed");

  return (
    <div className="space-y-5">
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

      <Card>
        <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Active projects</h2>
        <div className="mt-3 space-y-2">
          {activeProjects.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <span>{p.icon}</span>
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-slate-400">{p.identifier}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => completeProject.mutate(p.id)}
                  disabled={completeProject.isPending}
                  title="Mark as completed"
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <CheckCircle2 size={12} /> Mark complete
                </button>
                <button
                  onClick={() => setDeleteTarget(p)}
                  title="Delete"
                  className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {activeProjects.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">No active projects.</p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Completed projects</h2>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          Reopen a completed project anytime to keep working on it — nothing is lost.
        </p>
        <div className="space-y-2">
          {completedProjects.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>{p.icon}</span>
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-slate-400">{p.identifier}</span>
                {p.completed_at && (
                  <span className="text-xs text-slate-400">· completed {format(new Date(p.completed_at), "MMM d, yyyy")}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => reopenProject.mutate(p.id)}
                  disabled={reopenProject.isPending}
                  title="Reopen"
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RotateCw size={12} /> Reopen
                </button>
                <button
                  onClick={() => setDeleteTarget(p)}
                  title="Delete"
                  className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {completedProjects.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">No completed projects yet.</p>
          )}
        </div>
      </Card>

      {deleteTarget && (
        <DeleteProjectModal
          project={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteProject.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
          }}
          isPending={deleteProject.isPending}
        />
      )}
    </div>
  );
}

function DeleteProjectModal({
  project, onClose, onConfirm, isPending,
}: { project: Project; onClose: () => void; onConfirm: () => void; isPending: boolean }) {
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText === project.identifier;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-red-600 dark:text-red-400">Delete project</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={18} /></button>
        </div>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          This permanently deletes <span className="font-semibold">{project.name}</span> and all of its work
          items, pages, and cycles. This cannot be undone — if you just want to pause the project, use
          "Mark complete" instead so you can reopen it later.
        </p>
        <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
          Type <span className="font-mono font-semibold">{project.identifier}</span> to confirm:
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button
          onClick={onConfirm}
          disabled={!canDelete || isPending}
          className="w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          Permanently delete
        </button>
      </div>
    </div>
  );
}

function TeamTab() {
  const { data: workspaces } = useWorkspaces();
  const adminWorkspaces = workspaces?.filter((w) => w.my_role === "admin") ?? [];
  const [workspaceId, setWorkspaceId] = useState("");

  useEffect(() => {
    if (!workspaceId && adminWorkspaces[0]) setWorkspaceId(adminWorkspaces[0].id);
  }, [adminWorkspaces, workspaceId]);

  const { data: members } = useWorkspaceMembers(workspaceId);
  const { data: invites } = useInvites(workspaceId);
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const resendInvite = useResendInvite();

  const [role, setRole] = useState<MemberRole>("member");
  const [email, setEmail] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (adminWorkspaces.length === 0) {
    return (
      <Card>
        <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Team</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Only workspace admins can invite teammates or manage the team.
        </p>
      </Card>
    );
  }

  function inviteLink(token: string) {
    return `${window.location.origin}/invite/${token}`;
  }

  function copyLink(invite: { id: string; token: string }) {
    navigator.clipboard.writeText(inviteLink(invite.token)).then(() => {
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function submitInvite() {
    if (!workspaceId) return;
    createInvite.mutate(
      { workspace: workspaceId, role, email: email || undefined },
      { onSuccess: () => setEmail("") }
    );
  }

  const pendingInvites = invites?.filter((i) => i.status === "pending") ?? [];
  const pastInvites = invites?.filter((i) => i.status !== "pending") ?? [];

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Invite a teammate</h2>
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
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <Label>Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div>
            <Label>Email (optional, for your reference)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" />
          </div>
        </div>
        <button
          onClick={submitInvite}
          disabled={createInvite.isPending || !workspaceId}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Generate invite link
        </button>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          No email is sent — copy the link and share it yourself (email, Discord, WhatsApp, wherever).
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Pending invites</h2>
        <div className="mt-3 space-y-2">
          {pendingInvites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <div className="font-medium text-slate-800 dark:text-slate-100">
                  {invite.email || "Unlabeled invite"} <span className="text-slate-400">· {invite.role}</span>
                </div>
                <div className="text-slate-400 dark:text-slate-500">
                  Expires {format(new Date(invite.expires_at), "MMM d, yyyy")}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => copyLink(invite)}
                  title="Copy invite link"
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Copy size={12} /> {copiedId === invite.id ? "Copied!" : "Copy link"}
                </button>
                <button
                  onClick={() => resendInvite.mutate(invite.id)}
                  title="Regenerate link"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RotateCw size={12} />
                </button>
                <button
                  onClick={() => revokeInvite.mutate(invite.id)}
                  title="Revoke"
                  className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <XCircle size={12} />
                </button>
              </div>
            </div>
          ))}
          {pendingInvites.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">No pending invites.</p>
          )}
        </div>
        {pastInvites.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">History</p>
            <div className="space-y-1">
              {pastInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span>{invite.email || "Unlabeled"} · {invite.role}</span>
                  <span className="capitalize">{invite.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Members</h2>
        <div className="space-y-2">
          {members?.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              <span className="text-slate-700 dark:text-slate-200">{m.user.username}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
