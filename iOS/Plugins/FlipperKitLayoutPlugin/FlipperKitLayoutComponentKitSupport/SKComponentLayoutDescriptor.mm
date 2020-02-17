/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKComponentLayoutDescriptor.h"

#import <ComponentKit/CKComponent.h>
#import <ComponentKit/CKComponentAccessibility.h>
#import <ComponentKit/CKComponentActionInternal.h>
#import <ComponentKit/CKComponentDebugController.h>
#import <ComponentKit/CKComponentInternal.h>
#import <ComponentKit/CKComponentLayout.h>
#import <ComponentKit/CKComponentRootView.h>
#import <ComponentKit/CKComponentViewConfiguration.h>
#import <ComponentKit/CKFlexboxComponent.h>
#import <ComponentKit/CKInsetComponent.h>

#import <FlipperKitHighlightOverlay/SKHighlightOverlay.h>
#import <FlipperKitLayoutPlugin/SKObject.h>
#import <FlipperKitLayoutTextSearchable/FKTextSearchable.h>

#import "CKComponent+Sonar.h"
#import "SKComponentLayoutWrapper.h"
#import "SKSubDescriptor.h"
#import "Utils.h"

@implementation SKComponentLayoutDescriptor {
  NSDictionary<NSNumber*, NSString*>* CKFlexboxAlignSelfEnumMap;
  NSDictionary<NSNumber*, NSString*>* CKFlexboxPositionTypeEnumMap;
  NSArray<SKSubDescriptor*>* _registeredSubdescriptors;
}

- (void)setUp {
  [super setUp];

  if (!_registeredSubdescriptors) {
    _registeredSubdescriptors = [NSArray new];
  }

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    [self initEnumMaps];
  });
}

- (void)initEnumMaps {
  CKFlexboxAlignSelfEnumMap = @{
    @(CKFlexboxAlignSelfAuto) : @"auto",
    @(CKFlexboxAlignSelfStart) : @"start",
    @(CKFlexboxAlignSelfEnd) : @"end",
    @(CKFlexboxAlignSelfCenter) : @"center",
    @(CKFlexboxAlignSelfBaseline) : @"baseline",
    @(CKFlexboxAlignSelfStretch) : @"stretch",
  };

  CKFlexboxPositionTypeEnumMap = @{
    @(CKFlexboxPositionTypeRelative) : @"relative",
    @(CKFlexboxPositionTypeAbsolute) : @"absolute",
  };
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
  NSUInteger count = node.children.size();
  if (count == 0) {
    count = node.component.viewContext.view ? 1 : 0;
  }
  return count;
}

- (id)childForNode:(SKComponentLayoutWrapper*)node atIndex:(NSUInteger)index {
  if (node.children.size() == 0) {
    if (node.rootNode == node.component.viewContext.view) {
      return nil;
    }
    return node.component.viewContext.view;
  }
  return node.children[index];
}

- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)dataForNode:
    (SKComponentLayoutWrapper*)node {
  NSMutableArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>* data =
      [NSMutableArray new];

  if (node.isFlexboxChild) {
    [data
        addObject:[SKNamed
                      newWithName:@"Layout"
                        withValue:[self
                                      propsForFlexboxChild:node.flexboxChild]]];
  }
  NSMutableDictionary<NSString*, NSObject*>* extraData =
      [[NSMutableDictionary alloc] init];

  for (SKSubDescriptor* s in _registeredSubdescriptors) {
    [extraData setObject:[s getDataForNode:node] forKey:[s getName]];
  }
  if (extraData.count > 0) {
    [data addObject:[SKNamed newWithName:@"Extra Sections"
                               withValue:extraData]];
  }

  [data addObjectsFromArray:[node.component sonar_getData]];
  return data;
}

- (void)addSubDescriptors:(nonnull NSArray<SKSubDescriptor*>*)subDescriptors {
  _registeredSubdescriptors = subDescriptors;
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
    @"alignSelf" : CKFlexboxAlignSelfEnumMap[@(child.alignSelf)],
    @"position" : @{
      @"type" : CKFlexboxPositionTypeEnumMap[@(child.position.type)],
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
  if (node.children.size() == 0) {
    UIView* componentView = node.component.viewContext.view;
    if (componentView != nil) {
      if ([touch containedIn:componentView.bounds]) {
        [touch continueWithChildIndex:0 withOffset:componentView.bounds.origin];
        return;
      }
    }
  }

  NSInteger index = 0;
  for (index = node.children.size() - 1; index >= 0; index--) {
    const auto child = node.children[index];

    CGRect frame = {.origin = child.position, .size = child.size};

    if ([touch containedIn:frame]) {
      [touch continueWithChildIndex:index withOffset:child.position];
      return;
    }
  }

  [touch finish];
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

@end

#endif
