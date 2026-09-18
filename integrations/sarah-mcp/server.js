import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { pmApi } from "./api.js";

const PORT = process.env.PORT || 4545;
const SHARED_SECRET = process.env.SARAH_OS_MCP_SHARED_SECRET;

function textResult(value) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function buildServer() {
  const server = new McpServer({
    name: "bestlifeapps-pm",
    version: "1.0.0",
  });

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List all projects Sarah-OS has access to, across every workspace.",
      inputSchema: {},
    },
    async () => textResult(await pmApi.listProjects())
  );

  server.registerTool(
    "get_project_analytics",
    {
      title: "Get project analytics",
      description:
        "Real-time analytics snapshot for a project: status breakdown, priority breakdown, velocity, completion trend.",
      inputSchema: { project_id: z.string().describe("Project UUID") },
    },
    async ({ project_id }) => textResult(await pmApi.getProjectAnalytics(project_id))
  );

  server.registerTool(
    "list_work_items",
    {
      title: "List work items",
      description: "List work items, optionally filtered by project, state, assignee, label, priority, or cycle.",
      inputSchema: {
        project: z.string().optional().describe("Project UUID"),
        state: z.string().optional(),
        assignees: z.string().optional().describe("Comma-separated user IDs"),
        labels: z.string().optional().describe("Comma-separated label IDs"),
        priority: z.string().optional(),
        cycle: z.string().optional().describe("Cycle UUID"),
      },
    },
    async (params) => textResult(await pmApi.listWorkItems(params))
  );

  server.registerTool(
    "get_work_item",
    {
      title: "Get work item",
      description: "Fetch full detail for a single work item, including comments and activity.",
      inputSchema: { id: z.string().describe("Work item UUID") },
    },
    async ({ id }) => textResult(await pmApi.getWorkItem(id))
  );

  server.registerTool(
    "create_work_item",
    {
      title: "Create work item",
      description:
        "Create a new task/bug/story/epic in a project. Use this when Sarah-OS identifies new work that should be tracked.",
      inputSchema: {
        project: z.string().describe("Project UUID"),
        title: z.string(),
        description_html: z.string().optional(),
        item_type: z.enum(["task", "bug", "story", "epic"]).default("task"),
        priority: z.enum(["none", "low", "medium", "high", "urgent"]).default("none"),
        state: z.string().optional().describe("Workflow state UUID"),
        cycle: z.string().optional().describe("Cycle UUID"),
        assignees: z.array(z.string()).optional().describe("User IDs to assign"),
        labels: z.array(z.string()).optional().describe("Label IDs to attach"),
      },
    },
    async (payload) => textResult(await pmApi.createWorkItem(payload))
  );

  server.registerTool(
    "update_work_item",
    {
      title: "Update work item",
      description: "Update fields on an existing work item (state, priority, assignees, description, etc.).",
      inputSchema: {
        id: z.string().describe("Work item UUID"),
        fields: z.record(z.any()).describe("Partial fields to update, e.g. { state: '...', priority: 'high' }"),
      },
    },
    async ({ id, fields }) => textResult(await pmApi.updateWorkItem(id, fields))
  );

  server.registerTool(
    "add_comment",
    {
      title: "Add comment / suggestion",
      description:
        "Post a comment on a work item as Sarah-OS — use this to leave suggestions, status updates, or nudges directly inside the team's workflow.",
      inputSchema: {
        work_item_id: z.string(),
        body_html: z.string().describe("HTML-formatted comment body"),
      },
    },
    async ({ work_item_id, body_html }) => textResult(await pmApi.addComment(work_item_id, body_html))
  );

  server.registerTool(
    "list_activity",
    {
      title: "List recent activity",
      description: "Recent activity log entries, optionally filtered by project or work item, for status updates.",
      inputSchema: {
        project: z.string().optional(),
        work_item: z.string().optional(),
      },
    },
    async (params) => textResult(await pmApi.listActivity(params))
  );

  server.registerTool(
    "list_cycles",
    {
      title: "List cycles",
      description: "List sprints/cycles for a project.",
      inputSchema: { project_id: z.string() },
    },
    async ({ project_id }) => textResult(await pmApi.listCycles(project_id))
  );

  server.registerTool(
    "get_burndown",
    {
      title: "Get cycle burndown",
      description: "Ideal-vs-actual burndown data points for a cycle/sprint.",
      inputSchema: { cycle_id: z.string() },
    },
    async ({ cycle_id }) => textResult(await pmApi.getBurndown(cycle_id))
  );

  server.registerTool(
    "list_pages",
    {
      title: "List documentation pages",
      description: "List Pages (docs/notes) for a project.",
      inputSchema: { project_id: z.string() },
    },
    async ({ project_id }) => textResult(await pmApi.listPages(project_id))
  );

  server.registerTool(
    "create_page",
    {
      title: "Create documentation page",
      description: "Create a new Page (doc/notes) in a project, e.g. to write up a proposal or recap.",
      inputSchema: {
        project: z.string(),
        title: z.string(),
        content_html: z.string(),
        parent: z.string().optional().describe("Parent page UUID, for nesting"),
      },
    },
    async (payload) => textResult(await pmApi.createPage(payload))
  );

  server.registerTool(
    "update_page",
    {
      title: "Update documentation page",
      description: "Update an existing Page's content or title.",
      inputSchema: {
        id: z.string(),
        fields: z.record(z.any()),
      },
    },
    async ({ id, fields }) => textResult(await pmApi.updatePage(id, fields))
  );

  server.registerTool(
    "list_labels_and_states",
    {
      title: "List labels and workflow states",
      description: "Look up available labels and workflow states for a project, needed to create well-formed work items.",
      inputSchema: { project_id: z.string() },
    },
    async ({ project_id }) => {
      const [labels, states] = await Promise.all([
        pmApi.listLabels(project_id),
        pmApi.listStates(project_id),
      ]);
      return textResult({ labels, states });
    }
  );

  return server;
}

const app = express();
app.use(express.json());

// Simple shared-secret auth for the MCP endpoint itself (separate from the
// sarah-os PM account credentials, which are used server-side to call the API).
app.use((req, res, next) => {
  if (!SHARED_SECRET) return next(); // no extra gate configured; rely on network isolation
  const provided = req.header("x-mcp-shared-secret");
  if (provided !== SHARED_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

const transports = {};

app.post("/mcp", async (req, res) => {
  const sessionId = req.header("mcp-session-id");
  let transport = sessionId && transports[sessionId];

  if (!transport) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports[id] = transport;
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) delete transports[transport.sessionId];
    };
    const server = buildServer();
    await server.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.header("mcp-session-id");
  const transport = sessionId && transports[sessionId];
  if (!transport) return res.status(400).send("Unknown or missing session");
  await transport.handleRequest(req, res);
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`[sarah-mcp] Best Life Apps PM MCP server listening on port ${PORT}`);
});
