/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import "SKComponentLayoutWrapper.h"

#import <ComponentKit/CKAnalyticsListenerHelpers.h>
#import <ComponentKit/CKComponent.h>
#import <ComponentKit/CKComponentInternal.h>
#import <ComponentKit/CKComponentRootView.h>
#import <ComponentKit/CKComponentAttachController.h>
#import <ComponentKit/CKComponentAttachControllerInternal.h>
#import <ComponentKit/CKInspectableView.h>

#import "CKComponent+Sonar.h"

static char const kLayoutWrapperKey = ' ';

static CKFlexboxComponentChild findFlexboxLayoutParams(CKComponent *parent, CKComponent *child) {
  if ([parent isKindOfClass:[CKFlexboxComponent class]]) {
    static Ivar ivar = class_getInstanceVariable([CKFlexboxComponent class], "_children");
    static ptrdiff_t offset = ivar_getOffset(ivar);

    unsigned char *pComponent = (unsigned char*)(__bridge void*)parent;
    auto children = (std::vector<CKFlexboxComponentChild> *)(pComponent + offset);

    if (children) {
      for (auto it = children->begin(); it != children->end(); it++) {
        if (it->component == child) {
          return *it;
        }
      }
    }
  }

  return {};
}

@implementation SKComponentLayoutWrapper

+ (instancetype)newFromRoot:(id<CKInspectableView>)root {
  const CKComponentLayout layout = [root mountedLayout];
  // Check if there is a cached wrapper.
  if (layout.component) {
    SKComponentLayoutWrapper *cachedWrapper = objc_getAssociatedObject(layout.component, &kLayoutWrapperKey);
    if (cachedWrapper) {
      return cachedWrapper;
    }
  }
  CKComponentReuseWrapper *reuseWrapper = CKAnalyticsListenerHelpers::GetReusedNodes(layout.component);
  // Create a new layout wrapper.
  SKComponentLayoutWrapper *const wrapper =
  [[SKComponentLayoutWrapper alloc] initWithLayout:layout
                                          position:CGPointMake(0, 0)
                                      reuseWrapper:reuseWrapper];
  // Cache the result.
  if (layout.component) {
    objc_setAssociatedObject(layout.component, &kLayoutWrapperKey, wrapper, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  }
  return wrapper;
}

- (instancetype)initWithLayout:(const CKComponentLayout &)layout
                      position:(CGPoint)position
                  reuseWrapper:(CKComponentReuseWrapper *)reuseWrapper
{
  if (self = [super init]) {
    _component = layout.component;
    _size = layout.size;
    _position = position;
    _identifier = _component ? [NSString stringWithFormat:@"%d", _component.treeNode.nodeIdentifier] : @"(null)";

    if (_component && reuseWrapper) {
      auto const canBeReusedCounter = [reuseWrapper canBeReusedCounter:_component.treeNode.nodeIdentifier];
      if (canBeReusedCounter > 0) {
        _component.flipper_canBeReusedCounter = canBeReusedCounter;
      }
    }

    if (layout.children != nullptr) {
      for (const auto &child : *layout.children) {
        if (child.layout.component == nil) {
          continue; // nil children are allowed, ignore them
        }
        SKComponentLayoutWrapper *childWrapper = [[SKComponentLayoutWrapper alloc] initWithLayout:child.layout
                                                                                         position:child.position
                                                                                     reuseWrapper:reuseWrapper];
        childWrapper->_isFlexboxChild = [_component isKindOfClass:[CKFlexboxComponent class]];
        childWrapper->_flexboxChild = findFlexboxLayoutParams(_component, child.layout.component);
        _children.push_back(childWrapper);
      }
    }
  }

  return self;
}

@end

#endif
