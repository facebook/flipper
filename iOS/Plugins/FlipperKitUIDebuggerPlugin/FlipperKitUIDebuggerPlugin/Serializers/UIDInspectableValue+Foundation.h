/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/SKMacros.h>
#import <Foundation/Foundation.h>
#import "UIDFoundation.h"
#import "UIDInspectable.h"

NS_ASSUME_NONNULL_BEGIN

FB_LINK_REQUIRE_CATEGORY(UIDInspectableText_Foundation)
@interface UIDInspectableText (Foundation)<UIDFoundation>

@end

FB_LINK_REQUIRE_CATEGORY(UIDInspectableNumber_Foundation)
@interface UIDInspectableNumber (Foundation)<UIDFoundation>

@end

FB_LINK_REQUIRE_CATEGORY(UIDInspectableBoolean_Foundation)
@interface UIDInspectableBoolean (Foundation)<UIDFoundation>

@end

FB_LINK_REQUIRE_CATEGORY(UIDInspectableBounds_Foundation)
@interface UIDInspectableBounds (Foundation)<UIDFoundation>

@end

FB_LINK_REQUIRE_CATEGORY(UIDInspectableSize_Foundation)
@interface UIDInspectableSize (Foundation)<UIDFoundation>

@end

FB_LINK_REQUIRE_CATEGORY(UIDInspectableCoordinate_Foundation)
@interface UIDInspectableCoordinate (Foundation)<UIDFoundation>

@end

FB_LINK_REQUIRE_CATEGORY(UIDInspectableEdgeInsets_Foundation)
@interface UIDInspectableEdgeInsets (Foundation)<UIDFoundation>

@end

FB_LINK_REQUIRE_CATEGORY(UIDInspectableColor_Foundation)
@interface UIDInspectableColor (Foundation)<UIDFoundation>

@end

FB_LINK_REQUIRE_CATEGORY(UIDInspectableUnknown_Foundation)
@interface UIDInspectableUnknown (Foundation)<UIDFoundation>

@end

FB_LINK_REQUIRE_CATEGORY(UIDInspectableEnum_Foundation)
@interface UIDInspectableEnum (Foundation)<UIDFoundation>

@end

NS_ASSUME_NONNULL_END

#endif
