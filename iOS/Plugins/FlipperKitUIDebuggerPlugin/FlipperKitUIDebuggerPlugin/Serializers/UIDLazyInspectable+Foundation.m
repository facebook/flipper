/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDInspectable+Foundation.h"
#import "UIDLazyInspectable+Foundation.h"

FB_LINKABLE(UIDLazyInspectable_Foundation)
@implementation UIDLazyInspectable (Foundation)

/**
  Converting a lazy inspectable to its Foundation type
  equivalent may trigger materialisation of its value.

  If the lazy inspectable was already materialised, then
  this value will be returned and serialised.
  Otherwise, the loader will be invoked to obtain the value
  first.
 */
- (id)toFoundation {
  return [[self value] toFoundation];
}

@end

#endif
