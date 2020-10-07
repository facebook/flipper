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
  return [CKBackgroundLayoutComponent
      newWithComponent:
          [CKFlexboxComponent newWithView:{}
              size:{}
              style:{}
              children:{
                           {[CKButtonComponent
                               newWithAction:nil
                                     options:{
                                                 .titles = @"Purple",
                                                 .titleColors =
                                                     UIColor.purpleColor,
                                             }]},
                           {[CKButtonComponent
                               newWithAction:nil
                                     options:{
                                                 .titles = @"Brown",
                                                 .titleColors =
                                                     UIColor.brownColor,
                                             }]},
                           {[CKButtonComponent
                               newWithAction:nil
                                     options:{
                                                 .titles = @"Cyan",
                                                 .titleColors =
                                                     UIColor.cyanColor,
                                             }]},
                       }]
            background:CK::ImageComponentBuilder()
                           .image([UIImage imageNamed:@"sonarpattern"])
                           .build()];
}

@end
