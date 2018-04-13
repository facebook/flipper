#!/bin/sh
# This file is for backwards compatibility with old chef installations.

set -e

main () {
  local -r THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  "$THIS_DIR/launcher/root/Sonar.app/Contents/MacOS/Sonar" "$@"
}

main
