/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

#import <SonarKit/SonarPlugin.h>

#import <memory>

#import "SKDispatchQueue.h"

@interface SKBufferingPlugin : NSObject<SonarPlugin>

- (instancetype)initWithQueue:(const std::shared_ptr<facebook::sonar::DispatchQueue> &)queue NS_DESIGNATED_INITIALIZER;

- (void)send:(NSString *)method sonarObject:(NSDictionary<NSString *, id> *)sonarObject;

@end

#endif
