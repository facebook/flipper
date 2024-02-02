/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDAttributeEditor.h"
#import "UIDDescriptorRegister.h"

static NSString* const AttributeEditorErrorMissingRequiredArgumentDomain =
    @"Missing required argument";
static NSString* const AttributeEditorErrorUnknownDomain = @"Unknown";

static NSString* const AttributeEditorMissingNodeIdMessage =
    @"Node identifier not provided";
static NSString* const AttributeEditorMissingMetadataIdsMessage =
    @"Metadata identifiers not provided";
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
  __weak UIApplication* _application;
  __weak UIDDescriptorRegister* _descriptorRegister;
}

@end

@implementation UIDAttributeEditor

- (id)initWithApplication:(UIApplication*)application
    withDescriptorRegister:(UIDDescriptorRegister*)descriptorRegister {
  self = [super init];
  if (self) {
    _application = application;
    _descriptorRegister = descriptorRegister;
  }

  return self;
}

+ (instancetype)attributeEditorForApplication:(UIApplication*)application
                       withDescriptorRegister:
                           (UIDDescriptorRegister*)descriptorRegister {
  return [[UIDAttributeEditor alloc] initWithApplication:application
                                  withDescriptorRegister:descriptorRegister];
}

- (void)editNodeWithId:(NSNumber*)nodeId
                  value:(id)value
    metadataIdentifiers:(NSArray<UIDMetadataId>*)metadataIdentifiers
       compoundTypeHint:(UIDCompoundTypeHint)compoundTypeHint
           reportResult:(ReportAttributeEditorResult)reportResult {
}

@end

#endif
