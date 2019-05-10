#!/usr/bin/env bash
# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the LICENSE file
# in the root directory of this source tree.
set -e

pod trunk push ./scripts/Flipper.podspec --use-libraries --allow-warnings --verbose
pod trunk push ./scripts/FlipperKit.podspec --use-libraries --allow-warnings --verbose --skip-import-validation --swift-version=4.0
