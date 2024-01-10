/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <XCTest/XCTest.h>

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/FlipperClient.h>

@interface FlipperClientTests : XCTestCase
@end

@implementation FlipperClientTests

- (void)testStartingClientDoesntCrashOrHang {
  FlipperClient* client = [FlipperClient sharedClient];
  [client start];
}

@end

#endif
