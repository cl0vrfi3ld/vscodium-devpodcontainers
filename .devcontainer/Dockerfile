FROM debian:12-slim

ARG USERNAME=codium
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# USER root
# WORKDIR /base

# install basic deps
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive && \
    apt-get install -y sudo build-essential && \
    apt-get clean -y

# sort out perms 
RUN groupadd --gid $USER_GID $USERNAME && \
    useradd --uid $USER_UID --gid $USER_GID -m $USERNAME -p "" && \
    usermod -aG sudo $USERNAME
RUN chsh -s $(which bash) ${USERNAME}

RUN ["echo", "Finished building devcontainer!"]

USER ${USERNAME}