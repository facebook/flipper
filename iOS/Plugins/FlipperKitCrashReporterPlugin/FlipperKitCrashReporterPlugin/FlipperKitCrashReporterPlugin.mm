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

@interface FlipperKitCrashReporterPlugin()
@property (strong, nonatomic) id<FlipperConnection> connection;
@property (assign, nonatomic) NSUInteger notificationID;
- (void) handleException:(NSException *)exception;

@end

void flipperkitUncaughtExceptionHandler(NSException *exception) {
  NSLog(@"CRASH: %@", exception);
  NSLog(@"Stack Trace: %@", [exception callStackSymbols]);
  [[FlipperKitCrashReporterPlugin sharedInstance] handleException:exception];
}

@implementation FlipperKitCrashReporterPlugin

- (instancetype)init {
  if (self = [super init]) {
    _connection = nil;
    _notificationID = 0;
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

- (void) handleException:(NSException *)exception {
  // TODO: Rather than having indirection from c function, somehow pass objective c selectors as a c function pointer to NSSetUncaughtExceptionHandler
  self.notificationID += 1;
  [self.connection send:@"crash-report" withParams:@{@"id": [NSUUID UUID].UUIDString, @"reason": [exception reason], @"name": [exception name], @"callstack": [exception callStackSymbols]}];

}
- (void)didConnect:(id<FlipperConnection>)connection {
  self.connection = connection;
  NSSetUncaughtExceptionHandler(&flipperkitUncaughtExceptionHandler);
}

- (void)didDisconnect {
  self.connection = nil;
  NSSetUncaughtExceptionHandler(nullptr);
}

- (BOOL)runInBackground {
  return YES;
}

@end
#endif
