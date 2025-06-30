FROM oven/bun:alpine

WORKDIR /bot

COPY bun.lockb package.json ./
RUN bun install

COPY . .

CMD ["bun", "start"]