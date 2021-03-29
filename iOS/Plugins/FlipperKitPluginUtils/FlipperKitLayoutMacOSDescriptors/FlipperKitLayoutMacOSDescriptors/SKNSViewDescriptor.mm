/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKNSViewDescriptor.h"

#import <FlipperKitHighlightOverlay/SKHighlightOverlay.h>
#import <FlipperKitLayoutHelpers/FlipperKitLayoutDescriptorMapperProtocol.h>
#import <FlipperKitLayoutHelpers/NSColor+SKSonarValueCoder.h>
#import <FlipperKitLayoutHelpers/SKHiddenWindow.h>
#import <FlipperKitLayoutHelpers/SKNamed.h>
#import <FlipperKitLayoutHelpers/SKObject.h>

@implementation SKNSViewDescriptor

- (instancetype)initWithDescriptorMapper:
    (id<SKDescriptorMapperProtocol>)mapper {
  if (self = [super initWithDescriptorMapper:mapper]) {
    initEnumDictionaries();
  }

  return self;
}

- (NSString*)identifierForNode:(NSView*)node {
  return [NSString stringWithFormat:@"%p", node];
}

- (NSUInteger)childCountForNode:(NSView*)node {
  return [[self validChildrenForNode:node] count];
}

- (id)childForNode:(NSView*)node atIndex:(NSUInteger)index {
  return [[self validChildrenForNode:node] objectAtIndex:index];
}

- (NSArray*)validChildrenForNode:(NSView*)node {
  NSMutableArray* validChildren = [NSMutableArray new];

  // Use NSViewControllers for children which responds to a different
  // viewController than their parent
  for (NSView* child in node.subviews) {
    BOOL responderIsNSViewController =
        [child.nextResponder isKindOfClass:[NSViewController class]];

    if (!child.isHidden) {
      if (responderIsNSViewController &&
          child.nextResponder != node.nextResponder) {
        [validChildren addObject:child.nextResponder];
      } else {
        [validChildren addObject:child];
      }
    }
  }

  return validChildren;
}

- (NSArray<SKNamed<NSDictionary*>*>*)dataForNode:(NSView*)node {
  return [NSArray
      arrayWithObjects:
          [SKNamed newWithName:@"NSView"
                     withValue:@{
                       @"frame" : SKMutableObject(node.frame),
                       @"bounds" : SKObject(node.bounds),
                       @"alphaValue" : SKMutableObject(@(node.alphaValue)),
                       @"tag" : @(node.tag),
                     }],
          [SKNamed
              newWithName:@"CALayer"
                withValue:@{
                  @"shadowColor" : SKMutableObject(
                      node.layer.shadowColor
                          ? [NSColor colorWithCGColor:node.layer.shadowColor]
                          : nil),
                  @"shadowOpacity" :
                      SKMutableObject(@(node.layer.shadowOpacity)),
                  @"shadowRadius" : SKMutableObject(@(node.layer.shadowRadius)),
                  @"shadowOffset" : SKMutableObject(node.layer.shadowOffset),
                  @"backgroundColor" : SKMutableObject(
                      node.layer.backgroundColor
                          ? [NSColor
                                colorWithCGColor:node.layer.backgroundColor]
                          : nil),
                  @"borderColor" : SKMutableObject(
                      node.layer.borderColor
                          ? [NSColor colorWithCGColor:node.layer.borderColor]
                          : nil),
                  @"borderWidth" : SKMutableObject(@(node.layer.borderWidth)),
                  @"cornerRadius" : SKMutableObject(@(node.layer.cornerRadius)),
                  @"masksToBounds" :
                      SKMutableObject(@(node.layer.masksToBounds)),
                }],
          nil];
}

- (NSDictionary<NSString*, SKNodeUpdateData>*)dataMutationsForNode:
    (NSView*)node {
  NSDictionary<NSString*, SKNodeUpdateData>* dataMutations = @{
    // NSView
    @"NSView.alphaValue" : ^(NSNumber* value){
        node.alphaValue = [value floatValue];
}
,
    @"NSView.frame.origin.y": ^(NSNumber *value) {
      CGRect frame = node.frame;
      frame.origin.y = [value floatValue];
      node.frame = frame;
    },
    @"NSView.frame.origin.x": ^(NSNumber *value) {
      CGRect frame = node.frame;
      frame.origin.x = [value floatValue];
      node.frame = frame;
    },
    @"NSView.frame.size.width": ^(NSNumber *value) {
      CGRect frame = node.frame;
      frame.size.width = [value floatValue];
      node.frame = frame;
    },
    @"NSView.frame.size.height": ^(NSNumber *value) {
      CGRect frame = node.frame;
      frame.size.width = [value floatValue];
      node.frame = frame;
    },
    // CALayer
    @"CALayer.shadowColor": ^(NSNumber *value) {
      node.layer.shadowColor = [NSColor fromSonarValue:value].CGColor;
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
      node.layer.backgroundColor = [NSColor fromSonarValue:value].CGColor;
    },
    @"CALayer.borderColor": ^(NSNumber *value) {
      node.layer.borderColor = [NSColor fromSonarValue:value].CGColor;
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
}
;

return dataMutations;
}

- (NSArray<SKNamed<NSString*>*>*)attributesForNode:(NSView*)node {
  return @[ [SKNamed newWithName:@"addr"
                       withValue:[NSString stringWithFormat:@"%p", node]] ];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(NSView*)node {
  SKHighlightOverlay* overlay = [SKHighlightOverlay sharedInstance];
  if (highlighted == YES) {
    [overlay mountInView:node withFrame:node.bounds];
  } else {
    [overlay unmount];
  }
}

- (void)hitTest:(SKTouch*)touch forNode:(NSView*)node {
  bool finish = true;
  for (NSInteger index = [self childCountForNode:node] - 1; index >= 0;
       index--) {
    id<NSObject> childNode = [self childForNode:node atIndex:index];
    NSView* viewForNode = nil;

    if ([childNode isKindOfClass:[NSViewController class]]) {
      NSViewController* child = (NSViewController*)childNode;
      viewForNode = child.view;
    } else {
      viewForNode = (NSView*)childNode;
    }

    if (viewForNode.isHidden || viewForNode.alphaValue <= 0 ||
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

static void initEnumDictionaries() {}

@end

#endif
