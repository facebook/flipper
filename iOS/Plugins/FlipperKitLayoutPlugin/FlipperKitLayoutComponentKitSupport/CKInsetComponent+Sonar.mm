/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "CKInsetComponent+Sonar.h"

#import <FlipperKitLayoutPlugin/SKNamed.h>
#import <FlipperKitLayoutPlugin/SKObject.h>

#import "CKComponent+Sonar.h"

FB_LINKABLE(CKInsetComponent_Sonar)
@implementation CKInsetComponent (Sonar)

- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)
    sonar_additionalDataOverride {
  return @[ [SKNamed newWithName:@"CKInsetComponent"
                       withValue:@{
                         @"insets" : SKMutableObject(
                             [[self valueForKey:@"_insets"] UIEdgeInsetsValue])
                       }] ];
}

- (void)setMutableData:(id)data {
  [self setValue:data forKey:@"_insets"];
}

- (NSDictionary<NSString*, SKNodeDataChanged>*)sonar_getDataMutationsChanged {
  __block UIEdgeInsets insets =
      [[self valueForKey:@"_insets"] UIEdgeInsetsValue];
  return @{@"CKInsetComponent.insets.bottom" : ^(NSNumber* value){
      insets.bottom = value.floatValue;
  return [NSValue valueWithUIEdgeInsets:insets];
}
,
           @"CKInsetComponent.insets.left": ^(NSNumber *value) {
             insets.left = value.floatValue;
             return [NSValue valueWithUIEdgeInsets:insets];
           },
           @"CKInsetComponent.insets.right": ^(NSNumber *value) {
             insets.right = value.floatValue;
             return [NSValue valueWithUIEdgeInsets:insets];
           },
           @"CKInsetComponent.insets.top": ^(NSNumber *value) {
             insets.top = value.floatValue;
             return [NSValue valueWithUIEdgeInsets:insets];
           },
}
;
}

@end

#endif
