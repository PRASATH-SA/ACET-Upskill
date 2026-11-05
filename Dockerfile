# ACET SkillUp worker (Agenda jobs). Lives at the repo root because the build needs the whole
# monorepo as context: docker build .  (Vercel builds the `worker` service from this file.)
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace @acet/worker --workspace @acet/api --include-workspace-root=false && npm cache clean --force
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/worker apps/worker
COPY prompts prompts
USER node
WORKDIR /app/apps/worker
CMD ["node", "src/index.js"]
