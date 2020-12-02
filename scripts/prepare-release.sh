#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -e

echo "✨ Making a new release..."

# When starting this job from SandcastleFlipperAutoReleaseCommand, we pass in the revision to release
SANDCASTLE_REVISION="$1"
VERSION="$2"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SONAR_DIR="$DIR/../"
DESKTOP_DIR="$SONAR_DIR/desktop"

source "$DIR"/setup-env.sh

if [[ ! -d "$DESKTOP_DIR/node_modules" ]]; then
  yarn --cwd "$DESKTOP_DIR" install --ignore-scripts --ignore-engines
fi

# if we got called with a rev argument, we got triggered from our automatic sandcastle job
if [ "$SANDCASTLE_REVISION" == "" ];
then
  OLD_VERSION=$(jq -r '.version' "$DESKTOP_DIR"/package.json)
  echo "The currently released version is $OLD_VERSION. What should the version of the next release be?"
  read -r VERSION
  yarn --cwd "$DESKTOP_DIR" version --new-version "$VERSION"
fi

echo "Preparing release $VERSION..."

# Update flipper app version to the very same version
yarn --cwd "$DESKTOP_DIR" version --new-version "$VERSION"

# Update react-native-flipper to the very same version
yarn --cwd "$SONAR_DIR"/react-native/react-native-flipper version --new-version "$VERSION" --no-git-tag-version

# This could be one expression with GNU sed, but I guess we want to support the BSD crap, too.
SNAPSHOT_MINOR_VERSION=$(echo "$VERSION" | sed -Ee 's/([0-9]+)\.([0-9]+)\.([0-9]+)/\3 + 1/' | bc)
SNAPSHOT_VERSION="$(echo "$VERSION" | sed -Ee 's/([0-9]+)\.([0-9]+)\.([0-9]+)/\1.\2./')""$SNAPSHOT_MINOR_VERSION""-SNAPSHOT"

echo "Bumping version number for android related files..."
# Update Android related files
"$SONAR_DIR"/scripts/bump.sh "$VERSION"

# Generate changelog
$nodejs "$DESKTOP_DIR"/scripts/generate-changelog.js

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
