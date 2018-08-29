#!/usr/bin/env bash
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
  openssl aes-256-cbc -d -in scripts/gradle-publish-keys.enc -k "$ANDROID_PUBLISH_KEY" >> "$BASEDIR/gradle.properties"
  "$BASEDIR"/gradlew uploadArchives --info
fi
