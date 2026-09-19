import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInvitePreview, useAcceptInvite } from "../api/resources";
import { useAuth } from "../store/auth";
import { ThemeToggle } from "../components/ThemeToggle";

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { data: preview, isLoading, isError } = useInvitePreview(token);
  const acceptInvite = useAcceptInvite();

  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token || !username.trim() || !password) return;
    acceptInvite.mutate(
      { token, mode, username, password, email, first_name: firstName, last_name: lastName },
      {
        onSuccess: (data: any) => {
          setSession(data.access, data.refresh, data.user);
          navigate("/", { replace: true });
        },
        onError: (err: any) => {
          setError(
            err?.response?.data?.detail
              ?? err?.response?.data?.username?.[0]
              ?? err?.response?.data?.non_field_errors?.[0]
              ?? "Could not accept invite."
          );
        },
      }
    );
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

  return (
    <div className="relative flex h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute right-5 top-5">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/bestlifeapps-logo.png" alt="Best Life Apps" className="h-20 w-20 drop-shadow-sm" />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">You're invited</h1>
        </div>

        {isLoading && <p className="text-center text-sm text-slate-500 dark:text-slate-400">Checking invite...</p>}

        {(isError || (preview && !preview.is_valid)) && (
          <p className="text-center text-sm text-red-600 dark:text-red-400">
            This invite link is invalid, expired, or has already been used. Ask whoever invited you for a fresh link.
          </p>
        )}

        {preview && preview.is_valid && (
          <>
            <p className="mb-5 text-center text-sm text-slate-500 dark:text-slate-400">
              Join <span className="font-medium text-slate-700 dark:text-slate-200">{preview.workspace_name}</span> as a{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{preview.role}</span>
            </p>

            <div className="mb-4 flex rounded-lg border border-slate-200 p-1 text-sm dark:border-slate-700">
              <button
                onClick={() => setMode("register")}
                className={`flex-1 rounded-md py-1.5 font-medium transition ${
                  mode === "register" ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Create account
              </button>
              <button
                onClick={() => setMode("login")}
                className={`flex-1 rounded-md py-1.5 font-medium transition ${
                  mode === "login" ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                I have an account
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputClass} />
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={inputClass} />
                </div>
              )}
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className={inputClass} />
              {mode === "register" && (
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
              )}
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={inputClass} />

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={acceptInvite.isPending || !username.trim() || !password}
                className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {mode === "register" ? "Create account & join" : "Log in & join"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
