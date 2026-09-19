import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Project, Workspace, WorkflowState, WorkItem, Cycle, Page,
  Paginated, ProjectAnalytics, BurndownData, SavedView, Comment, User, Label,
  Session, Integration, Invite, InvitePreview, WorkspaceMember, MemberRole,
} from "../types";

// ---------- Workspaces / Projects ----------
export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => (await api.get<Paginated<Workspace>>("/workspaces/")).data.results,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<Paginated<Project>>("/projects/")).data.results,
  });
}

export function useProject(projectId?: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["projects", projectId],
    queryFn: async () => (await api.get<Project>(`/projects/${projectId}/`)).data,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { workspace: string; name: string; identifier: string; description?: string; color?: string }) =>
      (await api.post<Project>("/projects/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/me/")).data,
  });
}

// ---------- Account / Me ----------
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<User & { admin_workspace_ids: string[] }>("/me/")).data,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Pick<User, "first_name" | "last_name" | "email">>) =>
      (await api.patch("/me/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { current_password: string; new_password: string }) =>
      (await api.post("/auth/change-password/", payload)).data,
  });
}

// ---------- Security / Sessions ----------
export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await api.get<Session[]>("/sessions/")).data,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/sessions/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

// ---------- Integrations ----------
export function useIntegrations(workspaceId?: string) {
  return useQuery({
    enabled: !!workspaceId,
    queryKey: ["integrations", workspaceId],
    queryFn: async () =>
      (await api.get<any>("/integrations/", { params: { workspace: workspaceId } })).data,
    select: (data: any) => (Array.isArray(data) ? data : data.results) as Integration[],
  });
}

export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      workspace: string; provider: "imap" | "pop3" | "discord"; label: string;
      host?: string; port?: number; username?: string; use_ssl?: boolean;
      guild_id?: string; channel_id?: string; password: string;
    }) => (await api.post<Integration>("/integrations/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useTestIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<Integration>(`/integrations/${id}/test/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/integrations/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

// ---------- Team / Members ----------
export function useWorkspaceMembers(workspaceId?: string) {
  return useQuery({
    enabled: !!workspaceId,
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => (await api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members/`)).data,
  });
}

// ---------- Invites ----------
export function useInvites(workspaceId?: string) {
  return useQuery({
    enabled: !!workspaceId,
    queryKey: ["invites", workspaceId],
    queryFn: async () =>
      (await api.get<any>("/invites/", { params: { workspace: workspaceId } })).data,
    select: (data: any) => (Array.isArray(data) ? data : data.results) as Invite[],
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { workspace: string; role: MemberRole; email?: string }) =>
      (await api.post<Invite>("/invites/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/invites/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}

export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<Invite>(`/invites/${id}/resend/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
}

export function useInvitePreview(token?: string) {
  return useQuery({
    enabled: !!token,
    queryKey: ["invite-preview", token],
    queryFn: async () => (await api.get<InvitePreview>(`/invites/accept/${token}/`)).data,
    retry: false,
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: async ({
      token, mode, username, password, email, first_name, last_name,
    }: {
      token: string; mode: "register" | "login"; username: string; password: string;
      email?: string; first_name?: string; last_name?: string;
    }) =>
      (await api.post(`/invites/accept/${token}/`, { mode, username, password, email, first_name, last_name })).data,
  });
}

// ---------- Workflow States ----------
export function useStates(projectId?: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["states", projectId],
    queryFn: async () =>
      (await api.get<Paginated<WorkflowState> | WorkflowState[]>("/states/", { params: { project: projectId, page_size: 100 } })).data,
    select: (data: any) => (Array.isArray(data) ? data : data.results) as WorkflowState[],
  });
}

// ---------- Labels ----------
export function useLabels(projectId?: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["labels", projectId],
    queryFn: async () =>
      (await api.get<any>("/labels/", { params: { project: projectId, page_size: 100 } })).data,
    select: (data: any) => (Array.isArray(data) ? data : data.results) as Label[],
  });
}

// ---------- Work Items ----------
export function useWorkItems(projectId?: string, filters: Record<string, any> = {}) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["work-items", projectId, filters],
    queryFn: async () =>
      (
        await api.get<Paginated<WorkItem>>("/work-items/", {
          params: { project: projectId, page_size: 200, ...filters },
        })
      ).data.results,
  });
}

export function useWorkItem(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["work-item", id],
    queryFn: async () => (await api.get<WorkItem>(`/work-items/${id}/`)).data,
  });
}

export function useCreateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<WorkItem>) =>
      (await api.post<WorkItem>("/work-items/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-items"] }),
  });
}

export function useUpdateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<WorkItem> }) =>
      (await api.patch<WorkItem>(`/work-items/${id}/`, payload)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["work-items"] });
      qc.invalidateQueries({ queryKey: ["work-item", data.id] });
    },
  });
}

export function useDeleteWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/work-items/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-items"] }),
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workItemId, file }: { workItemId: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return (await api.post(`/work-items/${workItemId}/upload_attachment/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })).data;
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["work-item", vars.workItemId] }),
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Comment>) => (await api.post("/comments/", payload)).data,
    onSuccess: (data: any) => qc.invalidateQueries({ queryKey: ["work-item", data.work_item] }),
  });
}

// ---------- Cycles ----------
export function useCycles(projectId?: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["cycles", projectId],
    queryFn: async () =>
      (await api.get<any>("/cycles/", { params: { project: projectId } })).data,
    select: (data: any) => (Array.isArray(data) ? data : data.results) as Cycle[],
  });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Cycle>) => (await api.post<Cycle>("/cycles/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cycles"] }),
  });
}

export function useBurndown(cycleId?: string) {
  return useQuery({
    enabled: !!cycleId,
    queryKey: ["burndown", cycleId],
    queryFn: async () => (await api.get<BurndownData>(`/cycles/${cycleId}/burndown/`)).data,
  });
}

// ---------- Pages ----------
export function usePages(projectId?: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["pages", projectId],
    queryFn: async () =>
      (await api.get<any>("/pages/", { params: { project: projectId, page_size: 100 } })).data,
    select: (data: any) => (Array.isArray(data) ? data : data.results) as Page[],
  });
}

export function usePage(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["page", id],
    queryFn: async () => (await api.get<Page>(`/pages/${id}/`)).data,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Page>) => (await api.post<Page>("/pages/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pages"] }),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Page> }) =>
      (await api.patch<Page>(`/pages/${id}/`, payload)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      qc.invalidateQueries({ queryKey: ["page", data.id] });
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/pages/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pages"] }),
  });
}

// ---------- Saved Views ----------
export function useSavedViews(projectId?: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["views", projectId],
    queryFn: async () =>
      (await api.get<any>("/views/", { params: { project: projectId } })).data,
    select: (data: any) => (Array.isArray(data) ? data : data.results) as SavedView[],
  });
}

export function useCreateSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<SavedView>) => (await api.post<SavedView>("/views/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["views"] }),
  });
}

// ---------- Analytics ----------
export function useProjectAnalytics(projectId?: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["analytics", projectId],
    queryFn: async () => (await api.get<ProjectAnalytics>(`/analytics/projects/${projectId}/`)).data,
    refetchInterval: 15000,
  });
}
