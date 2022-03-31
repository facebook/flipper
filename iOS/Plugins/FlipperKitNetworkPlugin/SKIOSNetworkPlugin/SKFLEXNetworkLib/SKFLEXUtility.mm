// @lint-ignore-every LICENSELINT
/*
 * The file was derived from FLEXUtility.h.
 * All modifications to the original source are licensed under:
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

//
//  FLEXUtility.m
//  Flipboard
//
//  Created by Ryan Olson on 4/18/14.
//  Copyright (c) 2020 FLEX Team. All rights reserved.
//

// Copyright (c) 2014-2016, Flipboard
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
// this
//   list of conditions and the following disclaimer in the documentation and/or
//   other materials provided with the distribution.
// * Neither the name of Flipboard nor the names of its
//   contributors may be used to endorse or promote products derived from
//   this software without specific prior written permission.
// * You must NOT include this project in an application to be submitted
//   to the App Store™, as this project uses too many private APIs.
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

#import "SKFLEXUtility.h"

#include <assert.h>
#include <mach/mach.h>
#include <mach/mach_time.h>
#import <objc/runtime.h>
#import <zlib.h>

#import <ImageIO/ImageIO.h>

@implementation SKFLEXUtility

+ (SEL)swizzledSelectorForSelector:(SEL)selector {
  return NSSelectorFromString(
      [NSString stringWithFormat:@"_skflex_swizzle_%x_%@",
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
