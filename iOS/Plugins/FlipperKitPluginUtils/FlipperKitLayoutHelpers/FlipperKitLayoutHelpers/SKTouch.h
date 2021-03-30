/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <TargetConditionals.h>
#if TARGET_OS_IPHONE
#import <UIKit/UIKit.h>
#elif TARGET_OS_OSX
#import <AppKit/AppKit.h>
#endif

#import "FlipperKitLayoutDescriptorMapperProtocol.h"

typedef void (^SKTouchFinishDelegate)(id<NSObject> currentNode);
typedef void (^SKProcessFinishDelegate)(NSDictionary* tree);

@interface SKTouch : NSObject

- (instancetype)initWithTouchPoint:(CGPoint)touchPoint
                      withRootNode:(id<NSObject>)node
              withDescriptorMapper:(id<SKDescriptorMapperProtocol>)mapper
                   finishWithBlock:(SKTouchFinishDelegate)d;

- (void)continueWithChildIndex:(NSUInteger)childIndex
                    withOffset:(CGPoint)offset;

- (void)finish;

- (void)retrieveSelectTree:(SKProcessFinishDelegate)callback;

- (BOOL)containedIn:(CGRect)bounds;

@end
