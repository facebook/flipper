#!/bin/bash
set -e

# This script is used by `arc lint`.

THIS_DIR=$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$THIS_DIR" && hg root)

cd "$ROOT_DIR/xplat/sonar"

# Sonar's Electron dependency downloads itself via a post-install script.
# When running in Sandcastle or devservers, the module install will fail
# because we can't reach the internet. Setting the fwdproxy is dangerous, so
# the next best thing is to install the modules with `--ignore-scripts`.
# However, we can't run `install-node-modules.sh` like this all of the time.
# `install-node-modules.sh` uses its args as keys for the "yarn watchman check"
# cache. So if we run `install-node-modules.sh` outside of this script without
# the flag, but then this script runs it with the flag, we're going to
# invalidate the cache.

# If `node_modules` exists, we can't tell if it was created with
# `--ignore-scripts` or not, so we play it safe, and avoid touching it.
if [[ ! -d "node_modules" ]]; then
  "$ROOT_DIR/xplat/third-party/yarn/install-node-modules.sh" --ignore-scripts
fi

# Prefer the internal version of Flow, which should be in the PATH - but
# fallback to the OSS version (this is needed in Sandcastle).
FLOW_BINARY="$(which flow 2>/dev/null || echo "$ROOT_DIR/xplat/sonar/node_modules/.bin/flow")"

exec "$FLOW_BINARY" "$@"
