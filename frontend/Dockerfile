FROM oven/bun:1 as builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build


FROM nginx:stable-alpine
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80