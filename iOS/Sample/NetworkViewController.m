/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "NetworkViewController.h"

@interface NetworkViewController () 

@end

@implementation NetworkViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  self.navigationItem.title = @"Network";
}

- (IBAction)tappedGithubLitho:(UIButton*)sender {
  [[[NSURLSession sharedSession]
        dataTaskWithURL:
            [NSURL
                URLWithString:
                    @"https://raw.githubusercontent.com/facebook/litho/master/docs/static/logo.png"]
      completionHandler:^(
          NSData* _Nullable data,
          NSURLResponse* _Nullable response,
          NSError* _Nullable error) {
        if (error && !data) {
          return;
        }
        NSLog(@"Got Image");
      }] resume];
}

- (IBAction)tappedPOSTAPI:(UIButton*)sender {
  NSString* post = @"https://demo9512366.mockable.io/FlipperPost";
  NSURL* url = [NSURL URLWithString:post];
  NSMutableURLRequest* urlRequest = [NSMutableURLRequest requestWithURL:url];
  [urlRequest addValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  [urlRequest addValue:@"application/json" forHTTPHeaderField:@"Accept"];
  NSDictionary* mapData =
      [[NSDictionary alloc] initWithObjectsAndKeys:@"Flipper",
                                                   @"app",
                                                   @"Its awesome",
                                                   @"remarks",
                                                   nil];
  NSError* error = nil;
  NSData* postData = [NSJSONSerialization dataWithJSONObject:mapData
                                                     options:0
                                                       error:&error];
  [urlRequest setHTTPBody:postData];
  [urlRequest setHTTPMethod:@"POST"];
  __weak NetworkViewController* weakSelf = self;
  [[[NSURLSession sharedSession]
      dataTaskWithRequest:urlRequest
        completionHandler:^(
            NSData* _Nullable data,
            NSURLResponse* _Nullable response,
            NSError* _Nullable dataTaskError) {
          if (dataTaskError || !data) {
            [weakSelf
                showAlertWithMessage:@"Received error in POST API response"];
            return;
          }
          NSDictionary* dict =
              [NSJSONSerialization JSONObjectWithData:data
                                              options:0
                                                error:&dataTaskError];
          NSLog(@"MSG-POST: %@", dict[@"msg"]);

          [weakSelf showAlertWithMessage:@"Received response from POST API"];
        }] resume];
}

- (IBAction)tappedGetAPI:(UIButton*)sender {
  __weak NetworkViewController* weakSelf = self;
  [[[NSURLSession sharedSession]
        dataTaskWithURL:
            [NSURL URLWithString:@"https://demo9512366.mockable.io/FlipperGet"]
      completionHandler:^(
          NSData* _Nullable data,
          NSURLResponse* _Nullable response,
          NSError* _Nullable error) {
        if (error || !data) {
          [weakSelf showAlertWithMessage:@"Received error in GET API response"];
          return;
        }
        NSDictionary* dict = [NSJSONSerialization JSONObjectWithData:data
                                                             options:0
                                                               error:&error];
        NSLog(@"MSG-GET: %@", dict[@"msg"]);
        [weakSelf showAlertWithMessage:@"Received response from GET API"];
      }] resume];
}

- (void)showAlertWithMessage:(nonnull NSString*)msg {
  dispatch_async(dispatch_get_main_queue(), ^{
    UIAlertController* alertController = [self alertControllerForMessage:msg];
    [self presentViewController:alertController animated:true completion:nil];
  });
}

- (UIAlertController*)alertControllerForMessage:(nonnull NSString*)msg {
  UIAlertController* controller =
      [UIAlertController alertControllerWithTitle:@"Flipper"
                                          message:msg
                                   preferredStyle:UIAlertControllerStyleAlert];
  UIAlertAction* action =
      [UIAlertAction actionWithTitle:@"Ok"
                               style:UIAlertActionStyleDefault
                             handler:nil];
  [controller addAction:action];
  return controller;
}

@end
