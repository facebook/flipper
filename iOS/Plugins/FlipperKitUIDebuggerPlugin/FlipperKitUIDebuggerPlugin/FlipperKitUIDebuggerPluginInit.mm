/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/FlipperClient.h>
#import "FlipperKitUIDebuggerPlugin.h"
#import "UIDContext.h"
#import "UIDDescriptorRegister.h"
#import "UIDTreeObserverFactory.h"

@interface FlipperKitUIDebuggerPlugin ()
- (instancetype)initWithContext:(UIDContext*)context;
@end

#ifdef __cplusplus
extern "C" {
#endif
void FlipperKitUIDebuggerAddPlugin(FlipperClient* client) {
  UIDContext* context = [[UIDContext alloc]
      initWithApplication:[UIApplication sharedApplication]
       descriptorRegister:[UIDDescriptorRegister defaultRegister]
          observerFactory:[UIDTreeObserverFactory shared]];
  FlipperKitUIDebuggerPlugin* plugin =
      [[FlipperKitUIDebuggerPlugin alloc] initWithContext:context];

  [client addPlugin:plugin];
}
#ifdef __cplusplus
}
#endif

#endif
