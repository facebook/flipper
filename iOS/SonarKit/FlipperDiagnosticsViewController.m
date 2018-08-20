#ifdef FB_SONARKIT_ENABLED

#import "FlipperDiagnosticsViewController.h"
#import "SonarClient.h"

@implementation FlipperDiagnosticsViewController

- (void)viewDidLoad {
  [super viewDidLoad];

  UILabel *text = [[UILabel alloc] initWithFrame:CGRectMake(0, 0, self.view.frame.size.width, 50)];
  text.text = @"Flipper Diagnostics";
  [self.view addSubview:text];

  self.scrollView = [[UIScrollView alloc] initWithFrame:CGRectMake(0, 50, self.view.frame.size.width, self.view.frame.size.height - 100)];
  self.stateLabel = [[UILabel alloc] initWithFrame:CGRectMake(0, 0, self.view.frame.size.width, 1000)];

  self.stateLabel.numberOfLines = 0;
  self.stateLabel.text = [[SonarClient sharedClient] getState];
  [self.scrollView addSubview:self.stateLabel];
  self.scrollView.contentSize = self.stateLabel.frame.size;
  [self.view addSubview:self.scrollView];
}

- (void)onUpdate {
  FlipperDiagnosticsViewController __weak *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    FlipperDiagnosticsViewController *strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }
    NSString *state = [[SonarClient sharedClient] getState];
    strongSelf.stateLabel.text = state;
    [strongSelf.stateLabel sizeToFit];
    strongSelf.scrollView.contentSize = strongSelf.stateLabel.frame.size;
  });
}

- (void)viewWillAppear:(BOOL)animated {
  [super viewWillAppear:animated];
  id<FlipperStateUpdateListener> weakSelf = self;
  [[SonarClient sharedClient] subscribeForUpdates:weakSelf];
}

- (UIInterfaceOrientationMask)supportedInterfaceOrientations {
  return UIInterfaceOrientationMaskPortrait;
}

- (UIInterfaceOrientation)preferredInterfaceOrientationForPresentation {
  return UIInterfaceOrientationMaskPortrait;
}

@end

#endif
