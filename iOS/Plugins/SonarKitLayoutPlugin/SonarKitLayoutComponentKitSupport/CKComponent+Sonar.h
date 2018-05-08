/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <ComponentKit/CKComponent.h>
#import <SonarKit/SKMacros.h>
#import <SonarKitLayoutPlugin/SKNamed.h>
#import <SonarKitLayoutPlugin/SKNodeDescriptor.h>

FB_LINK_REQUIRE(CKComponent_Sonar)
@interface CKComponent (Sonar)

- (NSArray<SKNamed<NSDictionary<NSString *, NSObject *> *> *> *)sonar_getData;
- (NSDictionary<NSString *, SKNodeUpdateData> *)sonar_getDataMutations;
- (NSString *)sonar_getName;
- (NSString *)sonar_getDecoration;

@end
