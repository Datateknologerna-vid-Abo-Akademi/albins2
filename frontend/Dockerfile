FROM node:lts-alpine as builder

RUN apk add --no-cache build-base libc6-compat gcompat

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build


FROM nginx:stable-alpine
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
