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
1. Flipper Bot will comment \"#flipperrelease ephemeral\" to trigger a new ephemeral release job [\"flipper-release-ephemeral\"](https://fburl.com/sandcastle/4mt4rj18) on Sandcastle.\n\
1. After the job has finished, Flipper Bot will post to the Signal Hub the command to run the produced build with the exact version:\n\
\`env FLIPPERVERSIONV2=<FLIPPERVERSION> RUST_LOG=flipper_launcher=info /Applications/Flipper.app/Contents/MacOS/Flipper\`\n\
1. Run the build and perform exploratory tests.\n\
1. If everything is ok, accept and land the diff.\n\
1. After the diff has landed, Flipper Bot will comment \"#flipperrelease with bump\" to trigger the actual release build job [\"flipper-release\"](https://fburl.com/sandcastle/uh698xj2) on Sandcastle.\n\
1. After the job has finished, a new diff will be published for pinning the released version to the fbsource checkout, check further instructions in that diff.\n\
1. In case the release job has failed, Flipper Bot will post to the Signal Hub. In addition to that, the \"flipper\" oncall will receive an e-mail and a task for investigation.\n\n\
See more details about the Flipper release process [here](https://fburl.com/flipperreleasebot).\n\
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
