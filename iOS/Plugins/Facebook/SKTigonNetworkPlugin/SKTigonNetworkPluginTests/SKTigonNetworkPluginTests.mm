// Copyright 2004-present Facebook. All Rights Reserved.

#if FB_SONARKIT_ENABLED

#import <XCTest/XCTest.h>

#import <WebKit/WebKit.h>
#import <Foundation/NSURLResponse.h>

#import <SonarKitTestUtils/SonarConnectionMock.h>
#import <SKTigonNetworkPluginTestUtils/SKTigonNetworkPluginMock.h>
#import <SonarKitNetworkPlugin/SonarKitNetworkPlugin.h>
#import <SKTigonNetworkPlugin/SKTigonObserver.h>
#import <SKTigonNetworkPlugin/SKTigonAdapter.h>

static BOOL isResponseStrippedForContentType(NSString *contentType)
{
  SKTigonNetworkPluginMock *plugin = [[SKTigonNetworkPluginMock alloc] initWithNetworkAdapter:[SKTigonAdapter new]];
  SonarConnectionMock *connection = [SonarConnectionMock new];
  [plugin didConnect: connection];
  id<SKNetworkReporterDelegate> delegate = (id<SKNetworkReporterDelegate>)plugin;

  NSURL *url = [NSURL URLWithString: @"http://fakeurl"];
  NSURLResponse *response = [[NSHTTPURLResponse alloc] initWithURL: url
                                                        statusCode: 200
                                                       HTTPVersion: @"1.1"
                                                      headerFields: @{
                                                                    @"content-type": contentType
                                                                     }];

  FBMonotonicTimeMilliseconds responseTimestamp = FBMonotonicTimeGetCurrentMilliseconds();
  NSData *responseBody = [@"some-response-data" dataUsingEncoding: NSUTF8StringEncoding];

  ResponseInfo responseInfo = {
    .identifier = 1,
    .timestamp = responseTimestamp,
    .response = response,
    .body = nil,
  };
  responseInfo.setBody(responseBody);

  [delegate didObserveResponse:responseInfo];
  id data = connection.sent[@"newResponse"][0][@"data"];

  return [data isEqual:[NSNull null]];
}

static FBMonotonicTimeMilliseconds sendRequestInfoForIdentifier(NSInteger identifier, NSData *requestBody, SonarKitNetworkPlugin *plugin)
{
  id<SKNetworkReporterDelegate> delegate = (id<SKNetworkReporterDelegate>)plugin;
  NSURL *url = [NSURL URLWithString: @"http://fakeurl"];
  NSMutableURLRequest *request = [[NSURLRequest requestWithURL: url] mutableCopy];
  [request setHTTPMethod: @"POST"];
  [request addValue: @"somevalue" forHTTPHeaderField:@"some-header-field"];

  FBMonotonicTimeMilliseconds requestTimestamp = FBMonotonicTimeGetCurrentMilliseconds();

  RequestInfo requestInfo = {
    .identifier = identifier,
    .timestamp = requestTimestamp,
    .request = request,
    .body = nil,
  };
  requestInfo.setBody(requestBody);
  [delegate didObserveRequest:requestInfo];
  return requestTimestamp;
}

@interface SKTigonNetworkPluginTests : XCTestCase
@end

@implementation SKTigonNetworkPluginTests

- (void)testPluginIsObserverDelegate
{
  SonarKitNetworkPlugin *plugin = [[SKTigonNetworkPluginMock alloc] initWithNetworkAdapter:[SKTigonAdapter new]];
  XCTAssertTrue([plugin conformsToProtocol: @protocol(SKNetworkReporterDelegate)], @"SKTigonNetworkPlugin should conform to SKTigonObserverDelegate");
}

