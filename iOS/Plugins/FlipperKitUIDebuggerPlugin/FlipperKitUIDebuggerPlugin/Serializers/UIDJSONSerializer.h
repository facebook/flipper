/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>
#import "UIDFoundation.h"
#import "UIDFrameScanEvent+Foundation.h"
#import "UIDInitEvent+Foundation.h"
#import "UIDMetadataUpdateEvent+Foundation.h"
#import "UIDPerfStatsEvent+Foundation.h"

#ifdef __cplusplus
extern "C" {
#endif
extern NSString* UID_toJSON(id obj);
extern NSString* UID_FoundationtoJSON(id obj);
extern id UID_toFoundation(id<UIDFoundation> obj);
#ifdef __cplusplus
}
#endif

#endif
