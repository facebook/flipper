#!/bin/bash

echo "✨ Creating new Sonar release on GitHub..."
MAJOR=$(curl -x fwdproxy:8080 --silent https://raw.githubusercontent.com/facebook/Sonar/master/package.json | jq -r '.version' | sed -E 's/[0-9]+$//g')

echo "What should the patch version of the next release be? (v${MAJOR}_)"

read -r VERSION
if ! [[ $VERSION =~ ^[0-9]+$ ]] ; then
 echo "error: Version needs to be a number" >&2; exit 1
fi

echo "Creating version $MAJOR$VERSION and releasing to GitHub..."
TMP_DIR=$(mktemp -d)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
JSON=$(cat "$DIR/public-build.json")
JSON=${JSON/__VERSION__/$VERSION}
JSON=${JSON/__USER__/$USER}
echo "$JSON" > "$TMP_DIR/job.json"

scutil create "$TMP_DIR/job.json"
echo "✅ GitHub release will be automatically created once the Sandcastle job finishes."

rm -rf "$TMP_DIR"
