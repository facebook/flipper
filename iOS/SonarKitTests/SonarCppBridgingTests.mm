/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <XCTest/XCTest.h>

#if FB_SONARKIT_ENABLED

#import <SonarKit/SonarCppWrapperPlugin.h>
#import <SonarKit/SonarPlugin.h>

using facebook::sonar::SonarCppWrapperPlugin;

@interface DummyPlugin : NSObject <SonarPlugin>
@end

@implementation DummyPlugin
- (NSString *)identifier { return @"Dummy"; }
- (void)didConnect:(id<SonarConnection>)connection {}
- (void)didDisconnect {}
@end

@interface SonarCppBridgingTests : XCTestCase
@end

@implementation SonarCppBridgingTests

- (void)testCppWrapperRetainsObjCPlugin {
  NSObject<SonarPlugin> *dummyPlugin = [DummyPlugin new];
  auto retainCountBefore = CFGetRetainCount((void *)dummyPlugin);
  SonarCppWrapperPlugin wrapperPlugin(dummyPlugin);
  auto retainCountAfter = CFGetRetainCount((void *)dummyPlugin);
  XCTAssertTrue(retainCountAfter > retainCountBefore);
}

@end

#endif
