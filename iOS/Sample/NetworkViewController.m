/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#import "NetworkViewController.h"

@interface NetworkViewController ()

@end

@implementation NetworkViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  self.navigationItem.title = @"Network";
}

- (IBAction)tappedGithubLitho:(UIButton *)sender {
  [[[NSURLSession sharedSession] dataTaskWithURL:[NSURL URLWithString:@"https://raw.githubusercontent.com/facebook/litho/master/docs/static/logo.png"] completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {
    if (error && !data) {
      return;
    }
    NSLog(@"Got Image");
  }] resume];
}

- (IBAction)tappedPOSTAPI:(UIButton *)sender {
  NSString *post = @"https://demo9512366.mockable.io/SonarPost";
  NSURL *url = [NSURL URLWithString:post];
  NSMutableURLRequest *urlRequest = [NSMutableURLRequest requestWithURL: url];
  [urlRequest addValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  [urlRequest addValue:@"application/json" forHTTPHeaderField:@"Accept"];
  NSDictionary *mapData = [[NSDictionary alloc] initWithObjectsAndKeys: @"Sonar", @"app",
                           @"Its awesome", @"remarks",
                           nil];
  NSError *error = nil;
  NSData *postData = [NSJSONSerialization dataWithJSONObject:mapData options:0 error:&error];
  [urlRequest setHTTPBody:postData];
  [urlRequest setHTTPMethod:@"POST"];
  __weak NetworkViewController *weakSelf = self;
  [[[NSURLSession sharedSession] dataTaskWithRequest:urlRequest completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {

    if (error || !data) {
      UIAlertController *alertController = [weakSelf alertControllerForMessage:@"Received error in POST API response"];
      [weakSelf presentViewController:alertController animated:true completion:nil];
      return;
    }
    NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    NSLog(@"MSG-POST: %@", dict[@"msg"]);

    UIAlertController *alertController = [weakSelf alertControllerForMessage:@"Received response from POST API"];
    [weakSelf presentViewController:alertController animated:true completion:nil];

  }] resume];
}

- (IBAction)tappedGetAPI:(UIButton *)sender {
  __weak NetworkViewController *weakSelf = self;
  [[[NSURLSession sharedSession] dataTaskWithURL:[NSURL URLWithString:@"https://demo9512366.mockable.io/"] completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {
    if (error || !data) {
      UIAlertController *alertController = [weakSelf alertControllerForMessage:@"Received error in GET API response"];
      [weakSelf presentViewController:alertController animated:true completion:nil];
      return;
    }
    NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    NSLog(@"MSG-GET: %@", dict[@"msg"]);
    UIAlertController *alertController = [weakSelf alertControllerForMessage:@"Received response from GET API"];
    [weakSelf presentViewController:alertController animated:true completion:nil];
  }] resume];
}


- (UIAlertController *)alertControllerForMessage:(nonnull NSString *)msg {
  UIAlertController *controller = [UIAlertController alertControllerWithTitle:@"Sonar" message:msg preferredStyle:UIAlertControllerStyleAlert];
  UIAlertAction *action = [UIAlertAction actionWithTitle:@"Ok" style:UIAlertActionStyleDefault handler:nil];
  [controller addAction:action];
  return controller;
}

@end
