/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDInspectable.h"
#import "UIDMetadata.h"
#import "UIDMetadataRegister.h"
#import "UIDSnapshot.h"
#import "UIView+UIDDescriptor.h"

FB_LINKABLE(UIView_UIDDescriptor)
@implementation UIView (UIDDescriptor)

- (NSUInteger)UID_identifier {
  return [self hash];
}

- (nonnull NSString*)UID_name {
  return NSStringFromClass([self class]);
}

- (void)UID_aggregateAttributes:(nonnull UIDMutableAttributes*)attributes {
  static UIDMetadataId UIViewAttributeId;
  static UIDMetadataId FrameAttributeId;
  static UIDMetadataId BoundsAttributeId;
  static UIDMetadataId CenterAttributeId;
  static UIDMetadataId AnchorPointAttributeId;
  static UIDMetadataId SafeAreaInsetsAttributeId;
  static UIDMetadataId ClipsToBoundsAttributeId;
  static UIDMetadataId HiddenAttributeId;
  static UIDMetadataId AlphaAttributeId;
  static UIDMetadataId OpaqueAttributeId;
  static UIDMetadataId ClearContextBeforeDrawingAttributeId;
  static UIDMetadataId BackgroundColorAttributeId;
  static UIDMetadataId TintColorAttributeId;
  static UIDMetadataId TagAttributeId;

  static UIDMetadataId CALayerAttributeId;
  static UIDMetadataId CALayerShadowColorAttributeId;
  static UIDMetadataId CALayerShadowOpacityAttributeId;
  static UIDMetadataId CALayerShadowRadiusAttributeId;
  static UIDMetadataId CALayerShadowOffsetAttributeId;
  static UIDMetadataId CALayerBackgroundColorAttributeId;
  static UIDMetadataId CALayerBorderColorAttributeId;
  static UIDMetadataId CALayerBorderWidthAttributeId;
  static UIDMetadataId CALayerCornerRadiusAttributeId;
  static UIDMetadataId CALayerMasksToBoundsAttributeId;

  static UIDMetadataId AccessibilityAttributeId;
  static UIDMetadataId IsAccessibilityElementAttributeId;
  static UIDMetadataId AccessibilityLabelAttributeId;
  static UIDMetadataId AccessibilityIdentifierAttributeId;
  static UIDMetadataId AccessibilityValueAttributeId;
  static UIDMetadataId AccessibilityHintAttributeId;
  static UIDMetadataId AccessibilityTraitsAttributeId;
  static UIDMetadataId AccessibilityViewIsModalAttributeId;
  static UIDMetadataId ShouldGroupAccessibilityChildrenAttributeId;

  static UIDMetadataId AccessibilityTraitNoneAttributeId;
  static UIDMetadataId AccessibilityTraitButtonAttributeId;
  static UIDMetadataId AccessibilityTraitLinkAttributeId;
  static UIDMetadataId AccessibilityTraitImageAttributeId;
  static UIDMetadataId AccessibilityTraitSearchFieldAttributeId;
  static UIDMetadataId AccessibilityTraitKeyboardKeyAttributeId;
  static UIDMetadataId AccessibilityTraitStaticTextAttributeId;
  static UIDMetadataId AccessibilityTraitHeaderAttributeId;
  static UIDMetadataId AccessibilityTraitTabBarAttributeId;
  static UIDMetadataId AccessibilityTraitSummaryElementAttributeId;
  static UIDMetadataId AccessibilityTraitSelectedAttributeId;
  static UIDMetadataId AccessibilityTraitNotEnabledAttributeId;
  static UIDMetadataId AccessibilityTraitAdjustableAttributeId;
  static UIDMetadataId AccessibilityTraitAllowsDirectInteractionAttributeId;
  static UIDMetadataId AccessibilityTraitUpdatesFrequentlyAttributeId;
  static UIDMetadataId AccessibilityTraitCausesPageTurnAttributeId;
  static UIDMetadataId AccessibilityTraitPlaysSoundAttributeId;
  static UIDMetadataId AccessibilityTraitStartsMediaSessionAttributeId;

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    UIViewAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"UIView"];
    FrameAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_LAYOUT
                            name:@"frame"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    BoundsAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_LAYOUT
                            name:@"bounds"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    CenterAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_LAYOUT
                            name:@"center"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    AnchorPointAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_LAYOUT
                            name:@"anchorPoint"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    SafeAreaInsetsAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_LAYOUT
                            name:@"safeAreaInset"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    ClipsToBoundsAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_LAYOUT
                            name:@"clipsToBounds"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    HiddenAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"hidden"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    AlphaAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"alpha"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    OpaqueAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"opaque"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    ClearContextBeforeDrawingAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"clearContextBeforeDrawing"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    BackgroundColorAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"backgroundColor"
                       isMutable:false
                       definedBy:UIViewAttributeId];
    TintColorAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"tintColor"
                       isMutable:false
                       definedBy:UIViewAttributeId];

    TagAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"tag"
                       isMutable:false
                       definedBy:UIViewAttributeId];

    CALayerAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"CALayer"];

    CALayerShadowColorAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"shadowColor"
                       isMutable:false
                       definedBy:CALayerAttributeId];
    CALayerShadowOpacityAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"shadowOpacity"
                       isMutable:false
                       definedBy:CALayerAttributeId];
    CALayerShadowRadiusAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"shadowRadius"
                       isMutable:false
                       definedBy:CALayerAttributeId];
    CALayerShadowOffsetAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"shadowOffset"
                       isMutable:false
                       definedBy:CALayerAttributeId];
    CALayerBackgroundColorAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"shadowBackgroundColor"
                       isMutable:false
                       definedBy:CALayerAttributeId];
    CALayerBorderColorAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"borderColor"
                       isMutable:false
                       definedBy:CALayerAttributeId];
    CALayerBorderWidthAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"borderWidth"
                       isMutable:false
                       definedBy:CALayerAttributeId];
    CALayerCornerRadiusAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"cornerRadius"
                       isMutable:false
                       definedBy:CALayerAttributeId];
    CALayerMasksToBoundsAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"masksToBounds"
                       isMutable:false
                       definedBy:CALayerAttributeId];

    AccessibilityAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"Accessibility"];

    IsAccessibilityElementAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"isAccessibilityElement"
                       isMutable:false
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

    AccessibilityTraitNoneAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"none"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitButtonAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"button"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitLinkAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"link"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitImageAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"image"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitSearchFieldAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"searchField"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitKeyboardKeyAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"keyboardKey"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitStaticTextAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"staticText"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitHeaderAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"header"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitTabBarAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"tabBar"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitSummaryElementAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"summaryElement"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitSelectedAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"selected"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitNotEnabledAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"notEnabled"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitAdjustableAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"adjustable"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitAllowsDirectInteractionAttributeId =
        [[UIDMetadataRegister shared]
            registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                                name:@"directInteraction"
                           isMutable:false
                           definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitUpdatesFrequentlyAttributeId =
        [[UIDMetadataRegister shared]
            registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                                name:@"updatedFrequently"
                           isMutable:false
                           definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitCausesPageTurnAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"causesPageTurn"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitPlaysSoundAttributeId = [[UIDMetadataRegister shared]
        registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                            name:@"playsSound"
                       isMutable:false
                       definedBy:AccessibilityTraitsAttributeId];
    AccessibilityTraitStartsMediaSessionAttributeId =
        [[UIDMetadataRegister shared]
            registerMetadataWithType:UIDEBUGGER_METADATA_TYPE_ATTRIBUTE
                                name:@"startsMediaSession"
                           isMutable:false
                           definedBy:AccessibilityTraitsAttributeId];
  });

  NSMutableDictionary* viewAttributes = [NSMutableDictionary new];

  [viewAttributes setObject:[UIDInspectableBounds fromRect:self.frame]
                     forKey:FrameAttributeId];
  [viewAttributes setObject:[UIDInspectableBounds fromRect:self.bounds]
                     forKey:BoundsAttributeId];
  [viewAttributes setObject:[UIDInspectableCoordinate fromPoint:self.center]
                     forKey:CenterAttributeId];
  if (@available(iOS 16.0, *)) {
    [viewAttributes
        setObject:[UIDInspectableCoordinate fromPoint:self.anchorPoint]
           forKey:AnchorPointAttributeId];
  }
  [viewAttributes
      setObject:[UIDInspectableEdgeInsets fromUIEdgeInsets:self.safeAreaInsets]
         forKey:SafeAreaInsetsAttributeId];
  [viewAttributes
      setObject:[UIDInspectableBoolean fromBoolean:self.clipsToBounds]
         forKey:ClipsToBoundsAttributeId];
  [viewAttributes setObject:[UIDInspectableBoolean fromBoolean:self.isHidden]
                     forKey:HiddenAttributeId];
  [viewAttributes setObject:[UIDInspectableNumber fromCGFloat:self.alpha]
                     forKey:AlphaAttributeId];
  [viewAttributes setObject:[UIDInspectableBoolean fromBoolean:self.opaque]
                     forKey:OpaqueAttributeId];
  [viewAttributes setObject:[UIDInspectableBoolean
                                fromBoolean:self.clearsContextBeforeDrawing]
                     forKey:ClearContextBeforeDrawingAttributeId];
  [viewAttributes setObject:[UIDInspectableColor fromColor:self.backgroundColor]
                     forKey:BackgroundColorAttributeId];
  [viewAttributes setObject:[UIDInspectableColor fromColor:self.tintColor]
                     forKey:TintColorAttributeId];
  [viewAttributes setObject:[UIDInspectableNumber fromNumber:@(self.tag)]
                     forKey:TagAttributeId];

  [attributes setObject:[UIDInspectableObject fromFields:viewAttributes]
                 forKey:UIViewAttributeId];

  NSMutableDictionary* layerAttributes = [NSMutableDictionary new];

  [layerAttributes
      setObject:[UIDInspectableColor
                    fromColor:[UIColor colorWithCGColor:self.layer.shadowColor]]
         forKey:CALayerShadowColorAttributeId];
  [layerAttributes
      setObject:[UIDInspectableNumber fromCGFloat:self.layer.shadowOpacity]
         forKey:CALayerShadowOpacityAttributeId];
  [layerAttributes
      setObject:[UIDInspectableNumber fromCGFloat:self.layer.shadowRadius]
         forKey:CALayerShadowRadiusAttributeId];
  [layerAttributes
      setObject:[UIDInspectableSize fromSize:self.layer.shadowOffset]
         forKey:CALayerShadowOffsetAttributeId];
  [layerAttributes
      setObject:[UIDInspectableColor
                    fromColor:[UIColor
                                  colorWithCGColor:self.layer.backgroundColor]]
         forKey:CALayerBackgroundColorAttributeId];
  [layerAttributes
      setObject:[UIDInspectableColor
                    fromColor:[UIColor colorWithCGColor:self.layer.borderColor]]
         forKey:CALayerBorderColorAttributeId];
  [layerAttributes
      setObject:[UIDInspectableNumber fromCGFloat:self.layer.borderWidth]
         forKey:CALayerBorderWidthAttributeId];
  [layerAttributes
      setObject:[UIDInspectableNumber fromCGFloat:self.layer.cornerRadius]
         forKey:CALayerCornerRadiusAttributeId];
  [layerAttributes
      setObject:[UIDInspectableBoolean fromBoolean:self.layer.masksToBounds]
         forKey:CALayerMasksToBoundsAttributeId];

  [attributes setObject:[UIDInspectableObject fromFields:layerAttributes]
                 forKey:CALayerAttributeId];

  NSMutableDictionary* accessibilityAttributes = [NSMutableDictionary new];

  [accessibilityAttributes
      setObject:[UIDInspectableBoolean fromBoolean:self.isAccessibilityElement]
         forKey:IsAccessibilityElementAttributeId];
  [accessibilityAttributes
      setObject:[UIDInspectableText fromText:self.accessibilityLabel]
         forKey:AccessibilityLabelAttributeId];
  [accessibilityAttributes
      setObject:[UIDInspectableText fromText:self.accessibilityIdentifier]
         forKey:AccessibilityIdentifierAttributeId];
  [accessibilityAttributes
      setObject:[UIDInspectableText fromText:self.accessibilityValue]
         forKey:AccessibilityValueAttributeId];
  [accessibilityAttributes
      setObject:[UIDInspectableText fromText:self.accessibilityHint]
         forKey:AccessibilityHintAttributeId];
  [accessibilityAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:self.accessibilityViewIsModal]
         forKey:AccessibilityViewIsModalAttributeId];
  [accessibilityAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:self.shouldGroupAccessibilityChildren]
         forKey:ShouldGroupAccessibilityChildrenAttributeId];

  NSMutableDictionary* accessibilityTraitsAttributes =
      [NSMutableDictionary new];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean fromBoolean:(self.accessibilityTraits &
                                                    UIAccessibilityTraitNone)]
         forKey:AccessibilityTraitNoneAttributeId];

  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean fromBoolean:(self.accessibilityTraits &
                                                    UIAccessibilityTraitButton)]
         forKey:AccessibilityTraitButtonAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean fromBoolean:(self.accessibilityTraits &
                                                    UIAccessibilityTraitLink)]
         forKey:AccessibilityTraitLinkAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean fromBoolean:(self.accessibilityTraits &
                                                    UIAccessibilityTraitImage)]
         forKey:AccessibilityTraitImageAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitSearchField)]
         forKey:AccessibilityTraitSearchFieldAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitKeyboardKey)]
         forKey:AccessibilityTraitKeyboardKeyAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitStaticText)]
         forKey:AccessibilityTraitStaticTextAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean fromBoolean:(self.accessibilityTraits &
                                                    UIAccessibilityTraitHeader)]
         forKey:AccessibilityTraitHeaderAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean fromBoolean:(self.accessibilityTraits &
                                                    UIAccessibilityTraitTabBar)]
         forKey:AccessibilityTraitTabBarAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitSummaryElement)]
         forKey:AccessibilityTraitSummaryElementAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitSelected)]
         forKey:AccessibilityTraitSelectedAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitNotEnabled)]
         forKey:AccessibilityTraitNotEnabledAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitAdjustable)]
         forKey:AccessibilityTraitAdjustableAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitAllowsDirectInteraction)]
         forKey:AccessibilityTraitAllowsDirectInteractionAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitUpdatesFrequently)]
         forKey:AccessibilityTraitUpdatesFrequentlyAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitCausesPageTurn)]
         forKey:AccessibilityTraitCausesPageTurnAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitPlaysSound)]
         forKey:AccessibilityTraitPlaysSoundAttributeId];
  [accessibilityTraitsAttributes
      setObject:[UIDInspectableBoolean
                    fromBoolean:(self.accessibilityTraits &
                                 UIAccessibilityTraitStartsMediaSession)]
         forKey:AccessibilityTraitStartsMediaSessionAttributeId];

  [accessibilityAttributes
      setObject:[UIDInspectableObject fromFields:accessibilityTraitsAttributes]
         forKey:AccessibilityTraitsAttributeId];

  [attributes
      setObject:[UIDInspectableObject fromFields:accessibilityAttributes]
         forKey:AccessibilityAttributeId];
}

