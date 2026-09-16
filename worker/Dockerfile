# The one machine in the product that needs a binary rather than a runtime.
FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY index.mjs ./

# Work lands in the container's own disk and is deleted as it goes; a reel is
# the biggest thing here and it is measured in tens of megabytes.
ENV WORK_DIR=/tmp/adbite
CMD ["node", "index.mjs"]
