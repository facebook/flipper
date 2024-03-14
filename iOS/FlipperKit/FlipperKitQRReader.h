/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <TargetConditionals.h>

#ifdef FB_SONARKIT_ENABLED

#if !TARGET_OS_OSX

#import <AVFoundation/AVFoundation.h>
#import <UIKit/UIKit.h>

typedef NS_ENUM(NSInteger, QRReaderResult) {
  QRReaderResultAccepted,
  QRReaderResultError,
};

typedef void (^FBFlipperKitQRResultAck)(QRReaderResult result);

typedef void (^FBFlipperKitQRResult)(
    NSString* _Nullable content,
    NSError* _Nullable error,
    BOOL cancelled,
    FBFlipperKitQRResultAck _Nullable ack);

/** QRReader controller that displays the camera and attempts to read QR
 * metadata objects.
 */
@interface FBFlipperKitQRReaderController : UIViewController

- (instancetype _Nonnull)initWith:(FBFlipperKitQRResult _Nonnull)completion;

@end

/** QRReader prompt. Shows an alert to the user asking to scan a QR with the
 * device's camera.
 */
@interface FBFlipperKitQRReaderPrompt : UIAlertController

- (void)show;
+ (void)presentPromptWithTitle:(nullable NSString*)title
                       message:(nullable NSString*)message
                    completion:(FBFlipperKitQRResult _Nonnull)completion;

@end

/** QRReader entrypoint.
 */
@interface FlipperKitQRReader : NSObject

+ (void)read:(FBFlipperKitQRResult _Nonnull)result;

@end

#endif
#endif
