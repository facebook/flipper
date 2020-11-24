#!/bin/sh -xe

# try to install with wget
command -v wget &>/dev/null && wget -O /tmp/retry "https://github.com/moul/retry/releases/download/v0.5.0/retry_$(uname -s)_$(uname -m)" || true

# try to install with curl
if [ ! -f /tmp/retry ]; then
  command -v curl &>/dev/null && curl -L -o /tmp/retry "https://github.com/moul/retry/releases/download/v0.5.0/retry_$(uname -s)_$(uname -m)"
fi

chmod +x /tmp/retry
/tmp/retry --version
