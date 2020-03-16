/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "FlipperKitReactPlugin.h"

#import <FlipperKit/FlipperClient.h>

#import "Plugins.h"

void FlipperKitReactPluginInit(FlipperClient* client) {
  [client addPlugin:[FlipperKitReactPlugin new]];
}

#endif
