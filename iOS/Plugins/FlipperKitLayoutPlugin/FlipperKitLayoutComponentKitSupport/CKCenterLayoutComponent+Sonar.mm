/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "CKCenterLayoutComponent+Sonar.h"

#import <FlipperKitLayoutHelpers/SKNamed.h>
#import <FlipperKitLayoutHelpers/SKObject.h>

#import "CKComponent+Sonar.h"

static NSDictionary<NSString*, NSObject*>*
CKCenterLayoutComponentCenteringOptionsParser(
    CKCenterLayoutComponentCenteringOptions centeringOptions) {
  NSMutableDictionary<NSString*, NSObject*>* centeringDict =
      [NSMutableDictionary new];
  centeringDict[@"centeringX"] = SKMutableObject(
      @((BOOL)(centeringOptions & CKCenterLayoutComponentCenteringX)));
  centeringDict[@"centeringY"] = SKMutableObject(
      @((BOOL)(centeringOptions & CKCenterLayoutComponentCenteringY)));
  return centeringDict;
}

static NSDictionary<NSString*, NSObject*>*
CKCenterLayoutComponentSizingOptionsParser(
    CKCenterLayoutComponentSizingOptions sizingOptions) {
  NSMutableDictionary<NSString*, NSObject*>* centeringDict =
      [NSMutableDictionary new];
  centeringDict[@"sizingMinimumX"] = SKMutableObject(
      @((BOOL)(sizingOptions & CKCenterLayoutComponentSizingOptionMinimumX)));
  centeringDict[@"sizingMinimumY"] = SKMutableObject(
      @((BOOL)(sizingOptions & CKCenterLayoutComponentSizingOptionMinimumY)));
  return centeringDict;
}

struct CKCenterLayoutComponentOptionsStruct {
  CKCenterLayoutComponentCenteringOptions centeringOptions;
  CKCenterLayoutComponentSizingOptions sizingOptions;
  CKCenterLayoutComponentOptionsStruct() {
    centeringOptions = 0;
    sizingOptions = 0;
  }
};

FB_LINKABLE(CKCenterLayoutComponent_Sonar)
@implementation CKCenterLayoutComponent (Sonar)

- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)
    sonar_additionalDataOverride {
  return @[ [SKNamed
      newWithName:@"CKCenterLayoutComponent"
        withValue:@{
          @"centeringOptions" :
              SKMutableObject(CKCenterLayoutComponentCenteringOptionsParser(
                  (CKCenterLayoutComponentCenteringOptions)[
                      [self valueForKey:@"_centeringOptions"] longValue])),
          @"sizingOptions" :
              SKMutableObject(CKCenterLayoutComponentSizingOptionsParser(
                  (CKCenterLayoutComponentSizingOptions)[
                      [self valueForKey:@"_sizingOptions"] longValue]))
        }] ];
}

- (void)setMutableData:(id)data {
  CKCenterLayoutComponentOptionsStruct value;
  [data getValue:&value];
  [self setValue:@(value.centeringOptions) forKey:@"_centeringOptions"];
  [self setValue:@(value.sizingOptions) forKey:@"_sizingOptions"];
}

- (NSDictionary<NSString*, SKNodeDataChanged>*)sonar_getDataMutationsChanged {
  __block CKCenterLayoutComponentOptionsStruct options;
  options.centeringOptions = (CKCenterLayoutComponentCenteringOptions)[
      [self valueForKey:@"_centeringOptions"] longValue];
  options.sizingOptions = (CKCenterLayoutComponentSizingOptions)[
      [self valueForKey:@"_sizingOptions"] longValue];
  return @{
    @"CKCenterLayoutComponent.centeringOptions.centeringX" : ^(NSNumber* value){
        options.centeringOptions ^= CKCenterLayoutComponentCenteringX;
  return [NSValue value:&options
           withObjCType:@encode(CKCenterLayoutComponentOptionsStruct)];
}
,
           @"CKCenterLayoutComponent.centeringOptions.centeringY": ^(NSNumber *value) {
             options.centeringOptions ^= CKCenterLayoutComponentCenteringY;
             return [NSValue value:&options withObjCType:@encode(CKCenterLayoutComponentOptionsStruct)];
           },
           @"CKCenterLayoutComponent.sizingOptions.sizingMinimumX": ^(NSNumber *value) {
             options.sizingOptions ^= CKCenterLayoutComponentSizingOptionMinimumX;
             return [NSValue value:&options withObjCType:@encode(CKCenterLayoutComponentOptionsStruct)];
           },
           @"CKCenterLayoutComponent.sizingOptions.sizingMinimumY": ^(NSNumber *value) {
             options.sizingOptions ^= CKCenterLayoutComponentSizingOptionMinimumY;
             return [NSValue value:&options withObjCType:@encode(CKCenterLayoutComponentOptionsStruct)];
           },
}
;
}

@end

#endif
