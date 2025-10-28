FROM node:20-alpine as builder

RUN apk add --no-cache build-base libc6-compat gcompat

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build


FROM nginx:stable-alpine
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
