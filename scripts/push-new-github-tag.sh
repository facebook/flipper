#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

echo "✨ Creating new Sonar iOS release on GitHub..."

echo "What should the patch version of the next release be?"
read -r VERSION

TMP_DIR=$(mktemp -d)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
JSON=$(cat "$DIR/public-ios-release.json")
JSON=${JSON/__VERSION__/$VERSION}
JSON=${JSON/__VERSION__/$VERSION}
JSON=${JSON/__USER__/$USER}
echo "$JSON" > "$TMP_DIR/job.json"
scutil create "$TMP_DIR/job.json"
echo "✅ GitHub release will be automatically created once the Sandcastle job finishes."
rm -rf "$TMP_DIR"
