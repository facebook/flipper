/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import <FlipperKit/FlipperPlugin.h>
#import <Foundation/Foundation.h>

@class FlipperClient;

@interface FlipperKitUIDebuggerPlugin : NSObject<FlipperPlugin>

@end

FB_EXTERN_C_BEGIN

void FlipperKitUIDebuggerAddPlugin(FlipperClient*);

FB_EXTERN_C_END

#endif
