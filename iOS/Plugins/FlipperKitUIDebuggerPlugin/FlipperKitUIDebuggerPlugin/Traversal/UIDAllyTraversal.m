/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "UIDAllyTraversal.h"
#import "UIDDescriptorRegister.h"
#import "UIDMetadataRegister.h"
#import "UIDNode.h"

@interface UIAccessibilityElementTraversalOptions : NSObject
+ (instancetype)defaultVoiceOverOptions;
+ (instancetype)voiceOverOptionsIncludingElementsFromOpaqueProviders:(BOOL)arg1
                                                        honorsGroups:(BOOL)arg2;
@end

@interface UIApplication (Ally)
- (NSArray*)_accessibilityLeafDescendantsWithOptions:
    (UIAccessibilityElementTraversalOptions*)option;
@end

@implementation UIDAllyTraversal {
  UIDDescriptorRegister* _descriptorRegister;
}

+ (BOOL)isSupported {
  return _loadAccessibilityFramework() &&
      [UIApplication.sharedApplication
             respondsToSelector:@selector
             (_accessibilityLeafDescendantsWithOptions:)];
}

- (instancetype)initWithDescriptorRegister:
    (UIDDescriptorRegister*)descriptorRegister {
  self = [super init];
  if (self) {
    _descriptorRegister = descriptorRegister;
  }
  return self;
}

- (NSArray<UIDNode*>*)traverse:(UIApplication*)application root:(id)root {
  if (!root) {
    return @[];
  }

  if (!_loadAccessibilityFramework()) {
    return @[];
  }

  // create voice over representation of the app
  id options = [NSClassFromString(@"UIAccessibilityElementTraversalOptions")
      voiceOverOptionsIncludingElementsFromOpaqueProviders:YES
                                              honorsGroups:NO];
  if (![application respondsToSelector:@selector
                    (_accessibilityLeafDescendantsWithOptions:)]) {
    return @[];
  }
  NSArray<NSObject*>* const allyNodes = [[application
      _accessibilityLeafDescendantsWithOptions:options] mutableCopy];

  UIDNode* rootNode = [self _uidNodeForNode:root];
  NSInteger rootIdentifier = rootNode.identifier;

  NSMutableArray<UIDNode*>* nodes = [NSMutableArray new];
  NSMutableArray* childrenIds = [NSMutableArray new];
  for (NSObject* node in allyNodes) {
    UIDNode* uidNode = [self _uidNodeForNode:node];
    uidNode.parent = @(rootIdentifier);
    [nodes addObject:uidNode];
    [childrenIds addObject:[NSNumber numberWithUnsignedInt:uidNode.identifier]];
  }
  rootNode.children = childrenIds;
  [nodes insertObject:rootNode atIndex:0];
  return nodes;
}

- (UIDNode*)_uidNodeForNode:(NSObject*)node {
  UIDNodeDescriptor* descriptor =
      [_descriptorRegister descriptorForClass:[node class]];
  NSUInteger nodeIdentifier = [descriptor identifierForNode:node];
  UIDNode* uidNode = [[UIDNode alloc]
      initWithIdentifier:nodeIdentifier
           qualifiedName:[descriptor nameForNode:node]
                    name:_nameForNode(node)
                  bounds:[UIDBounds fromRect:node.accessibilityFrame]
                    tags:[descriptor tagsForNode:node]];
  uidNode.attributes = _atrtibutesForNode(node);
  return uidNode;
}

static BOOL _loadAccessibilityFramework(void) {
  static BOOL isAccessibilityFrameworkLoaded;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    NSURL* const knownFrameworkUrl =
        [NSBundle bundleForClass:UIApplication.class].bundleURL;
    if (!knownFrameworkUrl) {
      isAccessibilityFrameworkLoaded = NO;
    } else {
      NSURL* const accessibilityFrameworkUrl =
          [knownFrameworkUrl.URLByDeletingLastPathComponent
                  .URLByDeletingLastPathComponent
              URLByAppendingPathComponent:
                  @"PrivateFrameworks/UIAccessibility.framework"];
      isAccessibilityFrameworkLoaded =
          [[NSBundle bundleWithURL:accessibilityFrameworkUrl] load];
    }
  });
  return isAccessibilityFrameworkLoaded;
}

static NSString* _nameForNode(NSObject* node) {
  NSMutableArray* const parts = [NSMutableArray new];
  if (node.accessibilityLabel.length > 0) {
    [parts addObject:node.accessibilityLabel];
  }
  if (node.accessibilityValue.length > 0) {
    [parts addObject:node.accessibilityValue];
  }
  if (parts.count == 0) {
    return @"[No accessibility label]";
  }
  NSString* const emojiTraits =
      _descriptionFromTraits(node.accessibilityTraits, YES);
  NSString* const fullNodeName = [parts componentsJoinedByString:@", "];
  return emojiTraits
      ? [NSString stringWithFormat:@"%@: %@", emojiTraits, fullNodeName]
      : fullNodeName;
}

