/**
 * Feature flags, same precedence as src/lib/auth/config.ts's OIDC config: runtime
 * (`window.__BOOTH_CONFIG__`, set by /config.js from the chart's values) over build-time
 * (`VITE_*`, for `npm run dev`). One image serves every deployment; flipping a flag is a
 * `helm upgrade --set`, not a rebuild.
 *
 * ADR 0124 (projects): the picker is built against contracts/projects.md ahead of
 * booth-core actually shipping the project registry, so it ships here disabled by
 * default — `features.projects` in the chart turns it on once GET /api/projects exists.
 */
export function isProjectsEnabled(): boolean {
  const runtime = window.__BOOTH_CONFIG__?.enableProjects;
  if (runtime !== undefined) return runtime;
  return import.meta.env.VITE_ENABLE_PROJECTS === "true";
}
