# booth-design chart

Installs the UI shell: a single Deployment running the built SPA behind an
unprivileged nginx (serves the static bundle, reverse-proxies `/api` and `/modules` to
`booth-core`'s gateway per `contracts/ui-integration.md`), and a Service in front of it.
Not a `BoothModule` — this is the shell chrome every module's UI renders into, installed
once per deployment, not through the module registry.

## Values

| Key | Default | Notes |
|---|---|---|
| `image.repository` | `ghcr.io/projectbooth/booth-design` | |
| `image.tag` | `""` | Defaults to `Chart.appVersion` — a release's chart and image always carry the same version (ADR 0111). |
| `core.gatewayUrl` | `http://booth-core.booth-system.svc:8080` | In-cluster Service DNS for `booth-core`'s gateway. No trailing slash. Change this if `booth-core` isn't installed as the release name `booth-core` in namespace `booth-system`. |
| `oidc.issuerUrl` | `""` (**required**) | The OIDC provider the *browser* signs in against (ADR 0032's client-side PKCE flow) — must be reachable from the user's device, not just in-cluster, and must exactly match `booth-core`'s own `oidc.issuerUrl` (or its bundled Keycloak's computed issuer): tokens carry it as `iss`, and core rejects any other. `helm template`/`helm install` fail outright without this set — a shell that can't sign anyone in must not deploy. |
| `oidc.clientId` | `booth-design` | The public (no-secret) client. Must match the client `booth-core` (or its bundled Keycloak) is configured with. |
| `proxy.clientMaxBodySize` | `512m` | Largest request body nginx forwards to a module (e.g. a file upload through `booth-storage`). `"0"` disables the limit. |
| `service.type` / `service.port` / `service.nodePort` | `ClusterIP` / `8080` / `null` | `nodePort` is only read when `type` is `NodePort`. |

## Installing next to `booth-core`

This chart and `booth-core`'s are two separate Helm releases — there is no umbrella
chart. `booth-core`'s own first-login runbook
(`booth-core/docs/operations/first-login-runbook.md`) installs core, then says signing
in "needs the shell (`booth-design`), which is a separate chart/repo from `booth-core`
and not covered by this install." This section is that missing piece.

1. **Install `booth-core` first** (its own runbook) — note the namespace you used
   (`booth-system` in every example below) and its `ingress.host`.
2. **Install this chart into the same namespace**, pointing `oidc.issuerUrl` at the
   exact same issuer `booth-core` is using:

   ```sh
   helm install booth-design oci://ghcr.io/projectbooth/charts/booth-design \
     --version X.Y.Z \
     --namespace booth-system \
     --set oidc.issuerUrl=https://<ingress.host>/realms/booth
   ```

   (`core.gatewayUrl`'s default already assumes `booth-core` is release name
   `booth-core` in namespace `booth-system`, matching the runbook's own example — override
   it if yours differs. Same namespace as `booth-core` is not required — core's gateway
   Service carries no `NetworkPolicy` of its own, only Keycloak/Postgres/NATS do — it's
   just the simplest default and what the values above assume.)

3. **Reaching the shell is the one genuinely open piece.** `booth-core`'s own Ingress
   (`charts/booth-core/templates/ingress.yaml`) routes every path it doesn't claim for
   Keycloak — including `/`, where a browser would expect the shell — straight to
   **`booth-core`'s own Service**, not to this chart's. This chart ships no Ingress of
   its own. So today, after step 2, the shell is running and reachable *inside* the
   cluster (its Service), but `https://<ingress.host>/` does not yet reach it — that
   would need either an Ingress rule added here (or to `booth-core`'s chart) pointed at
   this chart's Service, which is out of scope for this repo's own release
   (`booth-core`'s chart isn't touched from here). Until that lands, reach the shell
   directly for testing:

   ```sh
   kubectl -n booth-system port-forward svc/booth-design 8080:8080
   # then open http://localhost:8080/ -- OIDC's redirect_uri is this origin, so a sign-in
   # started this way only round-trips correctly back to this same localhost:8080 URL.
   ```

   Flagging this explicitly rather than asserting a working end-to-end LAN install: it
   hasn't been exercised against a real cluster, and the gap above is real, not
   theoretical.

## Chart reference

Published per ADR 0111: `oci://ghcr.io/projectbooth/charts/booth-design` at the tagged
version, plus `<chart>-X.Y.Z.tgz` attached to the matching GitHub release for offline
use. Both image and chart are public on GHCR — no pull secret needed.
