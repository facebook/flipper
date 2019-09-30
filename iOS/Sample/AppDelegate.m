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

#import "AppDelegate.h"
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <FlipperKitLayoutComponentKitSupport/FlipperKitLayoutComponentKitSupport.h>
#import <FlipperKitExamplePlugin/FlipperKitExamplePlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>

#import "MainViewController.h"
#import "RootViewController.h"

#if !FB_SONARKIT_ENABLED
#error "Sample need to be run with SonarKit enabled in order to properly interact with Sonar. SonarKit is enabled by default if its a debug build."
#endif

@implementation AppDelegate {
  UIWindow *_window;
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  _window = [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
  FlipperClient *client = [FlipperClient sharedClient];

  SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
  [FlipperKitLayoutComponentKitSupport setUpWithDescriptorMapper: layoutDescriptorMapper];
  [client addPlugin: [[FlipperKitLayoutPlugin alloc] initWithRootNode: application
                                               withDescriptorMapper: layoutDescriptorMapper]];

  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];

  [[FlipperClient sharedClient] addPlugin: [[FlipperKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client addPlugin:[FlipperKitExamplePlugin sharedInstance]];
  [client addPlugin:[FlipperKitReactPlugin new]];
  [client start];

  UIStoryboard *storyboard = [UIStoryboard storyboardWithName:@"MainStoryBoard" bundle:nil];
  MainViewController *mainViewController = [storyboard instantiateViewControllerWithIdentifier:@"MainViewController"];

  UINavigationController *navigationController = [[UINavigationController alloc] initWithRootViewController: mainViewController];
  navigationController.navigationBar.topItem.title = @"Sample";
  navigationController.navigationBar.translucent = NO;

  [_window setRootViewController: [[UINavigationController alloc] initWithRootViewController: mainViewController]];
  [_window makeKeyAndVisible];

  NSLog(@"Hello from Flipper in an Objc app!");
  return YES;
}

@end
