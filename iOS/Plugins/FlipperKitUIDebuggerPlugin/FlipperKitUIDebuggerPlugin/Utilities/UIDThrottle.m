/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDThrottle.h"

@interface UIDThrottle () {
  dispatch_queue_t _queue;
  dispatch_block_t _block;
  dispatch_block_t _throttleJob;
}
@end

@implementation UIDThrottle

- (instancetype)initWithRate:(int64_t)rate {
  return [self initWithRate:rate queue:dispatch_get_main_queue()];
}

- (instancetype)initWithRate:(int64_t)rate
                       queue:(nonnull dispatch_queue_t)queue {
  self = [super init];
  if (self) {
    _rate = rate;
    _queue = queue;
    _block = nil;
  }
  return self;
}

- (void)run:(dispatch_block_t)block {
  /**
    Check if there's a block already queued. If there's none, create one.
    The reason we have two blocks:
      _throttleJob captures the incoming job, always.
      _block is the one currently in the queue, which will execute after a
    delay. This last block is only queued when there's none, it will clear
    itself after executing.
   */
  _throttleJob = block;

  if (_block == nil) {
    __weak typeof(self) weakSelf = self;
    _block = ^(void) {
      if (weakSelf) {
        typeof(self) strongSelf = weakSelf;
        strongSelf->_throttleJob();

        strongSelf->_throttleJob = nil;
        strongSelf->_block = nil;
      }
    };

    dispatch_after(
        dispatch_time(DISPATCH_TIME_NOW, _rate * NSEC_PER_MSEC),
        _queue,
        _block);
  }
}

- (void)cancel {
  _throttleJob = nil;
  _block = nil;
}

@end

#endif
