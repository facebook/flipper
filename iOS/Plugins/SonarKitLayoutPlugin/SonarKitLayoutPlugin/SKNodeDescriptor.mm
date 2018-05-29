/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import "SKNodeDescriptor.h"

@implementation SKNodeDescriptor
{
  SKDescriptorMapper *_mapper;
}

- (void)setUp {
}

- (instancetype)initWithDescriptorMapper:(SKDescriptorMapper *)mapper {
  if (self = [super init]) {
    _mapper = mapper;
  }
  return self;
}

- (SKNodeDescriptor *)descriptorForClass:(Class)cls {
  return [_mapper descriptorForClass: cls];
}

- (NSString *)identifierForNode:(id)node {
  @throw [NSString stringWithFormat:@"need to implement %@", NSStringFromSelector(_cmd)];
}

- (NSString *)nameForNode:(id)node {
  return NSStringFromClass([node class]);
}

- (NSUInteger)childCountForNode:(id)node {
  @throw [NSString stringWithFormat:@"need to implement %@", NSStringFromSelector(_cmd)];
}

- (id)childForNode:(id)node atIndex:(NSUInteger)index {
  @throw [NSString stringWithFormat:@"need to implement %@", NSStringFromSelector(_cmd)];
}

- (NSDictionary<NSString *, SKNodeUpdateData> *)dataMutationsForNode:(id)node {
  return @{};
}

- (NSArray<SKNamed<NSDictionary *> *> *)dataForNode:(id)node {
  return @[];
}

- (NSArray<SKNamed<NSString *> *> *)attributesForNode:(id)node {
  return @[];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(id)node {
}

- (void)hitTest:(SKTouch *)point forNode:(id)node {
}

- (void)invalidateNode:(id)node {
}

- (NSString *)decorationForNode:(id)node {
  return @"";
}

- (BOOL)matchesQuery:(NSString *)query forNode:(id)node {
    NSString *name = [self nameForNode: node];
  return [self string:name contains:query] || [self string:[self identifierForNode: node] contains: query];
}

- (BOOL)string:(NSString *)string contains:(NSString *)substring {
  return string != nil && substring != nil && [string rangeOfString: substring options: NSCaseInsensitiveSearch].location != NSNotFound;
}

@end

#endif
