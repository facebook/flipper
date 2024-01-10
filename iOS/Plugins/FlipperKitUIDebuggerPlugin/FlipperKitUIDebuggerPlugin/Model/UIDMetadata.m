/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDMetadata.h"
#import "UIDInspectable.h"

@implementation UIDMetadata

- (instancetype)initWithIdentifier:(UIDMetadataId)identifier
                              type:(NSString*)type
                              name:(NSString*)name
                         isMutable:(bool)isMutable
                            parent:(UIDMetadataId)parent
                    possibleValues:(NSSet<UIDInspectableValue*>*)possibleValues
                              tags:(NSSet<NSString*>*)tags
                  customAttributes:
                      (nullable NSDictionary<NSString*, id>*)customAttributes {
  self = [super init];
  if (self) {
    _identifier = identifier;
    _type = type;
    _name = name;
    _isMutable = isMutable;
    _parent = parent ?: @0;
    _possibleValues = possibleValues ?: [NSSet set];
    _tags = tags ?: [NSSet set];
    _customAttributes = customAttributes;
  }
  return self;
}

@end

#endif
