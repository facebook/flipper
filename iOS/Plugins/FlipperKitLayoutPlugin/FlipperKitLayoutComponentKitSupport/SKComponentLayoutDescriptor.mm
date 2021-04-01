/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKComponentLayoutDescriptor.h"

#import <utility>
#import <vector>

#import <ComponentKit/CKComponent.h>
#import <ComponentKit/CKComponentAccessibility.h>
#import <ComponentKit/CKComponentActionInternal.h>
#import <ComponentKit/CKComponentDebugController.h>
#import <ComponentKit/CKComponentInternal.h>
#import <ComponentKit/CKComponentLayout.h>
#import <ComponentKit/CKComponentRootView.h>
#import <ComponentKit/CKFlexboxComponent.h>
#import <ComponentKit/CKInsetComponent.h>
#import <ComponentKit/CKViewConfiguration.h>

#import <FlipperKitHighlightOverlay/SKHighlightOverlay.h>
#import <FlipperKitLayoutHelpers/SKObject.h>
#import <FlipperKitLayoutTextSearchable/FKTextSearchable.h>

#import "CKComponent+Sonar.h"
#import "SKComponentLayoutWrapper.h"
#import "SKComponentMountedView.h"
#import "SKSubDescriptor.h"
#import "Utils.h"

@implementation SKComponentLayoutDescriptor

static std::vector<std::pair<NSString*, SKSubDescriptor>>& subDescriptors() {
  // Avoid a global constructor; we want to lazily initialize this when needed.
  static std::vector<std::pair<NSString*, SKSubDescriptor>> d;
  return d;
}

static std::vector<SKAttributeGenerator>& attributeGenerators() {
  // Avoid a global constructor; we want to lazily initialize this when needed.
  static std::vector<SKAttributeGenerator> d;
  return d;
}

+ (void)registerAttributeGenerator:(SKAttributeGenerator)generator {
  if (generator) {
    attributeGenerators().push_back(generator);
  }
}

+ (void)registerSubDescriptor:(SKSubDescriptor)descriptor
                      forName:(NSString*)name {
  if (name && descriptor) {
    subDescriptors().push_back({name, descriptor});
  }
}

- (NSString*)identifierForNode:(SKComponentLayoutWrapper*)node {
  return node.identifier;
}

- (NSString*)identifierForInvalidation:(SKComponentLayoutWrapper*)node {
  return [NSString stringWithFormat:@"%p", node.rootNode];
}

- (NSString*)nameForNode:(SKComponentLayoutWrapper*)node {
  return [node.component sonar_getName];
}

- (NSString*)decorationForNode:(SKComponentLayoutWrapper*)node {
  return [node.component sonar_getDecoration];
}

- (NSUInteger)childCountForNode:(SKComponentLayoutWrapper*)node {
  if (!node) {
    return 0; // -children will return garbage if invoked on nil
  }
  return node.children.match(
      [](SKLeafViewChild) -> NSUInteger { return 1; },
      [](SKMountedViewChild) -> NSUInteger { return 1; },
      [](const std::vector<SKComponentLayoutWrapper*>& components)
          -> NSUInteger { return components.size(); });
}

- (id)childForNode:(SKComponentLayoutWrapper*)node atIndex:(NSUInteger)index {
  if (!node) {
    return nil; // -children will return garbage if invoked on nil
  }
  return node.children.match(
      [](SKLeafViewChild leafView) -> id { return leafView.view; },
      [](SKMountedViewChild mountedView) -> id { return mountedView.view; },
      [&](const std::vector<SKComponentLayoutWrapper*>& components) -> id {
        return components[index];
      });
}

- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)dataForNode:
    (SKComponentLayoutWrapper*)node {
  NSMutableArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>* data =
      [NSMutableArray new];

  if (node) {
    node.flexboxChild.apply([&](const CKFlexboxComponentChild& child) {
      [data addObject:[SKNamed newWithName:@"Layout"
                                 withValue:[self propsForFlexboxChild:child]]];
    });
  }
  NSMutableDictionary<NSString*, NSObject*>* extraData =
      [[NSMutableDictionary alloc] init];

  for (const auto& pair : subDescriptors()) {
    NSString* value = pair.second(node);
    if (value) {
      [extraData setObject:value forKey:pair.first];
    }
  }
  if (extraData.count > 0) {
    [data addObject:[SKNamed newWithName:@"Extra Sections"
                               withValue:extraData]];
  }

  [data addObjectsFromArray:[node.component sonar_getData]];
  return data;
}

- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)extraInfoForNode:
    (SKComponentLayoutWrapper*)node {
  NSMutableArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>* data =
      [NSMutableArray new];
  NSMutableDictionary<NSString*, NSObject*>* metaData =
      [[NSMutableDictionary alloc] init];

  [metaData setObject:node.component.className forKey:@"className"];
  [metaData setObject:@"CK" forKey:@"framework"];

  [data addObject:[SKNamed newWithName:@"metaData" withValue:metaData]];
  return data;
}

