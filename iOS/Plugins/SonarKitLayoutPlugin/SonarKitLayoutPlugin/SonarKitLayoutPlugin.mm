/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import "SonarKitLayoutPlugin.h"

#import <SonarKit/SonarClient.h>
#import <SonarKit/SonarConnection.h>
#import <SonarKit/SonarResponder.h>
#import <SonarKit/SKMacros.h>
#import "SKDescriptorMapper.h"
#import "SKNodeDescriptor.h"
#import "SKTapListener.h"
#import "SKTapListenerImpl.h"

@implementation SonarKitLayoutPlugin
{
  NSMapTable<NSString *, id> *_trackedObjects;
  NSString *_lastHighlightedNode;

  id<NSObject> _rootNode;
  id<SKTapListener> _tapListener;

  id<SonarConnection> _connection;

  NSMutableSet *_registeredDelegates;
}

- (instancetype)initWithRootNode:(id<NSObject>)rootNode
            withDescriptorMapper:(SKDescriptorMapper *)mapper{
  return [self initWithRootNode: rootNode
                withTapListener: [SKTapListenerImpl new]
           withDescriptorMapper: mapper];
}

- (instancetype)initWithRootNode:(id<NSObject>)rootNode
                 withTapListener:(id<SKTapListener>)tapListener
            withDescriptorMapper:(SKDescriptorMapper *)mapper {
  if (self = [super init]) {
    _descriptorMapper = mapper;
    _trackedObjects = [NSMapTable strongToWeakObjectsMapTable];
    _lastHighlightedNode = nil;
    _rootNode = rootNode;
    _tapListener = tapListener;

    _registeredDelegates = [NSMutableSet new];
    [SKInvalidation sharedInstance].delegate = self;
  }

  return self;
}

- (NSString *)identifier
{
  return @"Inspector";
}

- (void)didConnect:(id<SonarConnection>)connection {
  _connection = connection;

  [SKInvalidation enableInvalidations];

  // Run setup logic for each descriptor
  for (SKNodeDescriptor *descriptor in _descriptorMapper.allDescriptors) {
    [descriptor setUp];
  }

  // In order to avoid a retain cycle (Connection -> Block -> SonarKitLayoutPlugin -> Connection ...)
  __weak SonarKitLayoutPlugin *weakSelf = self;

  [connection receive:@"getRoot" withBlock:^(NSDictionary *params, id<SonarResponder> responder) {
    SonarPerformBlockOnMainThread(^{ [weakSelf onCallGetRoot: responder]; });
  }];

  [connection receive:@"getNodes" withBlock:^(NSDictionary *params, id<SonarResponder> responder) {
    SonarPerformBlockOnMainThread(^{ [weakSelf onCallGetNodes: params[@"ids"] withResponder: responder]; });
  }];

  [connection receive:@"setData" withBlock:^(NSDictionary *params, id<SonarResponder> responder) {
    SonarPerformBlockOnMainThread(^{
      [weakSelf onCallSetData: params[@"id"]
                 withPath: params[@"path"]
                  toValue: params[@"value"]
           withConnection: connection];
    });
  }];

  [connection receive:@"setHighlighted" withBlock:^(NSDictionary *params, id<SonarResponder> responder) {
    SonarPerformBlockOnMainThread(^{ [weakSelf onCallSetHighlighted: params[@"id"] withResponder: responder]; });
  }];

  [connection receive:@"setSearchActive" withBlock:^(NSDictionary *params, id<SonarResponder> responder) {
    SonarPerformBlockOnMainThread(^{ [weakSelf onCallSetSearchActive: [params[@"active"] boolValue] withConnection: connection]; });
  }];
}

- (void)didDisconnect {
  // Clear the last highlight if there is any
  [self onCallSetHighlighted: nil withResponder: nil];
  // Disable search if it is active
  [self onCallSetSearchActive: NO withConnection: nil];
}

- (void)onCallGetRoot:(id<SonarResponder>)responder {
  const auto rootNode= [self getNode: [self trackObject: _rootNode]];

  [responder success: rootNode];
}

- (void)onCallGetNodes:(NSArray<NSDictionary *> *)nodeIds withResponder:(id<SonarResponder>)responder {
  NSMutableArray<NSDictionary *> *elements = [NSMutableArray new];

  for (id nodeId in nodeIds) {
    const auto node = [self getNode: nodeId];
    if (node == nil) {
      continue;
    }
    [elements addObject: node];
  }

  [responder success: @{ @"elements": elements }];
}

- (void)onCallSetData:(NSString *)objectId
             withPath:(NSArray<NSString *> *)path
              toValue:(id<NSObject>)value
       withConnection:(id<SonarConnection>)connection {
  id node = [_trackedObjects objectForKey: objectId];
  if (node == nil) {
    SKLog(@"node is nil, trying to setData: \
          objectId: %@ \
          path: %@ \
          value: %@",
          objectId, path, value);
    return;
  }

  // Sonar sends nil/NSNull on some values when the text-field
  // is empty, disregard these changes otherwise we'll crash.
  if (value == nil || [value isKindOfClass: [NSNull class]]) {
    return;
  }

  SKNodeDescriptor *descriptor = [_descriptorMapper descriptorForClass: [node class]];

  NSString *dotJoinedPath = [path componentsJoinedByString: @"."];
  SKNodeUpdateData updateDataForPath = [[descriptor dataMutationsForNode: node] objectForKey: dotJoinedPath];
  if (updateDataForPath != nil) {
    updateDataForPath(value);
    [connection send: @"invalidate" withParams: @{ @"id": [descriptor identifierForNode: node] }];
  }
}

