/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "FlipperKitCookiesPlugin.h"
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>
#import "Plugins.h"

@implementation FlipperKitCookiesPlugin {
  id<FlipperConnection> _connection;
}

- (NSString*)identifier {
  return @"cookies";
}

- (void)didConnect:(id<FlipperConnection>)connection {
  _connection = connection;
  [self _sendCookies];

  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(onCookieStorageChange:)
             name:NSHTTPCookieManagerCookiesChangedNotification
           object:nil];
}

- (void)didDisconnect {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  _connection = nil;
}

#pragma mark - cookie storage observer

- (void)onCookieStorageChange:(NSNotification*)notification {
  [self _sendCookies];
}

#pragma mark - helper

- (void)_sendCookies {
  [_connection send:@"resetCookies" withParams:@{}];

  NSInteger i = 1;
  NSArray<NSHTTPCookie*>* _Nullable cookies =
      [[[NSHTTPCookieStorage sharedHTTPCookieStorage] cookies] copy];
  for (NSHTTPCookie* cookie in cookies) {
    NSMutableDictionary<NSString*, id>* dict = [NSMutableDictionary dictionary];
    dict[@"id"] = @(i);
    dict[@"Name"] = cookie.name;
    dict[@"Expires"] = cookie.expiresDate.description;
    dict[@"Value"] = cookie.value;
    [_connection send:@"addCookie" withParams:dict];
    i++;
  }
}

@end

void FlipperKitCookiesPluginInit(FlipperClient* client) {
  [client addPlugin:[FlipperKitCookiesPlugin new]];
}

#endif
