# Build BASE
FROM imbios/bun-node:18-slim as BASE


WORKDIR /app
COPY package.json bun.lockb ./
RUN  bun install --frozen-lockfile 

# Build Image
FROM imbios/bun-node:18-slim AS BUILD


WORKDIR /app
COPY --from=BASE /app/node_modules ./node_modules
COPY . .
RUN bun run build \
    && cd .next/standalone 
    # Follow https://github.com/ductnn/Dockerfile/blob/master/nodejs/node/16/alpine/Dockerfile

# Build production
FROM node:alpine AS PRODUCTION


WORKDIR /app

COPY --from=BUILD /app/public ./public
COPY --from=BUILD /app/next.config.mjs ./

# Set mode "standalone" in file "next.config.js"
COPY --from=BUILD /app/.next/standalone ./
COPY --from=BUILD /app/.next/static ./.next/static
COPY --from=BUILD /app/.next/server ./.next/server

EXPOSE 3000

CMD ["node", "server.js"]
