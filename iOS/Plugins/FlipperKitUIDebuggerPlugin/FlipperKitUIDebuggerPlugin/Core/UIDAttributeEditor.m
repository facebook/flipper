/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDAttributeEditor.h"
#import "UIDDescriptorRegister.h"
#import "UIDHierarchyTraversal.h"
#import "UIDMainThread.h"

static NSString* const AttributeEditorErrorMissingRequiredArgumentDomain =
    @"Missing required argument";
static NSString* const AttributeEditorErrorInfrastructureDomain =
    @"Attribute editor infrastructure error";
static NSString* const AttributeEditorErrorUnknownDomain = @"Unknown";

static NSString* const AttributeEditorMissingNodeIdMessage =
    @"Node identifier not provided";
static NSString* const AttributeEditorMissingMetadataIdsMessage =
    @"Metadata identifiers not provided";
static NSString* const AttributeEditorNodeNotFoundMessage =
    @"Unable to locate node for which changes were requested";
static NSString* const AttributeEditorUnknownMessage = @"Unknown error found";

FB_LINKABLE(NSError_AttributeEditorError)
@implementation NSError (AttributeEditorError)
+ (NSError*)UID_errorWithType:(AttributeEditorErrorType)type {
  NSString* domain;
  NSString* message;
  switch (type) {
    case AttributeEditorErrorTypeMissingNodeId:
      domain = AttributeEditorErrorMissingRequiredArgumentDomain;
      message = AttributeEditorMissingNodeIdMessage;
      break;
    case AttributeEditorErrorTypeMissingMetadataIds:
      domain = AttributeEditorErrorMissingRequiredArgumentDomain;
      message = AttributeEditorMissingMetadataIdsMessage;
      break;
    case AttributeEditorErrorTypeNodeNotFound:
      domain = AttributeEditorErrorInfrastructureDomain;
      message = AttributeEditorNodeNotFoundMessage;
      break;
    case AttributeEditorErrorTypeUnknown:
      domain = AttributeEditorErrorUnknownDomain;
      message = AttributeEditorUnknownMessage;
      break;
  }
  NSDictionary* userInfo = @{NSLocalizedDescriptionKey : message};
  return [NSError errorWithDomain:domain code:type userInfo:userInfo];
}

+ (NSDictionary*)UID_errorPayloadWithType:(AttributeEditorErrorType)type {
  return [self UID_errorPayloadWithError:[NSError UID_errorWithType:type]];
}

+ (NSDictionary*)UID_errorPayloadWithError:(NSError*)error {
  return @{
    @"errorType" : [error domain],
    @"errorMesssage" : [error localizedDescription]
  };
}

@end

@interface UIDAttributeEditor () {
  __weak UIDDescriptorRegister* _descriptorRegister;
}

@end

@implementation UIDAttributeEditor

- (id)initWithDescriptorRegister:(UIDDescriptorRegister*)descriptorRegister {
  self = [super init];
  if (self) {
    _descriptorRegister = descriptorRegister;
  }

  return self;
}

+ (instancetype)attributeEditorWithDescriptorRegister:
    (UIDDescriptorRegister*)descriptorRegister {
  return [[UIDAttributeEditor alloc]
      initWithDescriptorRegister:descriptorRegister];
}

- (void)editNodeWithId:(NSString*)nodeId
                  value:(id)value
    metadataIdentifiers:(NSArray<UIDMetadataId>*)metadataIdentifiers
       compoundTypeHint:(UIDCompoundTypeHint)compoundTypeHint
                   root:(id)root
           reportResult:(ReportAttributeEditorResult)reportResult {
  UIDHierarchyTraversal* const traversal =
      [UIDHierarchyTraversal createWithDescriptorRegister:_descriptorRegister];

  __weak __typeof(self) weakSelf = self;
  UIDRunBlockOnMainThreadAsync(^{
    UIDAttributeEditor* editor = weakSelf;
    if (!editor) {
      reportResult([NSError UID_errorWithType:AttributeEditorErrorTypeUnknown]);
      return;
    }

    id<NSObject> node = [traversal findWithId:nodeId inHierarchyWithRoot:root];
    if (!node) {
      reportResult(
          [NSError UID_errorWithType:AttributeEditorErrorTypeNodeNotFound]);
      return;
    }

    UIDNodeDescriptor* descriptor =
        [editor->_descriptorRegister descriptorForClass:[node class]];

    [descriptor editAttributeForNode:node
                           withValue:value
                        metadataPath:metadataIdentifiers
                                hint:compoundTypeHint];

    reportResult(nil);
  });
}

@end

#endif
