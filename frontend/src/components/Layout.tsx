import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import {
  LayoutGrid, Rows3, RefreshCw, FileText, BarChart3, LogOut, ChevronDown,
} from "lucide-react";
import { useProjects } from "../api/resources";
import { useAuth } from "../store/auth";
import { useWorkspaceStore } from "../store/workspace";
import { ThemeToggle } from "./ThemeToggle";
import { useEffect, useState } from "react";
import clsx from "clsx";

export function Layout() {
  const { data: projects } = useProjects();
  const { projectId } = useParams();
  const { user, logout } = useAuth();
  const { setCurrentProjectId } = useWorkspaceStore();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const currentProject = projects?.find((p) => p.id === projectId) ?? projects?.[0];

  useEffect(() => {
    if (!projectId && projects && projects.length > 0) {
      setCurrentProjectId(projects[0].id);
      navigate(`/projects/${projects[0].id}/board`, { replace: true });
    }
  }, [projectId, projects]); // eslint-disable-line react-hooks/exhaustive-deps

  const nav = currentProject
    ? [
        { to: `/projects/${currentProject.id}/board`, label: "Board", icon: LayoutGrid },
        { to: `/projects/${currentProject.id}/list`, label: "List", icon: Rows3 },
        { to: `/projects/${currentProject.id}/cycles`, label: "Cycles", icon: RefreshCw },
        { to: `/projects/${currentProject.id}/pages`, label: "Pages", icon: FileText },
        { to: `/projects/${currentProject.id}/analytics`, label: "Analytics", icon: BarChart3 },
      ]
    : [];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <img src="/bestlifeapps-logo.png" alt="Best Life Apps" className="h-10 w-10 shrink-0" />
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">Best Life Apps</span>
            <span className="block text-[11px] font-medium text-brand-600 dark:text-brand-400">Project Management</span>
          </div>
        </div>

        <div className="relative border-b border-slate-100 px-3 py-3 dark:border-slate-800">
          <button
            onClick={() => setSwitcherOpen((s) => !s)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <span className="flex items-center gap-2 truncate">
              <span>{currentProject?.icon ?? "📁"}</span>
              <span className="truncate font-medium text-slate-700 dark:text-slate-200">{currentProject?.name ?? "Select project"}</span>
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {switcherOpen && projects && (
            <div className="absolute left-3 right-3 z-10 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentProjectId(p.id);
                    setSwitcherOpen(false);
                    navigate(`/projects/${p.id}/board`);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <span>{p.icon}</span>
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{p.identifier}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  isActive && "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                )
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              {(user?.username ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <span className="text-slate-700 dark:text-slate-300">{user?.username}</span>
          </div>
          <button onClick={logout} title="Log out" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
