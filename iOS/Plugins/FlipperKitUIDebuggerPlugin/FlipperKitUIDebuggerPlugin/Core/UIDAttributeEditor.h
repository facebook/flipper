/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/SKMacros.h>
#import <UIKit/UIKit.h>
#import "UIDCompoundTypeHint.h"
#import "UIDMetadata.h"

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, AttributeEditorErrorType) {
  AttributeEditorErrorTypeMissingNodeId,
  AttributeEditorErrorTypeMissingMetadataIds,
  AttributeEditorErrorTypeNodeNotFound,
  AttributeEditorErrorTypeUnknown,
};

FB_LINK_REQUIRE_CATEGORY(NSError_AttributeEditorError)
@interface NSError (AttributeEditorError)
+ (NSError*)UID_errorWithType:(AttributeEditorErrorType)type;
+ (NSDictionary*)UID_errorPayloadWithType:(AttributeEditorErrorType)type;
+ (NSDictionary*)UID_errorPayloadWithError:(NSError*)error;
@end

typedef void (^ReportAttributeEditorResult)(NSError* _Nullable);

@class UIDDescriptorRegister;
@interface UIDAttributeEditor : NSObject

+ (instancetype)attributeEditorWithDescriptorRegister:
    (UIDDescriptorRegister*)descriptorRegister;

- (void)editNodeWithId:(NSString*)nodeId
                  value:(id)value
    metadataIdentifiers:(NSArray<UIDMetadataId>*)metadataIdentifiers
       compoundTypeHint:(UIDCompoundTypeHint)compoundTypeHint
                   root:(id _Nullable)root
           reportResult:(ReportAttributeEditorResult)reportResult;

@end

NS_ASSUME_NONNULL_END

#endif
