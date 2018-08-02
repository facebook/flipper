// Copyright 2004-present Facebook. All Rights Reserved.
#if FB_SONARKIT_ENABLED

#import <WebKit/WebKit.h>

#import <FBMonotonicTime/FBMonotonicTime.h>
#import <SonarKitNetworkPlugin/SKNetworkReporter.h>
#import <TigonSecretary/TigonDebugObserver.h>
#import <TigonSecretary/TigonObserver.h>

class SKTigonObserver : public facebook::tigon::TigonObserver, public facebook::tigon::TigonDebugObserver {
public:
  SKTigonObserver(id<SKNetworkReporterDelegate> notifier);

  void onAdded(std::shared_ptr<const facebook::tigon::TigonRequestAdded> requestAdded) override;

  void onStarted(std::shared_ptr<const facebook::tigon::TigonRequestStarted> requestStarted) override;

  void onResponse(std::shared_ptr<const facebook::tigon::TigonRequestResponse> requestResponse) override;

  void onEOM(std::shared_ptr<const facebook::tigon::TigonRequestSucceeded> requestSucceeded) override;

  void onError(std::shared_ptr<const facebook::tigon::TigonRequestErrored> requestErrored) override;

  void onWillRetry(std::shared_ptr<const facebook::tigon::TigonRequestErrored> requestWillRetry) override {};

  void onUploadBody(const std::shared_ptr<const facebook::tigon::TigonBodyObservation> &requestUploadBody) override;

  void onDownloadBody(const std::shared_ptr<const facebook::tigon::TigonBodyObservation> &requestDownloadBody) override;

protected:
  id<SKNetworkReporterDelegate> _delegate;
  std::unordered_map<NSUInteger, RequestInfo> _trackedRequests;
  std::unordered_map<NSUInteger, ResponseInfo> _trackedResponses;
};

#endif
