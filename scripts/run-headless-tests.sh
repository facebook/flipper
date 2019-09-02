#!/bin/bash

set -xeuo pipefail

if [ `adb devices | wc -l` -lt "3" ]
then
    echo "No devices are connected. Make sure emulator is booted with flipper sample app running"
    exit 1
fi

yarn build-headless --mac
unzip -u dist/Flipper-headless.zip -d /tmp
(cd headless-tests && yarn test)
