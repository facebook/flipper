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
Please follow these steps to ship the new Flipper release:\n\n\
1. Check Signal Hub for the ephemeral Flipper build. You will find instructions on how to run it in there: https://www.internalfb.com/intern/px/p/1Kcbk\n\
2. Perform some brief exploratory tests. Start an emulator, click around in the layout. This should only take a few minutes.\n\
3. If things are looking okay, accept both diffs and land them *together* as a stack.\n\
4. Once landed, the Flipper bot will comment with \"#flipperrelease with bump\" on the diff. If this doesn't happen, please do this yourself. This will kick off the [\"flipper-release\"](https://fburl.com/sandcastle/uh698xj2) job, resulting in another diff which when landed pins the new release for our users.\n\
See more details about the Flipper release process [here](https://fburl.com/flipperreleasebot).\n\n\
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
