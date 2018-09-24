/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import "CKFlexboxComponent+Sonar.h"

#import <FlipperKitLayoutPlugin/SKNamed.h>
#import <FlipperKitLayoutPlugin/SKObject.h>

#import "CKComponent+Sonar.h"
#import "Utils.h"

FB_LINKABLE(CKFlexboxComponent_Sonar)
@implementation CKFlexboxComponent (Sonar)

- (NSArray<SKNamed<NSDictionary<NSString *, NSObject *> *> *> *)sonar_additionalDataOverride
{
  static NSDictionary<NSNumber *, NSString *> *CKFlexboxDirectionEnumMap = @{
                                @(CKFlexboxDirectionColumn): @"vertical",
                                @(CKFlexboxDirectionRow): @"horizontal",
                                @(CKFlexboxDirectionColumnReverse): @"vertical-reverse",
                                @(CKFlexboxDirectionRowReverse): @"horizontal-reverse",
                                };

  static NSDictionary<NSNumber *, NSString *> *CKFlexboxJustifyContentEnumMap = @{
                                     @(CKFlexboxJustifyContentStart): @"start",
                                     @(CKFlexboxJustifyContentCenter): @"center",
                                     @(CKFlexboxJustifyContentEnd): @"end",
                                     @(CKFlexboxJustifyContentSpaceBetween): @"space-between",
                                     @(CKFlexboxJustifyContentSpaceAround): @"space-around",
                                     };

  static NSDictionary<NSNumber *, NSString *> *CKFlexboxAlignItemsEnumMap = @{
                                 @(CKFlexboxAlignItemsStart): @"start",
                                 @(CKFlexboxAlignItemsEnd): @"end",
                                 @(CKFlexboxAlignItemsCenter): @"center",
                                 @(CKFlexboxAlignItemsBaseline): @"baseline",
                                 @(CKFlexboxAlignItemsStretch): @"stretch",
                                 };

  static NSDictionary<NSNumber *, NSString *> *CKFlexboxAlignContentEnumMap = @{
                                   @(CKFlexboxAlignContentStart): @"start",
                                   @(CKFlexboxAlignContentEnd): @"end",
                                   @(CKFlexboxAlignContentCenter): @"center",
                                   @(CKFlexboxAlignContentSpaceBetween): @"space-between",
                                   @(CKFlexboxAlignContentSpaceAround): @"space-around",
                                   @(CKFlexboxAlignContentStretch): @"stretch",
                                   };

  static NSDictionary<NSNumber *, NSString *> *CKFlexboxWrapEnumMap = @{
                           @(CKFlexboxWrapWrap): @"wrap",
                           @(CKFlexboxWrapNoWrap): @"no-wrap",
                           @(CKFlexboxWrapWrapReverse): @"wrap-reverse",
                           };

  CKFlexboxComponentStyle style;
  [[self valueForKey: @"_style"] getValue: &style];

  return @[[SKNamed
            newWithName:@"CKFlexboxComponent"
            withValue:@{
              @"spacing": SKObject(@(style.spacing)),
              @"direction": SKObject(CKFlexboxDirectionEnumMap[@(style.direction)]),
              @"justifyContent": SKObject(CKFlexboxJustifyContentEnumMap[@(style.justifyContent)]),
              @"alignItems": SKObject(CKFlexboxAlignItemsEnumMap[@(style.alignItems)]),
              @"alignContent": SKObject(CKFlexboxAlignContentEnumMap[@(style.alignContent)]),
              @"wrap": SKObject(CKFlexboxWrapEnumMap[@(style.wrap)]),
              @"margin": SKObject(flexboxRect(style.margin)),
              @"padding": SKObject(flexboxRect(style.padding)),
            }]];
}

@end

#endif
