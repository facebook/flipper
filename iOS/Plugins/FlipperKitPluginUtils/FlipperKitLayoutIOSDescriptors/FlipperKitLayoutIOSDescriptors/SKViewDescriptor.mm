/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKViewDescriptor.h"

#import <FlipperKitHighlightOverlay/SKHighlightOverlay.h>
#import <FlipperKitLayoutHelpers/FlipperKitLayoutDescriptorMapperProtocol.h>
#import <FlipperKitLayoutHelpers/SKHiddenWindow.h>
#import <FlipperKitLayoutHelpers/SKNamed.h>
#import <FlipperKitLayoutHelpers/SKObject.h>
#import <FlipperKitLayoutHelpers/UIColor+SKSonarValueCoder.h>

@implementation SKViewDescriptor

- (instancetype)initWithDescriptorMapper:
    (id<SKDescriptorMapperProtocol>)mapper {
  return [super initWithDescriptorMapper:mapper];
}

- (NSString*)identifierForNode:(UIView*)node {
  return [NSString stringWithFormat:@"%p", node];
}

- (NSUInteger)childCountForNode:(UIView*)node {
  return [[self validChildrenForNode:node] count];
}

- (id)childForNode:(UIView*)node atIndex:(NSUInteger)index {
  return [[self validChildrenForNode:node] objectAtIndex:index];
}

- (NSArray*)validChildrenForNode:(UIView*)node {
  NSMutableArray* validChildren = [NSMutableArray new];

  // Use UIViewControllers for children which responds to a different
  // viewController than their parent
  for (UIView* child in node.subviews) {
    BOOL responderIsUIViewController =
        [child.nextResponder isKindOfClass:[UIViewController class]];

    if (!child.isHidden) {
      if (responderIsUIViewController &&
          child.nextResponder != node.nextResponder) {
        [validChildren addObject:child.nextResponder];
      } else {
        [validChildren addObject:child];
      }
    }
  }

  return validChildren;
}

- (NSArray<SKNamed<NSDictionary*>*>*)dataForNode:(UIView*)node {
  return [NSArray
      arrayWithObjects:
          [SKNamed
              newWithName:@"UIView"
                withValue:@{
                  @"frame" : SKMutableObject(node.frame),
                  @"bounds" : SKObject(node.bounds),
                  @"center" : SKObject(node.center),
                  @"layoutMargins" : SKObject(node.layoutMargins),
                  @"clipsToBounds" : @(node.clipsToBounds),
                  @"alpha" : SKMutableObject(@(node.alpha)),
                  @"tag" : @(node.tag),
                  @"backgroundColor" : SKMutableObject(node.backgroundColor)
                }],
          [SKNamed
              newWithName:@"CALayer"
                withValue:@{
                  @"shadowColor" : SKMutableObject(
                      [UIColor colorWithCGColor:node.layer.shadowColor]),
                  @"shadowOpacity" :
                      SKMutableObject(@(node.layer.shadowOpacity)),
                  @"shadowRadius" : SKMutableObject(@(node.layer.shadowRadius)),
                  @"shadowOffset" : SKMutableObject(node.layer.shadowOffset),
                  @"backgroundColor" : SKMutableObject(
                      [UIColor colorWithCGColor:node.layer.backgroundColor]),
                  @"borderColor" : SKMutableObject(
                      [UIColor colorWithCGColor:node.layer.borderColor]),
                  @"borderWidth" : SKMutableObject(@(node.layer.borderWidth)),
                  @"cornerRadius" : SKMutableObject(@(node.layer.cornerRadius)),
                  @"masksToBounds" :
                      SKMutableObject(@(node.layer.masksToBounds)),
                }],
          [SKNamed newWithName:@"Accessibility"
                     withValue:@{
                       @"isAccessibilityElement" :
                           SKMutableObject(@(node.isAccessibilityElement)),
                       @"accessibilityLabel" :
                           SKMutableObject(node.accessibilityLabel ?: @""),
                       @"accessibilityIdentifier" :
                           SKMutableObject(node.accessibilityIdentifier ?: @""),
                       @"accessibilityValue" :
                           SKMutableObject(node.accessibilityValue ?: @""),
                       @"accessibilityHint" :
                           SKMutableObject(node.accessibilityHint ?: @""),
                       @"accessibilityTraits" :
                           AccessibilityTraitsDict(node.accessibilityTraits),
                       @"accessibilityViewIsModal" :
                           SKMutableObject(@(node.accessibilityViewIsModal)),
                       @"shouldGroupAccessibilityChildren" : SKMutableObject(
                           @(node.shouldGroupAccessibilityChildren)),
                     }],
          nil];
}

