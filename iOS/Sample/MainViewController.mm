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
