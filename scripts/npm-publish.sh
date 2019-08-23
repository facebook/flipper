#!/bin/bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the LICENSE file
# in the root directory of this source tree.

set -e

THIS_DIR=$(cd -P "$(dirname "$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")")" && pwd)
cd "$THIS_DIR/.."

# remove scripts section from package.json, because we don't want post-install scripts executed for plugin developers
jq 'del(.scripts)' package.json > package2.json
rm package.json
mv package2.json package.json

echo "//registry.yarnpkg.com/:_authToken=$(secrets_tool get FLIPPER_NPM_TOKEN)" > ~/.npmrc
../third-party/yarn/yarn publish --proxy http://fwdproxy:8080 --https-proxy http://fwdproxy:8080 --new-version "$1"
rm -rf ~/.npmrc
