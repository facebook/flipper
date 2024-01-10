/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDTreeObserverFactory.h"
#import "UIDUIApplicationObserver.h"

@interface UIDTreeObserverFactory () {
  NSMutableArray<id<UIDTreeObserverBuilder>>* _builders;
}

@end

@implementation UIDTreeObserverFactory

- (instancetype)init {
  self = [super init];
  if (self) {
    _builders = [NSMutableArray new];
  }
  return self;
}

+ (instancetype)shared {
  static UIDTreeObserverFactory* factory = nil;

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    factory = [UIDTreeObserverFactory new];
    [factory registerBuilder:[UIDUIApplicationObserverBuilder new]];
  });

  return factory;
}

- (void)registerBuilder:(id<UIDTreeObserverBuilder>)builder {
  [_builders addObject:builder];
}

- (UIDTreeObserver*)createObserverForNode:(id)node
                              withContext:(UIDContext*)context {
  for (id<UIDTreeObserverBuilder> builder in _builders) {
    if ([builder canBuildFor:node]) {
      return [builder buildWithContext:context];
    }
  }
  return nil;
}

- (BOOL)hasObserverForNode:(id)node {
  for (id<UIDTreeObserverBuilder> builder in _builders) {
    if ([builder canBuildFor:node]) {
      return true;
    }
  }
  return false;
}

@end

#endif
