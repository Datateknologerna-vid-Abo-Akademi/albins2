FROM node:lts-alpine as builder

RUN apk add --no-cache build-base libc6-compat gcompat curl

RUN npm install -g pnpm

WORKDIR /app
COPY . .

RUN pnpm install
RUN pnpm run build


FROM nginx:stable-alpine
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80