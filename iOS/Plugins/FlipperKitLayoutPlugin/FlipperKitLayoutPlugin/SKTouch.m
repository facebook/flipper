/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKTouch.h"
#import "SKNodeDescriptor.h"

@implementation SKTouch {
  SKTouchFinishDelegate _onFinish;
  NSMutableArray<NSString*>* _path;

  CGPoint _currentTouchPoint;
  id<NSObject> _currentNode;

  SKDescriptorMapper* _descriptorMapper;
}

- (instancetype)initWithTouchPoint:(CGPoint)touchPoint
                      withRootNode:(id<NSObject>)node
              withDescriptorMapper:(SKDescriptorMapper*)mapper
                   finishWithBlock:(SKTouchFinishDelegate)finishBlock {
  if (self = [super init]) {
    _onFinish = finishBlock;
    _currentTouchPoint = touchPoint;
    _currentNode = node;
    _descriptorMapper = mapper;
    _path = [NSMutableArray new];
  }

  return self;
}

- (void)continueWithChildIndex:(NSUInteger)childIndex
                    withOffset:(CGPoint)offset {
  _currentTouchPoint.x -= offset.x;
  _currentTouchPoint.y -= offset.y;

  SKNodeDescriptor* descriptor =
      [_descriptorMapper descriptorForClass:[_currentNode class]];
  _currentNode = [descriptor childForNode:_currentNode atIndex:childIndex];

  descriptor = [_descriptorMapper descriptorForClass:[_currentNode class]];
  [_path addObject:[descriptor identifierForNode:_currentNode]];

  [descriptor hitTest:self forNode:_currentNode];
}

- (void)finish {
  _onFinish(_path);
}

- (BOOL)containedIn:(CGRect)bounds {
  return CGRectContainsPoint(bounds, _currentTouchPoint);
}

@end

#endif
