// Copyright 2004-present Facebook. All Rights Reserved.

#if FB_SONARKIT_ENABLED

#import "SKTigonObserver.h"

#import <FBDataCompress/NSData+Compress.h>
#import <FBTigonUtils/FBTigonRequest.h>
#import <FBNetworker/FBHttpExecutor.h>
#import <FBNetworker/FBHttpExecutor+Tigon.h>
#import <TigonSecretary/TigonDebugObserver.h>
#import <TigonSecretary/TigonObserver.h>
#import <FBTigonUtils/FBTigonBuffer.h>
#import <FBTigonUtils/FBTigonError.h>
#import <FBTigonUtils/FBTigonRequest.h>
#import <TigonSecretary/TigonRequestStats.h>
#import <FBHttpExecutorSingletons/FBHttpExecutor+Singletons.h>

SKTigonObserver::SKTigonObserver(id<SKNetworkReporterDelegate> delegate) : _delegate(delegate) {}

void SKTigonObserver::onAdded(std::shared_ptr<const facebook::tigon::TigonRequestAdded> requestAdded) {
  NSURLRequest *request = facebook::FBTigon::fromTigonRequest(requestAdded->submittedTigonRequest());
  _trackedRequests[requestAdded->requestId()] = {
    .identifier = requestAdded->requestId(),
    .request = request,
    .timestamp = FBMonotonicTimeGetCurrentMilliseconds(),
  };
}

void SKTigonObserver::onStarted(std::shared_ptr<const facebook::tigon::TigonRequestStarted> requestStarted) {
  NSURLRequest *request = facebook::FBTigon::fromTigonRequest(requestStarted->submittedTigonRequest());
  _trackedRequests[requestStarted->requestId()] = {
    .identifier = requestStarted->requestId(),
    .request = request,
    .timestamp = FBMonotonicTimeGetCurrentMilliseconds(),
  };
}

void SKTigonObserver::onResponse(std::shared_ptr<const facebook::tigon::TigonRequestResponse> requestResponse) {
  NSURLRequest *request = facebook::FBTigon::fromTigonRequest(requestResponse->sentTigonRequest());
  NSHTTPURLResponse *response = facebook::FBTigon::fromTigonResponse(requestResponse->tigonResponse(), [request URL]);
  _trackedResponses[requestResponse->requestId()] = {
    .identifier = requestResponse->requestId(),
    .timestamp = FBMonotonicTimeGetCurrentMilliseconds(),
    .response = response,
    .body = nil
  };
}

void SKTigonObserver::onError(std::shared_ptr<const facebook::tigon::TigonRequestErrored> requestErrored) {
  auto result = _trackedResponses.find(requestErrored->requestId());
  if (result == _trackedResponses.end()) {
    NSURLRequest *request = facebook::FBTigon::fromTigonRequest(requestErrored->sentTigonRequest());
    NSHTTPURLResponse *response = facebook::FBTigon::fromTigonResponse(requestErrored->tigonResponse(), [request URL]);
    [_delegate didObserveResponse:{
      .identifier = requestErrored->requestId(),
      .timestamp = FBMonotonicTimeGetCurrentMilliseconds(),
      .response = response,
      .body = nil
    }];
  } else {
    ResponseInfo &responseInfo = _trackedResponses[requestErrored->requestId()];
    responseInfo.timestamp = FBMonotonicTimeGetCurrentMilliseconds();
    [_delegate didObserveResponse:responseInfo];
  }
}

void SKTigonObserver::onEOM(std::shared_ptr<const facebook::tigon::TigonRequestSucceeded> requestSucceeded) {
  if (_trackedRequests.count(requestSucceeded->requestId()) != 0) {
    RequestInfo &requestInfo = _trackedRequests[requestSucceeded->requestId()];
    [_delegate didObserveRequest:requestInfo];
    _trackedRequests.erase(requestSucceeded->requestId());
  }

  ResponseInfo &responseInfo = _trackedResponses[requestSucceeded->requestId()];
  responseInfo.timestamp = FBMonotonicTimeGetCurrentMilliseconds();
  [_delegate didObserveResponse:responseInfo];
  _trackedResponses.erase(requestSucceeded->requestId());
}

void SKTigonObserver::onUploadBody(const std::shared_ptr<const facebook::tigon::TigonBodyObservation> &requestUploadBody) {
  RequestInfo &requestInfo = _trackedRequests[requestUploadBody->requestId()];

  NSURLRequest *urlRequest = requestInfo.request;

  NSString *contentType = [urlRequest valueForHTTPHeaderField: @"Content-Type"];
  BOOL isFormData = [contentType hasPrefix: @"application/x-www-form-urlencoded"] ||
                    [contentType hasPrefix: @"multipart/form-data"];

  if (requestUploadBody->body() && isFormData) {
    NSString *contentEncoding = [urlRequest valueForHTTPHeaderField: @"Content-Encoding"];
    BOOL isGzip = [contentEncoding isEqualToString: @"gzip"];

    NSData *data = facebook::FBTigon::toNSData(requestUploadBody->body());
    if (isGzip) {
      data = [data newDataByDecompressingWithGZIP];
    }

    requestInfo.setBody(data);
  }

  [_delegate didObserveRequest:requestInfo];
  _trackedRequests.erase(requestUploadBody->requestId());
}

void SKTigonObserver::onDownloadBody(const std::shared_ptr<const facebook::tigon::TigonBodyObservation> &requestDownloadBody) {
  if (requestDownloadBody->body()) {
    ResponseInfo &responseInfo = _trackedResponses[requestDownloadBody->requestId()];
    NSData *data = facebook::FBTigon::toNSData(requestDownloadBody->body());
    responseInfo.setBody(data);
    _trackedResponses[requestDownloadBody->requestId()] = responseInfo;
  }
}

#endif