static UIDAttributes* _atrtibutesForNode(NSObject* node) {
  static UIDMetadataId ClassAttributeId;
  static UIDMetadataId AddressAttributeId;
  static UIDMetadataId AccessibilityAttributeId;
  static UIDMetadataId IsAccessibilityElementAttributeId;
  static UIDMetadataId AccessibilityLabelAttributeId;
  static UIDMetadataId AccessibilityIdentifierAttributeId;
  static UIDMetadataId AccessibilityValueAttributeId;
  static UIDMetadataId AccessibilityHintAttributeId;
  static UIDMetadataId AccessibilityTraitsAttributeId;
  static UIDMetadataId AccessibilityViewIsModalAttributeId;
  static UIDMetadataId ShouldGroupAccessibilityChildrenAttributeId;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    UIDMetadataRegister* const metadataRegister = [UIDMetadataRegister shared];
    AccessibilityAttributeId = [metadataRegister
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"Accessibility"];
    AddressAttributeId = [metadataRegister
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"Address"
                       isMutable:NO
                       definedBy:AccessibilityAttributeId];
    ClassAttributeId = [metadataRegister
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"Class"
                       isMutable:NO
                       definedBy:AccessibilityAttributeId];
    IsAccessibilityElementAttributeId = [metadataRegister
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"isAccessibilityElement"
                       isMutable:NO
                       definedBy:AccessibilityAttributeId];
    AccessibilityLabelAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"accessibilityLabel"
                       isMutable:false
                       definedBy:AccessibilityAttributeId];
    AccessibilityIdentifierAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"accessibilityIdentifier"
                       isMutable:false
                       definedBy:AccessibilityAttributeId];
    AccessibilityValueAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"accessibilityValue"
                       isMutable:false
                       definedBy:AccessibilityAttributeId];
    AccessibilityHintAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"accessibilityHint"
                       isMutable:false
                       definedBy:AccessibilityAttributeId];
    AccessibilityTraitsAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"accessibilityTraits"
                       isMutable:false
                       definedBy:AccessibilityAttributeId];
    AccessibilityViewIsModalAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"accessibilityViewIsModal"
                       isMutable:false
                       definedBy:AccessibilityAttributeId];
    ShouldGroupAccessibilityChildrenAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"shouldGroupAccessibilityChildren"
                       isMutable:false
                       definedBy:AccessibilityAttributeId];
  });

  NSMutableDictionary* const accessibilityAttributes =
      [NSMutableDictionary new];
  accessibilityAttributes[ClassAttributeId] =
      [UIDInspectableText fromText:NSStringFromClass(node.class)];
  accessibilityAttributes[AddressAttributeId] =
      [UIDInspectableText fromText:[NSString stringWithFormat:@"%p", node]];
  accessibilityAttributes[IsAccessibilityElementAttributeId] =
      [UIDInspectableBoolean fromBoolean:node.isAccessibilityElement];
  accessibilityAttributes[IsAccessibilityElementAttributeId] =
      [UIDInspectableBoolean fromBoolean:node.isAccessibilityElement];
  accessibilityAttributes[AccessibilityLabelAttributeId] =
      [UIDInspectableText fromText:node.accessibilityLabel];
  if ([node conformsToProtocol:@protocol(UIAccessibilityIdentification)]) {
    accessibilityAttributes[AccessibilityIdentifierAttributeId] =
        [UIDInspectableText fromText:((id<UIAccessibilityIdentification>)node)
                                         .accessibilityIdentifier];
  }
  accessibilityAttributes[AccessibilityValueAttributeId] =
      [UIDInspectableText fromText:node.accessibilityValue];
  if (node.accessibilityHint != nil) {
    accessibilityAttributes[AccessibilityHintAttributeId] =
        [UIDInspectableText fromText:node.accessibilityHint];
  }
  accessibilityAttributes[AccessibilityViewIsModalAttributeId] =
      [UIDInspectableBoolean fromBoolean:node.accessibilityViewIsModal];
  accessibilityAttributes[ShouldGroupAccessibilityChildrenAttributeId] =
      [UIDInspectableBoolean fromBoolean:node.shouldGroupAccessibilityChildren];
  accessibilityAttributes[AccessibilityTraitsAttributeId] = [UIDInspectableText
      fromText:_descriptionFromTraits(node.accessibilityTraits, NO)];
  return @{
    AccessibilityAttributeId :
        [UIDInspectableObject fromFields:accessibilityAttributes]
  };
}

