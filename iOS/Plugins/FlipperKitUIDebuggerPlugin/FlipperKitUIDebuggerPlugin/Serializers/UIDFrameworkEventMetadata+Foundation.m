/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "NSDictionary+Foundation.h"
#import "UIDFrameworkEventMetadata+Foundation.h"

FB_LINKABLE(UIDFrameworkEventMetadata_Foundation)
@implementation UIDFrameworkEventMetadata (Foundation)

- (id)toFoundation {
  return @{
    @"type" : self.type,
    @"documentation" : self.documentation,
  };
}

@end

#endif
