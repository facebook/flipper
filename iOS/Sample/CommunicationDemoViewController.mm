/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "CommunicationDemoViewController.h"
#import <FlipperKitExamplePlugin/FlipperKitExamplePlugin.h>

@interface CommunicationDemoViewController ()<
    FlipperKitExampleCommunicationResponderDelegate>
@property(strong, nonatomic) NSMutableArray<NSString*>* messagesToDisplay;
@property(weak, nonatomic) IBOutlet UITextField* messageTextField;
@property(weak, nonatomic) IBOutlet UITableView* tableView;
@end

@implementation CommunicationDemoViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  [FlipperKitExamplePlugin sharedInstance].delegate = self;
}

- (IBAction)tappedTriggerNotification:(UIButton*)sender {
  [[FlipperKitExamplePlugin sharedInstance] triggerNotification];
}

- (IBAction)tappedSendMessage:(UIButton*)sender {
  if (self.messageTextField.text.length > 0) {
    [[FlipperKitExamplePlugin sharedInstance]
        sendMessage:self.messageTextField.text];
  }
}

- (nonnull UITableViewCell*)tableView:(nonnull UITableView*)tableView
                cellForRowAtIndexPath:(nonnull NSIndexPath*)indexPath {
  UITableViewCell* cell =
      [tableView dequeueReusableCellWithIdentifier:@"reusableCell"];
  cell.textLabel.text = self.messagesToDisplay[indexPath.row];
  return cell;
}

- (NSInteger)tableView:(nonnull UITableView*)tableView
    numberOfRowsInSection:(NSInteger)section {
  return self.messagesToDisplay.count;
}

- (void)messageReceived:(NSString*)msg {
  if (msg) {
    if (!self.messagesToDisplay) {
      self.messagesToDisplay = @[].mutableCopy;
    }
    [self.messagesToDisplay addObject:msg];
    dispatch_async(dispatch_get_main_queue(), ^{
      [self.tableView reloadData];
    });
  }
}

@end
