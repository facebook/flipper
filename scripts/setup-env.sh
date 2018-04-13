#!/bin/sh

set -e

main () {
  local -r THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  ROOT_DIR=$(cd "$THIS_DIR" && hg root)

  source "$ROOT_DIR/xplat/js/env-utils/setup_env_vars.sh"

  export SONAR_DIR="$ROOT_DIR/xplat/infinity"
  export PATH="$SONAR_DIR/node_modules/.bin:$ROOT_DIR/xplat/third-party/node/bin:$ROOT_DIR/xplat/third-party/yarn:$PATH"
}

main
