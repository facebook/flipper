/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "CKRatioLayoutComponent+Sonar.h"

#import <FlipperKitLayoutHelpers/SKNamed.h>
#import <FlipperKitLayoutHelpers/SKObject.h>

#import "CKComponent+Sonar.h"

FB_LINKABLE(CKRatioLayoutComponent_Sonar)
@implementation CKRatioLayoutComponent (Sonar)

- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)
    sonar_additionalDataOverride {
  return @[ [SKNamed
      newWithName:@"CKRatioLayoutComponent"
        withValue:@{
          @"ratio" : SKMutableObject((NSNumber*)[self valueForKey:@"_ratio"])
        }] ];
}

- (void)setMutableData:(id)data {
  [self setValue:data forKey:@"_ratio"];
}

- (NSDictionary<NSString*, SKNodeDataChanged>*)sonar_getDataMutationsChanged {
  return @{@"CKRatioLayoutComponent.ratio" : ^(NSNumber* value){
      CGFloat ratio = [(NSNumber*)[self valueForKey:@"_ratio"] floatValue];
  ratio = value.floatValue;
  return [NSNumber numberWithFloat:ratio];
}
,
}
;
}

@end

#endif
