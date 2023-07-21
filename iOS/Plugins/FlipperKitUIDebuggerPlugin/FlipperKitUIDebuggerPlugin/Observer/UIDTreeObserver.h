/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@class UIDContext;

@interface UIDTreeObserver<__covariant T> : NSObject

@property(nonatomic, strong)
    NSMutableDictionary<NSNumber*, UIDTreeObserver<T>*>* children;
@property(nonatomic, strong) NSString* type;

- (void)subscribe:(nullable T)node;
- (void)unsubscribe;
- (void)processNode:(id)node withContext:(UIDContext*)context;
- (void)processNode:(id)node
       withSnapshot:(BOOL)snapshot
        withContext:(UIDContext*)context;
- (void)cleanup;

@end

NS_ASSUME_NONNULL_END

#endif
