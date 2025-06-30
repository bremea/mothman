FROM oven/bun:alpine

RUN apk add --no-cache bash sudo

RUN adduser -S -h /home/mothman -s /bin/bash mothman
RUN echo "mothman ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER mothman
WORKDIR /home/mothman/bot

COPY bun.lockb package.json ./
RUN bun install

COPY . .

CMD ["bun", "start"]