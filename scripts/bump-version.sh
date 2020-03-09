#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -e

darwin=false
case "$(uname)" in
  Darwin*) darwin=true ;;
esac

if ! jq --version > /dev/null; then
  if $darwin; then
    echo -e "jq is not installed! Should the script install it for you? (y/n) \\c"
    read -r REPLY
    if [ "$REPLY" = "y" ]; then
      brew install jq
    else
      exit 1
    fi
  else
    echo >&2 "jq is not installed. Please install it using your platform's package manager (apt-get, yum, pacman, etc.)."
    exit 1
  fi
fi

echo "Checking for any uncommitted changes..."
CHANGES=$(hg st)
echo "$CHANGES"

if [ ! -z "$CHANGES" ];
then
    echo "There are uncommitted changes, either commit or revert them."
    exit 1
fi

echo "✨ Making a new release..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SONAR_DIR="$DIR/../"
FLIPPERKIT_PODSPEC_PATH="$SONAR_DIR/FlipperKit.podspec"
FLIPPER_PODSPEC_PATH="$SONAR_DIR/Flipper.podspec"
TUTORIAL_PODFILE_PATH="$SONAR_DIR/iOS/Tutorial/Podfile"
SONAR_GETTING_STARTED_DOC="$SONAR_DIR/docs/getting-started.md"
SPECS_DIR="$SONAR_DIR/Specs/"
FLIPPERKIT_VERSION_TAG='flipperkit_version'
OLD_VERSION_POD_ARG=$(< "$FLIPPER_PODSPEC_PATH" grep "$FLIPPERKIT_VERSION_TAG =" )
OLD_VERSION="${OLD_VERSION_POD_ARG##* }"

echo "The currently released version is $OLD_VERSION. What should the version of the next release be?"
read -r VERSION

# This could be one expression with GNU sed, but I guess we want to support the BSD crap, too.
SNAPSHOT_MINOR_VERSION=$(echo "$VERSION" | sed -Ee 's/([0-9]+)\.([0-9]+)\.([0-9]+)/\3 + 1/' | bc)
SNAPSHOT_VERSION="$(echo "$VERSION" | sed -Ee 's/([0-9]+)\.([0-9]+)\.([0-9]+)/\1.\2./')""$SNAPSHOT_MINOR_VERSION""-SNAPSHOT"

echo "Updating version $VERSION in podspecs, podfiles and in getting started docs..."

# Update Podspec files and podfiles with correct version
echo "Updating $FLIPPERKIT_PODSPEC_PATH"
if $darwin; then
sed -i '' "s/${FLIPPERKIT_VERSION_TAG} = ${OLD_VERSION}/${FLIPPERKIT_VERSION_TAG} = '${VERSION}'/" "$FLIPPERKIT_PODSPEC_PATH"
echo "Updating $FLIPPER_PODSPEC_PATH"
sed -i '' "s/${FLIPPERKIT_VERSION_TAG} = ${OLD_VERSION}/${FLIPPERKIT_VERSION_TAG} = '${VERSION}'/" "$FLIPPER_PODSPEC_PATH"
echo "Updating $SONAR_GETTING_STARTED_DOC"
sed -i '' "s/${FLIPPERKIT_VERSION_TAG} = ${OLD_VERSION}/${FLIPPERKIT_VERSION_TAG} = '${VERSION}'/" "$SONAR_GETTING_STARTED_DOC"
echo "Updating $TUTORIAL_PODFILE_PATH"
sed -i '' "s/${FLIPPERKIT_VERSION_TAG} = ${OLD_VERSION}/${FLIPPERKIT_VERSION_TAG} = '${VERSION}'/" "$TUTORIAL_PODFILE_PATH"
else
  sed -i "s/${FLIPPERKIT_VERSION_TAG} = ${OLD_VERSION}/${FLIPPERKIT_VERSION_TAG} = '${VERSION}'/" "$FLIPPERKIT_PODSPEC_PATH"
  echo "Updating $FLIPPER_PODSPEC_PATH"
  sed -i "s/${FLIPPERKIT_VERSION_TAG} = ${OLD_VERSION}/${FLIPPERKIT_VERSION_TAG} = '${VERSION}'/" "$FLIPPER_PODSPEC_PATH"
  echo "Updating $SONAR_GETTING_STARTED_DOC"
  sed -i "s/${FLIPPERKIT_VERSION_TAG} = ${OLD_VERSION}/${FLIPPERKIT_VERSION_TAG} = '${VERSION}'/" "$SONAR_GETTING_STARTED_DOC"
  echo "Updating $TUTORIAL_PODFILE_PATH"
  sed -i "s/${FLIPPERKIT_VERSION_TAG} = ${OLD_VERSION}/${FLIPPERKIT_VERSION_TAG} = '${VERSION}'/" "$TUTORIAL_PODFILE_PATH"
fi

echo "Bumping version number for android related files..."
# Update Android related files
"$SONAR_DIR"/scripts/bump.sh "$VERSION"

#Update Package.json
echo "Bumping version number in package.json"
jq '.version = $newVal' --arg newVal "$VERSION" "$SONAR_DIR"/desktop/package.json > tmp.$$.json && mv tmp.$$.json "$SONAR_DIR"/desktop/package.json

#Update react-native-flipper to the very same version
jq '.version = $newVal' --arg newVal "$VERSION" "$SONAR_DIR"/react-native/react-native-flipper/package.json > tmp.$$.json && mv tmp.$$.json "$SONAR_DIR"/react-native/react-native-flipper/package.json

echo "Committing the files..."
hg addremove

hg commit -m "Flipper Release: v$VERSION"

RELEASE_REV="$(hg log -r . --template "{node}\\n")"

echo "Release commit made as $RELEASE_REV, creating new snapshot version $SNAPSHOT_VERSION..."
"$SONAR_DIR"/scripts/bump.sh --snapshot "$SNAPSHOT_VERSION"

hg commit -m "Flipper Bump: v$SNAPSHOT_VERSION"

echo "Submitting diffs for review..."
jf submit -n -r.^::.
