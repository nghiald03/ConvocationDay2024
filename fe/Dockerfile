# Build dependencies
FROM oven/bun:1.2.10-alpine AS dependencies


WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build Image
FROM oven/bun:1.2.10-alpine AS build


WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG API_URL=http://be-nest:8081/api
ARG API_ORIGIN=http://be-nest:8081
ENV API_URL=$API_URL
ENV API_ORIGIN=$API_ORIGIN
RUN bun run build
    # Follow https://github.com/ductnn/Dockerfile/blob/master/nodejs/node/16/alpine/Dockerfile

# Build production
FROM node:20-alpine AS production


WORKDIR /app

COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./

# Set mode "standalone" in file "next.config.js"
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/.next/server ./.next/server

EXPOSE 3000
# Docker sets HOSTNAME to the container id, which makes Next.js listen on only one
# network when the container is attached to several; listen on all interfaces.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
USER node

CMD ["node", "server.js"]
