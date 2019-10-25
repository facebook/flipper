/*
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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
