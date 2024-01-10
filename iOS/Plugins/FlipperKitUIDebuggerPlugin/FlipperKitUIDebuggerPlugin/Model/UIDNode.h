/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>
#import "UIDBounds.h"
#import "UIDInspectable.h"
#import "UIDMetadata.h"

NS_ASSUME_NONNULL_BEGIN

@interface UIDNode : NSObject

@property(nonatomic) NSUInteger identifier;
@property(nonatomic, strong) NSString* qualifiedName;
@property(nonatomic, strong) NSString* name;
@property(nonatomic, strong) UIDBounds* bounds;
@property(nonatomic, strong) NSSet<NSString*>* tags;
@property(nonatomic, strong) UIDAttributes* attributes;
@property(nonatomic, strong) UIDInlineAttributes* inlineAttributes;
@property(nonatomic, strong) UIDGenericAttributes* hiddenAttributes;
@property(nonatomic, nullable) NSNumber* parent;
@property(nonatomic, strong) NSArray<NSNumber*>* children;
@property(nonatomic) NSNumber* activeChild;

- (instancetype)initWithIdentifier:(NSUInteger)identifier
                     qualifiedName:(NSString*)qualifiedName
                              name:(NSString*)name
                            bounds:(UIDBounds*)bounds
                              tags:(NSSet<NSString*>*)tags;

@end

NS_ASSUME_NONNULL_END

#endif
