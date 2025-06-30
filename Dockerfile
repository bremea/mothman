FROM oven/bun:alpine

WORKDIR /bot

RUN apk add --no-cache bash

COPY bun.lockb package.json ./
RUN bun install

COPY . .

CMD ["bun", "start"]