/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <XCTest/XCTest.h>

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/CppBridge/FlipperCppWrapperPlugin.h>
#import <FlipperKit/FlipperPlugin.h>

using facebook::flipper::FlipperCppWrapperPlugin;

@interface DummyPlugin : NSObject<FlipperPlugin>
@end

@implementation DummyPlugin
- (NSString*)identifier {
  return @"Dummy";
}
- (void)didConnect:(id<FlipperConnection>)connection {
}
- (void)didDisconnect {
}
@end

@interface FlipperCppBridgingTests : XCTestCase
@end

@implementation FlipperCppBridgingTests

- (void)testCppWrapperRetainsObjCPlugin {
  NSObject<FlipperPlugin>* dummyPlugin = [DummyPlugin new];
  auto retainCountBefore = CFGetRetainCount((void*)dummyPlugin);
  FlipperCppWrapperPlugin wrapperPlugin(dummyPlugin);
  auto retainCountAfter = CFGetRetainCount((void*)dummyPlugin);
  XCTAssertTrue(retainCountAfter > retainCountBefore);
}

@end

#endif