- (NSDictionary<NSString*, SKNodeUpdateData>*)dataMutationsForNode:
    (UIView*)node {
  NSDictionary<NSString*, SKNodeUpdateData>* dataMutations = @{
    // UIView
    @"UIView.alpha" : ^(NSNumber* value){
        node.alpha = [value floatValue];
}
,
    @"UIView.backgroundColor": ^(NSNumber *value) {
      node.backgroundColor = [UIColor fromSonarValue: value];
    },
    @"UIView.frame.origin.y": ^(NSNumber *value) {
      CGRect frame = node.frame;
      frame.origin.y = [value floatValue];
      node.frame = frame;
    },
    @"UIView.frame.origin.x": ^(NSNumber *value) {
      CGRect frame = node.frame;
      frame.origin.x = [value floatValue];
      node.frame = frame;
    },
    @"UIView.frame.size.width": ^(NSNumber *value) {
      CGRect frame = node.frame;
      frame.size.width = [value floatValue];
      node.frame = frame;
    },
    @"UIView.frame.size.height": ^(NSNumber *value) {
      CGRect frame = node.frame;
      frame.size.width = [value floatValue];
      node.frame = frame;
    },
    // CALayer
    @"CALayer.shadowColor": ^(NSNumber *value) {
      node.layer.shadowColor = [UIColor fromSonarValue:value].CGColor;
    },
    @"CALayer.shadowOpacity": ^(NSNumber *value) {
      node.layer.shadowOpacity = [value floatValue];
    },
    @"CALayer.shadowRadius": ^(NSNumber *value) {
      node.layer.shadowRadius = [value floatValue];
    },
    @"CALayer.shadowOffset.width": ^(NSNumber *value) {
      CGSize offset = node.layer.shadowOffset;
      offset.width = [value floatValue];
      node.layer.shadowOffset = offset;
    },
    @"CALayer.shadowOffset.height": ^(NSNumber *value) {
      CGSize offset = node.layer.shadowOffset;
      offset.height = [value floatValue];
      node.layer.shadowOffset = offset;
    },
    @"CALayer.backgroundColor": ^(NSNumber *value) {
      node.layer.backgroundColor = [UIColor fromSonarValue:value].CGColor;
    },
    @"CALayer.borderColor": ^(NSNumber *value) {
      node.layer.borderColor = [UIColor fromSonarValue:value].CGColor;
    },
    @"CALayer.borderWidth": ^(NSNumber *value) {
      node.layer.borderWidth = [value floatValue];
    },
    @"CALayer.cornerRadius": ^(NSNumber *value) {
      node.layer.cornerRadius = [value floatValue];
    },
    @"CALayer.masksToBounds": ^(NSNumber *value) {
      node.layer.masksToBounds = [value boolValue];
    },
    // Accessibility
    @"Accessibility.isAccessibilityElement": ^(NSNumber *value) {
      node.isAccessibilityElement = [value boolValue];
    },
    @"Accessibility.accessibilityLabel": ^(NSString *value) {
      node.accessibilityLabel = value;
    },
    @"Accessibility.accessibilityValue": ^(NSString *value) {
      node.accessibilityValue = value;
    },
    @"Accessibility.accessibilityHint": ^(NSString *value) {
      node.accessibilityHint = value;
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitButton": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitButton, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitLink": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitLink, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitHeader": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitHeader, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitSearchField": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitSearchField, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitImage": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitImage, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitSelected": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitSelected, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitPlaysSound": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitPlaysSound, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitKeyboardKey": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitKeyboardKey, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitStaticText": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitStaticText, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitSummaryElement": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitSummaryElement, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitNotEnabled": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitNotEnabled, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitUpdatesFrequently": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitUpdatesFrequently, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitStartsMediaSession": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitStartsMediaSession, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitAdjustable": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitAdjustable, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitAllowsDirectInteraction": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitAllowsDirectInteraction, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitCausesPageTurn": ^(NSNumber *value) {
      node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitCausesPageTurn, [value boolValue]);
    },
    @"Accessibility.accessibilityTraits.UIAccessibilityTraitTabBar": ^(NSNumber *value) {
      if (@available(iOS 10.0, *)) {
        node.accessibilityTraits = AccessibilityTraitsToggle(node.accessibilityTraits, UIAccessibilityTraitTabBar, [value boolValue]);
      }
    },
    @"Accessibility.accessibilityViewIsModal": ^(NSNumber *value) {
      node.accessibilityViewIsModal = [value boolValue];
    },
    @"Accessibility.shouldGroupAccessibilityChildren": ^(NSNumber *value) {
      node.shouldGroupAccessibilityChildren = [value boolValue];
    },
}
;
if (@available(iOS 10.0, *)) {
  NSMutableDictionary<NSString*, SKNodeUpdateData>* latestDataMutations =
      [dataMutations mutableCopy];
  latestDataMutations
      [@"Accessibility.accessibilityTraits.UIAccessibilityTraitTabBar"] =
          ^(NSNumber* value) {
            node.accessibilityTraits = AccessibilityTraitsToggle(
                node.accessibilityTraits,
                UIAccessibilityTraitTabBar,
                [value boolValue]);
          };
  dataMutations = latestDataMutations;
}
return dataMutations;
}

