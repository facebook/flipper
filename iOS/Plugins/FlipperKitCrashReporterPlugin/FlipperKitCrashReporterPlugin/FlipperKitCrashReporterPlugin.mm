/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
 #if FB_SONARKIT_ENABLED
 #import "FlipperKitCrashReporterPlugin.h"

@implementation FlipperKitCrashReporterPlugin

- (NSString *)identifier {
  return @"CrashReporter";
}

void uncaughtExceptionHandler(NSException *exception) {
  NSLog(@"CRASH: %@", exception);
  NSLog(@"Stack Trace: %@", [exception callStackSymbols]);
  // Internal error reporting
}

- (void)didConnect:(id<FlipperConnection>)connection {
  NSSetUncaughtExceptionHandler(&uncaughtExceptionHandler);
}

- (void)didDisconnect {
  NSSetUncaughtExceptionHandler(nullptr);
}

- (BOOL)runInBackground {
  return YES;
}

@end
#endif
