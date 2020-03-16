/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "TestNode.h"

@implementation TestNode

- (instancetype)initWithName:(NSString*)name {
  return [self initWithName:name withFrame:CGRectZero];
}

- (instancetype)initWithName:(NSString*)name withFrame:(CGRect)frame {
  if (self = [super init]) {
    _nodeName = name;
    _frame = frame;
  }

  return self;
}

@end
