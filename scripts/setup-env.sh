#!/bin/sh
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -e

main () {
  local -r THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  ROOT_DIR=$(cd "$THIS_DIR" && hg root)

  source "$ROOT_DIR/xplat/js/env-utils/setup_env_vars.sh"

  export SONAR_DIR="$ROOT_DIR/xplat/sonar"
  export PATH="$SONAR_DIR/node_modules/.bin:$ROOT_DIR/xplat/third-party/node/bin:$ROOT_DIR/xplat/third-party/yarn:$PATH"
}

main
