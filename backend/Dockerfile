FROM ubuntu:22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3-pip \
    python3 \
    python-is-python3 \
    python3.11-venv \
    python3.11-dev \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /backend \
    && useradd --create-home user \
    && chown -R user:user /backend

# Switch to the build stage
FROM base AS build

# Install additional dependencies in the build stage
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    git \
    iptables \
    libarchive-tools \
    libdevmapper1.02.1 \
    libgpgme11 \
    libnl-route-3-200 \
    libprotobuf-dev \
    libtinfo5 \
    netcat \
    software-properties-common \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://install.python-poetry.org/ | \
    POETRY_VERSION=1.8.3 POETRY_HOME=/etc/poetry python3.11 -

ADD --chown=user:user . /backend

WORKDIR /backend

USER user

ENV PATH="$PATH:/etc/poetry/bin"

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
