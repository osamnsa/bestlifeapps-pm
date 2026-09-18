import { create } from "zustand";

interface WorkspaceState {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentProjectId: localStorage.getItem("current_project_id"),
  setCurrentProjectId: (id) => {
    if (id) localStorage.setItem("current_project_id", id);
    else localStorage.removeItem("current_project_id");
    set({ currentProjectId: id });
  },
}));
