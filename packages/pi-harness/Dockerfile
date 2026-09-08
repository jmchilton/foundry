ARG NODE_IMAGE=node:22.19.0-bookworm-slim
FROM ${NODE_IMAGE}

ARG PI_VERSION=0.84.4
ARG FOUNDRY_CLI_VERSION=0.1.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts \
    "@earendil-works/pi-coding-agent@${PI_VERSION}" \
    "@galaxy-foundry/gxwf-foundry@${FOUNDRY_CLI_VERSION}"

LABEL org.galaxyproject.foundry.pi-version="${PI_VERSION}" \
      org.galaxyproject.foundry.cli-version="${FOUNDRY_CLI_VERSION}" \
      org.galaxyproject.foundry.pi-rpc-version="1"

WORKDIR /workspace
ENTRYPOINT ["pi"]
