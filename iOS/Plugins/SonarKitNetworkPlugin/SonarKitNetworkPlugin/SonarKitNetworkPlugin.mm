/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED
#import "SonarKitNetworkPlugin.h"
#import "SKNetworkReporter.h"

@interface SonarKitNetworkPlugin ()

@end

@implementation SonarKitNetworkPlugin

- (void)setAdapter:(id<SKNetworkAdapterDelegate>)adapter {
  _adapter = adapter;
  _adapter.delegate = self;
}

- (instancetype)init {
  if (self = [super initWithQueue:std::make_shared<facebook::sonar::GCDQueue>(dispatch_queue_create("com.sonarkit.network.buffer", DISPATCH_QUEUE_SERIAL))]) {
  }
  return self;
}

- (instancetype)initWithNetworkAdapter:(id<SKNetworkAdapterDelegate>)adapter {
  if (self = [super initWithQueue:std::make_shared<facebook::sonar::GCDQueue>(dispatch_queue_create("com.sonarkit.network.buffer", DISPATCH_QUEUE_SERIAL))]) {
    adapter.delegate = self;
    _adapter = adapter;
  }
  return self;
}

- (instancetype)initWithNetworkAdapter:(id<SKNetworkAdapterDelegate>)adapter queue:(const std::shared_ptr<facebook::sonar::DispatchQueue> &)queue; {
  if (self = [super initWithQueue:queue]) {
    adapter.delegate = self;
    _adapter = adapter;
  }
  return self;
}

#pragma mark - SKNetworkReporterDelegate


- (void)didObserveRequest:(RequestInfo)request;
{
  NSMutableArray<NSDictionary<NSString *, id> *> *headers = [NSMutableArray new];
  for (NSString *key in [request.request.allHTTPHeaderFields allKeys]) {
    NSDictionary<NSString *, id> *header = @{
                                             @"key": key,
                                             @"value": request.request.allHTTPHeaderFields[key]
                                            };
    [headers addObject: header];
  }

  NSString *body = request.body;

  [self send:@"newRequest"
 sonarObject:@{
               @"id": @(request.identifier),
               @"timestamp": @(request.timestamp),
               @"method": request.request.HTTPMethod ?: [NSNull null],
               @"url": [request.request.URL absoluteString] ?: [NSNull null],
               @"headers": headers,
               @"data": body ? body : [NSNull null]
               }];
}

- (void)didObserveResponse:(ResponseInfo)response
{
  NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse*)response.response;

  NSMutableArray<NSDictionary<NSString *, id> *> *headers = [NSMutableArray new];
  for (NSString *key in [httpResponse.allHeaderFields allKeys]) {
    NSDictionary<NSString *, id> *header = @{
                                             @"key": key,
                                             @"value": httpResponse.allHeaderFields[key]
                                            };
    [headers addObject: header];
  }

  NSString *body = response.body;

  [self send:@"newResponse"
 sonarObject:@{
               @"id": @(response.identifier),
               @"timestamp": @(response.timestamp),
               @"status": @(httpResponse.statusCode),
               @"reason": [NSHTTPURLResponse localizedStringForStatusCode: httpResponse.statusCode] ?: [NSNull null],
               @"headers": headers,
               @"data": body ? body : [NSNull null]
               }];

}

@end

#endif
