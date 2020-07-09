#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -e
if [ -z "$1" ]
  then
    echo "Please pass the root directory of flipper repository as a first argument."
    exit 1
fi

if [ -z "$2" ]
  then
    echo "Please pass the path to update the pod version in your second argument."
    exit 1
fi

darwin=false
case "$(uname)" in
  Darwin*) darwin=true ;;
esac

if ! jq --version > /dev/null; then
  if $darwin; then
    echo "jq is not installed. Installing it..."
    brew install jq
  else
    echo >&2 "jq is not installed. Please install it using your platform's package manager (apt-get, yum, pacman, etc.)."
    exit 1
  fi
fi

FLIPPER_DIR=$1
PACKAGE_VERSION=$(jq -r .version "$FLIPPER_DIR/desktop/package.json")
OLD_VERSION_POD_ARG=$(< "FlipperKit.podspec" grep "flipperkit_version =" )
OLD_VERSION="${OLD_VERSION_POD_ARG##* }"
FLIPPERKIT_VERSION_TAG='flipperkit_version'

echo "Updating $2"
if $darwin; then
sed -i '' "s/${FLIPPERKIT_VERSION_TAG} = ${OLD_VERSION}/${FLIPPERKIT_VERSION_TAG} = '${PACKAGE_VERSION}'/" "$2"
else
  sed -i "s/${FLIPPERKIT_VERSION_TAG} = ${OLD_VERSION}/${FLIPPERKIT_VERSION_TAG} = '${PACKAGE_VERSION}'/" "$2"
fi
