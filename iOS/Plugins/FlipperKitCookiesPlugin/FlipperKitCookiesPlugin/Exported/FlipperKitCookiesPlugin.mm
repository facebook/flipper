/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <WebKit/WebKit.h>

#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>
#import "FlipperKitCookiesPlugin.h"
#import "Plugins.h"

@interface FlipperKitCookiesPlugin ()<WKHTTPCookieStoreObserver>
@end

@implementation FlipperKitCookiesPlugin {
  id<FlipperConnection> _connection;
  NSArray<NSHTTPCookie*>* _previousCookies;
}

- (NSString*)identifier {
  return @"cookies";
}

- (void)didConnect:(id<FlipperConnection>)connection {
  __weak __typeof(self) weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    [weakSelf _didConnect:connection];
  });
}

- (void)didDisconnect {
  __weak __typeof(self) weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    [weakSelf _didDisconnect];
  });
}

#pragma mark - NSHTTP Cookie storage observer

- (void)onNSHTTPCookieStorageChange:(NSNotification*)notification {
  __weak __typeof(self) weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    [weakSelf _refreshCookies];
  });
}

#pragma mark - WKHTTPCookieStoreObserver

- (void)cookiesDidChangeInCookieStore:(WKHTTPCookieStore*)cookieStore {
  __weak __typeof(self) weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    [weakSelf _refreshCookies];
  });
}

#pragma mark - helper

- (void)_didConnect:(id<FlipperConnection>)connection {
  self->_connection = connection;

  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(onNSHTTPCookieStorageChange:)
             name:NSHTTPCookieManagerCookiesChangedNotification
           object:nil];
  [[[WKWebsiteDataStore defaultDataStore] httpCookieStore] addObserver:self];
  [self _refreshCookies];
}

- (void)_didDisconnect {
  self->_connection = nil;
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [[[WKWebsiteDataStore defaultDataStore] httpCookieStore] removeObserver:self];
  _previousCookies = nil;
}

- (void)_refreshCookies {
  // get Cookies from NS
  NSArray<NSHTTPCookie*>* _Nullable NSCookies =
      [[NSHTTPCookieStorage sharedHTTPCookieStorage] cookies];

  // get Cookies from WebKit
  [[[WKWebsiteDataStore defaultDataStore] httpCookieStore]
      getAllCookies:^(NSArray<NSHTTPCookie*>* WKCookies) {
        // combine and sort cookies based on name - preferring WK
        NSMutableDictionary<NSString*, NSHTTPCookie*>* cookies =
            [NSMutableDictionary dictionary];
        for (NSHTTPCookie* cookie in NSCookies) {
          cookies[cookie.name] = cookie;
        }
        for (NSHTTPCookie* cookie in WKCookies) {
          cookies[cookie.name] = cookie;
        }
        NSArray<NSHTTPCookie*>* sortedCookies = [cookies.allValues
            sortedArrayUsingComparator:^NSComparisonResult(
                NSHTTPCookie* cookie1, NSHTTPCookie* cookie2) {
              return [cookie1.name compare:cookie2.name];
            }];

        [self _sendCookies:sortedCookies];
      }];
}

- (void)_sendCookies:(NSArray*)sortedCookies {
  if ([_previousCookies isEqualToArray:sortedCookies]) {
    return;
  }

  // deliver to flipper
  [_connection send:@"resetCookies" withParams:@{}];
  NSInteger rowid = 1;
  for (NSHTTPCookie* cookie in sortedCookies) {
    NSMutableDictionary<NSString*, id>* dict = [NSMutableDictionary dictionary];
    dict[@"id"] = @(rowid++);
    dict[@"Name"] = cookie.name;
    dict[@"Expires"] = cookie.expiresDate.description;
    dict[@"Value"] = cookie.value;
    [_connection send:@"addCookie" withParams:dict];
  }

  _previousCookies = sortedCookies.copy;
}

@end

void FlipperKitCookiesPluginInit(FlipperClient* client) {
  [client addPlugin:[FlipperKitCookiesPlugin new]];
}

#endif
