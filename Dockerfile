FROM oven/bun:alpine

RUN apk add --no-cache bash
RUN adduser -rm -d /home/mothman -s /bin/bash -g root -G sudo mothman

USER mothman
WORKDIR /home/mothman/bot

COPY bun.lockb package.json ./
RUN bun install

COPY . .

CMD ["bun", "start"]