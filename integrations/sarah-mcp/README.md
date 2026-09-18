# Sarah-OS Integration (MCP Server)

This service exposes the Best Life Apps PM platform to **Sarah-OS** (or any
MCP-compatible agent) as a set of callable tools, authenticated as the
`sarah-os` admin account. It gives Sarah full read/write access to projects,
work items, comments, cycles, pages, and analytics — and every new module
added to this app in the future should register its API here the same way,
so Sarah's access grows with the platform automatically.

## What Sarah can do through this server

| Tool | Purpose |
|---|---|
| `list_projects` | See every project across every workspace |
| `get_project_analytics` | Pull the live analytics snapshot for a project |
| `list_work_items` / `get_work_item` | Read tasks/bugs/stories/epics, with filters |
| `create_work_item` / `update_work_item` | Create or change work items |
| `add_comment` | **Post suggestions/updates directly inside a work item's discussion** |
| `list_activity` | Recent activity feed, for status updates |
| `list_cycles` / `get_burndown` | Sprint status and burndown data |
| `list_pages` / `create_page` / `update_page` | Read/write project documentation |
| `list_labels_and_states` | Look up valid labels/workflow states before creating items |

## Running it

It's already wired into `docker-compose.yml` as the `sarah-mcp` service. To
start it:

1. Set `SARAH_OS_PASSWORD` in `backend/.env` (root `.env.example` has a
   template) to the password you were given for the `sarah-os` account.
2. Optionally set `SARAH_OS_MCP_SHARED_SECRET` to a random string — if set,
   every request to this MCP server must include an
   `x-mcp-shared-secret` header matching it. Leave unset if the server is
   only reachable inside your own network/VPN.
3. `docker compose up -d --build sarah-mcp`

It listens on port **4545**, using the MCP **Streamable HTTP** transport at:

```
http://<your-host>:4545/mcp
```

## Connecting Sarah-OS

Point Sarah-OS at this as a remote MCP server. Example MCP client config
(the exact field names depend on Sarah-OS's own MCP client implementation,
but the shape is standard):

```json
{
  "mcpServers": {
    "bestlifeapps-pm": {
      "url": "http://<your-host>:4545/mcp",
      "headers": {
        "x-mcp-shared-secret": "<value of SARAH_OS_MCP_SHARED_SECRET, if set>"
      }
    }
  }
}
```

If your desktop/PC-based Sarah-OS instance is offline and you're accessing
this remotely (e.g. from Nigeria while your rig at home is off), you'll need
this server reachable from wherever Sarah-OS itself is running — e.g. by
exposing port 4545 through your existing remote-access setup, the same way
you already reach the rest of this app.

## Extending it for future add-ons

When you add a new feature/app to this platform (e.g. govcon course module,
new analytics), add its endpoints to `api.js` and register a corresponding
`server.registerTool(...)` block in `server.js`. Sarah-OS then has access to
it immediately on the next restart of this service — no changes needed on
her end beyond noticing the new tool in her MCP tool list.

## Security notes

- The `sarah-os` account is a full Django superuser/staff account — she can
  see and change everything a human admin can, including the admin site at
  `/admin/`.
- Rotate `SARAH_OS_PASSWORD` any time by re-running:
  `docker compose exec backend python manage.py create_sarah_os --password "<new password>"`
  and updating `backend/.env` + restarting `sarah-mcp`.
- This server's own HTTP endpoint has no built-in rate limiting or audit
  log yet — if you expose it beyond your own network, put it behind your
  existing reverse proxy / VPN, and set `SARAH_OS_MCP_SHARED_SECRET`.
