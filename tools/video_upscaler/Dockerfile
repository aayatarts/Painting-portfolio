FROM ubuntu:24.04

# Ubuntu's ffmpeg build includes libvidstab (stabilization), libx264, and all
# standard filters (hqdn3d, minterpolate, unsharp) out of the box.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg bash coreutils ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /work
COPY enhance.sh /usr/local/bin/enhance.sh
RUN chmod +x /usr/local/bin/enhance.sh

ENTRYPOINT ["/usr/local/bin/enhance.sh"]
