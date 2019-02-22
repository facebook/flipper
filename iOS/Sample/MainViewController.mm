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
#import "UserDefaultsViewController.h"
#import "CommunicationDemoViewController.h"
#import <FlipperKit/FlipperDiagnosticsViewController.h>

@interface MainViewController ()

@end

@implementation MainViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view.
}
- (IBAction)tappedDiagnosticScreen:(UIButton *)sender {
    FlipperDiagnosticsViewController *controller = [[FlipperDiagnosticsViewController alloc] init];
    [self.navigationController pushViewController:controller animated:true];
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

- (IBAction)tappedUserDefaults:(id)sender {
    UIStoryboard *storyboard = [UIStoryboard storyboardWithName:@"MainStoryBoard" bundle:nil];
    UserDefaultsViewController *userDefaultsViewController = [storyboard instantiateViewControllerWithIdentifier:@"UserDefaultsViewController"];
    
    [self.navigationController pushViewController:userDefaultsViewController animated:true];
}

- (IBAction)tappedCommunicationDemo:(UIButton *)sender {
    UIStoryboard *storyboard = [UIStoryboard storyboardWithName:@"MainStoryBoard" bundle:nil];
    CommunicationDemoViewController *communicationDemoViewController = [storyboard instantiateViewControllerWithIdentifier:@"CommunicationDemoViewController"];
    [self.navigationController pushViewController:communicationDemoViewController animated:true];
}

- (IBAction)tappedCauseCrash:(UIButton *)sender {
  NSArray *arr = @[];
  [arr objectAtIndex:10];
}

@end
