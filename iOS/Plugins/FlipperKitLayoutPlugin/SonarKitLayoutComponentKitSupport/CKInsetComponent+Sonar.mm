/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import "CKInsetComponent+Sonar.h"

#import <FlipperKitLayoutPlugin/SKNamed.h>
#import <FlipperKitLayoutPlugin/SKObject.h>

#import "CKComponent+Sonar.h"

FB_LINKABLE(CKInsetComponent_Sonar)
@implementation CKInsetComponent (Sonar)

- (NSArray<SKNamed<NSDictionary<NSString *, NSObject *> *> *> *)sonar_additionalDataOverride
{
  return @[[SKNamed newWithName:@"CKInsetComponent" withValue:@{@"insets": SKObject([[self valueForKey: @"_insets"] UIEdgeInsetsValue])}]];
}

@end

#endif
