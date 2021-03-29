/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKDescriptorMapper.h"

#if TARGET_OS_IPHONE

#import <FlipperKitLayoutIOSDescriptors/SKApplicationDescriptor.h>
#import <FlipperKitLayoutIOSDescriptors/SKButtonDescriptor.h>
#import <FlipperKitLayoutIOSDescriptors/SKScrollViewDescriptor.h>
#import <FlipperKitLayoutIOSDescriptors/SKViewControllerDescriptor.h>
#import <FlipperKitLayoutIOSDescriptors/SKViewDescriptor.h>

#elif TARGET_OS_OSX

#import <FlipperKitLayoutMacOSDescriptors/SKNSApplicationDescriptor.h>
#import <FlipperKitLayoutMacOSDescriptors/SKNSButtonDescriptor.h>
#import <FlipperKitLayoutMacOSDescriptors/SKNSScrollViewDescriptor.h>
#import <FlipperKitLayoutMacOSDescriptors/SKNSViewControllerDescriptor.h>
#import <FlipperKitLayoutMacOSDescriptors/SKNSViewDescriptor.h>
#import <FlipperKitLayoutMacOSDescriptors/SKNSWindowDescriptor.h>

#endif

@implementation SKDescriptorMapper {
  NSMutableDictionary<NSString*, SKNodeDescriptor*>* _descriptors;
}

- (instancetype)initWithDefaults {
  if (self = [super init]) {
    _descriptors = [NSMutableDictionary new];

#if TARGET_OS_IPHONE
    [self registerDescriptor:[[SKApplicationDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[UIApplication class]];
    [self registerDescriptor:[[SKViewControllerDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[UIViewController class]];
    [self registerDescriptor:[[SKScrollViewDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[UIScrollView class]];
    [self registerDescriptor:[[SKButtonDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[UIButton class]];
    [self registerDescriptor:[[SKViewDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[UIView class]];

#elif TARGET_OS_OSX
    [self registerDescriptor:[[SKNSApplicationDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[NSApplication class]];
    [self registerDescriptor:[[SKNSViewControllerDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[NSViewController class]];
    [self registerDescriptor:[[SKNSScrollViewDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[NSScrollView class]];
    [self registerDescriptor:[[SKNSButtonDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[NSButton class]];
    [self registerDescriptor:[[SKNSViewDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[NSView class]];
    [self registerDescriptor:[[SKNSWindowDescriptor alloc]
                                 initWithDescriptorMapper:self]
                    forClass:[NSWindow class]];
#endif
  }

  return self;
}

- (SKNodeDescriptor*)descriptorForClass:(Class)cls {
  SKNodeDescriptor* classDescriptor = nil;

  while (classDescriptor == nil && cls != nil) {
    classDescriptor = [_descriptors objectForKey:NSStringFromClass(cls)];
    cls = [cls superclass];
  }

  return classDescriptor;
}

- (void)registerDescriptor:(SKNodeDescriptor*)descriptor forClass:(Class)cls {
  NSString* className = NSStringFromClass(cls);
  _descriptors[className] = descriptor;
}

- (NSArray<SKNodeDescriptor*>*)allDescriptors {
  return [_descriptors allValues];
}

@end

#endif
