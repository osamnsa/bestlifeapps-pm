/**
 * Live shared-secret sync for the MCP endpoint's own auth gate.
 *
 * Historically this was a single fixed value from SARAH_OS_MCP_SHARED_SECRET.
 * Now the app itself (Settings/Integrations > Sarah-OS) lets an admin
 * generate and rotate this secret, so instead of reading a static env var we
 * fetch the current live value(s) from the PM API (authenticated as
 * sarah-os, same login the rest of this server already uses) and refresh
 * them periodically. A change made in the app takes effect within one
 * refresh interval — no restart needed.
 *
 * The env var SARAH_OS_MCP_SHARED_SECRET, if set, is always also accepted as
 * a fallback/bootstrap value (useful before the app-managed secret exists,
 * or for fully offline/air-gapped setups).
 */
import { pmApi } from "./api.js";

const REFRESH_INTERVAL_MS = 60_000;
const ENV_FALLBACK_SECRET = process.env.SARAH_OS_MCP_SHARED_SECRET || null;

let liveSecrets = [];
let lastFetchOk = false;
let refreshTimer = null;

async function refresh() {
  try {
    const data = await pmApi.getLiveMcpSecrets();
    liveSecrets = Array.isArray(data.secrets) ? data.secrets : [];
    lastFetchOk = true;
  } catch (err) {
    lastFetchOk = false;
    console.error("[sarah-mcp] Could not refresh live MCP secret(s) from the app:", err.message);
  }
}

export function startMcpAuthSync() {
  refresh();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, REFRESH_INTERVAL_MS);
}

export function isAuthorized(providedSecret) {
  const configured = liveSecrets.length > 0 || !!ENV_FALLBACK_SECRET;
  if (!configured) return true; // no secret configured anywhere; rely on network isolation

  if (ENV_FALLBACK_SECRET && providedSecret === ENV_FALLBACK_SECRET) return true;
  return liveSecrets.includes(providedSecret);
}

export function getStatus() {
  return {
    liveSecretCount: liveSecrets.length,
    hasEnvFallback: !!ENV_FALLBACK_SECRET,
    lastFetchOk,
  };
}
