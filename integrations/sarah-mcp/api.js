import axios from "axios";

const BASE_URL = process.env.PM_API_BASE_URL || "http://backend:8000";
const USERNAME = process.env.SARAH_OS_USERNAME || "sarah-os";
const PASSWORD = process.env.SARAH_OS_PASSWORD;

if (!PASSWORD) {
  console.error(
    "[sarah-mcp] SARAH_OS_PASSWORD is not set. The MCP server cannot authenticate against the PM API."
  );
}

let accessToken = null;
let refreshToken = null;

const client = axios.create({ baseURL: BASE_URL, timeout: 15000 });

async function login() {
  const { data } = await axios.post(`${BASE_URL}/api/auth/token/`, {
    username: USERNAME,
    password: PASSWORD,
  });
  accessToken = data.access;
  refreshToken = data.refresh;
}

async function ensureAuthenticated() {
  if (!accessToken) {
    await login();
  }
}

async function request(method, url, { params, data } = {}) {
  await ensureAuthenticated();
  try {
    const res = await client.request({
      method,
      url,
      params,
      data,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.data;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      // Access token expired or invalid — re-login once and retry.
      await login();
      const res = await client.request({
        method,
        url,
        params,
        data,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data;
    }
    throw err;
  }
}

export const pmApi = {
  // Workspaces / projects
  listWorkspaces: () => request("get", "/api/workspaces/"),
  listProjects: () => request("get", "/api/projects/"),
  getProject: (id) => request("get", `/api/projects/${id}/`),

  // Analytics
  getProjectAnalytics: (projectId) =>
    request("get", `/api/analytics/projects/${projectId}/`),

  // Work items
  listWorkItems: (params) => request("get", "/api/work-items/", { params }),
  getWorkItem: (id) => request("get", `/api/work-items/${id}/`),
  createWorkItem: (payload) => request("post", "/api/work-items/", { data: payload }),
  updateWorkItem: (id, payload) => request("patch", `/api/work-items/${id}/`, { data: payload }),

  // Comments — this is how Sarah-OS "engages in chats with suggestions"
  listComments: (workItemId) =>
    request("get", "/api/comments/", { params: { work_item: workItemId } }),
  addComment: (workItemId, bodyHtml, bodyJson) =>
    request("post", "/api/comments/", {
      data: {
        work_item: workItemId,
        body: bodyJson || { type: "doc", content: [] },
        body_html: bodyHtml,
      },
    }),

  // Activity log — for "give updates"
  listActivity: (params) => request("get", "/api/activity/", { params }),

  // Cycles / burndown
  listCycles: (projectId) =>
    request("get", "/api/cycles/", { params: { project: projectId } }),
  getBurndown: (cycleId) => request("get", `/api/cycles/${cycleId}/burndown/`),

  // Pages
  listPages: (projectId) =>
    request("get", "/api/pages/", { params: { project: projectId } }),
  getPage: (id) => request("get", `/api/pages/${id}/`),
  createPage: (payload) => request("post", "/api/pages/", { data: payload }),
  updatePage: (id, payload) => request("patch", `/api/pages/${id}/`, { data: payload }),

  // Labels / workflow states (useful for creating well-formed work items)
  listLabels: (projectId) =>
    request("get", "/api/labels/", { params: { project: projectId } }),
  listStates: (projectId) =>
    request("get", "/api/states/", { params: { project: projectId } }),

  // Sarah-OS MCP connection settings, configured from the app itself (Integrations
  // page) rather than a static env var. Returns the list of currently enabled
  // secrets across every workspace sarah-os administers.
  getLiveMcpSecrets: () => request("get", "/api/mcp-settings/live/"),
};
