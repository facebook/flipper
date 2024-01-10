/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "NSDictionary+Foundation.h"
#import "UIDInspectableObject+Foundation.h"

FB_LINKABLE(UIDInspectableObject_Foundation)
@implementation UIDInspectableObject (Foundation)

- (id)toFoundation {
  return @{@"type" : @"object", @"fields" : [self.fields toFoundation]};
}

@end

#endif
