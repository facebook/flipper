/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#import <XCTest/XCTest.h>
#if FB_SONARKIT_ENABLED

#import <FlipperKit/FlipperPlugin.h>
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperClient+Testing.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKitTestUtils/BlockBasedSonarPlugin.h>
#import <FlipperTestLib/FlipperResponderMock.h>
#import <FlipperTestLib/FlipperConnectionManagerMock.h>
#import <FlipperTestLib/FlipperPluginMock.h>
#import <folly/json.h>
#import <vector>

@interface FlipperClientTests : XCTestCase

@end

@implementation FlipperClientTests
facebook::flipper::FlipperClient *client;
facebook::flipper::test::FlipperConnectionManagerMock *socket;
FlipperClient *objcClient;

- (void)setUp {
    // Put setup code here. This method is called before the invocation of each test method in the class.
    socket = new facebook::flipper::test::FlipperConnectionManagerMock;
    auto state = std::make_shared<FlipperState>();

    client = new facebook::flipper::FlipperClient(std::unique_ptr<facebook::flipper::test::FlipperConnectionManagerMock>{socket}, state);
    objcClient = [[FlipperClient alloc] initWithCppClient:client];

}

- (void)tearDown {
    // Put teardown code here. This method is called after the invocation of each test method in the class.
    delete client;
}

- (void)testGetPlugin {

    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"cat" connect:nil disconnect:nil];
    BlockBasedSonarPlugin *dog = [[BlockBasedSonarPlugin alloc] initIdentifier:@"dog" connect:nil disconnect:nil];

    [objcClient addPlugin:cat];
    [objcClient addPlugin:dog];

    NSObject<FlipperPlugin> *retrievedPlugin = [objcClient pluginWithIdentifier:@"cat"];
    XCTAssertEqual(retrievedPlugin, cat);
    retrievedPlugin = [objcClient pluginWithIdentifier:@"dog"];
    XCTAssertEqual(retrievedPlugin, dog);
}


- (void)testRemovePlugin {
    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"cat" connect:nil disconnect:nil];

    [objcClient addPlugin:cat];
    [objcClient removePlugin:cat];

    folly::dynamic message = folly::dynamic::object("id", 1)("method", "getPlugins");

    std::vector<folly::dynamic> successes = std::vector<folly::dynamic>();
    std::vector<folly::dynamic> errors = std::vector<folly::dynamic>();
    std::unique_ptr<facebook::flipper::FlipperResponderMock> responder = std::make_unique<facebook::flipper::FlipperResponderMock>(&successes, &errors);
    socket->callbacks->onMessageReceived(message, std::move(responder));
    folly::dynamic expected = folly::dynamic::object("plugins", folly::dynamic::array());
    XCTAssertEqual(successes.size(), 1);
    XCTAssertEqual(errors.size(), 0);
    XCTAssertEqual(successes[0], expected);
}

- (void) testPluginActivatedInBackgroundMode {
    __block BOOL pluginConnected = NO;
    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"cat" connect:^(id<FlipperConnection>) {
        pluginConnected = YES;
    } disconnect:^{
        pluginConnected = NO;

    } runInBackground: YES];

    [objcClient addPlugin:cat];
    [objcClient start];
    XCTAssertTrue(pluginConnected);
}

- (void) testPluginNotActivatedInNonBackgroundMode {
    __block BOOL pluginConnected = NO;
    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"cat" connect:^(id<FlipperConnection>) {
        pluginConnected = YES;
    } disconnect:^{
        pluginConnected = NO;

    } runInBackground: NO];

    [objcClient addPlugin:cat];
    [objcClient start];
    XCTAssertFalse(pluginConnected);
}

- (void)testConnectAndDisconnectCallbackForNonBackgroundCase {
    __block BOOL pluginConnected = NO;
    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"cat" connect:^(id<FlipperConnection>) {
        pluginConnected = YES;
    } disconnect:^{
        pluginConnected = NO;
    } runInBackground: NO];

    [objcClient addPlugin:cat];
    [objcClient start];

    folly::dynamic messageInit = folly::dynamic::object("method", "init")("params", folly::dynamic::object("plugin", "cat"));
    std::unique_ptr<facebook::flipper::FlipperResponder> responder = std::make_unique<facebook::flipper::FlipperResponderMock>();

    socket->callbacks->onMessageReceived(messageInit, std::move(responder));
    XCTAssertTrue(pluginConnected);
    [objcClient stop];
    XCTAssertFalse(pluginConnected);
}

- (void)testConnectAndDisconnectCallbackForBackgroundCase {
    __block BOOL pluginConnected = YES;
    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"cat" connect:^(id<FlipperConnection>) {
        pluginConnected = YES;
    } disconnect:^{
        pluginConnected = NO;
    } runInBackground: YES];

    [objcClient addPlugin:cat];
    [objcClient start];
    XCTAssertTrue(pluginConnected);
    [objcClient stop];
    XCTAssertFalse(pluginConnected);
}

