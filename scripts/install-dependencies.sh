#!/bin/sh
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

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

  # go back
  cd "$PREV_DIR"

  # remove correct dependencies log
  printf "\r"
}

main
