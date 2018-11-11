/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>
#import <FlipperKit/FlipperPlugin.h>

@interface FlipperKitCrashReporterPlugin : NSObject<FlipperPlugin>
- (instancetype)init NS_UNAVAILABLE;
+ (instancetype) sharedInstance;
@end


#endif
