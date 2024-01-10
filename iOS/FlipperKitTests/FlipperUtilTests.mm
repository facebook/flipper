/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <XCTest/XCTest.h>
#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/FlipperClient+Testing.h>
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperPlugin.h>
#import <FlipperKitTestUtils/BlockBasedSonarPlugin.h>
#import <FlipperKitTestUtils/FlipperResponderMock.h>
#import <FlipperTestLib/FlipperConnectionManagerMock.h>
#import <FlipperTestLib/FlipperPluginMock.h>
#import <folly/json.h>
#import <vector>

#import "FlipperPlugin.h"

@interface FlipperUtilTests : XCTestCase

@end

@implementation FlipperUtilTests {
  FlipperResponderMock* responder;
}

- (void)setUp {
  responder = [FlipperResponderMock new];
}

- (void)testPerformOnMainThreadSuccess {
  FlipperPerformBlockOnMainThread(
      ^{
      },
      responder);
  NSAssert([responder.successes count] == 0, @"No successes are output");
  NSAssert([responder.errors count] == 0, @"No errors are output");
}

- (void)testPerformOnMainThreadStdException {
  FlipperPerformBlockOnMainThread(
      ^{
        throw new std::exception();
      },
      responder);
  NSAssert([responder.successes count] == 0, @"No successes are output");
  NSAssert([responder.errors count] == 1, @"1 error is output");
}

- (void)testPerformOnMainThreadNSException {
  FlipperPerformBlockOnMainThread(
      ^{
        NSArray* a = [NSArray init];
        [a objectAtIndex:1];
      },
      responder);
  NSAssert([responder.successes count] == 0, @"No successes are output");
  NSAssert([responder.errors count] == 1, @"1 error is output");
}

@end
#endif
