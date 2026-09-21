// Runtime configuration placeholder. Empty here so `npm run dev` falls back to the
// VITE_OIDC_* build-time variables; the container image replaces this file at startup
// (docker/40-booth-config.sh) with values from the Helm chart.
window.__BOOTH_CONFIG__ = {};