- (NSDictionary<NSString*, NSObject*>*)propsForFlexboxChild:
    (CKFlexboxComponentChild)child {
  return @{
    @"spacingBefore" : SKObject(@(child.spacingBefore)),
    @"spacingAfter" : SKObject(@(child.spacingAfter)),
    @"flexGrow" : SKObject(@(child.flexGrow)),
    @"flexShrink" : SKObject(@(child.flexShrink)),
    @"zIndex" : SKObject(@(child.zIndex)),
    @"sizeConstraints" : SKObject(ckcomponentSize(child.sizeConstraints)),
    @"useTextRounding" : SKObject(@(child.useTextRounding)),
    @"margin" : flexboxRect(child.margin),
    @"flexBasis" : relativeDimension(child.flexBasis),
    @"padding" : flexboxRect(child.padding),
    @"alignSelf" : stringForAlignSelf(child.alignSelf),
    @"position" : @{
      @"type" : stringForFlexboxPositionType(child.position.type),
      @"start" : relativeDimension(child.position.start),
      @"top" : relativeDimension(child.position.top),
      @"end" : relativeDimension(child.position.end),
      @"bottom" : relativeDimension(child.position.bottom),
      @"left" : relativeDimension(child.position.left),
      @"right" : relativeDimension(child.position.right),
    },
    @"aspectRatio" : @(child.aspectRatio.aspectRatio()),
  };
}

- (NSDictionary<NSString*, SKNodeUpdateData>*)dataMutationsForNode:
    (SKComponentLayoutWrapper*)node {
  return [node.component sonar_getDataMutations];
}

- (NSArray<SKNamed<NSString*>*>*)attributesForNode:
    (SKComponentLayoutWrapper*)node {
  NSMutableArray<SKNamed<NSString*>*>* attributes = [NSMutableArray array];
  [attributes
      addObject:[SKNamed
                    newWithName:@"responder"
                      withValue:SKObject(NSStringFromClass(
                                    [node.component.nextResponder class]))]];
  for (SKAttributeGenerator generator : attributeGenerators()) {
    if (!generator) {
      // technically, this could be nullptr, so lets be careful.
      continue;
    }

    SKNamed* const attribute = generator(node);
    if (attribute) {
      [attributes addObject:attribute];
    }
  }
  return attributes;
}

- (void)setHighlighted:(BOOL)highlighted
               forNode:(SKComponentLayoutWrapper*)node {
  SKHighlightOverlay* overlay = [SKHighlightOverlay sharedInstance];
  if (highlighted) {
    CKComponentViewContext viewContext = node.component.viewContext;
    [overlay mountInView:viewContext.view withFrame:viewContext.frame];
  } else {
    [overlay unmount];
  }
}

- (void)hitTest:(SKTouch*)touch forNode:(SKComponentLayoutWrapper*)node {
  if (!node) {
    return; // -children will return garbage if invoked on nil
  }
  BOOL didContinueTouch = node.children.match(
      [&](SKLeafViewChild leafView) -> BOOL {
        [touch continueWithChildIndex:0 withOffset:{0, 0}];
        return YES;
      },
      [&](SKMountedViewChild mountedView) -> BOOL {
        [touch continueWithChildIndex:0 withOffset:{0, 0}];
        return YES;
      },
      [&](std::vector<SKComponentLayoutWrapper*> children) -> BOOL {
        BOOL continueTouch = NO;
        for (auto it = children.rbegin(); it != children.rend(); ++it) {
          SKComponentLayoutWrapper* wrapper = *it;
          CGRect frame = {.origin = wrapper.position, .size = wrapper.size};
          if ([touch containedIn:frame]) {
            NSUInteger index = std::distance(children.begin(), it.base()) - 1;
            [touch continueWithChildIndex:index withOffset:wrapper.position];
            continueTouch = YES;
          }
        }
        return continueTouch;
      });
  if (!didContinueTouch) {
    [touch finish];
  }
}

- (BOOL)matchesQuery:(NSString*)query forNode:(id)node {
  if ([super matchesQuery:query forNode:node]) {
    return YES;
  }
  if ([node isKindOfClass:[SKComponentLayoutWrapper class]]) {
    const auto layoutWrapper = (SKComponentLayoutWrapper*)node;
    if ([layoutWrapper.component
            conformsToProtocol:@protocol(FKTextSearchable)]) {
      NSString* text =
          ((id<FKTextSearchable>)layoutWrapper.component).searchableText;
      return [self string:text contains:query];
    }
  }
  return NO;
}

- (BOOL)string:(NSString*)string contains:(NSString*)substring {
  return string != nil && substring != nil &&
      [string rangeOfString:substring options:NSCaseInsensitiveSearch]
          .location != NSNotFound;
}

static NSString* stringForAlignSelf(CKFlexboxAlignSelf alignSelf) {
  switch (alignSelf) {
    case CKFlexboxAlignSelfAuto:
      return @"auto";
    case CKFlexboxAlignSelfStart:
      return @"start";
    case CKFlexboxAlignSelfEnd:
      return @"end";
    case CKFlexboxAlignSelfCenter:
      return @"center";
    case CKFlexboxAlignSelfBaseline:
      return @"baseline";
    case CKFlexboxAlignSelfStretch:
      return @"stretch";
  }
  return @"unknown";
}

static NSString* stringForFlexboxPositionType(CKFlexboxPositionType type) {
  switch (type) {
    case CKFlexboxPositionTypeRelative:
      return @"relative";
    case CKFlexboxPositionTypeAbsolute:
      return @"absolute";
  }
  return @"unknown";
}

@end

#endif