static NSString* _Nullable _descriptionFromTraits(
    UIAccessibilityTraits traits,
    BOOL emojiOnly) {
  if (traits == UIAccessibilityTraitNone) {
    return emojiOnly ? nil : @"None";
  }
  static NSArray* allTraits;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    allTraits = @[
      @(UIAccessibilityTraitButton),
      @(UIAccessibilityTraitLink),
      @(UIAccessibilityTraitHeader),
      @(UIAccessibilityTraitSearchField),
      @(UIAccessibilityTraitImage),
      @(UIAccessibilityTraitSelected),
      @(UIAccessibilityTraitPlaysSound),
      @(UIAccessibilityTraitKeyboardKey),
      @(UIAccessibilityTraitStaticText),
      @(UIAccessibilityTraitSummaryElement),
      @(UIAccessibilityTraitNotEnabled),
      @(UIAccessibilityTraitUpdatesFrequently),
      @(UIAccessibilityTraitStartsMediaSession),
      @(UIAccessibilityTraitAdjustable),
      @(UIAccessibilityTraitAllowsDirectInteraction),
      @(UIAccessibilityTraitCausesPageTurn),
      @(UIAccessibilityTraitTabBar),
    ];
  });
  NSMutableArray* descriptionComponents = [NSMutableArray new];
  for (NSNumber* wrappedTrait in allTraits) {
    UIAccessibilityTraits trait = wrappedTrait.unsignedIntegerValue;
    if ((traits & trait) == trait) {
      NSString* traitDescription = emojiOnly
          ? _emojiFromTrait(trait)
          : [NSString stringWithFormat:@"%@ - %@",
                                       _emojiFromTrait(trait),
                                       _descriptionFromTrait(trait)];
      if (traitDescription) {
        [descriptionComponents addObject:traitDescription];
      }
    }
  }
  return descriptionComponents.count > 0
      ? [descriptionComponents componentsJoinedByString:@", "]
      : (emojiOnly ? nil : @"None");
}

static NSString* _Nullable _descriptionFromTrait(UIAccessibilityTraits trait) {
  if (trait == UIAccessibilityTraitButton) {
    return @"button";
  } else if (trait == UIAccessibilityTraitLink) {
    return @"link";
  } else if (trait == UIAccessibilityTraitHeader) {
    return @"header";
  } else if (trait == UIAccessibilityTraitSearchField) {
    return @"search field";
  } else if (trait == UIAccessibilityTraitImage) {
    return @"image";
  } else if (trait == UIAccessibilityTraitSelected) {
    return @"selected";
  } else if (trait == UIAccessibilityTraitPlaysSound) {
    return @"plays sound";
  } else if (trait == UIAccessibilityTraitKeyboardKey) {
    return @"keyboard key";
  } else if (trait == UIAccessibilityTraitStaticText) {
    return @"static text";
  } else if (trait == UIAccessibilityTraitSummaryElement) {
    return @"summary element";
  } else if (trait == UIAccessibilityTraitNotEnabled) {
    return @"not enabled";
  } else if (trait == UIAccessibilityTraitUpdatesFrequently) {
    return @"updates frequently";
  } else if (trait == UIAccessibilityTraitStartsMediaSession) {
    return @"starts media session";
  } else if (trait == UIAccessibilityTraitAdjustable) {
    return @"adjustable";
  } else if (trait == UIAccessibilityTraitAllowsDirectInteraction) {
    return @"allows direct interaction";
  } else if (trait == UIAccessibilityTraitCausesPageTurn) {
    return @"causes page turn";
  } else if (trait == UIAccessibilityTraitTabBar) {
    return @"tab tar";
  }
  return nil;
}

static NSString* _Nullable _emojiFromTrait(UIAccessibilityTraits trait) {
  if (trait == UIAccessibilityTraitButton) {
    return @"🆗";
  } else if (trait == UIAccessibilityTraitLink) {
    return @"🔗";
  } else if (trait == UIAccessibilityTraitHeader) {
    return @"🏷️";
  } else if (trait == UIAccessibilityTraitSearchField) {
    return @"🔍";
  } else if (trait == UIAccessibilityTraitImage) {
    return @"🖼️";
  } else if (trait == UIAccessibilityTraitSelected) {
    return @"✅";
  } else if (trait == UIAccessibilityTraitPlaysSound) {
    return @"🔊";
  } else if (trait == UIAccessibilityTraitKeyboardKey) {
    return @"⌨️";
  } else if (trait == UIAccessibilityTraitStaticText) {
    return @"📄";
  } else if (trait == UIAccessibilityTraitSummaryElement) {
    return @"ℹ️";
  } else if (trait == UIAccessibilityTraitNotEnabled) {
    return @"❌";
  } else if (trait == UIAccessibilityTraitUpdatesFrequently) {
    return @"🔄";
  } else if (trait == UIAccessibilityTraitStartsMediaSession) {
    return @"🎬";
  } else if (trait == UIAccessibilityTraitAdjustable) {
    return @"🔧";
  } else if (trait == UIAccessibilityTraitAllowsDirectInteraction) {
    return @"👆";
  } else if (trait == UIAccessibilityTraitCausesPageTurn) {
    return @"📖";
  } else if (trait == UIAccessibilityTraitTabBar) {
    return @"🗂️";
  }
  return nil;
}
@end

#endif
