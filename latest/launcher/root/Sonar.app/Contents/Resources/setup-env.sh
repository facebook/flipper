#!/usr/bin/env bash

set -e

main () {
  local -r THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  export CACHE_DIR="$HOME/.sonar-desktop"

  export PLATFORM=$(uname -s)
  if [ "$PLATFORM" = "Darwin" ]; then
    export START_COMMAND="Sonar.app/Contents/MacOS/Sonar"
    export HANDLE_NAME="osx"
  else
    export START_COMMAND="sonar"
    export HANDLE_NAME="linux"
  fi

  if [ -f "$CACHE_DIR/.sonarversion" ]; then
    export CACHE_STATUS="exists"
  else
    export CACHE_STATUS="none"
  fi
}

main
