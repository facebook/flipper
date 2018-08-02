// Copyright 2004-present Facebook. All Rights Reserved.

#if FB_SONARKIT_ENABLED

#import <XCTest/XCTest.h>

#import <SonarKitNetworkPlugin/SonarKitNetworkPlugin.h>
#import <SonarKitTestUtils/SonarConnectionMock.h>
#import <SKTigonNetworkPlugin/SKTigonObserver.h>
#import <SKTigonNetworkPluginTestUtils/SKDispatchQueueMock.h>

static FBMonotonicTimeMilliseconds sendRequestInfoForIdentifier(NSInteger identifier, SKBufferingPlugin *plugin)
{
  FBMonotonicTimeMilliseconds requestTimestamp = FBMonotonicTimeGetCurrentMilliseconds();

  [plugin send:@"newRequest" sonarObject:@{
    @"id": @(identifier),
    @"timestamp": @(requestTimestamp),
  }];

  return requestTimestamp;
}

@interface SKBufferingPluginTests : XCTestCase

@end

@implementation SKBufferingPluginTests

- (void)testCacheAfterSuccessfulConnection {
  SKBufferingPlugin *plugin = [[SKBufferingPlugin alloc] initWithQueue:std::make_shared<facebook::sonar::SyncQueue>()];

  FBMonotonicTimeMilliseconds timestamp1 = sendRequestInfoForIdentifier(1, plugin);
  FBMonotonicTimeMilliseconds timestamp2 = sendRequestInfoForIdentifier(2, plugin);
  SonarConnectionMock *connection = [SonarConnectionMock new];
  [plugin didConnect: connection];
  FBMonotonicTimeMilliseconds timestamp3 = sendRequestInfoForIdentifier(3, plugin);

  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @1,
                                    @"timestamp": @(timestamp1),
                                    }]));
  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @2,
                                    @"timestamp": @(timestamp2),
                                    }]));
  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @3,
                                    @"timestamp": @(timestamp3),
                                    }]));
}

- (void)testCacheAfterDisconnection {
  SKBufferingPlugin *plugin = [[SKBufferingPlugin alloc] initWithQueue:std::make_shared<facebook::sonar::SyncQueue>()];

  FBMonotonicTimeMilliseconds timestamp1 = sendRequestInfoForIdentifier(1, plugin);
  SonarConnectionMock *connection = [SonarConnectionMock new];
  [plugin didConnect: connection];
  FBMonotonicTimeMilliseconds timestamp2 = sendRequestInfoForIdentifier(2, plugin);
  [plugin didDisconnect];
  connection.connected = NO;
  FBMonotonicTimeMilliseconds timestamp3 = sendRequestInfoForIdentifier(3, plugin);

  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @1,
                                    @"timestamp": @(timestamp1),
                                    }]));
  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @2,
                                    @"timestamp": @(timestamp2),
                                    }]));
  XCTAssertFalse(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @3,
                                    @"timestamp": @(timestamp3),
                                    }]));
}

- (void)testCacheAfterDisconnectionAndConnection {
  SKBufferingPlugin *plugin = [[SKBufferingPlugin alloc] initWithQueue:std::make_shared<facebook::sonar::SyncQueue>()];

  FBMonotonicTimeMilliseconds timestamp1 = sendRequestInfoForIdentifier(1, plugin);
  SonarConnectionMock *connection = [SonarConnectionMock new];
  [plugin didConnect: connection];
  FBMonotonicTimeMilliseconds timestamp2 = sendRequestInfoForIdentifier(2, plugin);
  [plugin didDisconnect];
  connection.connected = NO;
  FBMonotonicTimeMilliseconds timestamp3 = sendRequestInfoForIdentifier(3, plugin);
  connection.connected = YES;
  [plugin didConnect: connection];

  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @1,
                                    @"timestamp": @(timestamp1),
                                    }]));
  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @2,
                                    @"timestamp": @(timestamp2),
                                    }]));
  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @3,
                                    @"timestamp": @(timestamp3),
                                    }]));
}

- (void)testLossOfEventsDueToDisconnection {
  auto queue = std::make_shared<facebook::sonar::SyncQueue>();
  SKBufferingPlugin *plugin = [[SKBufferingPlugin alloc] initWithQueue:queue];
  FBMonotonicTimeMilliseconds timestamp1 = sendRequestInfoForIdentifier(1, plugin);
  queue->suspend();
  FBMonotonicTimeMilliseconds timestamp2 = sendRequestInfoForIdentifier(2, plugin);
  SonarConnectionMock *connection = [SonarConnectionMock new];
  [plugin didConnect: connection];
  [plugin didDisconnect];
  connection.connected = NO;
  queue->resume();
  XCTAssertFalse(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @1,
                                    @"timestamp": @(timestamp1),
                                    }]));
  XCTAssertFalse(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @2,
                                    @"timestamp": @(timestamp2),
                                    }]));
}

- (void)testCacheInQueueSuspension {
  auto queue = std::make_shared<facebook::sonar::SyncQueue>();
  SKBufferingPlugin *plugin = [[SKBufferingPlugin alloc] initWithQueue:queue];
  FBMonotonicTimeMilliseconds timestamp1 = sendRequestInfoForIdentifier(1, plugin);
  queue->suspend();
  FBMonotonicTimeMilliseconds timestamp2 = sendRequestInfoForIdentifier(2, plugin);
  SonarConnectionMock *connection = [SonarConnectionMock new];
  [plugin didConnect: connection];
  queue->resume();
  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @1,
                                    @"timestamp": @(timestamp1),
                                    }]));
  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @2,
                                    @"timestamp": @(timestamp2),
                                    }]));
}

@end

#endif
