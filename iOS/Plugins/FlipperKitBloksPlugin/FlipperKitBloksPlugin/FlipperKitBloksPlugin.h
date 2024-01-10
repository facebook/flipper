/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/FlipperPlugin.h>
#import <Foundation/Foundation.h>

@interface FlipperKitBloksPlugin : NSObject<FlipperPlugin>

- (void)logAction:(NSString*)action withData:(NSDictionary*)data;

@end

#endif
