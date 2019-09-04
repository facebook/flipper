#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the LICENSE file
# in the root directory of this source tree.

set -xeuo pipefail

if [ `adb devices | wc -l` -lt "3" ]
then
    echo "No devices are connected. Make sure emulator is booted with flipper sample app running"
    exit 1
fi

yarn build-headless --mac
unzip -u dist/Flipper-headless.zip -d /tmp
(cd headless-tests && yarn test)
