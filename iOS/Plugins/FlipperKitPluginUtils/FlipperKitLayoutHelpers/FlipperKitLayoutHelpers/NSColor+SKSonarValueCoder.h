/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX

#import <AppKit/AppKit.h>

#import <FlipperKit/SKMacros.h>

#import "SKObject.h"

FB_LINK_REQUIRE_CATEGORY(NSColor_SonarValueCoder)
@interface NSColor (SonarValueCoder)<SKSonarValueCoder>

@end

#endif
