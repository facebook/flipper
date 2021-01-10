/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RootViewController.h"

#import <ComponentKit/CKBackgroundLayoutComponent.h>
#import <ComponentKit/CKButtonComponent.h>
#import <ComponentKit/CKComponent.h>
#import <ComponentKit/CKComponentFlexibleSizeRangeProvider.h>
#import <ComponentKit/CKComponentHostingView.h>
#import <ComponentKit/CKComponentProvider.h>
#import <ComponentKit/CKCompositeComponent.h>
#import <ComponentKit/CKFlexboxComponent.h>
#import <ComponentKit/CKImageComponent.h>
#import <ComponentKit/CKInsetComponent.h>

@interface RootViewController ()

@property(strong, nonatomic) CKComponentHostingView* rootCKHostingView;

@end

@implementation RootViewController

- (instancetype)init {
  if (self = [super init]) {
    _rootCKHostingView = [[CKComponentHostingView alloc]
        initWithComponentProviderFunc:componentForModel
                    sizeRangeProvider:
                        [CKComponentFlexibleSizeRangeProvider
                            providerWithFlexibility:
                                CKComponentSizeRangeFlexibleHeight]];

    [self.view addSubview:_rootCKHostingView];
    [self loadViewIfNeeded];
  }
  return self;
}

- (void)viewDidLoad {
  [super viewDidLoad];
  self.navigationItem.title = @"ComponentKit Layout";
  self.edgesForExtendedLayout = UIRectEdgeNone;
}

- (void)viewDidLayoutSubviews {
  [super viewDidLayoutSubviews];
  _rootCKHostingView.frame = self.view.bounds;
}

static CKComponent* componentForModel(
    id<NSObject> model,
    id<NSObject> context) {
  return CK::BackgroundLayoutComponentBuilder()
      .component(CK::FlexboxComponentBuilder()
                     .child(
                         {.component = CK::ButtonComponentBuilder()
                                           .action(nil)
                                           .title(@"Purple")
                                           .titleColor(UIColor.purpleColor)
                                           .build()})
                     .child(
                         {.component = CK::ButtonComponentBuilder()
                                           .action(nil)
                                           .title(@"Brown")
                                           .titleColor(UIColor.brownColor)
                                           .build()})
                     .child(
                         {.component = CK::ButtonComponentBuilder()
                                           .action(nil)
                                           .title(@"Cyan")
                                           .titleColor(UIColor.cyanColor)
                                           .build()})
                     .build())
      .background(CK::ImageComponentBuilder()
                      .image([UIImage imageNamed:@"sonarpattern"])
                      .build())
      .build();
}

@end
