/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "CKInsetComponent+Sonar.h"

#import <ComponentKit/CKDimension.h>
#import <FlipperKitLayoutHelpers/SKNamed.h>
#import <FlipperKitLayoutHelpers/SKObject.h>

#import "CKComponent+Sonar.h"

FB_LINKABLE(CKInsetComponent_Sonar)
@implementation CKInsetComponent (Sonar)

- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)
    sonar_additionalDataOverride {
  return @[
    [SKNamed newWithName:@"CKInsetComponent"
               withValue:@{@"insets" : SKObject([self insetsDictionary])}],
  ];
}

- (id)insetsDictionary {
  CKRelativeDimension top;
  CKRelativeDimension left;
  CKRelativeDimension bottom;
  CKRelativeDimension right;
  [[self valueForKey:@"_top"] getValue:&top];
  [[self valueForKey:@"_left"] getValue:&left];
  [[self valueForKey:@"_right"] getValue:&bottom];
  [[self valueForKey:@"_bottom"] getValue:&right];
  return @{
    @"top" : top.description(),
    @"left" : left.description(),
    @"bottom" : bottom.description(),
    @"right" : right.description(),
  };
}

@end

#endif
