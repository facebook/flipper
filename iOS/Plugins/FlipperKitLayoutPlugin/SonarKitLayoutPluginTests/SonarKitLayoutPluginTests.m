/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <XCTest/XCTest.h>

#if FB_SONARKIT_ENABLED

#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitLayoutPlugin/SKDescriptorMapper.h>
#import <FlipperKitLayoutPlugin/SKNodeDescriptor.h>
#import <FlipperKitTestUtils/FlipperConnectionMock.h>
#import <FlipperKitTestUtils/FlipperResponderMock.h>

#import "SKTapListenerMock.h"
#import "TestNode.h"
#import "TestNodeDescriptor.h"

@interface SonarKitLayoutPluginTests : XCTestCase
@end

@implementation SonarKitLayoutPluginTests {
  SKDescriptorMapper* _descriptorMapper;
}

- (void)setUp {
  [super setUp];

  _descriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];

  [_descriptorMapper registerDescriptor:[TestNodeDescriptor new]
                               forClass:[TestNode class]];
}

- (void)testGetRoot {
  FlipperKitLayoutPlugin* plugin = [[FlipperKitLayoutPlugin alloc]
          initWithRootNode:[[TestNode alloc] initWithName:@"rootNode"]
           withTapListener:nil
      withDescriptorMapper:_descriptorMapper];

  FlipperConnectionMock* connection = [FlipperConnectionMock new];
  FlipperResponderMock* responder = [FlipperResponderMock new];
  [plugin didConnect:connection];

  SonarReceiver receiver = connection.receivers[@"getRoot"];
  receiver(@{}, responder);

  XCTAssertTrue(([responder.successes containsObject:@{
    @"id" : @"rootNode",
    @"name" : @"TestNode",
    @"children" : @[],
    @"attributes" : @[],
    @"data" : @{},
    @"extraInfo" : @{},
    @"decoration" : @"",
  }]));
}

- (void)testGetEmptyNodes {
  FlipperKitLayoutPlugin* plugin = [FlipperKitLayoutPlugin new];
  FlipperConnectionMock* connection = [FlipperConnectionMock new];
  FlipperResponderMock* responder = [FlipperResponderMock new];
  [plugin didConnect:connection];

  SonarReceiver receiver = connection.receivers[@"getNodes"];
  receiver(@{@"ids" : @[]}, responder);

  dispatch_barrier_sync(
      SKLayoutPluginSerialBackgroundQueue(),
      ^{
      });

  XCTAssertTrue(([responder.successes containsObject:@{@"elements" : @[]}]));
}

- (void)testGetNodes {
  TestNode* rootNode = [[TestNode alloc] initWithName:@"rootNode"];
  NSArray* childNodes = @[
    [[TestNode alloc] initWithName:@"testNode1"],
    [[TestNode alloc] initWithName:@"testNode2"],
    [[TestNode alloc] initWithName:@"testNode3"],
  ];

  rootNode.children = childNodes;

  FlipperKitLayoutPlugin* plugin =
      [[FlipperKitLayoutPlugin alloc] initWithRootNode:rootNode
                                       withTapListener:nil
                                  withDescriptorMapper:_descriptorMapper];

  FlipperConnectionMock* connection = [FlipperConnectionMock new];
  FlipperResponderMock* responder = [FlipperResponderMock new];
  [plugin didConnect:connection];

  // Ensure that nodes are tracked
  connection.receivers[@"getRoot"](@{}, responder);

  SonarReceiver receiver = connection.receivers[@"getNodes"];
  receiver(
      @{@"ids" : @[ @"testNode1", @"testNode2", @"testNode3" ]}, responder);

  dispatch_barrier_sync(
      SKLayoutPluginSerialBackgroundQueue(),
      ^{
      });

  XCTAssertTrue(([responder.successes containsObject:@{
    @"elements" : @[
      @{
        @"id" : @"testNode1",
        @"name" : @"TestNode",
        @"children" : @[],
        @"attributes" : @[],
        @"data" : @{},
        @"extraInfo" : @{},
        @"decoration" : @"",
      },
      @{
        @"id" : @"testNode2",
        @"name" : @"TestNode",
        @"children" : @[],
        @"attributes" : @[],
        @"data" : @{},
        @"extraInfo" : @{},
        @"decoration" : @"",
      },
      @{
        @"id" : @"testNode3",
        @"name" : @"TestNode",
        @"children" : @[],
        @"attributes" : @[],
        @"data" : @{},
        @"extraInfo" : @{},
        @"decoration" : @"",
      },
    ]
  }]));
}

- (void)testSetHighlighted {
  TestNode* rootNode = [[TestNode alloc] initWithName:@"rootNode"];

  TestNode* testNode1 = [[TestNode alloc] initWithName:@"testNode1"];
  TestNode* testNode2 = [[TestNode alloc] initWithName:@"testNode2"];
  NSArray* childNodes = @[ testNode1, testNode2 ];

  rootNode.children = childNodes;

  FlipperKitLayoutPlugin* plugin =
      [[FlipperKitLayoutPlugin alloc] initWithRootNode:rootNode
                                       withTapListener:nil
                                  withDescriptorMapper:_descriptorMapper];

  FlipperConnectionMock* connection = [FlipperConnectionMock new];
  FlipperResponderMock* responder = [FlipperResponderMock new];
  [plugin didConnect:connection];

  // Setup in order to track nodes successfully
  connection.receivers[@"getRoot"](@{}, responder);
  SonarReceiver getNodesCall = connection.receivers[@"getNodes"];
  getNodesCall(@{@"ids" : @[ @"testNode1", @"testNode2" ]}, responder);

  dispatch_barrier_sync(
      SKLayoutPluginSerialBackgroundQueue(),
      ^{
      });

  SonarReceiver setHighlighted = connection.receivers[@"setHighlighted"];
  setHighlighted(@{@"id" : @"testNode2"}, responder);

  XCTAssertTrue(testNode2.highlighted);

  setHighlighted(@{@"id" : @"testNode1"}, responder);

  // Ensure that old highlight was removed
  XCTAssertTrue(testNode1.highlighted && !testNode2.highlighted);
}

