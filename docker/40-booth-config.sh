#!/bin/sh
# Runs from the nginx image's /docker-entrypoint.d/ before nginx starts. Writes the
# runtime config the SPA reads (src/lib/auth/config.ts) so one image serves every
# deployment — issuer URL and client ID come from the Helm chart, not the build.
set -eu

: "${OIDC_ISSUER_URL:?OIDC_ISSUER_URL must be set (chart value oidc.issuerUrl)}"
: "${OIDC_CLIENT_ID:?OIDC_CLIENT_ID must be set (chart value oidc.clientId)}"
# Optional, ADR 0124: unset outside the chart (e.g. a bare `docker run`) defaults off.
: "${ENABLE_PROJECTS:=false}"

# Values land inside JS string literals: escape backslashes and double quotes so a
# malformed value can't break out of the string.
esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

# ENABLE_PROJECTS is a JS boolean literal, not a quoted string (the chart's value is
# already the literal "true"/"false", so this just passes through anything else as
# false rather than ever emitting invalid JS).
enable_projects=false
[ "$ENABLE_PROJECTS" = "true" ] && enable_projects=true

mkdir -p /tmp/booth-config
cat > /tmp/booth-config/config.js <<EOF
window.__BOOTH_CONFIG__ = {
  "oidcIssuerUrl": "$(esc "$OIDC_ISSUER_URL")",
  "oidcClientId": "$(esc "$OIDC_CLIENT_ID")",
  "enableProjects": $enable_projects
};
EOF
echo "40-booth-config: wrote /tmp/booth-config/config.js for issuer ${OIDC_ISSUER_URL}"
