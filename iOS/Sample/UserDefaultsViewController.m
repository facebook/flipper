/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "UserDefaultsViewController.h"

@interface UserDefaultsViewController ()
@property(weak, nonatomic) IBOutlet UITextField* valueTextField;
@property(weak, nonatomic) IBOutlet UITextField* keyTextField;
@property(nonatomic, strong) NSUserDefaults* userDefaults;
@end

@implementation UserDefaultsViewController

- (instancetype)initWithCoder:(NSCoder*)aDecoder {
  if (self = [super initWithCoder:aDecoder]) {
    _userDefaults = [[NSUserDefaults alloc] initWithSuiteName:nil];
  }
  return self;
}

- (IBAction)tappedSave:(id)sender {
  [self.userDefaults setObject:self.valueTextField.text
                        forKey:self.keyTextField.text];
}

@end
