// Copyright 2004-present Facebook. All Rights Reserved.

#if FB_SONARKIT_ENABLED

#import "SKTigonAdapter.h"

#import <FBDataCompress/NSData+Compress.h>
#import <FBHttpExecutorSingletons/FBHttpExecutor+Singletons.h>
#import <FBNetworker/FBHttpExecutor+Tigon.h>
#import <FBNetworker/FBHttpExecutor.h>
#import <FBTigonUtils/FBTigonBuffer.h>
#import <FBTigonUtils/FBTigonError.h>
#import <FBTigonUtils/FBTigonRequest.h>
#import <TigonSecretary/TigonDebugObserver.h>
#import <TigonSecretary/TigonObserver.h>
#import <TigonSecretary/TigonRequestStats.h>

@implementation SKTigonAdapter
{
  std::unique_ptr<facebook::mobile::xplat::executor::ObserverToken> _observerToken;
  std::unique_ptr<facebook::mobile::xplat::executor::ObserverToken> _observerDebugToken;
}
@synthesize delegate = _delegate;

- (void)setDelegate:(id<SKNetworkReporterDelegate>)delegate {
  _delegate = delegate;
  auto listener = std::make_shared<SKTigonObserver>(_delegate);

  _observerToken = [[FBHttpExecutor sharedStack] addObserver:listener];
  _observerDebugToken = [[FBHttpExecutor sharedStack] addDebugObserver:listener];

}

- (void)dealloc {
  if (_observerToken) {
    _observerToken->remove();
    _observerToken = nullptr;
  }
  if (_observerDebugToken) {
    _observerDebugToken->remove();
    _observerDebugToken = nullptr;
  }
}

@end

#endif
