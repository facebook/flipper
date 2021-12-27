/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

#import <ComponentKit/CKComponentLayout.h>
#import <ComponentKit/CKFlexboxComponent.h>
#import <RenderCore/CKOptional.h>
#import <RenderCore/CKVariant.h>

#import <vector>

@protocol CKInspectableView;
@class SKComponentLayoutWrapper;
@class SKComponentMountedView;

// RC::Variant does not support Objective-C types unless they are boxed:
struct SKLeafViewChild {
  UIView* view;
};
struct SKMountedViewChild {
  SKComponentMountedView* view;
};

/**
 The children of a SKComponentLayoutWrapper may be:
 - A single leaf view, which may have UIView children of its own.
 - A single non-leaf view, if the component created a view; its children will be
   the component's child components.
 - An array of SKComponentLayoutWrappers, if the component did not create a
   view.
 */
using SKComponentLayoutWrapperChildren = CK::Variant<
    SKLeafViewChild,
    SKMountedViewChild,
    std::vector<SKComponentLayoutWrapper*>>;

@interface SKComponentLayoutWrapper : NSObject

@property(nonatomic, weak, readonly) CKComponent* component;
@property(nonatomic, readonly) NSString* identifier;
@property(nonatomic, readonly) CGSize size;
@property(nonatomic, readonly) CGPoint position;
@property(nonatomic, readonly) SKComponentLayoutWrapperChildren children;
@property(nonatomic, weak, readonly) id<CKInspectableView> rootNode;
/** CK::none for components that are not the child of a CKFlexboxComponent. */
@property(nonatomic, readonly) CK::Optional<CKFlexboxComponentChild>
    flexboxChild;

+ (instancetype)newFromRoot:(id<CKInspectableView>)root
                  parentKey:(NSString*)parentKey;

@end
