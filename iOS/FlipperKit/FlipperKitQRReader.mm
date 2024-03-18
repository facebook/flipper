/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "FlipperKitQRReader.h"

#ifdef FB_SONARKIT_ENABLED
#if !TARGET_OS_OSX

typedef NS_ENUM(NSInteger, QRActionButtonState) {
  QRActionButtonStateProcessing,
  QRActionButtonStateAccepted,
  QRActionButtonStateError,
  QRActionButtonStateReading
};

@interface QRActionButton : UIButton
@property(nonatomic) QRActionButtonState customState;
@end

@implementation QRActionButton

- (instancetype)init {
  self = [super init];
  if (self) {
    self.contentEdgeInsets = UIEdgeInsetsMake(10, 10, 10, 10);
    self.layer.borderColor = [UIColor systemBlueColor].CGColor;
    self.layer.borderWidth = 2;
    self.translatesAutoresizingMaskIntoConstraints = NO;
    [self.titleLabel setFont:[UIFont boldSystemFontOfSize:18]];
    [self setTitleColor:UIColor.systemBlueColor forState:UIControlStateNormal];
  }
  return self;
}

- (void)setCustomState:(QRActionButtonState)customState {
  _customState = customState;

  switch (customState) {
    case QRActionButtonStateProcessing:
      self.enabled = NO;
      [self setTitle:@"Processing" forState:UIControlStateNormal];
      [self setTitleColor:UIColor.systemBlueColor
                 forState:UIControlStateNormal];
      self.layer.borderColor = [UIColor systemBlueColor].CGColor;
      break;
    case QRActionButtonStateAccepted:
      self.enabled = NO;
      [self setTitle:@"Accepted" forState:UIControlStateNormal];
      [self setTitleColor:UIColor.systemGreenColor
                 forState:UIControlStateNormal];
      self.layer.borderColor = [UIColor systemGreenColor].CGColor;

      break;
    case QRActionButtonStateError:
      self.enabled = NO;
      [self setTitle:@"Failed" forState:UIControlStateNormal];
      [self setTitleColor:UIColor.systemRedColor forState:UIControlStateNormal];
      self.layer.borderColor = [UIColor systemRedColor].CGColor;
      break;
    case QRActionButtonStateReading:
      self.enabled = YES;
      [self setTitle:@"Dismiss" forState:UIControlStateNormal];
      [self setTitleColor:UIColor.systemBlueColor
                 forState:UIControlStateNormal];
      self.layer.borderColor = [UIColor systemBlueColor].CGColor;
      break;
  }

  [self setNeedsLayout];
}

@end

@interface FBFlipperKitQRReaderController ()<
    AVCaptureMetadataOutputObjectsDelegate> {
  __strong FBFlipperKitQRResult _completion;
  dispatch_queue_t _dispatchQueue;
  QRActionButton* _dismissButton;
}

@property(atomic) BOOL isReading;
@property(nonatomic, strong) UIWindow* promptWindow;
@property(nonatomic, strong) AVCaptureSession* captureSession;
@property(nonatomic, strong) AVCaptureVideoPreviewLayer* videoPreviewPlayer;
@property(nonatomic, strong) AVAudioPlayer* audioPlayer;

@end

@implementation FBFlipperKitQRReaderController

