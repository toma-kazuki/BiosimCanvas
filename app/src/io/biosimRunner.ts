/**
 * Thin client for the BioSim REST API.
 *
 * The Vite dev-server proxy forwards /biosim-api/* → http://localhost:8009/*
 * so browser CORS restrictions do not apply.
 *
 * Endpoints used:
 *   GET  /api/simulation          → { simulations: number[] }  (server health check)
 *   POST /api/simulation/start    → { simId: number }          (start new instance)
 */

const BASE = "/biosim-api";

export interface RunResult {
  ok: true;
  simId: number;
}

export interface RunError {
  ok: false;
  reason: "server-offline" | "start-failed";
  message: string;
}

/** Returns true if the BioSim server is reachable. */
export async function isBiosimServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/simulation`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Post the given XML to the BioSim server and start a new simulation instance.
 * Checks server reachability first; returns a typed result union.
 */
export async function runBiosim(configXml: string): Promise<RunResult | RunError> {
  const alive = await isBiosimServerRunning();
  if (!alive) {
    return {
      ok: false,
      reason: "server-offline",
      message:
        "BioSim server is not running. Start it with:\n  cd /Users/tomakazuki/local/documents/research/BIOSIM/biosim\n  bin/start-biosim-server",
    };
  }

  try {
    const res = await fetch(`${BASE}/api/simulation/start`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: configXml,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: "start-failed", message: `HTTP ${res.status}: ${body}` };
    }
    const data = (await res.json()) as { simId: number };
    return { ok: true, simId: data.simId };
  } catch (err) {
    return { ok: false, reason: "start-failed", message: (err as Error).message };
  }
}
