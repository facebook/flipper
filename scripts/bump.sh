#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Run from here so we know we're having fbsource in our $PWD.
cd "$BASEDIR" || exit

case $OSTYPE in
  darwin*) ./bump.mac "$@" ;;
  linux-gnu) ./bump.lnx64 "$@" ;;
  *) echo "Unknown OS. Using source version via https://haskellstack.org/" && ./bump/bump.hs "$@" ;;
esac
