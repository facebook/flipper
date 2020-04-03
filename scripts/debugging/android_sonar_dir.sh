#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

if [ "$#" -ne 4 ] && [ "$#" -ne 2 ]; then
    echo "Utility for manipulating the sonar directory where certificates and connection config are stored on Android devices."
    echo "Usage: $0 pull APP_PACKAGE SOURCE DEST"
    echo "E.g:   $0 pull com.facebook.flipper.sample device.crt /tmp/device.crt"
    echo " or"
    echo "Usage: $0 ls APP_PACKAGE"
    exit 1;
fi
PACKAGE=$2
SOURCE=$3
DEST=$4
case "$1" in
  "pull")
    # run-as opens a subshell on the device, so we echo the command we want to
    # execute into that subshell.
    echo "cat files/sonar/$SOURCE" | adb shell run-as "$PACKAGE" > "$DEST"
    ;;
  "ls")
    echo "ls -la files/sonar" | adb shell run-as "$PACKAGE"
    ;;
  *)
    echo "Unrecognised command: $1"
    exit 1
    ;;
esac
