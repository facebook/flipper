/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#import "MainViewController.h"

#import "NetworkViewController.h"
#import "RootViewController.h"

@interface MainViewController ()

@end

@implementation MainViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view.
}

- (IBAction)tappedComponentKitLayout:(UIButton *)sender {
  RootViewController *rootViewController = [RootViewController new];

  [self.navigationController pushViewController:rootViewController animated:true];
}

- (IBAction)tappedNetworkInspector:(UIButton *)sender {
  UIStoryboard *storyboard = [UIStoryboard storyboardWithName:@"MainStoryBoard" bundle:nil];
  NetworkViewController *networkViewController = [storyboard instantiateViewControllerWithIdentifier:@"NetworkViewController"];

  [self.navigationController pushViewController:networkViewController animated:true];
}

@end
