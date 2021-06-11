/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "FLEXUtility.h"

#include <assert.h>
#include <mach/mach.h>
#include <mach/mach_time.h>
#import <objc/runtime.h>
#import <zlib.h>

#import <ImageIO/ImageIO.h>

@implementation FLEXUtility

+ (SEL)swizzledSelectorForSelector:(SEL)selector {
  return NSSelectorFromString(
      [NSString stringWithFormat:@"_flex_swizzle_%x_%@",
                                 arc4random(),
                                 NSStringFromSelector(selector)]);
}

+ (BOOL)instanceRespondsButDoesNotImplementSelector:(SEL)selector
                                              class:(Class)cls {
  if ([cls instancesRespondToSelector:selector]) {
    unsigned int numMethods = 0;
    Method* methods = class_copyMethodList(cls, &numMethods);

    BOOL implementsSelector = NO;
    for (int index = 0; index < numMethods; index++) {
      SEL methodSelector = method_getName(methods[index]);
      if (selector == methodSelector) {
        implementsSelector = YES;
        break;
      }
    }

    free(methods);

    if (!implementsSelector) {
      return YES;
    }
  }

  return NO;
}

+ (void)replaceImplementationOfKnownSelector:(SEL)originalSelector
                                     onClass:(Class)className
                                   withBlock:(id)block
                            swizzledSelector:(SEL)swizzledSelector {
  // This method is only intended for swizzling methods that are know to exist
  // on the class. Bail if that isn't the case.
  Method originalMethod = class_getInstanceMethod(className, originalSelector);
  if (!originalMethod) {
    return;
  }

  IMP implementation = imp_implementationWithBlock(block);
  class_addMethod(
      className,
      swizzledSelector,
      implementation,
      method_getTypeEncoding(originalMethod));
  Method newMethod = class_getInstanceMethod(className, swizzledSelector);
  method_exchangeImplementations(originalMethod, newMethod);
}

+ (void)replaceImplementationOfSelector:(SEL)selector
                           withSelector:(SEL)swizzledSelector
                               forClass:(Class)cls
                  withMethodDescription:
                      (struct objc_method_description)methodDescription
                    implementationBlock:(id)implementationBlock
                         undefinedBlock:(id)undefinedBlock {
  if ([self instanceRespondsButDoesNotImplementSelector:selector class:cls]) {
    return;
  }

  IMP implementation = imp_implementationWithBlock((id)(
      [cls instancesRespondToSelector:selector] ? implementationBlock
                                                : undefinedBlock));

  Method oldMethod = class_getInstanceMethod(cls, selector);
  if (oldMethod) {
    objc_method_description* description = method_getDescription(oldMethod);
    class_addMethod(cls, swizzledSelector, implementation, description->types);
    Method newMethod = class_getInstanceMethod(cls, swizzledSelector);
    method_exchangeImplementations(oldMethod, newMethod);
  } else {
    class_addMethod(cls, selector, implementation, methodDescription.types);
  }
}

@end

@implementation NSNumber (SonarUtility)

+ (NSNumber*)random {
  int64_t identifier;
  arc4random_buf(&identifier, sizeof(int64_t));
  return @(identifier);
}

@end

@implementation NSDate (SonarUtility)

+ (NSTimeInterval)timestamp {
  const NSTimeInterval timestamp = [[NSDate date] timeIntervalSince1970];
  return timestamp * 1000;
}

@end
