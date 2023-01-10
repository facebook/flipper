#!/usr/bin/env bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -e

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
IS_SNAPSHOT="$(grep 'VERSION_NAME=[0-9\.]\+-SNAPSHOT' "$BASEDIR/gradle.properties" || echo "")"

if [ "$ANDROID_PUBLISH_KEY" == "" ]; then
  echo "No encryption key. Skipping snapshot deployment."
  exit
elif [ "$IS_SNAPSHOT" == "" ]; then
  echo "Skipping build. Given build doesn't appear to be a SNAPSHOT release."
  exit 1
else
  openssl aes-256-cbc -pbkdf2 -d -in scripts/gradle-publish-keys.enc -k "$ANDROID_PUBLISH_KEY" >> "$BASEDIR/gradle.properties"
  "$BASEDIR"/gradlew publish
fi
