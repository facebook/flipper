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

#import "RootViewController.h"

#import <ComponentKit/CKBackgroundLayoutComponent.h>
#import <ComponentKit/CKButtonComponent.h>
#import <ComponentKit/CKComponent.h>
#import <ComponentKit/CKComponentFlexibleSizeRangeProvider.h>
#import <ComponentKit/CKComponentHostingView.h>
#import <ComponentKit/CKComponentProvider.h>
#import <ComponentKit/CKCompositeComponent.h>
#import <ComponentKit/CKFlexboxComponent.h>
#import <ComponentKit/CKImageComponent.h>
#import <ComponentKit/CKInsetComponent.h>

@interface RootViewController ()

@property (strong, nonatomic) CKComponentHostingView *rootCKHostingView;

@end

@implementation RootViewController

- (instancetype)init
{
  if (self = [super init]) {
    _rootCKHostingView = [[CKComponentHostingView alloc]
                          initWithComponentProvider:[self class]
                          sizeRangeProvider:
                          [CKComponentFlexibleSizeRangeProvider providerWithFlexibility:CKComponentSizeRangeFlexibleHeight]];

    [self.view addSubview:_rootCKHostingView];
    [self loadViewIfNeeded];
  }
  return self;
}

- (void)viewDidLoad {
  [super viewDidLoad];
  self.navigationItem.title = @"ComponentKit Layout";
  self.edgesForExtendedLayout = UIRectEdgeNone;
}

- (void)viewDidLayoutSubviews
{
  [super viewDidLayoutSubviews];
  _rootCKHostingView.frame = self.view.bounds;
}

+ (CKComponent *)componentForModel:(id<NSObject>)model context:(id<NSObject>)context {
  return [CKBackgroundLayoutComponent
   newWithComponent:
   [CKFlexboxComponent
    newWithView:{
    }
    size:{}
    style:{}
    children: {
      {
        [CKButtonComponent
         newWithAction:nil
         options:{
           .titles = @"Purple",
           .titleColors = UIColor.purpleColor,
         }
         ]
      },
      {
        [CKButtonComponent
         newWithAction:nil
         options:{
           .titles = @"Brown",
           .titleColors = UIColor.brownColor,
         }
         ]
      },
      {
        [CKButtonComponent
         newWithAction:nil
         options:{
           .titles = @"Cyan",
           .titleColors = UIColor.cyanColor,
         }
         ]
      },
    }]
   background:
   [CKImageComponent
    newWithImage:[UIImage imageNamed:@"sonarpattern"]
    attributes:{}
    size:{}]];
}

@end
