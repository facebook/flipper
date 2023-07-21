/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef NSNumber* UIDMetadataId;

@class UIDInspectableValue;

/**
  Represent metadata associated for an attribute. Metadata identifier is a
  unique identifier used by attributes to refer to its metadata. Type refers to
  attribute semantics. It can represent: identity, attributes, layout,
  documentation, or a custom type.
 */
@interface UIDMetadata : NSObject

@property(nonatomic, readonly) UIDMetadataId identifier;
@property(nonatomic, strong, readonly) NSString* type;
@property(nonatomic, readonly) UIDMetadataId parent;
@property(nonatomic, strong, readonly) NSString* name;
@property(nonatomic, readonly) bool isMutable;
@property(nonatomic, strong, readonly)
    NSSet<UIDInspectableValue*>* possibleValues;
@property(nonatomic, strong, readonly) NSSet<NSString*>* tags;

- (instancetype)initWithIdentifier:(UIDMetadataId)identifier
                              type:(NSString*)type
                              name:(NSString*)name;

- (instancetype)initWithIdentifier:(UIDMetadataId)identifier
                              type:(NSString*)type
                              name:(NSString*)name
                         isMutable:(bool)isMutable
                            parent:(UIDMetadataId)parent;

- (instancetype)initWithIdentifier:(UIDMetadataId)identifier
                              type:(NSString*)type
                              name:(NSString*)name
                         isMutable:(bool)isMutable
                            parent:(UIDMetadataId)parent
                    possibleValues:(NSSet<UIDInspectableValue*>*)possibleValues
                              tags:(NSSet<NSString*>*)tags;
@end

NS_ASSUME_NONNULL_END

#endif
