#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

RESULT_FILE=$1

if [ -f "$RESULT_FILE" ]; then
  rm "$RESULT_FILE"
fi
touch "$RESULT_FILE"

checksum_file() {
  openssl sha256 "$1" | awk '{print $2}'
}

FILES=()
while read -r -d ''; do
  FILES+=("$REPLY")
done < <(find . -type f \( -name "build.gradle*" -o -name "gradle-wrapper.properties" \) -print0)

# Loop through files and append checksum to result file
for FILE in "${FILES[@]}"; do
  checksum_file "$FILE" >> "$RESULT_FILE"
done

sort "$RESULT_FILE" -o "$RESULT_FILE"
