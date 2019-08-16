#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the LICENSE file
# in the root directory of this source tree.
set -e

# This script is used by `arc lint`.

THIS_DIR=$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$THIS_DIR" && hg root)

cd "$ROOT_DIR/xplat/sonar"

# Sonar's Electron dependency downloads itself via a post-install script.
# When running in Sandcastle or devservers, the module install will fail
# because we can't reach the internet. Setting the fwdproxy is dangerous, so
# the next best thing is to install the modules with `--ignore-scripts`.
# However, we can't run `install-node-modules` like this all of the time.
# `install-node-modules` uses its args as keys for the "yarn watchman check"
# cache. So if we run `install-node-modules` outside of this script without
# the flag, but then this script runs it with the flag, we're going to
# invalidate the cache.

# If `node_modules` exists, we can't tell if it was created with
# `--ignore-scripts` or not, so we play it safe, and avoid touching it.
if [[ ! -d "node_modules" ]]; then
  "$ROOT_DIR/xplat/third-party/yarn/install-node-modules" --ignore-scripts --ignore-engines
fi

exec \
  "$ROOT_DIR/xplat/third-party/node/bin/node" \
  "$ROOT_DIR/xplat/sonar/node_modules/.bin/eslint" \
  "$@"