- (NSArray<id<NSObject>>*)UID_children {
  NSMutableArray* children = [NSMutableArray new];

  // Use UIViewControllers for children which responds to a different
  // view controller than their parent.
  for (UIView* child in self.subviews) {
    BOOL isController =
        [child.nextResponder isKindOfClass:[UIViewController class]];

    if (!child.isHidden) {
      if (isController && child.nextResponder != self.nextResponder) {
        [children addObject:child.nextResponder];
      } else {
        [children addObject:child];
      }
    }
  }

  return children;
}

/**
  In the context of UIView, the active child is defined as the last view in
  the subviews collection. If said item's next responder is a UIViewController,
  then return this instead.
 */
- (id<NSObject>)UID_activeChild {
  if (self.subviews && self.subviews.count > 0) {
    UIView* activeChild = [self.subviews lastObject];
    BOOL isController =
        [activeChild.nextResponder isKindOfClass:[UIViewController class]];

    if (!activeChild.isHidden) {
      if (isController && activeChild.nextResponder != self.nextResponder) {
        return activeChild.nextResponder;
      }
      return activeChild;
    }
  }
  return nil;
}

- (UIImage*)UID_snapshot {
  return UIDViewSnapshot(self);
}

- (UIDBounds*)UID_bounds {
  if ([self.superview isKindOfClass:[UIScrollView class]]) {
    UIScrollView* parent = (UIScrollView*)self.superview;

    CGFloat x = self.frame.origin.x - parent.contentOffset.x;
    CGFloat y = self.frame.origin.y - parent.contentOffset.y;
    CGFloat width = self.frame.size.width;
    CGFloat height = self.frame.size.height;

    return [UIDBounds fromRect:CGRectMake(x, y, width, height)];
  }

  return [UIDBounds fromRect:self.frame];
}

@end

#endif