- (NSArray<SKNamed<NSString*>*>*)attributesForNode:(UIView*)node {
  return @[ [SKNamed newWithName:@"addr"
                       withValue:[NSString stringWithFormat:@"%p", node]] ];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(UIView*)node {
  SKHighlightOverlay* overlay = [SKHighlightOverlay sharedInstance];
  if (highlighted == YES) {
    [overlay mountInView:node withFrame:node.bounds];
  } else {
    [overlay unmount];
  }
}

- (UIImage*)getSnapshot:(BOOL)includeChildren forNode:(UIView*)node {
  if ([[UIScreen mainScreen] respondsToSelector:@selector(scale)]) {
    UIGraphicsBeginImageContextWithOptions(
        node.bounds.size, node.isOpaque, 0.0);
  } else {
    UIGraphicsBeginImageContext(node.bounds.size);
  }

  [node.layer renderInContext:UIGraphicsGetCurrentContext()];

  UIImage* img = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();
  return img;
}

- (void)hitTest:(SKTouch*)touch forNode:(UIView*)node {
  bool finish = true;
  for (NSInteger index = [self childCountForNode:node] - 1; index >= 0;
       index--) {
    id<NSObject> childNode = [self childForNode:node atIndex:index];
    UIView* viewForNode = nil;

    if ([childNode isKindOfClass:[UIViewController class]]) {
      UIViewController* child = (UIViewController*)childNode;
      viewForNode = child.view;
    } else {
      viewForNode = (UIView*)childNode;
    }

    if (viewForNode.isHidden || viewForNode.alpha <= 0 ||
        [[viewForNode class] isEqual:[SKHiddenWindow class]]) {
      /*SKHiddenWindow is the pink overlay which is added in window to capture
       the gestures.*/
      continue;
    }

    if ([touch containedIn:viewForNode.frame]) {
      [touch continueWithChildIndex:index withOffset:viewForNode.frame.origin];
      finish = false;
    }
  }

  if (finish) {
    [touch finish];
  }
}

/*
 Takes the originalTraits, and set all bits from toggleTraits to the toggleValue
 e.g. originalTraits = UIAccessibilityTraitButton | UIAccessibilityTraitSelected
      toggleTraits = UIAccessibilityTraitImage
      toggleValue = YES
      return value = UIAccessibilityTraitButton | UIAccessibilityTraitSelected |
 UIAccessibilityTraitImage
 */
static UIAccessibilityTraits AccessibilityTraitsToggle(
    UIAccessibilityTraits originalTraits,
    UIAccessibilityTraits toggleTraits,
    BOOL toggleValue) {
  // NEGATE all bits of toggleTraits from originalTraits and OR it against
  // either toggleTraits or 0 (UIAccessibilityTraitNone) based on toggleValue
  UIAccessibilityTraits bitsValue =
      toggleValue ? toggleTraits : UIAccessibilityTraitNone;
  return (originalTraits & ~(toggleTraits)) | bitsValue;
}

static NSDictionary* AccessibilityTraitsDict(
    UIAccessibilityTraits accessibilityTraits) {
  NSMutableDictionary* traitsDict = [NSMutableDictionary new];
  [traitsDict addEntriesFromDictionary:@{
    @"UIAccessibilityTraitButton" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitButton))),
    @"UIAccessibilityTraitLink" :
        SKMutableObject(@(!!(accessibilityTraits & UIAccessibilityTraitLink))),
    @"UIAccessibilityTraitHeader" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitHeader))),
    @"UIAccessibilityTraitSearchField" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitSearchField))),
    @"UIAccessibilityTraitImage" :
        SKMutableObject(@(!!(accessibilityTraits & UIAccessibilityTraitImage))),
    @"UIAccessibilityTraitSelected" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitSelected))),
    @"UIAccessibilityTraitPlaysSound" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitPlaysSound))),
    @"UIAccessibilityTraitKeyboardKey" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitKeyboardKey))),
    @"UIAccessibilityTraitStaticText" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitStaticText))),
    @"UIAccessibilityTraitSummaryElement" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitSummaryElement))),
    @"UIAccessibilityTraitNotEnabled" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitNotEnabled))),
    @"UIAccessibilityTraitUpdatesFrequently" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitUpdatesFrequently))),
    @"UIAccessibilityTraitStartsMediaSession" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitStartsMediaSession))),
    @"UIAccessibilityTraitAdjustable" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitAdjustable))),
    @"UIAccessibilityTraitAllowsDirectInteraction" : SKMutableObject(@(
        !!(accessibilityTraits & UIAccessibilityTraitAllowsDirectInteraction))),
    @"UIAccessibilityTraitCausesPageTurn" : SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitCausesPageTurn))),
  }];
  if (@available(iOS 10.0, *)) {
    traitsDict[@"UIAccessibilityTraitTabBar"] = SKMutableObject(
        @(!!(accessibilityTraits & UIAccessibilityTraitTabBar)));
  }
  return traitsDict;
}

@end

#endif
