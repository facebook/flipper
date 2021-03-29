/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <TargetConditionals.h>

#if TARGET_OS_IPHONE
#import <UIKit/UIKit.h>
#elif TARGET_OS_OSX
#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#endif

@protocol SKSonarValueCoder

+ (instancetype)fromSonarValue:(id)sonarValue;

- (NSDictionary<NSString*, id<NSObject>>*)sonarValue;

@end

class SKObject {
 public:
  SKObject(CGRect rect);
  SKObject(CGSize size);
  SKObject(CGPoint point);
#if TARGET_OS_IPHONE
  SKObject(UIEdgeInsets insets);
#elif TARGET_OS_OSX
  SKObject(NSEdgeInsets insets);
#endif
  SKObject(CGAffineTransform transform);
  SKObject(id<SKSonarValueCoder> value);
  SKObject(id value);

  operator id<NSObject>() const noexcept {
    return _actual ?: [NSNull null];
  }

 protected:
  id<NSObject> _actual;
};

class SKMutableObject : public SKObject {
 public:
  SKMutableObject(CGRect rect) : SKObject(rect) {}
  SKMutableObject(CGSize size) : SKObject(size){};
  SKMutableObject(CGPoint point) : SKObject(point){};
#if TARGET_OS_IPHONE
  SKMutableObject(UIEdgeInsets insets) : SKObject(insets){};
#elif TARGET_OS_OSX
  SKMutableObject(NSEdgeInsets insets) : SKObject(insets){};
#endif
  SKMutableObject(CGAffineTransform transform) : SKObject(transform){};
  SKMutableObject(id<SKSonarValueCoder> value) : SKObject(value){};
  SKMutableObject(id value) : SKObject(value){};

  operator id<NSObject>() {
    convertToMutable();
    return _actual;
  }

 protected:
  BOOL _convertedToMutable = NO;
  void convertToMutable();
};
