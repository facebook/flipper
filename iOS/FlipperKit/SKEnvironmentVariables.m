/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "SKEnvironmentVariables.h"

static int const DEFAULT_INSECURE_PORT = 9089;
static int const DEFAULT_SECURE_PORT = 9088;

static int const DEFAULT_ALT_INSECURE_PORT = 9089;
static int const DEFAULT_ALT_SECURE_PORT = 9088;

@implementation SKEnvironmentVariables

+ (int)getInsecurePort {
  NSString* envVar = [self getFlipperPortsVariable];
  return [self extractIntFromPropValue:envVar
                               atIndex:0
                           withDefault:DEFAULT_INSECURE_PORT];
}
+ (int)getSecurePort {
  NSString* envVar = [self getFlipperPortsVariable];
  return [self extractIntFromPropValue:envVar
                               atIndex:1
                           withDefault:DEFAULT_SECURE_PORT];
}
+ (int)getAltInsecurePort {
  NSString* envVar = [self getFlipperAltPortsVariable];
  return [self extractIntFromPropValue:envVar
                               atIndex:0
                           withDefault:DEFAULT_ALT_INSECURE_PORT];
}
+ (int)getAltSecurePort {
  NSString* envVar = [self getFlipperAltPortsVariable];
  return [self extractIntFromPropValue:envVar
                               atIndex:1
                           withDefault:DEFAULT_ALT_SECURE_PORT];
}
+ (int)extractIntFromPropValue:(NSString*)propValue
                       atIndex:(int)index
                   withDefault:(int)fallback {
  NSArray<NSString*>* components = [propValue componentsSeparatedByString:@","];
  NSString* component = [components objectAtIndex:index];
  int envInt = [component intValue];
  return envInt > 0 ? envInt : fallback;
}
+ (NSString*)getFlipperPortsVariable {
  // Try to retrieve from environment first.
  NSString* value = NSProcessInfo.processInfo.environment[@"FLIPPER_PORTS"];
  // If empty, check defaults instead.
  if ([value length] == 0) {
    value = [[NSUserDefaults standardUserDefaults]
        stringForKey:@"com.facebook.flipper.ports"];
  }

  return value;
}
+ (NSString*)getFlipperAltPortsVariable {
  // Try to retrieve from environment first.
  NSString* value = NSProcessInfo.processInfo.environment[@"FLIPPER_ALT_PORTS"];
  // If empty, check defaults instead.
  if ([value length] == 0) {
    value = [[NSUserDefaults standardUserDefaults]
        stringForKey:@"com.facebook.flipper.ports.alt"];
  }

  return value;
}
@end

#endif
