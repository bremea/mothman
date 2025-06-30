FROM oven/bun:alpine

RUN apk add --no-cache bash
RUN adduser -S -h /home/mothman -s /bin/bash mothman

USER mothman
WORKDIR /home/mothman/bot

COPY bun.lockb package.json ./
RUN bun install

COPY . .

CMD ["bun", "start"]