/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
 #if FB_SONARKIT_ENABLED
 #import "FlipperKitCrashReporterPlugin.h"
#import <FlipperKit/FlipperConnection.h>
#include <folly/io/async/ScopedEventBaseThread.h>
#import "FlipperKitSignalHandler.h"

@interface FlipperKitCrashReporterPlugin()
@property (strong, nonatomic) id<FlipperConnection> connection;
@property (assign, nonatomic) NSUInteger notificationID;
@property (assign, nonatomic) NSUncaughtExceptionHandler *prevHandler;

@end

@implementation FlipperKitCrashReporterPlugin {
  std::unique_ptr<facebook::flipper::FlipperKitSignalHandler> _signalHandler;
  folly::ScopedEventBaseThread _crashReporterThread;
}

- (instancetype)init {
  if (self = [super init]) {
    _connection = nil;
    _notificationID = 0;
    _prevHandler = NSGetUncaughtExceptionHandler();
  }
  return self;
}

+ (instancetype)sharedInstance {
  static FlipperKitCrashReporterPlugin *sInstance = nil;

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sInstance = [FlipperKitCrashReporterPlugin new];
  });

  return sInstance;
}

- (NSString *)identifier {
  return @"CrashReporter";
}

- (void)sendCrashParams:(NSDictionary *)params {
    self.notificationID += 1;
}

- (void)didConnect:(id<FlipperConnection>)connection {
  self.connection = connection;
}

- (void)didDisconnect {
  self.connection = nil;
}

- (BOOL)runInBackground {
  return YES;
}

@end
#endif
