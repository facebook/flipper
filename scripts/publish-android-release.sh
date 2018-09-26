#!/usr/bin/env bash
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
  "$BASEDIR"/gradlew bintrayUpload -PdryRun=false
fi
