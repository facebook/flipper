/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@class UIDNode;
@class UIApplication;
@class UIDDescriptorRegister;

@interface UIDAllyTraversal : NSObject

+ (void)setVoiceOverServiceEnabled:(BOOL)enabled;

@property(nonatomic, class, readonly, getter=isSupported) BOOL supported;

- (instancetype)initWithDescriptorRegister:
    (UIDDescriptorRegister*)descriptorRegister;

- (NSArray<UIDNode*>*)traverse:(UIApplication*)application root:(id)root;

@end

NS_ASSUME_NONNULL_END

#endif
