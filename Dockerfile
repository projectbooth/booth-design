# syntax=docker/dockerfile:1

# ---- Build the SPA ----------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /src

COPY package.json package-lock.json .npmrc ./

# @projectbooth/module-store-ui (ADR 0030) is published to GitHub Packages, which
# requires an auth token even to read. Supplied as a BuildKit secret so it never lands in
# an image layer or the build cache:
#   docker build --secret id=npm_token,env=NPM_TOKEN -t booth-design .
# (needs read:packages). Without it, `npm ci` fails on that one package with a 401.
RUN --mount=type=secret,id=npm_token \
    if [ -s /run/secrets/npm_token ]; then \
      npm ci --//npm.pkg.github.com/:_authToken="$(cat /run/secrets/npm_token)"; \
    else \
      echo "WARNING: no npm_token build secret; installing @projectbooth/* from GitHub Packages will 401" >&2; \
      npm ci; \
    fi

COPY . .
# No VITE_OIDC_* here on purpose: OIDC config is injected at container start
# (docker/40-booth-config.sh -> /config.js), so this image is deployment-agnostic.
RUN npm run build

# Belt and braces alongside .gitattributes: strip any CRs from the container-side files
# (a Windows checkout tarred to a Linux host would otherwise break the script's shebang).
RUN sed -i 's/\r$//' docker/40-booth-config.sh docker/nginx.conf.template

# ---- Serve it ---------------------------------------------------------------------------
# The unprivileged nginx variant: runs as uid 101 and listens on 8080, so the chart can
# enforce runAsNonRoot.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY --from=build /src/dist /usr/share/nginx/html
COPY --from=build /src/docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build --chmod=0755 /src/docker/40-booth-config.sh /docker-entrypoint.d/40-booth-config.sh

# Defaults for the envsubst'd nginx template; the chart overrides them.
ENV CLIENT_MAX_BODY_SIZE=512m \
    CORE_GATEWAY_URL=http://booth-core.booth-system.svc:8080

EXPOSE 8080