- (void)testCrashSuppressionInDidConnectCallback {
    __block BOOL pluginConnected = NO;
    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"cat" connect:^(id<FlipperConnection>) {
        pluginConnected = YES;
        NSArray *array = @[];
        [array objectAtIndex:10]; //This will throw an exception
    } disconnect:nil runInBackground: YES];

    [objcClient addPlugin:cat];
    // Since background plugin's didconnect is called as soon as flipper client starts
    XCTAssertNoThrow([objcClient start]);
    XCTAssertTrue(pluginConnected); // To be sure that connect block is called
}

- (void)testCrashSuppressionInDisconnectCallback {
    __block BOOL isCalled = NO;
    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"cat" connect:nil disconnect:^{
        isCalled = YES;
        NSArray *array = @[];
        [array objectAtIndex:10]; //This will throw an exception
    } runInBackground: YES];

    [objcClient addPlugin:cat];
    [objcClient start];

    XCTAssertNoThrow([objcClient stop]); // Stopping client will call disconnect of the plugin
    XCTAssertTrue(isCalled); // To be sure that connect block is called
}

- (void)testMethodBlockIsCalledNonBackgroundCase {
    __block BOOL isCalled = NO;

    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"PluginIdentifier" connect:^(id<FlipperConnection> connection) {

        [connection receive:@"MethodName" withBlock:^(NSDictionary * dict, id<FlipperResponder> responder) {
            isCalled = YES;
        }];
    } disconnect:nil];

    [objcClient addPlugin:cat];
    [objcClient start];

    folly::dynamic messageInit = folly::dynamic::object("method", "init")("params", folly::dynamic::object("plugin", "PluginIdentifier"));
    std::unique_ptr<facebook::flipper::FlipperResponder> responder1 = std::make_unique<facebook::flipper::FlipperResponderMock>();
    socket->callbacks->onMessageReceived(messageInit, std::move(responder1));
    folly::dynamic message = folly::dynamic::object("id", 1)("method", "execute")("params", folly::dynamic::object("api", "PluginIdentifier")("method", "MethodName"));
    std::unique_ptr<facebook::flipper::FlipperResponder> responder2 = std::make_unique<facebook::flipper::FlipperResponderMock>();

    socket->callbacks->onMessageReceived(message, std::move(responder2));

    XCTAssertTrue(isCalled);
}

- (void)testMethodBlockIsCalledBackgroundCase {
    __block BOOL isCalled = NO;

    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"PluginIdentifier" connect:^(id<FlipperConnection> connection) {

        [connection receive:@"MethodName" withBlock:^(NSDictionary * dict, id<FlipperResponder> responder) {
            isCalled = YES;
        }];
    } disconnect:nil runInBackground:YES];

    [objcClient addPlugin:cat];
    [objcClient start];

    folly::dynamic message = folly::dynamic::object("id", 1)("method", "execute")("params", folly::dynamic::object("api", "PluginIdentifier")("method", "MethodName"));
    std::unique_ptr<facebook::flipper::FlipperResponder> responder = std::make_unique<facebook::flipper::FlipperResponderMock>();
    socket->callbacks->onMessageReceived(message, std::move(responder));

    XCTAssertTrue(isCalled);
}

- (void)testExceptionSuppressionInMethodBlock {
    __block BOOL isCalled = NO;

    BlockBasedSonarPlugin *cat = [[BlockBasedSonarPlugin alloc] initIdentifier:@"PluginIdentifier" connect:^(id<FlipperConnection> connection) {

        [connection receive:@"MethodName" withBlock:^(NSDictionary * dict, id<FlipperResponder> responder) {
            isCalled = YES;
            NSArray *array = @[];
            [array objectAtIndex:10]; //This will throw an exception
        }];
    } disconnect:nil runInBackground:YES];

    [objcClient addPlugin:cat];
    [objcClient start];

    folly::dynamic message = folly::dynamic::object("id", 1)("method", "execute")("params", folly::dynamic::object("api", "PluginIdentifier")("method", "MethodName"));
    std::vector<folly::dynamic> successes = std::vector<folly::dynamic>();
    std::vector<folly::dynamic> errors = std::vector<folly::dynamic>();
    std::unique_ptr<facebook::flipper::FlipperResponderMock> responder = std::make_unique<facebook::flipper::FlipperResponderMock>(&successes, &errors);

    XCTAssertNoThrow(socket->callbacks->onMessageReceived(message, std::move(responder)));
    XCTAssertTrue(isCalled);
    XCTAssertEqual(successes.size(), 0);
    XCTAssertEqual(errors.size(), 1);
}

@end
#endif
