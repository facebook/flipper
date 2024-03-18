/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#import <TargetConditionals.h>

#if !TARGET_OS_OSX
#ifdef FB_SONARKIT_ENABLED

#import <Flipper/FlipperCertificateProvider.h>
#import "FlipperKitCertificateProvider.h"

namespace facebook {
namespace flipper {

class QRVerifiedCertificateProvider : public FlipperCertificateProvider {
 public:
  QRVerifiedCertificateProvider()
      : medium_(FlipperCertificateExchangeMedium::FS_ACCESS),
        cancelled_(false) {}

  void getCertificates(const std::string& path, const std::string& deviceID)
      override;

  bool shouldResetCertificateFolder() override;

  void setCertificateExchangeMedium(
      FlipperKitCertificateExchangeMedium medium) override;

  void setFlipperState(std::shared_ptr<FlipperState> state) override;

  FlipperCertificateExchangeMedium getCertificateExchangeMedium() override;

 private:
  std::atomic<FlipperCertificateExchangeMedium> medium_;
  std::shared_ptr<FlipperState> flipperState_;
  bool cancelled_;
};

} // namespace flipper
} // namespace facebook

@interface FlipperKitQRVerifiedCertificateProvider
    : NSObject<FlipperKitCertificateProvider>

- (_Nonnull instancetype)initCPPCertificateProvider;

- (void* _Nonnull)getCPPCertificateProvider;
- (void)setCertificateExchangeMedium:
    (FlipperKitCertificateExchangeMedium)medium;

@end

#endif
#endif
