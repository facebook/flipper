/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import <vector>

#import "SKBufferingPlugin.h"
#import <SonarKit/SonarConnection.h>

struct CachedEvent {
  NSString *method;
  NSDictionary<NSString *, id> *sonarObject;
};

static const NSUInteger bufferSize = 500;

@implementation SKBufferingPlugin
{
  std::vector<CachedEvent> _ringBuffer;
  std::shared_ptr<facebook::sonar::DispatchQueue> _connectionAccessQueue;

  id<SonarConnection> _connection;
}

- (instancetype)initWithQueue:(const std::shared_ptr<facebook::sonar::DispatchQueue> &)queue {
  if (self = [super init]) {
    _ringBuffer.reserve(bufferSize);
    _connectionAccessQueue = queue;
  }
  return self;
}

- (NSString *)identifier {
  // Note: This must match with the javascript pulgin identifier!!
  return @"Network";
}

- (void)didConnect:(id<SonarConnection>)connection {
  _connectionAccessQueue->async(^{
    self->_connection = connection;
    [self sendBufferedEvents];
  });
}

- (void)didDisconnect {
  _connectionAccessQueue->async(^{
    self->_connection = nil;
  });
}

- (void)send:(NSString *)method
 sonarObject:(NSDictionary<NSString *, id> *)sonarObject {
  _connectionAccessQueue->async(^{
    if (self->_connection) {
      [self->_connection send:method withParams:sonarObject];
    } else {
      if (self->_ringBuffer.size() == bufferSize) {
        return;
      }
      self->_ringBuffer.push_back({
        .method = method,
        .sonarObject = sonarObject
      });
    }
  });
}

- (void)sendBufferedEvents {
  NSAssert(_connection, @"connection object cannot be nil");
  for (const auto &event : _ringBuffer) {
    [_connection send:event.method withParams:event.sonarObject];
  }
  _ringBuffer.clear();
}

@end

#endif
