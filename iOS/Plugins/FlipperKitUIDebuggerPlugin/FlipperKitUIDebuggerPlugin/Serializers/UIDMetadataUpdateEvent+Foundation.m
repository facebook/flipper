/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "NSDictionary+Foundation.h"
#import "UIDMetadataUpdateEvent+Foundation.h"

FB_LINKABLE(UIDMetadataUpdateEvent_Foundation)
@implementation UIDMetadataUpdateEvent (Foundation)

- (id)toFoundation {
  return @{
    @"attributeMetadata" : [self.attributeMetadata toFoundation],
  };
}

@end

#endif
