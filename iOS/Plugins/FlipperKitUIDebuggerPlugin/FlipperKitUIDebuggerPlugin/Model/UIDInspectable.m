/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDInspectable.h"
#import "UIDBounds.h"
#import "UIDEdgeInsets.h"

@implementation UIDInspectable
@end

@interface UIDLazyInspectable () {
  UIDInspectable* _value;
  UIDInspectable* (^_loader)(void);
}

@end

@implementation UIDLazyInspectable
- (instancetype)initWithLoader:(UIDInspectable* (^)(void))loader {
  if (self = [super init]) {
    self->_value = nil;
    self->_loader = loader;
  }
  return self;
}

- (UIDInspectable*)value {
  if (!_value && _loader) {
    _value = _loader();
  }
  return _value;
}

+ (instancetype)from:(UIDInspectable* (^)(void))loader {
  return [[self alloc] initWithLoader:loader];
}

@end

@implementation UIDInspectableObject

- (instancetype)initWithFields:
    (NSDictionary<NSNumber*, UIDInspectable*>*)fields {
  self = [super init];
  if (self) {
    _fields = fields;
  }
  return self;
}

+ (instancetype)fromFields:(NSDictionary<NSNumber*, UIDInspectable*>*)fields {
  return [[UIDInspectableObject alloc] initWithFields:fields];
}

@end

@implementation UIDInspectableArray

- (instancetype)initWithItems:(NSArray<UIDInspectable*>*)items {
  self = [super init];
  if (self) {
    _items = items;
  }
  return self;
}

+ (instancetype)fromItems:(NSArray<UIDInspectable*>*)items {
  return [[UIDInspectableArray alloc] initWithItems:items];
}

@end

@implementation UIDInspectableValue

+ (instancetype)createWithText:(NSString*)text {
  return [[UIDInspectableText alloc] initWithValue:text];
}

+ (instancetype)createWithBoolean:(bool)boolean {
  return [[UIDInspectableBoolean alloc] initWithValue:boolean];
}

+ (instancetype)createWithNumber:(NSNumber*)number {
  return [[UIDInspectableNumber alloc] initWithValue:number];
}

@end

@implementation UIDInspectableText

- (instancetype)initWithValue:(NSString*)value {
  self = [super init];
  if (self) {
    _value = value;
  }
  return self;
}

+ (instancetype)fromText:(NSString*)value {
  return [[UIDInspectableText alloc] initWithValue:value];
}

@end

@implementation UIDInspectableBoolean

- (instancetype)initWithValue:(bool)value {
  self = [super init];
  if (self) {
    _value = value;
  }
  return self;
}

+ (instancetype)fromBoolean:(bool)value {
  return [[UIDInspectableBoolean alloc] initWithValue:value];
}

@end

@implementation UIDInspectableNumber

- (instancetype)initWithValue:(NSNumber*)value {
  self = [super init];
  if (self) {
    _value = value;
  }
  return self;
}

+ (instancetype)fromNumber:(NSNumber*)value {
  return [[UIDInspectableNumber alloc] initWithValue:value];
}

+ (instancetype)fromCGFloat:(CGFloat)value {
  return [self fromNumber:[NSNumber numberWithFloat:value]];
}

@end

@implementation UIDInspectableBounds

- (instancetype)initWithValue:(UIDBounds*)value {
  self = [super init];
  if (self) {
    _value = value;
  }
  return self;
}

+ (instancetype)fromBounds:(UIDBounds*)bounds {
  return [[UIDInspectableBounds alloc] initWithValue:bounds];
}

+ (instancetype)fromRect:(CGRect)rect {
  return [self fromBounds:[UIDBounds fromRect:rect]];
}

@end

@implementation UIDInspectableCoordinate

- (instancetype)initWithValue:(CGPoint)value {
  self = [super init];
  if (self) {
    _value = value;
  }
  return self;
}

+ (instancetype)fromPoint:(CGPoint)value {
  return [[UIDInspectableCoordinate alloc] initWithValue:value];
}

@end

@implementation UIDInspectableSize

- (instancetype)initWithValue:(CGSize)value {
  self = [super init];
  if (self) {
    _value = value;
  }
  return self;
}

+ (instancetype)fromSize:(CGSize)value {
  return [[UIDInspectableSize alloc] initWithValue:value];
}

@end

@implementation UIDInspectableEdgeInsets

- (instancetype)initWithValue:(UIDEdgeInsets*)value {
  self = [super init];
  if (self) {
    _value = value;
  }
  return self;
}

+ (instancetype)fromEdgeInsets:(UIDEdgeInsets*)value {
  return [[UIDInspectableEdgeInsets alloc] initWithValue:value];
}

+ (instancetype)fromUIEdgeInsets:(UIEdgeInsets)value {
  return [self fromEdgeInsets:[UIDEdgeInsets fromUIEdgeInsets:value]];
}

@end

@implementation UIDInspectableColor

- (instancetype)initWithValue:(UIColor*)value {
  self = [super init];
  if (self) {
    _value = value;
  }
  return self;
}

+ (instancetype)fromColor:(UIColor*)value {
  return [[UIDInspectableColor alloc] initWithValue:value];
}

@end

@implementation UIDInspectableUnknown

- (instancetype)initWithValue:(NSString*)value {
  self = [super init];
  if (self) {
    _value = value;
  }
  return self;
}

+ (instancetype)unknown {
  return [[UIDInspectableUnknown alloc] initWithValue:@"unknown"];
}

+ (instancetype)undefined {
  return [[UIDInspectableUnknown alloc] initWithValue:@"undefined"];
}

+ (instancetype)null {
  return [[UIDInspectableUnknown alloc] initWithValue:@"null"];
}

@end

@implementation UIDInspectableEnum

- (instancetype)initWithValue:(NSString*)value {
  self = [super init];
  if (self) {
    _value = value;
  }
  return self;
}

+ (instancetype)from:(NSString*)value {
  return [[UIDInspectableEnum alloc] initWithValue:value ?: @"UNKNOWN"];
}

@end

#endif
