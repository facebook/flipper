#!/bin/sh

set -e

main () {
  local -r THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  ROOT_DIR=$(cd "$THIS_DIR" && hg root)
  source "$ROOT_DIR/xplat/sonar/scripts/setup-env.sh"

  # save current cursor location
  printf "Ensuring correct dependencies..."

  PREV_DIR="`pwd`"

  # install dependencies
  cd "$INFINITY_DIR"
  "$INSTALL_NODE_MODULES"

  # ensure electron gets installed
  node node_modules/electron/install.js

  # go back
  cd "$PREV_DIR"

  # remove correct dependencies log
  printf "\r"
}

main
