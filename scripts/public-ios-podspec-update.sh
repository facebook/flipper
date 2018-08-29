#!/bin/bash

echo "✨ Updating podspecs with new release..."

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
sed -i "" "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/g" "$SONARKIT_PODSPEC_PATH"
sed -i "" "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/g" "$SONAR_PODSPEC_PATH"
sed -i "" "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/g" "$SONAR_GETTING_STARTED_DOC"

# Copy Podfiles
mkdir "$SPECS_DIR/SonarKit/$VERSION"  # New Specs dir for SonarKit podspec
mkdir "$SPECS_DIR/Sonar/$VERSION"     # New Specs dir for Sonar podspec
cp "$SONARKIT_PODSPEC_PATH" "$SPECS_DIR/SonarKit/$VERSION" # Copied SonarKit podspec
cp "$SONAR_PODSPEC_PATH" "$SPECS_DIR/Sonar/$VERSION" # Copied Sonar podspec