+ (void)readQRWith:(FBFlipperKitQRResult)completion {
  FBFlipperKitQRReaderController* readerController =
      [[FBFlipperKitQRReaderController alloc] initWith:completion];

  UIWindow* window =
      [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
  [window setRootViewController:readerController];
  [window setBackgroundColor:[UIColor clearColor]];
  [window setWindowLevel:UIWindowLevelAlert + 1];
  [window makeKeyAndVisible];

  readerController.promptWindow = window;
}

- (instancetype)initWith:(FBFlipperKitQRResult)completion {
  self = [super init];
  if (self) {
    _completion = completion;
  }
  return self;
}

- (void)viewDidLoad {
  [super viewDidLoad];

  NSError* error;

  AVCaptureDevice* captureDevice =
      [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
  AVCaptureDeviceInput* deviceInput =
      [AVCaptureDeviceInput deviceInputWithDevice:captureDevice error:&error];

  if (!deviceInput) {
    _completion(nil, error, NO, nil);
    return;
  }

  _captureSession = [[AVCaptureSession alloc] init];
  [_captureSession addInput:deviceInput];

  AVCaptureMetadataOutput* capturedMetadataOutput =
      [[AVCaptureMetadataOutput alloc] init];
  [_captureSession addOutput:capturedMetadataOutput];

  _dispatchQueue = dispatch_queue_create("com.facebook.flipper.qrreader", NULL);
  [capturedMetadataOutput setMetadataObjectsDelegate:self queue:_dispatchQueue];

  [capturedMetadataOutput
      setMetadataObjectTypes:[NSArray
                                 arrayWithObject:AVMetadataObjectTypeQRCode]];

  _videoPreviewPlayer =
      [[AVCaptureVideoPreviewLayer alloc] initWithSession:_captureSession];

  [_videoPreviewPlayer setVideoGravity:AVLayerVideoGravityResizeAspectFill];
  [_videoPreviewPlayer setFrame:self.view.layer.bounds];

  [self.view.layer addSublayer:_videoPreviewPlayer];

  __weak FBFlipperKitQRReaderController* weakSelf = self;
  dispatch_async(_dispatchQueue, ^{
    FBFlipperKitQRReaderController* strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }
    strongSelf->_isReading = YES;
    [strongSelf->_captureSession startRunning];
  });

  UIView* dismissContainerView = [[UIView alloc] init];
  dismissContainerView.translatesAutoresizingMaskIntoConstraints = NO;
  [self.view addSubview:dismissContainerView];

  [NSLayoutConstraint activateConstraints:@[
    [dismissContainerView.leadingAnchor
        constraintEqualToAnchor:self.view.leadingAnchor],
    [dismissContainerView.trailingAnchor
        constraintEqualToAnchor:self.view.trailingAnchor],
    [dismissContainerView.bottomAnchor
        constraintEqualToAnchor:self.view.bottomAnchor],
    [dismissContainerView.heightAnchor constraintEqualToConstant:80]
  ]];

  _dismissButton = [QRActionButton new];
  _dismissButton.customState = QRActionButtonStateReading;
  [_dismissButton addTarget:self
                     action:@selector(onDismissButtonTapped)
           forControlEvents:UIControlEventTouchUpInside];
  [dismissContainerView addSubview:_dismissButton];

  [NSLayoutConstraint activateConstraints:@[
    [_dismissButton.centerXAnchor
        constraintEqualToAnchor:dismissContainerView.centerXAnchor],
    [_dismissButton.centerYAnchor
        constraintEqualToAnchor:dismissContainerView.centerYAnchor]
  ]];
}

- (void)stop {
  _isReading = NO;

  [_captureSession stopRunning];
  _captureSession = nil;

  [_videoPreviewPlayer removeFromSuperlayer];
  _videoPreviewPlayer = nil;

  self.promptWindow.hidden = YES;
  self.promptWindow = nil;
}

- (void)onDismissButtonTapped {
  _completion(nil, nil, YES, nil);
  [self stop];
}

- (void)captureOutput:(AVCaptureOutput*)output
    didOutputMetadataObjects:
        (NSArray<__kindof AVMetadataObject*>*)metadataObjects
              fromConnection:(AVCaptureConnection*)connection {
  if (!_isReading) {
    return;
  }

  if (metadataObjects != nil && metadataObjects.count > 0) {
    AVMetadataMachineReadableCodeObject* metadataObject =
        [metadataObjects objectAtIndex:0];

    if ([[metadataObject type] isEqualToString:AVMetadataObjectTypeQRCode] &&
        [metadataObject stringValue]) {
      _isReading = NO;

      dispatch_sync(dispatch_get_main_queue(), ^{
        self->_dismissButton.customState = QRActionButtonStateProcessing;
      });

      NSString* value = [metadataObject stringValue];
      _completion(value, nil, NO, ^(QRReaderResult result) {
        switch (result) {
          case QRReaderResultAccepted: {
            dispatch_async(dispatch_get_main_queue(), ^{
              self->_dismissButton.customState = QRActionButtonStateAccepted;
              double dismissAfterDelayInSeconds = 1.0;
              dispatch_time_t dismissTime = dispatch_time(
                  DISPATCH_TIME_NOW,
                  (int64_t)(dismissAfterDelayInSeconds * NSEC_PER_SEC));
              dispatch_after(dismissTime, dispatch_get_main_queue(), ^{
                [self stop];
              });
            });
          } break;
          case QRReaderResultError: {
            dispatch_async(dispatch_get_main_queue(), ^{
              self->_dismissButton.customState = QRActionButtonStateError;
              double retryAfterDelayInSeconds = 1.0;
              dispatch_time_t retryTime = dispatch_time(
                  DISPATCH_TIME_NOW,
                  (int64_t)(retryAfterDelayInSeconds * NSEC_PER_SEC));
              dispatch_after(retryTime, dispatch_get_main_queue(), ^{
                self->_isReading = YES;
                self->_dismissButton.customState = QRActionButtonStateReading;
              });
            });
          } break;
        }
      });
    }
  }
}

@end

@interface FBFlipperKitQRReaderPrompt ()
@property(nonatomic, strong) UIWindow* promptWindow;
@end

@implementation FBFlipperKitQRReaderPrompt

- (void)viewDidDisappear:(BOOL)animated {
  [super viewDidDisappear:animated];
  [[self promptWindow] setHidden:YES];
  [self setPromptWindow:nil];
}

- (void)show {
  [self showAnimated:YES];
}

- (void)showAnimated:(BOOL)animated {
  UIViewController* hostController = [[UIViewController alloc] init];
  [[hostController view] setBackgroundColor:[UIColor clearColor]];

  UIWindow* window =
      [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
  [window setRootViewController:hostController];
  [window setBackgroundColor:[UIColor clearColor]];
  [window setWindowLevel:UIWindowLevelAlert + 1];
  [window makeKeyAndVisible];
  [self setPromptWindow:window];

  [hostController presentViewController:self animated:animated completion:nil];
}

+ (void)presentPromptWithTitle:(nullable NSString*)title
                       message:(nullable NSString*)message
                    completion:(FBFlipperKitQRResult)completion {
  dispatch_async(dispatch_get_main_queue(), ^{
    FBFlipperKitQRReaderPrompt* alertController = [FBFlipperKitQRReaderPrompt
        alertControllerWithTitle:title
                         message:message
                  preferredStyle:UIAlertControllerStyleAlert];
    UIAlertAction* readAction = [UIAlertAction
        actionWithTitle:@"OK"
                  style:UIAlertActionStyleDefault
                handler:^(UIAlertAction* action) {
                  [FBFlipperKitQRReaderController readQRWith:completion];
                }];
    UIAlertAction* cancelAction =
        [UIAlertAction actionWithTitle:@"Not for this session"
                                 style:UIAlertActionStyleCancel
                               handler:^(UIAlertAction* action) {
                                 completion(nil, nil, YES, nil);
                               }];
    [alertController addAction:readAction];
    [alertController addAction:cancelAction];
    [alertController show];
  });
}

@end

@implementation FlipperKitQRReader

+ (void)read:(FBFlipperKitQRResult)completion {
  [FBFlipperKitQRReaderPrompt
      presentPromptWithTitle:@"Flipper"
                     message:
                         @"Trying to establish a secure connection with your app, please scan the QR code displayed on Flipper Desktop for verification."
                  completion:completion];
}

@end

#endif
#endif
