FROM node:alpine AS client-builder
WORKDIR /app/Client

COPY Client/package*.json ./
RUN npm ci

COPY Client/ ./
RUN npm run build


FROM node:alpine AS server-deps
WORKDIR /app/Server

COPY Server/package*.json ./
RUN npm ci --omit=dev


FROM node:alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=server-deps /app/Server/node_modules ./Server/node_modules
COPY Server/ ./Server/
COPY --from=client-builder /app/Client/dist ./Client/dist

VOLUME ["/app/Server/data"]
EXPOSE 4000

CMD ["node", "Server/src/server.js"]

