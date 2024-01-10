/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDMetadataRegister.h"

NSString* const UIDEBUGGER_METADATA_TYPE_IDENTIFIER = @"identity";
NSString* const UIDEBUGGER_METADATA_TYPE_ATTRIBUTE = @"attribute";
NSString* const UIDEBUGGER_METADATA_TYPE_LAYOUT = @"layout";
NSString* const UIDEBUGGER_METADATA_TYPE_DOCUMENTATION = @"documentation";

typedef NSMutableDictionary<NSString*, UIDMetadata*>* UIDNamedMetadata;
@interface UIDMetadataRegister () {
  NSMutableDictionary<UIDMetadataId, UIDNamedMetadata>* _register;
  NSMutableArray<UIDMetadata*>* _pending;
  uint32_t _generator;

  UIDMetadataId _rootId;
  NSLock* _lock;
}

@end

@implementation UIDMetadataRegister

- (instancetype)init {
  self = [super init];
  if (self) {
    _lock = [NSLock new];
    _register = [NSMutableDictionary new];
    _pending = [NSMutableArray new];

    _rootId = @0;
    _generator = 0;

    [_register setObject:[NSMutableDictionary new] forKey:_rootId];
  }
  return self;
}

+ (instancetype)shared {
  static UIDMetadataRegister* instance = nil;

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    instance = [UIDMetadataRegister new];
  });

  return instance;
}

- (UIDMetadataId)registerMetadataWithType:(NSString*)type name:(NSString*)name {
  return [self registerMetadataWithType:type
                                   name:name
                              isMutable:false
                              definedBy:_rootId];
}

- (UIDMetadataId)registerMetadataWithType:(NSString*)type
                                     name:(NSString*)name
                                isMutable:(bool)isMutable
                                definedBy:(UIDMetadataId)parent {
  return [self registerMetadataWithType:type
                                   name:name
                              isMutable:isMutable
                              definedBy:parent
                       customAttributes:nil];
}

- (UIDMetadataId)registerMetadataWithType:(NSString*)type
                                     name:(NSString*)name
                                isMutable:(bool)isMutable
                                definedBy:(UIDMetadataId)parent
                         customAttributes:
                             (nullable NSDictionary<NSString*, id>*)
                                 customAttributes {
  if (!parent) {
    parent = _rootId;
  }

  UIDMetadataId identifier = @(++_generator);
  UIDMetadata* metadata =
      [[UIDMetadata alloc] initWithIdentifier:identifier
                                         type:type
                                         name:name
                                    isMutable:isMutable
                                       parent:parent
                               possibleValues:nil
                                         tags:nil
                             customAttributes:customAttributes];

  [_lock lock];
  if (![_register objectForKey:parent]) {
    [_register setObject:[NSMutableDictionary new] forKey:parent];
  }
  [[_register objectForKey:parent] setObject:metadata forKey:name];

  [_pending addObject:metadata];
  [_lock unlock];

  return identifier;
}

- (UIDMetadataId)findRootMetadataWithName:(NSString*)name {
  return [self findMetadataDefinedBy:_rootId name:name];
}

- (UIDMetadataId)findMetadataDefinedBy:(UIDMetadataId)parentId
                                  name:(NSString*)name {
  [_lock lock];
  UIDMetadata* metadata = [[_register objectForKey:parentId] objectForKey:name];
  [_lock unlock];
  if (metadata) {
    return metadata.identifier;
  }

  return nil;
}

- (NSDictionary<UIDMetadataId, UIDMetadata*>*)extractPendingMetadata {
  NSMutableDictionary* pendingMetadata = [NSMutableDictionary new];
  [_lock lock];
  for (UIDMetadata* metadata in _pending) {
    [pendingMetadata setObject:metadata forKey:metadata.identifier];
  }
  [_pending removeAllObjects];
  [_lock unlock];
  return pendingMetadata;
}

- (void)reset {
  [_lock lock];
  [_pending removeAllObjects];
  for (id key in _register) {
    UIDNamedMetadata value = [_register objectForKey:key];
    [_pending addObjectsFromArray:value.allValues];
  }
  [_lock unlock];
}

@end

#endif
