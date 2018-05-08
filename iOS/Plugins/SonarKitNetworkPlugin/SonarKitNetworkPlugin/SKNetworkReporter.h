/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <Foundation/Foundation.h>

struct RequestInfo {
  int64_t identifier;
  uint64_t timestamp;
  NSURLRequest *request;
  NSString *body;

  void setBody(NSData *data) {
    body = data ? [data base64EncodedStringWithOptions: 0]
    : [request.HTTPBody base64EncodedStringWithOptions: 0];
  }
};

struct ResponseInfo {
  int64_t identifier;
  uint64_t timestamp;
  NSURLResponse *response;
  NSString *body;

  bool shouldStripReponseBody() {
    NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse*)response;
    NSString *contentType = httpResponse.allHeaderFields[@"content-type"];
    if (!contentType) {
      return NO;
    }

    return [contentType containsString:@"image/"] ||
    [contentType containsString:@"video/"] ||
    [contentType containsString:@"application/zip"];
  }

  void setBody(NSData *data) {
    body = shouldStripReponseBody() ? nil : [data base64EncodedStringWithOptions: 0];
  }

};

@protocol SKNetworkReporterDelegate

- (void)didObserveRequest:(RequestInfo)request;
- (void)didObserveResponse:(ResponseInfo)response;

@end

@protocol SKNetworkAdapterDelegate

@property (weak, nonatomic) id<SKNetworkReporterDelegate> delegate;

@end
