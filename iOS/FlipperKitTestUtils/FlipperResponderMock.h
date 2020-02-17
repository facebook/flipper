/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

#import <FlipperKit/FlipperResponder.h>

@interface FlipperResponderMock : NSObject<FlipperResponder>

@property(nonatomic, readonly) NSArray<NSDictionary*>* successes;
@property(nonatomic, readonly) NSArray<NSDictionary*>* errors;

@end