- (void)onCallSetHighlighted:(NSString *)objectId withResponder:(id<SonarResponder>)responder {
  if (_lastHighlightedNode != nil) {
    id lastHighlightedObject = [_trackedObjects objectForKey: _lastHighlightedNode];
    if (lastHighlightedObject == nil) {
      [responder error: @{ @"error": @"unable to get last highlighted object" }];
      return;
    }

    SKNodeDescriptor *descriptor = [self->_descriptorMapper descriptorForClass: [lastHighlightedObject class]];
    [descriptor setHighlighted: NO forNode: lastHighlightedObject];

    _lastHighlightedNode = nil;
  }

  if (objectId == nil || [objectId isKindOfClass:[NSNull class]]) {
    return;
  }

  id object = [_trackedObjects objectForKey: objectId];
  if (object == nil) {
    SKLog(@"tried to setHighlighted for untracked id, objectId: %@", objectId);
    return;
  }

  SKNodeDescriptor *descriptor = [self->_descriptorMapper descriptorForClass: [object class]];
  [descriptor setHighlighted: YES forNode: object];

  _lastHighlightedNode = objectId;
}

- (void)onCallSetSearchActive:(BOOL)active withConnection:(id<SonarConnection>)connection {
  if (active) {
    [_tapListener mountWithFrame: [[UIScreen mainScreen] bounds]];
    __block id<NSObject> rootNode = _rootNode;

    [_tapListener listenForTapWithBlock:^(CGPoint touchPoint) {
      SKTouch *touch =
        [[SKTouch alloc] initWithTouchPoint: touchPoint
                               withRootNode: rootNode
                       withDescriptorMapper: self->_descriptorMapper
                            finishWithBlock:^(NSArray<NSString *> *path) {
                              [connection send: @"select"
                                    withParams: @{ @"path": path }];
                            }];

      SKNodeDescriptor *descriptor = [self->_descriptorMapper descriptorForClass: [rootNode class]];
      [descriptor hitTest: touch forNode: rootNode];
    }];
  } else {
    [_tapListener unmount];
  }
}

- (void)invalidateNode:(id<NSObject>)node {
  SKNodeDescriptor *descriptor = [_descriptorMapper descriptorForClass: [node class]];
  if (descriptor == nil) {
    return;
  }

  NSString *nodeId = [descriptor identifierForNode: node];
  if (![_trackedObjects objectForKey: nodeId]) {
    return;
  }

  [descriptor invalidateNode: node];

  [_connection send: @"invalidate" withParams: @{ @"id": nodeId }];
}

- (void)updateNodeReference:(id<NSObject>)node {
  SKNodeDescriptor *descriptor = [_descriptorMapper descriptorForClass: [node class]];
  if (descriptor == nil) {
    return;
  }

  NSString *nodeId = [descriptor identifierForNode: node];
  [_trackedObjects setObject:node forKey:nodeId];
}

- (NSDictionary *)getNode:(NSString *)nodeId {
  id<NSObject> node = [_trackedObjects objectForKey: nodeId];
  if (node == nil) {
    SKLog(@"node is nil, no tracked node found for nodeId: %@", nodeId);
    return nil;
  }

  SKNodeDescriptor *nodeDescriptor = [_descriptorMapper descriptorForClass: [node class]];
  if (nodeDescriptor == nil) {
    SKLog(@"No registered descriptor for class: %@", [node class]);
    return nil;
  }

  NSMutableArray *attributes = [NSMutableArray new];
  NSMutableDictionary *data = [NSMutableDictionary new];

  const auto *nodeAttributes = [nodeDescriptor attributesForNode: node];
  for (const SKNamed<NSString *> *namedPair in nodeAttributes) {
    const NSDictionary *attribute = @{
                                      @"name": namedPair.name,
                                      @"value": namedPair.value ?: [NSNull null],
                                      };

    [attributes addObject: attribute];
  }

  const auto *nodeData = [nodeDescriptor dataForNode: node];
  for (const SKNamed<NSDictionary *> *namedPair in nodeData) {
    data[namedPair.name] = namedPair.value;
  }

  NSMutableArray *children = [NSMutableArray new];
  for (NSUInteger i = 0; i < [nodeDescriptor childCountForNode: node]; i++) {
    id childNode = [nodeDescriptor childForNode: node atIndex: i];

    NSString *childIdentifier = [self trackObject: childNode];
    if (childIdentifier) {
      [children addObject: childIdentifier];
    }
  }

  NSDictionary *nodeDic =
  @{
    @"id": [nodeDescriptor identifierForNode: node],
    @"name": [nodeDescriptor nameForNode: node],
    @"children": children,
    @"attributes": attributes,
    @"data": data,
    @"decoration": [nodeDescriptor decorationForNode: node],
    };

  return nodeDic;
}

- (NSString *)trackObject:(id)object {
  const SKNodeDescriptor *descriptor = [_descriptorMapper descriptorForClass: [object class]];
  NSString *objectIdentifier = [descriptor identifierForNode: object];

  if (objectIdentifier == nil) {
    return nil;
  }

  if (! [_trackedObjects objectForKey: objectIdentifier]) {
    [_trackedObjects setObject:object forKey:objectIdentifier];
  }

  return objectIdentifier;
}

@end

#endif
