#!/usr/bin/env bash
# This script is ran when /Applications/Sonar.app is invoked and requires an update and is ran in a terminal

set -e

main () {
  local -r THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  source "$THIS_DIR/setup-env.sh"

  clear

  "$THIS_DIR/start.sh"

  # kill the terminal process reponsible for this window
  # this is because after command completion Terminal.app will still have an open window
  kill `ps -A | grep -w Terminal.app | grep download-initial | awk '{print $1}'`
}

main
