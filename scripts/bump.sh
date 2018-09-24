#!/bin/bash

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

case $OSTYPE in
  darwin*) "$BASEDIR"/bump.mac "$@" ;;
  linux-gnu) "$BASEDIR"/bump.lnx64 "$@" ;;
  *) echo "Unknown OS. Using source version using https://haskellstack.org/" && "$BASEDIR"/bump.hs "$@" ;;
esac
