/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDMainThread.h"

#ifdef __cplusplus
extern "C" {
#endif
void UIDRunBlockOnMainThread(dispatch_block_t block) {
  if ([NSThread isMainThread]) {
    block();
  } else {
    dispatch_sync(dispatch_get_main_queue(), block);
  }
}
void UIDRunBlockOnMainThreadAsync(dispatch_block_t block) {
  dispatch_async(dispatch_get_main_queue(), block);
}
void UIDRunBlockOnMainThreadAfter(
    dispatch_block_t block,
    unsigned int seconds) {
  dispatch_after(
      dispatch_time(DISPATCH_TIME_NOW, seconds * NSEC_PER_SEC),
      dispatch_get_main_queue(),
      block);
}
#ifdef __cplusplus
}
#endif

#endif
