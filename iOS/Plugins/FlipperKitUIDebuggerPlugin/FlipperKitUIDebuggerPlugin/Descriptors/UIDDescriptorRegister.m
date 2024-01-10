/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDDescriptorRegister.h"
#import <objc/runtime.h>
#import "UIDChainedDescriptor.h"
#import "UIDUIAccessibilityElementDescriptor.h"
#import "UIDUIApplicationDescriptor.h"
#import "UIDUILabelDescriptor.h"
#import "UIDUINavigationControllerDescriptor.h"
#import "UIDUITabBarControllerDescriptor.h"
#import "UIDUIViewControllerDescriptor.h"
#import "UIDUIViewDescriptor.h"
#import "UIDUIWindowDescriptor.h"

@interface UIDDescriptorRegister ()

- (void)prepareChain;

@end

@implementation UIDDescriptorRegister {
  NSMutableDictionary<NSString*, UIDNodeDescriptor*>* _register;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    _register = [NSMutableDictionary new];
  }
  return self;
}

+ (instancetype)defaultRegister {
  static UIDDescriptorRegister* defaultRegister = nil;

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    defaultRegister = [UIDDescriptorRegister new];

    [defaultRegister registerDescriptor:[UIDUIApplicationDescriptor new]
                               forClass:[UIApplication class]];
    [defaultRegister registerDescriptor:[UIDUIWindowDescriptor new]
                               forClass:[UIWindow class]];
    [defaultRegister registerDescriptor:[UIDUIViewControllerDescriptor new]
                               forClass:[UIViewController class]];
    [defaultRegister registerDescriptor:[UIDUIViewDescriptor new]
                               forClass:[UIView class]];
    [defaultRegister registerDescriptor:[UIDUILabelDescriptor new]
                               forClass:[UILabel class]];
    [defaultRegister
        registerDescriptor:[UIDUIAccessibilityElementDescriptor new]
                  forClass:[UIAccessibilityElement class]];
  });

  return defaultRegister;
}

- (void)registerDescriptor:(UIDNodeDescriptor*)descriptor
                  forClass:(Class)clazz {
  NSString* key = NSStringFromClass(clazz);
  _register[key] = descriptor;

  [self prepareChain];
}

- (UIDNodeDescriptor*)descriptorForClass:(Class)clazz {
  UIDNodeDescriptor* classDescriptor = nil;

  while (classDescriptor == nil && clazz != nil) {
    classDescriptor = [_register objectForKey:NSStringFromClass(clazz)];
    clazz = [clazz superclass];
  }

  return classDescriptor;
}

- (void)prepareChain {
  NSEnumerator* enumerator = [_register keyEnumerator];
  NSString* key;

  while ((key = [enumerator nextObject])) {
    UIDNodeDescriptor* descriptor = [_register objectForKey:key];
    if ([descriptor isKindOfClass:[UIDChainedDescriptor class]]) {
      UIDChainedDescriptor* chainedDescriptor =
          (UIDChainedDescriptor*)descriptor;

      Class clazz = NSClassFromString(key);
      Class superclass = [clazz superclass];

      UIDNodeDescriptor* superDescriptor = [self descriptorForClass:superclass];
      if ([superDescriptor isKindOfClass:[UIDChainedDescriptor class]]) {
        chainedDescriptor.parent = (UIDChainedDescriptor*)superDescriptor;
      }
    }
  }
}

@end

#endif
