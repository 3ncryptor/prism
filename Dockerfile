# syntax=docker/dockerfile:1
#
# Single image, two entrypoints (docker-compose.yml selects which one via
# `command:`): the Next.js app (`npm run start`) and the document-processing
# worker (`npm run worker`, workers/document-worker.ts via tsx). The worker
# needs the full source tree + full node_modules (including the `tsx`
# devDependency it runs on) — Next's `output: "standalone"` trace mode only
# covers the Next.js app itself, not this separate script, so we
# deliberately don't prune devDependencies or use standalone output here.
#
# Real external services (MongoDB, Redis, Pinecone, S3, Gemini) are either
# containerized alongside this image (Mongo/Redis, see docker-compose.yml)
# or remain real cloud endpoints reached via env vars — never baked into
# this image. No secret is ever passed as a build ARG or copied in.

FROM node:20-alpine AS base
WORKDIR /app
# libc6-compat: several npm packages ship prebuilt binaries that expect glibc-ish shims on musl (alpine).
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# lib/config/env.ts's accessors are lazy (never called at module-import
# time), so `next build` succeeds with zero secrets present — verified in
# docs/agent-artifacts/01-project-foundation/spec.md.
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/app ./app
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/workers ./workers
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
CMD ["npm", "run", "start"]
