//
//  UserDefaultsViewController.m
//  Sample
//
//  Created by Marc Terns on 10/7/18.
//  Copyright © 2018 Facebook. All rights reserved.
//

#import "UserDefaultsViewController.h"

@interface UserDefaultsViewController ()
@property (weak, nonatomic) IBOutlet UITextField *valueTextField;
@property (weak, nonatomic) IBOutlet UITextField *keyTextField;
@property (nonatomic, strong) NSUserDefaults *userDefaults;
@end

@implementation UserDefaultsViewController

- (instancetype)initWithCoder:(NSCoder *)aDecoder {
    if (self = [super initWithCoder:aDecoder]) {
        _userDefaults = [[NSUserDefaults alloc] initWithSuiteName:nil];
    }
    return self;
}

- (IBAction)tappedSave:(id)sender {
    [self.userDefaults setObject:self.valueTextField.text forKey:self.keyTextField.text];
}

@end
