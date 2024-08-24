FROM debian:12-slim

# USER vscode
USER root
# WORKDIR /base

# install basic deps
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive && \
    apt-get install -y git build-essential && \
    apt-get clean -y

RUN ["echo", "Finished building devcontainer!"]