/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/FlipperConnection.h>
#import <Foundation/Foundation.h>
#import "UIDAttributeEditor.h"
#import "UIDConnectionListener.h"
#import "UIDFrameworkEventManager.h"
#import "UIDUpdateDigester.h"

NS_ASSUME_NONNULL_BEGIN

@class UIDDescriptorRegister;
@class UIDTreeObserverFactory;
@class UIDFrameworkEvent;
@class UIDFrameworkEventMetadata;

@interface UIDContext : NSObject

@property(nonatomic, nullable) UIApplication* application;
@property(nonatomic, nullable) id<FlipperConnection> connection;
@property(nonatomic, readonly) UIDDescriptorRegister* descriptorRegister;
@property(nonatomic, readonly) UIDTreeObserverFactory* observerFactory;
@property(nonatomic, nullable) id<UIDUpdateDigester> updateDigester;
@property(nonatomic, nullable) UIDAttributeEditor* attributeEditor;
@property(nonatomic, strong, readonly) id<UIDFrameworkEventManager>
    frameworkEventManager;

- (instancetype)initWithApplication:(UIApplication*)application
                 descriptorRegister:(UIDDescriptorRegister*)descriptorRegister
                    observerFactory:(UIDTreeObserverFactory*)observerFactory;

- (NSSet<id<UIDConnectionListener>>*)connectionListeners;
- (void)addConnectionListener:(id<UIDConnectionListener>)listener;
- (void)removeConnectionListener:(id<UIDConnectionListener>)listener;

@end

NS_ASSUME_NONNULL_END

#endif
