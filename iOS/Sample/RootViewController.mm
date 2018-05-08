/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import "RootViewController.h"

#import <ComponentKit/CKButtonComponent.h>
#import <ComponentKit/CKComponentFlexibleSizeRangeProvider.h>
#import <ComponentKit/CKComponentHostingView.h>
#import <ComponentKit/CKComponentProvider.h>
#import <ComponentKit/CKFlexboxComponent.h>
#import <ComponentKit/CKInsetComponent.h>

@interface RootViewController () //<CKComponentProvider>
@end

@implementation RootViewController
{
  CKComponentHostingView *_rootCKHostingView;
}

- (instancetype)init
{
  if (self = [super init]) {
    _rootCKHostingView = [[CKComponentHostingView alloc]
                          initWithComponentProvider:[self class]
                          sizeRangeProvider:
                          [CKComponentFlexibleSizeRangeProvider providerWithFlexibility:CKComponentSizeRangeFlexibleHeight]];

    self.view = _rootCKHostingView;
    [self setView:_rootCKHostingView];
    [self loadViewIfNeeded];

  }
  return self;
}

+ (CKComponent *)componentForModel:(id<NSObject>)model context:(id<NSObject>)context {
  return [CKInsetComponent
          newWithInsets: { .top = 70, .bottom = 70, .left = 20, .right = 20}
          component:
          [CKFlexboxComponent
           newWithView: {}
           size: {}
           style: {.alignItems = CKFlexboxAlignItemsStart}
           children: {
             {
               [CKButtonComponent
                newWithAction:@selector(didClickGetRequest:)
                options:{
                  .titles = @"Hit a Get request",
                }
               ]
             },
             {
               [CKButtonComponent
                newWithAction:@selector(didClickPostRequest:)
                options:{
                  .titles = @"Hit a Post request",
                }
                ]
             },
             {
               [CKButtonComponent
                newWithAction:@selector(didTapFetchYogaInfo:)
                options:{
                  .titles = @"Fetch details of lib yoga",
                }
                ]
             },
           }]];
}

- (void)didTapFetchYogaInfo:(CKButtonComponent *)sender {
  [[[NSURLSession sharedSession] dataTaskWithURL:[NSURL URLWithString:@"https://api.github.com/repos/facebook/yoga"] completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {
    if (error && !data) {
      return;
    }
    NSLog(@"Fetched yoga info");
  }] resume];
}

- (void)didClickPostRequest:(CKButtonComponent *)sender {

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
  [[[NSURLSession sharedSession] dataTaskWithRequest:urlRequest completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {
    if (error && !data) {
      return;
    }
    NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    NSLog(@"MSG-POST: %@", dict[@"msg"]);

  }] resume];

}

- (void)didClickGetRequest:(CKButtonComponent *)sender {
  [[[NSURLSession sharedSession] dataTaskWithURL:[NSURL URLWithString:@"https://demo9512366.mockable.io/"] completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {
    if (error && !data) {
      return;
    }
    NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    NSLog(@"MSG-GET: %@", dict[@"msg"]);
  }] resume];
}


@end
