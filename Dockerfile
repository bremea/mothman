FROM oven/bun:debian

# fix for steamcmd
RUN dpkg --add-architecture i386 \
	&& apt-get update \
	&& apt-get install -y libc6:i386 libncurses5:i386 libstdc++6:i386 ca-certificates

RUN apt-get update && \
	apt-get install -y sudo bash passwd && \
	useradd -m -s /bin/bash mothman && \
	echo "mothman ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

WORKDIR /home/mothman/bot

COPY . .
RUN bun install

VOLUME ["/home/mothman"]

CMD ["bun", "start"]