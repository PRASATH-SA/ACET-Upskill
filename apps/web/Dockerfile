# ACET SkillUp web, production (H1). Build from the repo root: docker build -f apps/web/Dockerfile .
# Stage 1 builds the static app; stage 2 serves it with nginx, which also proxies /api to the API.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @acet/web --include-workspace-root=false
COPY packages/shared packages/shared
COPY apps/web apps/web
# Same-origin API through the nginx proxy: no CORS, and the service worker can cache it.
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build -w @acet/web

FROM nginx:1.27-alpine
# nginx renders /etc/nginx/templates/*.template with envsubst at start-up.
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80 443
