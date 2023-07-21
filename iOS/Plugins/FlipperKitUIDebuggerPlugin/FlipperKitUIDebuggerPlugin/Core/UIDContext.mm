/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "UIDContext.h"
#import "UIDDescriptorRegister.h"
#import "UIDSerialFrameworkEventManager.h"
#import "UIDTreeObserverFactory.h"

@implementation UIDContext

- (instancetype)initWithApplication:(UIApplication*)application
                 descriptorRegister:(UIDDescriptorRegister*)descriptorRegister
                    observerFactory:(UIDTreeObserverFactory*)observerFactory {
  self = [super init];
  if (self) {
    _application = application;
    _descriptorRegister = descriptorRegister;
    _observerFactory = observerFactory;
    _connection = nil;
    _frameworkEventManager = [UIDSerialFrameworkEventManager new];
  }
  return self;
}

@end

#endif
