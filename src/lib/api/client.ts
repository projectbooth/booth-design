import type { Identity, ModuleSummary } from "./types";
import { getAccessToken } from "@/lib/auth/tokenStore";
import { handleUnauthorized } from "@/lib/auth/authClient";

/**
 * Thin fetch wrapper for booth-core's gateway-fronted API (contracts/core-platform-api.md).
 * Auth is a bearer token, not a cookie/session (ADR 0032) — booth-core's middleware has
 * no cookie mechanism at all and requires `Authorization: Bearer <token>` on every
 * request. The token comes from src/lib/auth's client-side OIDC PKCE flow; AuthGate
 * guarantees one is in memory before anything using this client gets a chance to render.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit & { workspace?: string }): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.workspace) {
    // ADR 0025 §6: the client sends the active workspace slug on every API call;
    // core validates it against the token and forwards X-Booth-Workspace/-Role.
    headers.set("X-Workspace", init.workspace);
  }

  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    // The token in memory is missing/invalid/expired in a way the silent-refresh timer
    // didn't catch (e.g. revoked server-side) — no retry loop, straight back to login.
    handleUnauthorized();
    throw new ApiError(401, "Not authenticated");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function getMe(): Promise<Identity> {
  return request<Identity>("/api/me");
}

export async function listModules(workspace?: string): Promise<ModuleSummary[]> {
  return request<ModuleSummary[]>("/api/modules", { workspace });
}

export async function getIframeUrl(moduleId: string, workspace?: string): Promise<string> {
  const { url } = await request<{ url: string }>(`/api/modules/${moduleId}/iframe-url`, {
    workspace,
  });
  return url;
}

export interface InstallModuleRequest {
  namespace: string;
  chartRef?: string;
  chart?: { path?: string; repoUrl?: string; chartName?: string; version?: string };
}

/** Owner-only (core 403s otherwise, ADR 0023) — booth-module-store calls this directly per ADR 0027; not expected to be used from this shell. */
export async function installModule(
  moduleId: string,
  body: InstallModuleRequest,
  workspace?: string,
): Promise<void> {
  await request(`/api/modules/${moduleId}/install`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    workspace,
  });
}
