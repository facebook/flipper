// Copyright 2004-present Facebook. All Rights Reserved.

#if FB_SONARKIT_ENABLED

#import "SKTigonNetworkPluginMock.h"

#import "SKDispatchQueueMock.h"

@implementation SKTigonNetworkPluginMock

- (instancetype)initWithNetworkAdapter:(id<SKNetworkAdapterDelegate>)adapter {
  return [super initWithNetworkAdapter:adapter queue:std::make_shared<facebook::sonar::SyncQueue>()];
}

@end

#endif
