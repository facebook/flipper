#!/usr/bin/env bash

set -e

main () {
  local -r THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  source "$THIS_DIR/setup-env.sh"
  cd "$THIS_DIR"

  # check if we need to update
  if [ "$CACHE_STATUS" == "none" ]; then
    # no download present, we need to block execution
    ./download.py
  else
    # perform a background update, will bail out if we have an up to date copy
    ./download.py &
  fi

  # sometimes NODE_ENV is set and this messes with the infinity electron init script
  unset NODE_ENV

  # launch in the background
  "$CACHE_DIR/$START_COMMAND" "$@" </dev/null &>/dev/null &
}

main "$@"
