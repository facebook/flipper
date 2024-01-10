/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>
#import "UIDMetadata.h"

NS_ASSUME_NONNULL_BEGIN

FOUNDATION_EXPORT NSString* const UIDEBUGGER_METADATA_TYPE_IDENTIFIER;
FOUNDATION_EXPORT NSString* const UIDEBUGGER_METADATA_TYPE_ATTRIBUTE;
FOUNDATION_EXPORT NSString* const UIDEBUGGER_METADATA_TYPE_LAYOUT;
FOUNDATION_EXPORT NSString* const UIDEBUGGER_METADATA_TYPE_DOCUMENTATION;

@interface UIDMetadataRegister : NSObject

+ (instancetype)shared;

- (UIDMetadataId)registerMetadataWithType:(NSString*)type name:(NSString*)name;

- (UIDMetadataId)registerMetadataWithType:(NSString*)type
                                     name:(NSString*)name
                                isMutable:(bool)isMutable
                                definedBy:(UIDMetadataId)parent;

- (UIDMetadataId)registerMetadataWithType:(NSString*)type
                                     name:(NSString*)name
                                isMutable:(bool)isMutable
                                definedBy:(UIDMetadataId)parent
                         customAttributes:
                             (nullable NSDictionary<NSString*, id>*)
                                 customAttributes;

- (NSDictionary<UIDMetadataId, UIDMetadata*>*)extractPendingMetadata;

- (UIDMetadataId)findMetadataDefinedBy:(UIDMetadataId)definedById
                                  name:(NSString*)name;
- (UIDMetadataId)findRootMetadataWithName:(NSString*)name;

- (void)reset;

@end

NS_ASSUME_NONNULL_END

#endif
