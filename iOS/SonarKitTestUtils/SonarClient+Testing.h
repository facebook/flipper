/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#ifndef __cplusplus
#error This header can only be included in .mm (ObjC++) files
#endif

#import <Foundation/Foundation.h>

#import <Sonar/SonarClient.h>
#import <SonarKit/SonarClient.h>

@interface SonarClient (Testing)

- (instancetype)initWithCppClient:(facebook::sonar::SonarClient *)cppClient;

@end
