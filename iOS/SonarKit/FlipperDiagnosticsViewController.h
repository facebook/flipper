/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#ifdef FB_SONARKIT_ENABLED

#include "FlipperStateUpdateListener.h"
#import <UIKit/UIKit.h>

@interface FlipperDiagnosticsViewController : UIViewController <FlipperStateUpdateListener>
@property(strong, nonatomic) UIScrollView *scrollView;
@property(strong, nonatomic) UILabel *stateLabel;
- (void)onUpdate;
@end

#endif
