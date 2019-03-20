/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import "SKComponentLayoutWrapper.h"

#import <ComponentKit/CKComponent.h>
#import <ComponentKit/CKComponentRootView.h>
// TODO T41966103 Remove conditional imports
#if FLIPPER_OSS
#import <ComponentKit/CKComponentDataSourceAttachController.h>
#import <ComponentKit/CKComponentDataSourceAttachControllerInternal.h>
#else
#import <ComponentKit/CKComponentAttachController.h>
#import <ComponentKit/CKComponentAttachControllerInternal.h>
#endif
#import <ComponentKit/CKInspectableView.h>

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
  SKComponentLayoutWrapper *const wrapper =
  [[SKComponentLayoutWrapper alloc] initWithLayout:layout
                                          position:CGPointMake(0, 0)
                                         parentKey:[NSString stringWithFormat: @"%p.", layout.component]];
  if (layout.component)
    objc_setAssociatedObject(layout.component, &kLayoutWrapperKey, wrapper, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  return wrapper;
}

- (instancetype)initWithLayout:(const CKComponentLayout &)layout position:(CGPoint)position parentKey:(NSString *)parentKey {
  if (self = [super init]) {
    _component = layout.component;
    _size = layout.size;
    _position = position;
    _identifier = [parentKey stringByAppendingString:layout.component ? NSStringFromClass([layout.component class]) : @"(null)"];

    if (layout.children != nullptr) {
      int index = 0;
      for (const auto &child : *layout.children) {
        if (child.layout.component == nil) {
          continue; // nil children are allowed, ignore them
        }
        SKComponentLayoutWrapper *childWrapper = [[SKComponentLayoutWrapper alloc] initWithLayout:child.layout
                                                                                         position:child.position
                                                                                        parentKey:[_identifier stringByAppendingFormat:@"[%d].", index++]];
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
