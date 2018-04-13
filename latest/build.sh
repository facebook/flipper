#!/bin/sh

set -e

main () {
  if ! which sha1sum; then
    echo "No sha1sum binary found. Run \`brew install md5sha1sum\` to install it."
    exit 1
  fi

  local -r THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  source "$THIS_DIR/../scripts/setup-env.sh"
  SONAR_DIR="$THIS_DIR/.."
  OSX_DIR="$SONAR_DIR/dist/mac"
  LINUX_DIR="$SONAR_DIR/dist/linux-unpacked"
  WINDOWS_DIR="$SONAR_DIR/dist/win-unpacked"
  cd "$SONAR_DIR"

  # Increment patch version
  echo "[build] Bumping version..."
  yarn version --no-git-tag-version --new-version patch

  # Update `versionDate` field in package.json
  node ./latest/update-package-json-date.js

  # Initial build
  echo "[build] Performing initial build..."
  yarn build

  function create_hash () {
    find -s $1 -type f -exec sha1sum {} \; | sha1sum | awk '{print $1;}'
  }

  function everstore_upload () {
    RESPONSE=$(curl -L \
      -X POST \
      -F tarball="@$1" \
      "https://interngraph.intern.facebook.com/sonar/upload?app=543626909362475&token=AeNRaexWgPooanyxG0")

    HANDLER=$(echo $RESPONSE | grep 'handle' | cut -d ',' -f 2 | cut -d ':' -f 2 | sed -e 's/^[ ]*//' | sed -e 's/}$//')
    echo $HANDLER
  }

  # Creating tarballs
  TAR_DIR="$SONAR_DIR/dist/tar"
  OSX_TAR="$TAR_DIR/osx.tar.gz"
  LINUX_TAR="$TAR_DIR/linux.tar.gz"
  WINDOWS_TAR="$TAR_DIR/win.tar.gz"
  mkdir -p "$TAR_DIR"
  echo "[build] Creating tarballs..."
  tar -zcvf "$LINUX_TAR" -C "$LINUX_DIR" .
  tar -zcvf "$OSX_TAR" -C "$OSX_DIR" .
  tar -zcvf "$WINDOWS_TAR" -C "$WINDOWS_DIR" .

  # Upload to everstore
  echo "[build] Uploading OSX build..."
  OSX_HANDLE=$(everstore_upload "$OSX_TAR")
  echo "[build] OSX handle uploaded: $OSX_HANDLE"
  echo "[build] Uploading Linux build..."
  LINUX_HANDLE=$(everstore_upload "$LINUX_TAR")
  echo "[build] Linux handle uploaded: $LINUX_HANDLE"
  echo "[build] Uploading Windows build..."
  WINDOWS_HANDLE=$(everstore_upload "$WINDOWS_TAR")
  echo "[build] Windows handle uploaded: $WINDOWS_HANDLE"

  # Update hashes
  echo "{\"osx\": $OSX_HANDLE, \"linux\": $LINUX_HANDLE, \"windows\": $WINDOWS_HANDLE}" >"$SONAR_DIR/.sonarhandles"
  echo "[build] Done."
}

main
