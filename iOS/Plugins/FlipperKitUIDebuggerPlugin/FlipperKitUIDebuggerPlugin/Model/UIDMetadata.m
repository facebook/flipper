/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "UIDMetadata.h"
#import "UIDInspectable.h"

@implementation UIDMetadata

- (instancetype)initWithIdentifier:(UIDMetadataId)identifier
                              type:(NSString*)type
                              name:(NSString*)name {
  return [self initWithIdentifier:identifier
                             type:type
                             name:name
                        isMutable:false
                           parent:@0
                   possibleValues:[NSSet set]
                             tags:[NSSet set]];
}

- (instancetype)initWithIdentifier:(UIDMetadataId)identifier
                              type:(NSString*)type
                              name:(NSString*)name
                         isMutable:(bool)isMutable
                            parent:(UIDMetadataId)parent {
  return [self initWithIdentifier:identifier
                             type:type
                             name:name
                        isMutable:isMutable
                           parent:parent
                   possibleValues:[NSSet set]
                             tags:[NSSet set]];
}

- (instancetype)initWithIdentifier:(UIDMetadataId)identifier
                              type:(NSString*)type
                              name:(NSString*)name
                         isMutable:(bool)isMutable
                            parent:(UIDMetadataId)parent
                    possibleValues:(NSSet<UIDInspectableValue*>*)possibleValues
                              tags:(NSSet<NSString*>*)tags {
  self = [super init];
  if (self) {
    _identifier = identifier;
    _type = type;
    _name = name;
    _isMutable = isMutable;
    _parent = parent;
    _possibleValues = possibleValues;
    _tags = tags;
  }
  return self;
}

@end

#endif
