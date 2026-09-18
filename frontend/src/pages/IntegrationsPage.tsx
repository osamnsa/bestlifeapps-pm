import { useEffect, useState } from "react";
import { Mail, Plus, X, RefreshCw, Trash2, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import {
  useWorkspaces, useIntegrations, useCreateIntegration, useTestIntegration, useDeleteIntegration,
} from "../api/resources";
import type { Integration, IntegrationProvider } from "../types";

function StatusBadge({ status }: { status: Integration["status"] }) {
  if (status === "connected") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
        <CheckCircle2 size={12} /> Connected
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
        <XCircle size={12} /> Error
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <HelpCircle size={12} /> Untested
    </span>
  );
}

export function IntegrationsPage() {
  const { data: workspaces } = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useState("");
  const [showConnect, setShowConnect] = useState(false);

  useEffect(() => {
    if (!workspaceId && workspaces?.[0]) setWorkspaceId(workspaces[0].id);
  }, [workspaces, workspaceId]);

  const isAdmin = workspaces?.find((w) => w.id === workspaceId)?.my_role === "admin";
  const { data: integrations } = useIntegrations(workspaceId);
  const testIntegration = useTestIntegration();
  const deleteIntegration = useDeleteIntegration();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Integrations</h1>
        {workspaces && workspaces.length > 1 && (
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
              <Mail size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Custom Email (IMAP/POP3)</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Connect any mail account by host/port — no OAuth required.</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={14} /> Connect
            </button>
          )}
        </div>

        <div className="space-y-2">
          {integrations?.map((integ) => (
            <div
              key={integ.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700"
            >
              <div className="text-sm">
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                  {integ.label || integ.username}
                  <StatusBadge status={integ.status} />
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {integ.provider.toUpperCase()} · {integ.host}:{integ.port} · {integ.username}
                </div>
                {integ.status === "error" && integ.last_error && (
                  <div className="mt-0.5 text-xs text-red-600 dark:text-red-400">{integ.last_error}</div>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => testIntegration.mutate(integ.id)}
                    disabled={testIntegration.isPending}
                    title="Test connection"
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <RefreshCw size={12} className={testIntegration.isPending ? "animate-spin" : ""} /> Test
                  </button>
                  <button
                    onClick={() => deleteIntegration.mutate(integ.id)}
                    title="Disconnect"
                    className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {(!integrations || integrations.length === 0) && (
            <p className="text-sm text-slate-400 dark:text-slate-500">No custom email accounts connected yet.</p>
          )}
        </div>
      </div>

      {showConnect && workspaceId && (
        <ConnectEmailModal workspaceId={workspaceId} onClose={() => setShowConnect(false)} />
      )}
    </div>
  );
}

function ConnectEmailModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const createIntegration = useCreateIntegration();
  const [label, setLabel] = useState("");
  const [provider, setProvider] = useState<IntegrationProvider>("imap");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(993);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [useSsl, setUseSsl] = useState(true);

  function submit() {
    if (!host.trim() || !username.trim() || !password) return;
    createIntegration.mutate(
      { workspace: workspaceId, provider, label, host, port, username, password, use_ssl: useSsl },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Connect email account</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={18} /></button>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Label (optional)</label>
          <input
            value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Support inbox"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Protocol</label>
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value as IntegrationProvider;
                setProvider(p);
                setPort(p === "imap" ? 993 : 995);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="imap">IMAP</option>
              <option value="pop3">POP3</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Port</label>
            <input
              type="number" value={port} onChange={(e) => setPort(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Host</label>
          <input
            value={host} onChange={(e) => setHost(e.target.value)} placeholder="mail.example.com"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Username</label>
          <input
            value={username} onChange={(e) => setUsername(e.target.value)} placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={useSsl} onChange={(e) => setUseSsl(e.target.checked)} />
          Use SSL/TLS
        </label>

        <button
          onClick={submit}
          disabled={createIntegration.isPending || !host.trim() || !username.trim() || !password}
          className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Connect
        </button>
        {createIntegration.isError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {(createIntegration.error as any)?.response?.data?.detail ?? "Could not connect account."}
          </p>
        )}
      </div>
    </div>
  );
}
