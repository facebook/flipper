#!/bin/bash
set -e

darwin=false
case "$(uname)" in
  Darwin*) darwin=true ;;
esac

if ! jq --version > /dev/null; then
   echo -e "jq is not installed! Should the script install it for you? (y/n) \\c"
   read -r REPLY
   if [ "$REPLY" = "y" ]; then
      brew install jq
    else
      exit 1
   fi
fi

echo "Checking for any uncommitted changes..."
CHANGES=$(hg st)
echo "$CHANGES"

if [ ! -z "$CHANGES" ];
then
    echo "There are uncommitted changes, either commit it or revert them."
    exit 1
fi

echo "✨ Making a new release..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SONAR_DIR="$DIR/../"
SONARKIT_PODSPEC_PATH="$SONAR_DIR/iOS/SonarKit.podspec"
SONAR_PODSPEC_PATH="$SONAR_DIR/xplat/Sonar/Sonar.podspec"
SONAR_GETTING_STARTED_DOC="$SONAR_DIR/docs/getting-started.md"
SPECS_DIR="$SONAR_DIR/Specs/"
SONARKIT_VERSION_TAG='sonarkit_version'
OLD_VERSION_POD_ARG=$(< "$SONAR_PODSPEC_PATH" grep "$SONARKIT_VERSION_TAG =" )
OLD_VERSION="${OLD_VERSION_POD_ARG##* }"

echo "Currently released version is $OLD_VERSION, What should the version of the next release be?"
read -r VERSION

echo "Updating version $VERSION in podspecs, podfiles and in getting started docs..."

# Update Podspec files and podfiles with correct version
echo "Updating $SONARKIT_PODSPEC_PATH"
if $darwin; then
sed -i '' "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/" "$SONARKIT_PODSPEC_PATH"
echo "Updating $SONAR_PODSPEC_PATH"
sed -i '' "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/" "$SONAR_PODSPEC_PATH"
echo "Updating $SONAR_GETTING_STARTED_DOC"
sed -i '' "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/" "$SONAR_GETTING_STARTED_DOC"
else
  sed -i "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/" "$SONARKIT_PODSPEC_PATH"
  echo "Updating $SONAR_PODSPEC_PATH"
  sed -i "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/" "$SONAR_PODSPEC_PATH"
  echo "Updating $SONAR_GETTING_STARTED_DOC"
  sed -i "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/" "$SONAR_GETTING_STARTED_DOC"
fi
# Copy Podfiles
mkdir "$SPECS_DIR/SonarKit/$VERSION"  # New Specs dir for SonarKit podspec
mkdir "$SPECS_DIR/Sonar/$VERSION"     # New Specs dir for Sonar podspec
echo "Copying SonarKit.podspec in Specs folder"
cp "$SONARKIT_PODSPEC_PATH" "$SPECS_DIR/SonarKit/$VERSION" # Copied SonarKit podspec
echo "Copying Sonar.podspec in Specs folder"
cp "$SONAR_PODSPEC_PATH" "$SPECS_DIR/Sonar/$VERSION" # Copied Sonar podspec

echo "Bumping version number for android related files..."
# Update Android related files
"$SONAR_DIR"/scripts/bump.sh "$VERSION"

#Update Package.json
echo "Bumping version number in package.json"
jq '.version = $newVal' --arg newVal "$VERSION" "$SONAR_DIR"/package.json > tmp.$$.json && mv tmp.$$.json "$SONAR_DIR"/package.json

echo "Committing the files..."
hg addremove
hg commit -m"Flipper Release: v$VERSION"

echo "Preparing diff for your review..."
arc diff --prepare
