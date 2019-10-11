#!/usr/bin/env bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -e

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
IS_SNAPSHOT="$(grep 'VERSION_NAME=[0-9\.]\+-SNAPSHOT' "$BASEDIR/gradle.properties" || echo "")"

if [ "$ANDROID_PUBLISH_KEY" == "" ]; then
  echo "No encryption key. Skipping snapshot deployment."
  exit
elif [ "$IS_SNAPSHOT" != "" ]; then
  echo "Build appears to be a SNAPSHOT release, but this is a script for building stable releases. Skipping ..."
  exit 1
else
  openssl aes-256-cbc -d -in scripts/bintray-publish-keys.enc -k "$ANDROID_PUBLISH_KEY" >> "$BASEDIR/gradle.properties"
  # Need to list the projects individually here because of a bug in the gradle-bintray-plugin that
  # tries to upload projects not meant for distribution (like our root project) and throws an NPE
  # in that case.
  "$BASEDIR"/gradlew :android:bintrayUpload :noop:bintrayUpload :fresco-plugin:bintrayUpload :network-plugin:bintrayUpload :litho-plugin:bintrayUpload :leakcanary-plugin:bintrayUpload -PdryRun=false
fi
