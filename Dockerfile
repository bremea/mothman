FROM oven/bun:debian

# fix for steamcmd
RUN dpkg --add-architecture i386 \
	&& apt-get update \
	&& apt-get install -y libc6:i386 libncurses5:i386 libstdc++6:i386 ca-certificates

WORKDIR /root/bot

COPY . .
RUN bun install

VOLUME ["/root"]

CMD ["bun", "start"]