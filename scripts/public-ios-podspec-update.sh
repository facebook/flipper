#!/bin/bash

echo "✨ Updating podspecs with new release..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FBSOURCE_DIR="$DIR/../../../../"
XPLAT_SONAR_DIR="$FBSOURCE_DIR/xplat/sonar"
XPLAT_SONAR_GETTING_STARTED_DOC="$XPLAT_SONAR_DIR/docs/getting-started.md"
XPLAT_SONAR_CLIENT_SONAR_PODSPEC="$FBSOURCE_DIR/xplat/sonar-client/Sonar/Sonar.podspec"
SPECS_DIR="$FBSOURCE_DIR/xplat/sonar/Specs"
PODSPEC_PATH="$DIR/../OSSProject/SonarKit.podspec"
PODFILE_PATH="$DIR/../Sample/Podfile"
SONARKIT_VERSION_TAG='sonarkit_version'
OLD_VERSION_POD_ARG=$(< "$PODSPEC_PATH" grep "$SONARKIT_VERSION_TAG =" )
OLD_VERSION="${OLD_VERSION_POD_ARG##* }"

echo "Currently released version is $OLD_VERSION, What should the version of the next release be?"
read -r VERSION

echo "Updating version $VERSION in podspecs, podfiles and in getting started docs..."

# Update Podspec files and podfiles with correct version
sed -i "" "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/g" "$PODSPEC_PATH"
sed -i "" "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/g" "$PODFILE_PATH"
sed -i "" "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/g" "$XPLAT_SONAR_CLIENT_SONAR_PODSPEC"
sed -i "" "s/${SONARKIT_VERSION_TAG} = ${OLD_VERSION}/${SONARKIT_VERSION_TAG} = '${VERSION}'/g" "$XPLAT_SONAR_GETTING_STARTED_DOC"

# Copy Podfiles
mkdir "$SPECS_DIR/SonarKit/$VERSION"  # New Specs dir for SonarKit podspec
mkdir "$SPECS_DIR/Sonar/$VERSION"     # New Specs dir for Sonar podspec
cp "$PODSPEC_PATH" "$SPECS_DIR/SonarKit/$VERSION" # Copied SonarKit podspec
cp "$XPLAT_SONAR_CLIENT_SONAR_PODSPEC" "$SPECS_DIR/Sonar/$VERSION" # Copied Sonar podspec
