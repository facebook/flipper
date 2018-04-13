#!/bin/sh

set -e

main () {
  local -r THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

  cd "$THIS_DIR/.."
  source "$THIS_DIR/../../infinity/scripts/setup-env.sh"

  # get current sonar version
  SONAR_VERSION=$(node -p "require('./package.json').version")

  # update Info.plist fields in Sonar.app
  ROOT_LOC="$THIS_DIR/launcher/root"
  INFO_PLIST_LOC="$ROOT_LOC/Sonar.app/Contents/Info.plist"
  defaults write "$INFO_PLIST_LOC" CFBundleShortVersionString "$SONAR_VERSION"
  defaults write "$INFO_PLIST_LOC" CFBundleVersion "$SONAR_VERSION"

  # defaults converts the plist to a binary format, convert it back to xml
  plutil -convert xml1 "$INFO_PLIST_LOC"

  # set permissions
  chmod -R +r "$ROOT_LOC"

  # build package
  pkgbuild \
    --version "$SONAR_VERSION" \
    --root "$ROOT_LOC" \
    --component-plist "$THIS_DIR/launcher/PkgBuildComponent.plist" \
    --install-location /Applications \
    "$THIS_DIR/launcher/Sonar.pkg"

  # reset permissions
  chmod +r "$ROOT_LOC"

  # generate hash for pantri
  openssl sha -sha256 "$THIS_DIR/launcher/Sonar.pkg"
}

main
