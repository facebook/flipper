#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

echo "Starting a manual test run ..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
DIST_DIR="$DIR/../dist"

if [[ ! -d $DIST_DIR/mac || ! -d $DIST_DIR/linux-unpacked || ! -d $DIST_DIR/win-unpacked ]]; then
    echo "ERR: Needs distributions built for Mac, Linux and Windows."
    echo "Please run in this in the desktop directory:"
    echo "$ yarn build --mac --linux --win"
    exit 1
fi

has_resources() {
    if ! tar tf "$1" | grep '[Rr]esources/app.asar' > /dev/null; then
        echo "ERR: $1 for $2 does not contain a resource bundle. Check your packfile!"
        exit 2
    fi
}

has_no_resources() {
    if (( $(tar tf "$1" | grep -cFv '[Rr]esources/app.asar') < 10 )); then
        echo "ERR: $1 for $2 has suspiciously low number of non-resource files. Check your packfile!"
        exit 2
    fi
}

echo "Build for Mac ..."

cargo run mac
has_resources core.tar.xz mac
has_no_resources frameworks.tar.xz mac
cat manifest.json

echo
echo "All good."

echo "Build for Linux ..."

cargo run linux
has_resources core.tar.xz linux
has_no_resources frameworks.tar.xz linux
cat manifest.json

echo
echo "All good."

echo "Building for Windows ..."

cargo run windows
has_resources core.tar.xz windows
has_no_resources frameworks.tar.xz windows
cat manifest.json

echo
echo "All good. Ship it."
