# One image for the whole app: the API serves the built web app from the same port.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build \
 && pnpm --filter @gatherly/api deploy --prod /out/apps/api \
 && cp -r apps/web/dist /out/apps/web-dist

FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
COPY --from=build /out/apps/api /app/apps/api
COPY --from=build /out/apps/web-dist /app/apps/web/dist
WORKDIR /app/apps/api
EXPOSE 3000
# Migrations run before the server starts; the server itself never migrates.
CMD ["sh", "-c", "node dist/migrate.js && exec node --enable-source-maps --import ./dist/telemetry.js dist/server.js"]
