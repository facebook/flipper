/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "CKFlexboxComponent+Sonar.h"

#import <FlipperKitLayoutHelpers/SKNamed.h>
#import <FlipperKitLayoutHelpers/SKObject.h>

#import "CKComponent+Sonar.h"
#import "Utils.h"

FB_LINKABLE(CKFlexboxComponent_Sonar)
@implementation CKFlexboxComponent (Sonar)

static NSDictionary<NSNumber*, NSString*>* CKFlexboxDirectionEnumMap;

static NSDictionary<NSNumber*, NSString*>* CKFlexboxJustifyContentEnumMap;

static NSDictionary<NSNumber*, NSString*>* CKFlexboxAlignItemsEnumMap;

static NSDictionary<NSNumber*, NSString*>* CKFlexboxAlignContentEnumMap;

static NSDictionary<NSNumber*, NSString*>* CKFlexboxWrapEnumMap;

+ (void)initialize {
  CKFlexboxDirectionEnumMap = @{
    @(CKFlexboxDirectionColumn) : @"column",
    @(CKFlexboxDirectionRow) : @"row",
    @(CKFlexboxDirectionColumnReverse) : @"column-reverse",
    @(CKFlexboxDirectionRowReverse) : @"row-reverse",
  };
  CKFlexboxJustifyContentEnumMap = @{
    @(CKFlexboxJustifyContentStart) : @"start",
    @(CKFlexboxJustifyContentCenter) : @"center",
    @(CKFlexboxJustifyContentEnd) : @"end",
    @(CKFlexboxJustifyContentSpaceBetween) : @"space-between",
    @(CKFlexboxJustifyContentSpaceAround) : @"space-around",
  };
  CKFlexboxAlignItemsEnumMap = @{
    @(CKFlexboxAlignItemsStart) : @"start",
    @(CKFlexboxAlignItemsEnd) : @"end",
    @(CKFlexboxAlignItemsCenter) : @"center",
    @(CKFlexboxAlignItemsBaseline) : @"baseline",
    @(CKFlexboxAlignItemsStretch) : @"stretch",
  };
  CKFlexboxAlignContentEnumMap = @{
    @(CKFlexboxAlignContentStart) : @"start",
    @(CKFlexboxAlignContentEnd) : @"end",
    @(CKFlexboxAlignContentCenter) : @"center",
    @(CKFlexboxAlignContentSpaceBetween) : @"space-between",
    @(CKFlexboxAlignContentSpaceAround) : @"space-around",
    @(CKFlexboxAlignContentStretch) : @"stretch",
  };
  CKFlexboxWrapEnumMap = @{
    @(CKFlexboxWrapWrap) : @"wrap",
    @(CKFlexboxWrapNoWrap) : @"no-wrap",
    @(CKFlexboxWrapWrapReverse) : @"wrap-reverse",
  };
}

- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)
    sonar_additionalDataOverride {
  CKFlexboxComponentStyle style;
  [[self valueForKey:@"_style"] getValue:&style];

  return @[ [SKNamed
      newWithName:@"CKFlexboxComponent"
        withValue:@{
          @"spacing" : SKMutableObject(@(style.spacing)),
          @"direction" :
              SKMutableObject(CKFlexboxDirectionEnumMap[@(style.direction)]),
          @"justifyContent" : SKMutableObject(
              CKFlexboxJustifyContentEnumMap[@(style.justifyContent)]),
          @"alignItems" :
              SKMutableObject(CKFlexboxAlignItemsEnumMap[@(style.alignItems)]),
          @"alignContent" : SKMutableObject(
              CKFlexboxAlignContentEnumMap[@(style.alignContent)]),
          @"wrap" : SKMutableObject(CKFlexboxWrapEnumMap[@(style.wrap)]),
          @"padding" : SKMutableObject(flexboxRect(style.padding)),
        }] ];
}

- (void)setMutableData:(id)data {
  CKFlexboxComponentStyle style;
  [data getValue:&style];
  [self setValue:data forKey:@"_style"];
}

- (NSDictionary<NSString*, SKNodeDataChanged>*)sonar_getDataMutationsChanged {
  __block CKFlexboxComponentStyle style;
  [[self valueForKey:@"_style"] getValue:&style];
  return @{@"CKFlexboxComponent.spacing" : ^(NSNumber* value){
      style.spacing = value.floatValue;
  return [NSValue value:&style withObjCType:@encode(CKFlexboxComponentStyle)];
}
,
           @"CKFlexboxComponent.direction": ^(NSString *value) {
             for (NSNumber *key in CKFlexboxDirectionEnumMap) {
               if ([CKFlexboxDirectionEnumMap[key] isEqualToString:value]) {
                 style.direction = (CKFlexboxDirection) key.intValue;
                 break;
               }
             }
             return [NSValue value:&style withObjCType:@encode(CKFlexboxComponentStyle)];
           },
           @"CKFlexboxComponent.alignContent": ^(NSString *value) {
             for (NSNumber *key in CKFlexboxAlignContentEnumMap) {
               if ([CKFlexboxAlignContentEnumMap[key] isEqualToString:value]) {
                 style.alignContent = (CKFlexboxAlignContent) key.intValue;
                 break;
               }
             }
             return [NSValue value:&style withObjCType:@encode(CKFlexboxComponentStyle)];
           },
           @"CKFlexboxComponent.alignContent": ^(NSString *value) {
             for (NSNumber *key in CKFlexboxAlignItemsEnumMap) {
               if ([CKFlexboxAlignItemsEnumMap[key] isEqualToString:value]) {
                 style.alignItems = (CKFlexboxAlignItems) key.intValue;
                 break;
               }
             }
             return [NSValue value:&style withObjCType:@encode(CKFlexboxComponentStyle)];
           },
           @"CKFlexboxComponent.justifyContent": ^(NSString *value) {
             for (NSNumber *key in CKFlexboxJustifyContentEnumMap) {
               if ([CKFlexboxJustifyContentEnumMap[key] isEqualToString:value]) {
                 style.justifyContent = (CKFlexboxJustifyContent) key.intValue;
                 break;
               }
             }
             return [NSValue value:&style withObjCType:@encode(CKFlexboxComponentStyle)];
           },
           @"CKFlexboxComponent.wrap": ^(NSString *value) {
             for (NSNumber *key in CKFlexboxWrapEnumMap) {
               if ([CKFlexboxWrapEnumMap[key] isEqualToString:value]) {
                 style.wrap = (CKFlexboxWrap) key.intValue;
                 break;
               }
             }
             return [NSValue value:&style withObjCType:@encode(CKFlexboxComponentStyle)];
           },
           @"CKFlexboxComponent.padding.bottom": ^(NSString *value) {
             style.padding.bottom = relativeStructDimension(value);
             return [NSValue value:&style withObjCType:@encode(CKFlexboxComponentStyle)];
           },
           @"CKFlexboxComponent.padding.top": ^(NSString *value) {
             style.padding.top = relativeStructDimension(value);
             return [NSValue value:&style withObjCType:@encode(CKFlexboxComponentStyle)];
           },
           @"CKFlexboxComponent.padding.end": ^(NSString *value) {
             style.padding.end = relativeStructDimension(value);
             return [NSValue value:&style withObjCType:@encode(CKFlexboxComponentStyle)];
           },
           @"CKFlexboxComponent.padding.start": ^(NSString *value) {
             style.padding.start = relativeStructDimension(value);
             return [NSValue value:&style withObjCType:@encode(CKFlexboxComponentStyle)];
           },
}
;
}

@end

#endif
