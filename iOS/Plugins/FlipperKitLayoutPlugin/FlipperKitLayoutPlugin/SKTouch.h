/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <UIKit/UIKit.h>

#import "SKDescriptorMapper.h"

typedef void (^SKTouchFinishDelegate)(NSArray<NSString*>* path);

@interface SKTouch : NSObject

- (instancetype)initWithTouchPoint:(CGPoint)touchPoint
                      withRootNode:(id<NSObject>)node
              withDescriptorMapper:(SKDescriptorMapper*)mapper
                   finishWithBlock:(SKTouchFinishDelegate)d;

- (void)continueWithChildIndex:(NSUInteger)childIndex
                    withOffset:(CGPoint)offset;

- (void)finish;

- (BOOL)containedIn:(CGRect)bounds;

@end
