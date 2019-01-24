#!/bin/bash

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Run from here so we know we're having fbsource in our $PWD.
cd "$BASEDIR" || exit

case $OSTYPE in
  darwin*) ./bump.mac "$@" ;;
  linux-gnu) ./bump.lnx64 "$@" ;;
  *) echo "Unknown OS. Using source version via https://haskellstack.org/" && ./bump/bump.hs "$@" ;;
esac