- (void)testObserveRequest
{
  SKTigonNetworkPluginMock *plugin = [[SKTigonNetworkPluginMock alloc] initWithNetworkAdapter:[SKTigonAdapter new]];
  SonarConnectionMock *connection = [SonarConnectionMock new];
  [plugin didConnect: connection];
  id<SKNetworkReporterDelegate> delegate = (id<SKNetworkReporterDelegate>)plugin;

  NSURL *url = [NSURL URLWithString: @"http://fakeurl"];
  NSMutableURLRequest *request = [[NSURLRequest requestWithURL: url] mutableCopy];
  [request setHTTPMethod: @"POST"];
  [request addValue: @"somevalue" forHTTPHeaderField:@"some-header-field"];

  FBMonotonicTimeMilliseconds requestTimestamp = FBMonotonicTimeGetCurrentMilliseconds();
  NSData *requestBody = [@"some-request-data" dataUsingEncoding: NSUTF8StringEncoding];

  RequestInfo requestInfo = {
    .identifier = 1,
    .timestamp = requestTimestamp,
    .request = request,
    .body = nil,
  };
  requestInfo.setBody(requestBody);

  [delegate didObserveRequest:requestInfo];

  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @1,
                                    @"timestamp": @(requestTimestamp),
                                    @"method": @"POST",
                                    @"url": @"http://fakeurl",
                                    @"headers": @[ @{
                                                     @"key": @"some-header-field",
                                                     @"value": @"somevalue"
                                                     }],
                                    @"data": [requestBody base64EncodedStringWithOptions: 0]
                                    }]));
}

- (void)testObserveRequestWithCache {
  SKTigonNetworkPluginMock *plugin = [[SKTigonNetworkPluginMock alloc] initWithNetworkAdapter:[SKTigonAdapter new]];
  NSData *requestBody = [@"some-request-data" dataUsingEncoding: NSUTF8StringEncoding];
  FBMonotonicTimeMilliseconds timestamp1 = sendRequestInfoForIdentifier(1, requestBody, plugin);
  FBMonotonicTimeMilliseconds timestamp2 = sendRequestInfoForIdentifier(2, requestBody, plugin);
  FBMonotonicTimeMilliseconds timestamp3 = sendRequestInfoForIdentifier(3, requestBody, plugin);
  SonarConnectionMock *connection = [SonarConnectionMock new];
  [plugin didConnect: connection];
  FBMonotonicTimeMilliseconds timestamp4 = sendRequestInfoForIdentifier(4, requestBody, plugin);

  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @1,
                                    @"timestamp": @(timestamp1),
                                    @"method": @"POST",
                                    @"url": @"http://fakeurl",
                                    @"headers": @[ @{
                                                     @"key": @"some-header-field",
                                                     @"value": @"somevalue"
                                                     }],
                                    @"data": [requestBody base64EncodedStringWithOptions: 0]
                                    }]));
  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @2,
                                    @"timestamp": @(timestamp2),
                                    @"method": @"POST",
                                    @"url": @"http://fakeurl",
                                    @"headers": @[ @{
                                                     @"key": @"some-header-field",
                                                     @"value": @"somevalue"
                                                     }],
                                    @"data": [requestBody base64EncodedStringWithOptions: 0]
                                    }]));
  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @3,
                                    @"timestamp": @(timestamp3),
                                    @"method": @"POST",
                                    @"url": @"http://fakeurl",
                                    @"headers": @[ @{
                                                     @"key": @"some-header-field",
                                                     @"value": @"somevalue"
                                                     }],
                                    @"data": [requestBody base64EncodedStringWithOptions: 0]
                                    }]));
  XCTAssertTrue(([connection.sent[@"newRequest"]
                  containsObject: @{
                                    @"id": @4,
                                    @"timestamp": @(timestamp4),
                                    @"method": @"POST",
                                    @"url": @"http://fakeurl",
                                    @"headers": @[ @{
                                                     @"key": @"some-header-field",
                                                     @"value": @"somevalue"
                                                     }],
                                    @"data": [requestBody base64EncodedStringWithOptions: 0]
                                    }]));
}

- (void)testStripBinaryResponse
{
  XCTAssertTrue(isResponseStrippedForContentType(@"image/jpeg"));
  XCTAssertTrue(isResponseStrippedForContentType(@"image/jpg"));
  XCTAssertTrue(isResponseStrippedForContentType(@"image/png"));
  XCTAssertTrue(isResponseStrippedForContentType(@"video/mp4"));
  XCTAssertTrue(isResponseStrippedForContentType(@"application/zip"));
}

@end

#endif
