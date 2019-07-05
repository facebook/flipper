/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
//
//  FKUserDefaultsPlugin.h
//  Sample
//
//  Created by Marc Terns on 9/30/18.
//  Copyright © 2018 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <FlipperKit/FlipperPlugin.h>

NS_ASSUME_NONNULL_BEGIN

@interface FKUserDefaultsPlugin : NSObject <FlipperPlugin>

- (instancetype)initWithSuiteName:(nullable NSString *)suiteName;
    
@end

NS_ASSUME_NONNULL_END
