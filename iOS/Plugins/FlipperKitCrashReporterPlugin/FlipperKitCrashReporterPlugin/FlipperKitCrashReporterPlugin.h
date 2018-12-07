/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
#if FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>
#import <FlipperKit/FlipperPlugin.h>

@protocol CrashReporterDelegate
- (void)sendCrashParams:(NSDictionary *)params;
@end

@interface FlipperKitCrashReporterPlugin : NSObject<FlipperPlugin, CrashReporterDelegate>
- (instancetype)init NS_UNAVAILABLE;
+ (instancetype) sharedInstance;
@end

#endif
