/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKNSButtonDescriptor.h"

#import <FlipperKitLayoutHelpers/NSColor+SKSonarValueCoder.h>
#import <FlipperKitLayoutHelpers/SKObject.h>

@implementation SKNSButtonDescriptor

- (NSString*)identifierForNode:(NSButton*)node {
  return [NSString stringWithFormat:@"%p", node];
}

- (NSUInteger)childCountForNode:(NSButton*)node {
  return 0;
}

- (id)childForNode:(NSButton*)node atIndex:(NSUInteger)index {
  return nil;
}

- (NSArray<SKNamed<NSDictionary*>*>*)dataForNode:(NSButton*)node {
  SKNodeDescriptor* viewDescriptor = [self descriptorForClass:[NSView class]];
  auto* viewData = [viewDescriptor dataForNode:node];

  NSMutableArray* data = [NSMutableArray new];
  [data addObjectsFromArray:viewData];
  [data addObject:[SKNamed
                      newWithName:@"NSButton"
                        withValue:@{
                          @"enabled" : SKMutableObject(@(node.enabled)),
                          @"highlighted" : SKMutableObject(@(node.highlighted)),
                          @"title" : SKMutableObject(node.title),
                        }]];
  return data;
}

- (NSDictionary<NSString*, SKNodeUpdateData>*)dataMutationsForNode:
    (NSButton*)node {
  NSDictionary* buttonMutations = @{};

  SKNodeDescriptor* viewDescriptor = [self descriptorForClass:[NSView class]];
  NSDictionary* viewMutations = [viewDescriptor dataMutationsForNode:node];

  NSMutableDictionary* mutations = [NSMutableDictionary new];
  [mutations addEntriesFromDictionary:buttonMutations];
  [mutations addEntriesFromDictionary:viewMutations];

  return mutations;
}

- (NSArray<SKNamed<NSString*>*>*)attributesForNode:(NSScrollView*)node {
  SKNodeDescriptor* descriptor = [self descriptorForClass:[NSView class]];
  return [descriptor attributesForNode:node];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(NSButton*)node {
  SKNodeDescriptor* viewDescriptor = [self descriptorForClass:[NSView class]];
  [viewDescriptor setHighlighted:highlighted forNode:node];
}

- (void)hitTest:(SKTouch*)touch forNode:(NSButton*)node {
  [touch finish];
}

@end

#endif