- (void)testSetSearchActive {
  TestNode* rootNode = [[TestNode alloc] initWithName:@"rootNode"
                                            withFrame:CGRectMake(0, 0, 20, 60)];

  TestNode* testNode1 =
      [[TestNode alloc] initWithName:@"testNode1"
                           withFrame:CGRectMake(20, 20, 20, 20)];
  TestNode* testNode2 =
      [[TestNode alloc] initWithName:@"testNode2"
                           withFrame:CGRectMake(20, 40, 20, 20)];
  TestNode* testNode3 =
      [[TestNode alloc] initWithName:@"testNode3"
                           withFrame:CGRectMake(25, 42, 5, 5)];

  rootNode.children = @[ testNode1, testNode2 ];
  testNode2.children = @[ testNode3 ];

  SKTapListenerMock* tapListener = [SKTapListenerMock new];
  FlipperKitLayoutPlugin* plugin =
      [[FlipperKitLayoutPlugin alloc] initWithRootNode:rootNode
                                       withTapListener:tapListener
                                  withDescriptorMapper:_descriptorMapper];

  FlipperConnectionMock* connection = [FlipperConnectionMock new];
  FlipperResponderMock* responder = [FlipperResponderMock new];
  [plugin didConnect:connection];

  connection.receivers[@"setSearchActive"](@{@"active" : @YES}, responder);

  // Fake a tap at `testNode3`
  [tapListener tapAt:(CGPoint){26, 43}];

  NSLog(@"%@", connection.sent[@"select"]);
  XCTAssertTrue(([connection.sent[@"select"] containsObject:@{
    @"path" : @[ @"testNode2", @"testNode3" ],
    @"tree" : @{@"testNode2" : @{@"testNode3" : @{}}}
  }]));
}

- (void)testSetSearchActiveMountAndUnmount {
  TestNode* rootNode = [[TestNode alloc] initWithName:@"rootNode"];

  SKTapListenerMock* tapListener = [SKTapListenerMock new];
  FlipperKitLayoutPlugin* plugin =
      [[FlipperKitLayoutPlugin alloc] initWithRootNode:rootNode
                                       withTapListener:tapListener
                                  withDescriptorMapper:_descriptorMapper];

  FlipperConnectionMock* connection = [FlipperConnectionMock new];
  FlipperResponderMock* responder = [FlipperResponderMock new];
  [plugin didConnect:connection];

  SonarReceiver setSearchActive = connection.receivers[@"setSearchActive"];
  setSearchActive(@{@"active" : @YES}, responder);

  XCTAssertTrue(tapListener.isMounted);

  setSearchActive(@{@"active" : @NO}, responder);
  XCTAssertTrue(!tapListener.isMounted);
}

- (void)testSetData {
  TestNode* rootNode = [[TestNode alloc] initWithName:@"rootNode"
                                            withFrame:CGRectMake(0, 0, 20, 60)];

  TestNode* testNode1 =
      [[TestNode alloc] initWithName:@"testNode1"
                           withFrame:CGRectMake(20, 20, 20, 20)];
  TestNode* testNode2 =
      [[TestNode alloc] initWithName:@"testNode2"
                           withFrame:CGRectMake(20, 40, 20, 20)];
  TestNode* testNode3 =
      [[TestNode alloc] initWithName:@"testNode3"
                           withFrame:CGRectMake(25, 42, 5, 5)];

  rootNode.children = @[ testNode1, testNode2 ];
  testNode2.children = @[ testNode3 ];

  SKTapListenerMock* tapListener = [SKTapListenerMock new];
  FlipperKitLayoutPlugin* plugin =
      [[FlipperKitLayoutPlugin alloc] initWithRootNode:rootNode
                                       withTapListener:tapListener
                                  withDescriptorMapper:_descriptorMapper];

  FlipperConnectionMock* connection = [FlipperConnectionMock new];
  FlipperResponderMock* responder = [FlipperResponderMock new];
  [plugin didConnect:connection];

  // Setup in order to track nodes successfully
  connection.receivers[@"getRoot"](@{}, responder);
  connection.receivers[@"getNodes"](@{@"ids" : @[ @"testNode2" ]}, responder);

  dispatch_barrier_sync(
      SKLayoutPluginSerialBackgroundQueue(),
      ^{
      });

  // Modify the name of testNode3
  connection.receivers[@"setData"](
      @{
        @"id" : @"testNode3",
        @"path" : @[ @"TestNode", @"name" ],
        @"value" : @"changedNameForTestNode3",
      },
      responder);

  XCTAssertTrue(
      [testNode3.nodeName isEqualToString:@"changedNameForTestNode3"]);
}

@end

#endif
