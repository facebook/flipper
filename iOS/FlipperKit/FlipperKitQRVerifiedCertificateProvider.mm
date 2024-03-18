/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperKitQRVerifiedCertificateProvider.h"

#if !TARGET_OS_OSX
#ifdef FB_SONARKIT_ENABLED

#import <Flipper/CertificateUtils.h>
#import <Flipper/FlipperCertificateProvider.h>
#import <SSZipArchive/SSZipArchive.h>
#import "FlipperKitQRReader.h"

namespace facebook {
namespace flipper {

NSString* FBFlipperKitQRCertificateProviderErrorDomain =
    @"com.FlipperKit.FBFlipperKitCertificateProvider";

void QRVerifiedCertificateProvider::getCertificates(
    const std::string& path,
    const std::string& deviceID) {
  // If it has been cancelled for the session, do not proceed.
  if (cancelled_) {
    return;
  }

  NSString* destination = [NSString stringWithUTF8String:path.c_str()];
  NSString* const certificatesPath =
      [destination stringByAppendingPathComponent:@"certificates.zip"];
  NSString* const encryptedCertificatesPath =
      [destination stringByAppendingPathComponent:@"certificates.enc"];

  NSFileManager* const fileManager = [NSFileManager new];

  // If there are no encrypted certificates, do not proceed either.
  if (![fileManager fileExistsAtPath:encryptedCertificatesPath]) {
    return;
  }

  // Ensure the destination directory exists.
  BOOL isDirectory = YES;
  if (![fileManager fileExistsAtPath:destination isDirectory:&isDirectory]) {
    NSError* creationError = nil;
    BOOL isSuccess = [fileManager createDirectoryAtPath:destination
                            withIntermediateDirectories:YES
                                             attributes:nil
                                                  error:&creationError];
    if (creationError || !isSuccess) {
      throw std::runtime_error("Unable to create destination directory");
    }
  }

  // Remove any previously decrypted certificates.
  [fileManager removeItemAtPath:certificatesPath error:nil];

  // Encrypted certificates are base64 encoded. So, read the file into memory,
  // decode it, and write it back to the file.
  NSString* base64EncodedEncryptedContent =
      [NSString stringWithContentsOfFile:encryptedCertificatesPath
                                encoding:NSUTF8StringEncoding
                                   error:nil];
  NSData* encryptedContentData =
      [[NSData alloc] initWithBase64EncodedString:base64EncodedEncryptedContent
                                          options:0];
  [encryptedContentData writeToFile:encryptedCertificatesPath atomically:YES];

  // At this stage, the setup is complete. Now, we can read the QR code which
  // contains the key to decrypt the certificates.
  __block NSError* certError = nil;

  auto QRReadStep = flipperState_
      ? flipperState_->start(
            "Attempt to decrypt certificates with QR decryption key")
      : nullptr;

  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
  [FlipperKitQRReader read:^(
                          NSString* key,
                          NSError* error,
                          BOOL cancelled,
                          FBFlipperKitQRResultAck readResultAck) {
    if (error || cancelled) {
      // If the QR code was cancelled, we should not proceed on further
      // requests.
      cancelled_ = cancelled;
      certError =
          [NSError errorWithDomain:FBFlipperKitQRCertificateProviderErrorDomain
                              code:-1
                          userInfo:@{
                            NSLocalizedDescriptionKey : NSLocalizedString(
                                @"Unable to read key from QR code", nil),
                          }];
      dispatch_semaphore_signal(semaphore);
      return;
    }

    // Get the data from the base64-encoded key.
    NSData* keyData = [[NSData alloc] initWithBase64EncodedString:key
                                                          options:0];
    // QR codes may be corrupt, invalid, or just contain a different
    // content to the one that is expected i.e. base-64 encoded key.
    // If that is the case, then just return with an error.
    if (!keyData) {
      readResultAck(QRReaderResultError);
      return;
    }

    auto success = AESDecrypt(
        [encryptedCertificatesPath UTF8String],
        [certificatesPath UTF8String],
        (const unsigned char*)[keyData bytes]);

    // If the decryption failed, must likely, the key is invalid which may be
    // caused by an erroneous QR read.
    if (!success) {
      readResultAck(QRReaderResultError);
      return;
    }

    // If the decryption was successful, we can now read the certificates.
    // The certificates are stored in a zip file. Unzip to destination.

    [SSZipArchive unzipFileAtPath:certificatesPath toDestination:destination];

    // Remove the certificate zip file.
    [fileManager removeItemAtPath:certificatesPath error:nil];

    // At this stage, dismiss the QR code reader.
    readResultAck(QRReaderResultAccepted);

    if (QRReadStep) {
      QRReadStep->complete();
    }

    // Signal the semaphore as to unblock the connection thread.
    dispatch_semaphore_signal(semaphore);
    return;
  }];

  // Wait for the semaphore to be signalled. This will block the connection
  // thread until the QR code is read or an error takes place.
  dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);

  // Remove the encrypted certificates.
  [fileManager removeItemAtPath:encryptedCertificatesPath error:nil];

  if (certError) {
    if (QRReadStep) {
      QRReadStep->fail(
          std::string([certError.localizedDescription UTF8String]));
    }
    throw certError;
  }
}

bool QRVerifiedCertificateProvider::shouldResetCertificateFolder() {
  return false;
}

void QRVerifiedCertificateProvider::setCertificateExchangeMedium(
    FlipperKitCertificateExchangeMedium medium) {
  medium_ = medium;
}

void QRVerifiedCertificateProvider::setFlipperState(
    std::shared_ptr<FlipperState> state) {
  flipperState_ = state;
}

FlipperCertificateExchangeMedium
QRVerifiedCertificateProvider::getCertificateExchangeMedium() {
  return medium_;
}

} // namespace flipper
} // namespace facebook

@implementation FlipperKitQRVerifiedCertificateProvider {
  std::shared_ptr<facebook::flipper::QRVerifiedCertificateProvider>
      _cppCertProvider;
}

- (_Nonnull instancetype)initCPPCertificateProvider {
  if (self = [super init]) {
    _cppCertProvider =
        std::make_shared<facebook::flipper::QRVerifiedCertificateProvider>();
  }
  return self;
}

- (void* _Nonnull)getCPPCertificateProvider {
  return &_cppCertProvider;
}

- (void)setCertificateExchangeMedium:
    (FlipperKitCertificateExchangeMedium)medium {
  _cppCertProvider->setCertificateExchangeMedium(medium);
}

- (void)setFlipperState:(std::shared_ptr<FlipperState>)state {
  _cppCertProvider->setFlipperState(state);
}

@end

#endif
#endif
