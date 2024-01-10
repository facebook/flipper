/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

#ifdef __cplusplus
extern "C" {
#endif
extern void UIDRunBlockOnMainThread(dispatch_block_t block);
extern void UIDRunBlockOnMainThreadAsync(dispatch_block_t block);
extern void UIDRunBlockOnMainThreadAfter(
    dispatch_block_t block,
    unsigned int seconds);
#ifdef __cplusplus
}
#endif

#endif
