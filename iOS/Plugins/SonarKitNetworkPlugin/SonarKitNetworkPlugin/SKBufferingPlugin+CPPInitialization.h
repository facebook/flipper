/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED
#pragma once

#import "SKBufferingPlugin.h"
#import "SKDispatchQueue.h"
#import <iostream>
#import <memory>

struct CachedEvent {
  NSString *method;
  NSDictionary<NSString *, id> *sonarObject;
};


@interface SKBufferingPlugin(CPPInitialization)

- (instancetype)initWithVectorEventSize:(NSUInteger)size connectionAccessQueue:(std::shared_ptr<facebook::sonar::DispatchQueue>)connectionAccessQueue;
- (instancetype)initWithDispatchQueue:(std::shared_ptr<facebook::sonar::DispatchQueue>)queue;

@end

#endif
