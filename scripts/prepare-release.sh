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

# When starting this job from SandcastleFlipperAutoReleaseCommand, we pass in the revision to release
SANDCASTLE_REVISION="$1"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SONAR_DIR="$DIR/../"
DESKTOP_DIR="$SONAR_DIR/desktop"
FLIPPERKIT_PODSPEC_PATH="$SONAR_DIR/FlipperKit.podspec"
FLIPPER_PODSPEC_PATH="$SONAR_DIR/Flipper.podspec"
TUTORIAL_PODFILE_PATH="$SONAR_DIR/iOS/Tutorial/Podfile"
SONAR_GETTING_STARTED_DOC="$SONAR_DIR/docs/getting-started.md"
SPECS_DIR="$SONAR_DIR/Specs/"
FLIPPERKIT_VERSION_TAG='flipperkit_version'
OLD_VERSION_POD_ARG=$(< "$FLIPPER_PODSPEC_PATH" grep "$FLIPPERKIT_VERSION_TAG =" )
OLD_VERSION="${OLD_VERSION_POD_ARG##* }"

source "$DIR"/setup-env.sh

# if we got called with a rev argument, we got triggered from our automatic sandcastle job
if [ "$SANDCASTLE_REVISION" != "" ]; 
then
  # In future, bump majors instead of minors?
  echo "Automatically bumping version to next minor in package.json"
  npm -C "$DESKTOP_DIR" version minor
  VERSION=$(jq -r '.version' "$DESKTOP_DIR"/package.json)
else
  echo "The currently released version is $OLD_VERSION. What should the version of the next release be?"
  read -r VERSION
fi

echo "Preparing release $VERSION..."

# Update all the packages included as workspaces to the very same version
yarn --cwd "$DESKTOP_DIR" bump-versions --new-version "$VERSION"

# Update react-native-flipper to the very same version
yarn --cwd "$SONAR_DIR"/react-native/react-native-flipper version --new-version "$VERSION" --no-git-tag-version

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

# Generate changelog
"$DESKTOP_DIR"/scripts/generate-changelog.js

# Create commit
echo "Committing the files..."
hg addremove
hg commit -m "$(echo -e "Flipper Release: v${VERSION}\n\n\
Summary:\nReleasing version $VERSION\n\n\
Test Plan:\n\
* Wait until this build is green\n\
* Find the release id as explained here: https://our.internmc.facebook.com/intern/wiki/Flipper_Internals/Oncall_Runbook/#testing-the-release-vers and run:
* \`env FLIPPERVERSION=XXXX /Applications/Flipper.app/Contents/MacOS/Flipper\`\n\
* ...or, alternatively, run \`yarn build --mac && dist/mac/Flipper.app/Contents/MacOS/Flipper\`\n\
* Perform exploratory tests\n\n\
Reviewers: flipper\n\n\
Tags: accept2ship"
)"

# Create snapshot commit
RELEASE_REV="$(hg log -r . --template "{node}\\n")"

echo "Release commit made as $RELEASE_REV, creating new snapshot version $SNAPSHOT_VERSION..."
"$SONAR_DIR"/scripts/bump.sh --snapshot "$SNAPSHOT_VERSION"

hg commit -m "$(echo -e "Flipper Snapshot Bump: v${SNAPSHOT_VERSION}\n\n\
Summary:\nReleasing snapshot version $SNAPSHOT_VERSION\n\n\
Test Plan:\nN/A\n\n\
Reviewers: flipper\n\n\
Tags: accept2ship"
)"

if [ "$SANDCASTLE_REVISION" == "" ]; 
then
  # Submit diffs, we only do this when running locally.
  # From SandcastleFlipperAutoReleaseCommand, the diffs are submitted 
  # later by using the bot context
  echo "Submitting diffs for review..."
  jf submit -n -r.^::.
else
  echo "Skip submitting diffs, as this diffs should be submitted by SC"
fi
