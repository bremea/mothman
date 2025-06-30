FROM oven/bun:debian

RUN apt-get update && \
	apt-get install -y sudo bash passwd && \
	useradd -m -s /bin/bash mothman && \
	echo "mothman ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER mothman
WORKDIR /home/mothman/bot

COPY bun.lockb package.json ./
RUN bun install

COPY . .

CMD ["bun", "start"]