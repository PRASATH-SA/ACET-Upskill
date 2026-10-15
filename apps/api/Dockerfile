# ACET SkillUp API. Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace @acet/api --include-workspace-root=false && npm cache clean --force
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "src/server.js"]
