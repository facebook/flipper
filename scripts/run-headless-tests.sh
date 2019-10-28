#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -euo pipefail

if [ `adb devices | wc -l` -lt "3" ]
then
    echo "ERROR: No devices are connected. Make sure emulator is booted with flipper sample app running"
    exit 1
fi

api_version=$(adb shell getprop ro.build.version.sdk)

if [ "$api_version" != "24" ]; then
    echo "WARNING: Emulator has api version $api_version. Should be using API 24 for snapshot test to pass. ( Must match the one we request from oneworld at https://fburl.com/diffusion/op67q916 )"
fi

yarn build-headless --mac
unzip -o dist/Flipper-headless.zip -d /tmp
(cd headless-tests && yarn test)
