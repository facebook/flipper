/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>
#import "UIDFoundation.h"

NS_ASSUME_NONNULL_BEGIN

@interface UIDInspectable : NSObject
@end

/**
    Lazy inspectables can be used to defer materialisation
    of the inspectable until a later stage, like for example,
    during serialisation.
 */
@interface UIDLazyInspectable : UIDInspectable

- (UIDInspectable*)value;
+ (instancetype)from:(UIDInspectable* (^)(void))loader;

@end

@interface UIDInspectableValue : UIDInspectable

+ (instancetype)createWithText:(NSString*)text;
+ (instancetype)createWithBoolean:(bool)boolean;
+ (instancetype)createWithNumber:(NSNumber*)number;

@end

@interface UIDInspectableObject : UIDInspectable

@property(nonatomic, strong, readonly)
    NSDictionary<NSNumber*, UIDInspectable*>* fields;

- (instancetype)initWithFields:
    (NSDictionary<NSNumber*, UIDInspectable*>*)fields;

+ (instancetype)fromFields:(NSDictionary<NSNumber*, UIDInspectable*>*)fields;

@end

@interface UIDInspectableArray : UIDInspectable

@property(nonatomic, strong, readonly) NSArray<UIDInspectable*>* items;

- (instancetype)initWithItems:(NSArray<UIDInspectable*>*)items;

+ (instancetype)fromItems:(NSArray<UIDInspectable*>*)items;

@end

@interface UIDInspectableText : UIDInspectableValue

@property(nonatomic, strong, readonly) NSString* value;

- (instancetype)initWithValue:(NSString*)value;

+ (instancetype)fromText:(NSString*)value;

@end

@interface UIDInspectableBoolean : UIDInspectableValue

@property(nonatomic, readonly) bool value;

- (instancetype)initWithValue:(bool)value;

+ (instancetype)fromBoolean:(bool)value;

@end

@interface UIDInspectableNumber : UIDInspectableValue

@property(nonatomic, strong, readonly) NSNumber* value;

- (instancetype)initWithValue:(NSNumber*)value;

+ (instancetype)fromNumber:(NSNumber*)value;
+ (instancetype)fromCGFloat:(CGFloat)value;

@end

@class UIDBounds;
@interface UIDInspectableBounds : UIDInspectableValue

@property(nonatomic, strong, readonly) UIDBounds* value;

- (instancetype)initWithValue:(UIDBounds*)value;

+ (instancetype)fromBounds:(UIDBounds*)value;
+ (instancetype)fromRect:(CGRect)rect;

@end

@interface UIDInspectableCoordinate : UIDInspectableValue

@property(nonatomic, readonly) CGPoint value;

- (instancetype)initWithValue:(CGPoint)value;

+ (instancetype)fromPoint:(CGPoint)value;

@end

@interface UIDInspectableSize : UIDInspectableValue

@property(nonatomic, readonly) CGSize value;

- (instancetype)initWithValue:(CGSize)value;

+ (instancetype)fromSize:(CGSize)value;

@end

@interface UIDInspectableUnknown : UIDInspectableValue

@property(nonatomic, readonly) NSString* value;

- (instancetype)initWithValue:(NSString*)value;

+ (instancetype)unknown;
+ (instancetype)undefined;
+ (instancetype)null;

@end

@class UIDEdgeInsets;
@interface UIDInspectableEdgeInsets : UIDInspectableValue

@property(nonatomic, readonly) UIDEdgeInsets* value;

- (instancetype)initWithValue:(UIDEdgeInsets*)value;

+ (instancetype)fromEdgeInsets:(UIDEdgeInsets*)value;
+ (instancetype)fromUIEdgeInsets:(UIEdgeInsets)value;

@end

@interface UIDInspectableColor : UIDInspectableValue

@property(nonatomic, strong, readonly) UIColor* value;

- (instancetype)initWithValue:(UIColor*)value;

+ (instancetype)fromColor:(UIColor*)value;

@end

@interface UIDInspectableEnum : UIDInspectableValue

@property(nonatomic, readonly) NSString* value;

- (instancetype)initWithValue:(NSString*)value;

+ (instancetype)from:(NSString*)value;

@end

typedef NSDictionary<NSNumber*, UIDInspectable*> UIDAttributes;
typedef NSMutableDictionary<NSNumber*, UIDInspectable*> UIDMutableAttributes;
typedef NSDictionary<NSString*, NSString*> UIDInlineAttributes;
typedef NSMutableDictionary<NSString*, NSString*> UIDMutableInlineAttributes;
typedef NSDictionary<NSString*, id> UIDGenericAttributes;

NS_ASSUME_NONNULL_END

#endif
