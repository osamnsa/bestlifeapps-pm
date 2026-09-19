export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  admin_workspace_ids?: string[];
}

export interface Label {
  id: string;
  project: string;
  name: string;
  color: string;
}

export type ProjectStatus = "active" | "completed";

export interface Project {
  id: string;
  workspace: string;
  name: string;
  identifier: string;
  description: string;
  icon: string;
  color: string;
  members: User[];
  labels: Label[];
  work_item_count?: number;
  status: ProjectStatus;
  completed_at: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  projects: Project[];
  my_role?: "admin" | "member" | "viewer" | null;
}

export interface WorkflowState {
  id: string;
  project: string;
  name: string;
  group: "backlog" | "unstarted" | "started" | "completed" | "cancelled";
  color: string;
  order: number;
}

export interface Cycle {
  id: string;
  project: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  total_items?: number;
  completed_items?: number;
  total_points?: number;
  completed_points?: number;
}

export interface Attachment {
  id: string;
  work_item: string;
  file: string;
  file_name: string;
  file_size: number;
  uploaded_by?: User;
  created_at: string;
}

export interface Comment {
  id: string;
  work_item: string;
  author?: User;
  body: any;
  body_html: string;
  created_at: string;
}

export type Priority = "none" | "low" | "medium" | "high" | "urgent";
export type ItemType = "task" | "bug" | "story" | "epic";

export interface WorkItem {
  id: string;
  identifier: string;
  project: string;
  number: number;
  title: string;
  description?: any;
  description_html?: string;
  item_type: ItemType;
  state: string;
  state_group?: string;
  priority: Priority;
  cycle: string | null;
  parent: string | null;
  assignees: User[];
  labels: Label[];
  attachments?: Attachment[];
  comments?: Comment[];
  story_points: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedView {
  id: string;
  project: string;
  name: string;
  layout: "kanban" | "list" | "calendar";
  filters: Record<string, any>;
  group_by: string;
  sort_by: string;
  is_default: boolean;
}

export interface Page {
  id: string;
  project: string;
  parent: string | null;
  title: string;
  content: any;
  content_html: string;
  icon: string;
  is_archived: boolean;
  created_by?: User;
  created_at: string;
  updated_at: string;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
}

export interface BurndownData {
  cycle: string;
  start_date: string;
  end_date: string;
  total_points: number;
  ideal: BurndownPoint[];
  actual: BurndownPoint[];
}

export interface ProjectAnalytics {
  project: string;
  total_work_items: number;
  completed_work_items: number;
  completion_rate: number;
  by_state: { state__name: string; state__color: string; state__group: string; count: number }[];
  by_priority: { priority: string; count: number }[];
  by_type: { item_type: string; count: number }[];
  by_assignee: { assignees__id: string; assignees__username: string; total: number; completed: number }[];
  completed_trend: { date: string; completed: number }[];
  velocity: { cycle: string; start_date: string; completed_points: number; total_points: number }[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type MemberRole = "admin" | "member" | "viewer";

export interface WorkspaceMember {
  id: string;
  user: User;
  role: MemberRole;
}

export type InviteStatus = "pending" | "accepted" | "revoked";

export interface Invite {
  id: string;
  workspace: string;
  workspace_name: string;
  email: string;
  role: MemberRole;
  token: string;
  status: InviteStatus;
  invited_by: User | null;
  accepted_at: string | null;
  expires_at: string;
  is_expired: boolean;
  created_at: string;
}

export interface InvitePreview {
  workspace_name: string;
  role: MemberRole;
  status: InviteStatus;
  is_valid: boolean;
  expires_at: string;
}

export interface Session {
  id: number;
  created_at: string;
  expires_at: string;
}

export interface McpSettings {
  id: string;
  workspace: string;
  is_enabled: boolean;
  is_configured: boolean;
  rotated_at: string | null;
  updated_at: string;
}

export interface McpRotateResponse extends McpSettings {
  secret: string;
}

export type IntegrationProvider = "imap" | "pop3" | "discord";
export type IntegrationStatus = "connected" | "error" | "untested";

export interface Integration {
  id: string;
  workspace: string;
  provider: IntegrationProvider;
  label: string;
  host: string;
  port: number | null;
  username: string;
  use_ssl: boolean;
  guild_id: string;
  channel_id: string;
  status: IntegrationStatus;
  last_error: string;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}
