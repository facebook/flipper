/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKComponentLayoutWrapper.h"

#import <ComponentKit/CKAnalyticsListenerHelpers.h>
#import <ComponentKit/CKComponent.h>
#import <ComponentKit/CKComponentAttachController.h>
#import <ComponentKit/CKComponentAttachControllerInternal.h>
#import <ComponentKit/CKComponentInternal.h>
#import <ComponentKit/CKComponentRootView.h>
#import <ComponentKit/CKInspectableView.h>

#import "CKComponent+Sonar.h"
#import "SKComponentMountedView.h"

static char const kLayoutWrapperKey = ' ';

static CK::Optional<CKFlexboxComponentChild> findFlexboxLayoutParams(
    id<CKMountable> parent,
    id<CKMountable> child) {
  if ([parent isKindOfClass:[CKFlexboxComponent class]]) {
    static Ivar ivar =
        class_getInstanceVariable([CKFlexboxComponent class], "_children");
    static ptrdiff_t offset = ivar_getOffset(ivar);

    unsigned char* pComponent = (unsigned char*)(__bridge void*)parent;
    auto children =
        (std::vector<CKFlexboxComponentChild>*)(pComponent + offset);

    if (children) {
      for (auto it = children->begin(); it != children->end(); it++) {
        if (it->component == child) {
          return *it;
        }
      }
    }
  }

  return CK::none;
}

@implementation SKComponentLayoutWrapper

+ (instancetype)newFromRoot:(id<CKInspectableView>)root
                  parentKey:(NSString*)parentKey {
  const auto layout = [root mountedLayout];
  // Check if there is a cached wrapper.
  if (layout.component) {
    SKComponentLayoutWrapper* cachedWrapper =
        objc_getAssociatedObject(layout.component, &kLayoutWrapperKey);
    if (cachedWrapper) {
      return cachedWrapper;
    }
  }
  // TODO: Add support for `CKMountable` components.
  CKComponent* component = (CKComponent*)layout.component;
  CKComponentReuseWrapper* reuseWrapper =
      CKAnalyticsListenerHelpers::GetReusedNodes(component);
  // Create a new layout wrapper.
  SKComponentLayoutWrapper* const wrapper = [[SKComponentLayoutWrapper alloc]
      initWithLayout:layout
            position:CGPointMake(0, 0)
        flexboxChild:CK::none
           parentKey:[NSString
                         stringWithFormat:@"%@%d.",
                                          parentKey,
                                          component.treeNode.nodeIdentifier]
        reuseWrapper:reuseWrapper
            rootNode:root];
  // Cache the result.
  if (component) {
    objc_setAssociatedObject(
        component,
        &kLayoutWrapperKey,
        wrapper,
        OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  }
  return wrapper;
}

- (instancetype)initWithLayout:(const CKComponentLayout&)layout
                      position:(CGPoint)position
                  flexboxChild:
                      (CK::Optional<CKFlexboxComponentChild>)flexboxChild
                     parentKey:(NSString*)parentKey
                  reuseWrapper:(CKComponentReuseWrapper*)reuseWrapper
                      rootNode:(id<CKInspectableView>)node {
  if (self = [super init]) {
    _rootNode = node;
    _component = (CKComponent*)layout.component;
    _size = layout.size;
    _position = position;
    _flexboxChild = flexboxChild;
    _identifier = [parentKey stringByAppendingString:layout.component
                                 ? layout.component.className
                                 : @"(null)"];

    if (_component && reuseWrapper) {
      auto const canBeReusedCounter =
          [reuseWrapper canBeReusedCounter:_component.treeNode.nodeIdentifier];
      if (canBeReusedCounter > 0) {
        _component.flipper_canBeReusedCounter = canBeReusedCounter;
      }
    }

    std::vector<SKComponentLayoutWrapper*> childComponents;
    if (layout.children != nullptr) {
      int index = 0;
      for (const auto& child : *layout.children) {
        if (child.layout.component == nil) {
          continue; // nil children are allowed, ignore them
        }
        SKComponentLayoutWrapper* childWrapper =
            [[SKComponentLayoutWrapper alloc]
                initWithLayout:child.layout
                      position:child.position
                  flexboxChild:findFlexboxLayoutParams(
                                   _component, child.layout.component)
                     parentKey:[_identifier
                                   stringByAppendingFormat:@"[%d].", index++]
                  reuseWrapper:reuseWrapper
                      rootNode:node];
        childComponents.push_back(childWrapper);
      }
    }

    UIView* mountedView = _component.mountedView;
    if (mountedView && !childComponents.empty()) {
      _children = SKMountedViewChild{[[SKComponentMountedView alloc]
          initWithView:mountedView
              children:childComponents]};
    } else if (mountedView) {
      _children = SKLeafViewChild{mountedView}; // leaf view
    } else {
      _children = childComponents;
    }
  }

  return self;
}

@end

#endif
