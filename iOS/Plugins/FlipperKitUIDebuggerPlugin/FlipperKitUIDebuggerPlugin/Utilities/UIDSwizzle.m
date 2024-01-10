/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDSwizzle.h"
#import <Foundation/Foundation.h>
#import <objc/runtime.h>

void UIDSwizzleMethod(Class cls, SEL original, SEL replacement, BOOL create) {
  Method originalMethod = class_getInstanceMethod(cls, original);
  Method replacementMethod = class_getInstanceMethod(cls, replacement);

  /**
    The method is not implemented by the target class and the create option is
    set to false.
   */
  if (originalMethod == NULL && !create) {
    return;
  }

  /**
    Use class_addMethod to add an implementation of the method to the target
    class, which we do using our replacement implementation.
   */
  BOOL didAddMethod = class_addMethod(
      cls,
      original,
      method_getImplementation(replacementMethod),
      method_getTypeEncoding(replacementMethod));

  if (didAddMethod) {
    /**
     Use class_replaceMethod to replace calls to the swizzled method to the
     original one. i.e. when you call the replacement method, it actually calls
     the original method.
     */
    class_replaceMethod(
        cls,
        replacement,
        method_getImplementation(originalMethod),
        method_getTypeEncoding(originalMethod));
  } else {
    /**
     If the method is defined by the target class, class_addMethod will fail.
     Use method_exchangeImplementations to exchange the new and old
     implementations.
     */
    method_exchangeImplementations(originalMethod, replacementMethod);
  }
}

#endif
