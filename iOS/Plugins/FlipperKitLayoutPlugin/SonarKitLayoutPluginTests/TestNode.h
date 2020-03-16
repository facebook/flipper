/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <UIKit/UIKit.h>

@interface TestNode : NSObject

@property(nonatomic, copy) NSString* nodeName;
@property(nonatomic, copy) NSArray<TestNode*>* children;

@property(nonatomic, assign) BOOL highlighted;
@property(nonatomic, assign) CGRect frame;

- (instancetype)initWithName:(NSString*)name;
- (instancetype)initWithName:(NSString*)name withFrame:(CGRect)frame;

@end
