FROM oven/bun:1.2.10 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN bun run build

FROM dependencies AS migration
COPY drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle
COPY src/database/schema ./src/database/schema
CMD ["bun", "run", "drizzle:migrate"]

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 1001 nest && useradd --system --uid 1001 --gid nest nest
COPY --from=dependencies --chown=nest:nest /app/node_modules ./node_modules
COPY --from=build --chown=nest:nest /app/dist ./dist
COPY --chown=nest:nest package.json ./package.json
USER nest
EXPOSE 8081
CMD ["node", "dist/main.js"]
