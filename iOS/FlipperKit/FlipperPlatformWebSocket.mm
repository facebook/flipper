/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "FlipperPlatformWebSocket.h"
#import <Flipper/FlipperConnectionEndpointVerifier.h>
#import <Flipper/Log.h>
#import <SocketRocket/SocketRocket.h>

static constexpr int connectionKeepaliveSeconds = 10;

#pragma mark - FlipperClientCertificateSecurityPolicy

@interface FlipperClientCertificateSecurityPolicy : SRSecurityPolicy

@property(nonatomic)
    facebook::flipper::SocketCertificateProvider certificateProvider;

- (id)initWithCertificateProvider:
    (facebook::flipper::SocketCertificateProvider)certificateProvider;

@end

@implementation FlipperClientCertificateSecurityPolicy

- (id)initWithCertificateProvider:
    (facebook::flipper::SocketCertificateProvider)certificateProvider {
  self = [super init];

  if (self) {
    _certificateProvider = certificateProvider;
  }

  return self;
}

/**
 Updates all the security options for  output streams, used for client
 certificate authentication.

 @param stream Stream to update the options in.
 */
- (void)updateSecurityOptionsInStream:(NSStream*)stream {
  if (!_certificateProvider || ![stream isKindOfClass:[NSOutputStream class]]) {
    return;
  }

  NSMutableDictionary* SSLOptions = [[NSMutableDictionary alloc] init];
  [stream setProperty:(__bridge id)kCFStreamSocketSecurityLevelNegotiatedSSL
               forKey:(__bridge id)kCFStreamPropertySocketSecurityLevel];

  char PASSWORD[512] = {};
  auto certificatePath = _certificateProvider(&PASSWORD[0], 512);

  NSString* certificatePathObjC =
      [NSString stringWithUTF8String:certificatePath.c_str()];
  NSData* certificateData = [NSData dataWithContentsOfFile:certificatePathObjC];
  if (!certificateData) {
    return;
  }

  NSString* password = [NSString stringWithUTF8String:PASSWORD];
  NSDictionary* optionsDictionary = [NSDictionary
      dictionaryWithObject:password
                    forKey:(__bridge id)kSecImportExportPassphrase];

  CFArrayRef items = NULL;
  OSStatus status = SecPKCS12Import(
      (__bridge CFDataRef)certificateData,
      (__bridge CFDictionaryRef)optionsDictionary,
      &items);
  if (status != noErr) {
    return;
  }

  CFDictionaryRef identityDictionary =
      (CFDictionaryRef)CFArrayGetValueAtIndex(items, 0);
  SecIdentityRef identity = (SecIdentityRef)CFDictionaryGetValue(
      identityDictionary, kSecImportItemIdentity);

  SecCertificateRef certificate = NULL;
  status = SecIdentityCopyCertificate(identity, &certificate);

  if (status != noErr) {
    return;
  }

  NSArray* certificates = [[NSArray alloc]
      initWithObjects:(__bridge id)identity, (__bridge id)certificate, nil];

  [SSLOptions setObject:[NSNumber numberWithBool:NO]
                 forKey:(NSString*)kCFStreamSSLValidatesCertificateChain];
  [SSLOptions setObject:(NSString*)kCFStreamSocketSecurityLevelNegotiatedSSL
                 forKey:(NSString*)kCFStreamSSLLevel];
  [SSLOptions setObject:(NSString*)kCFStreamSocketSecurityLevelNegotiatedSSL
                 forKey:(NSString*)kCFStreamPropertySocketSecurityLevel];
  [SSLOptions setObject:certificates
                 forKey:(NSString*)kCFStreamSSLCertificates];
  [SSLOptions setObject:[NSNumber numberWithBool:NO]
                 forKey:(NSString*)kCFStreamSSLIsServer];

  [stream setProperty:SSLOptions
               forKey:(__bridge id)kCFStreamPropertySSLSettings];
}

@end

#pragma mark - FlipperPlatformWebSocket

@interface FlipperPlatformWebSocket ()<SRWebSocketDelegate> {
  NSOperationQueue* _dispatchQueue;

  NSURL* _url;
  NSTimer* _keepAlive;

  FlipperClientCertificateSecurityPolicy* _policy;
}

@property(nonatomic, strong) SRWebSocket* socket;

@end

@implementation FlipperPlatformWebSocket

- (instancetype)initWithURL:(NSURL* _Nonnull)url {
  self = [super init];
  if (self) {
    _url = url;
    _policy = [FlipperClientCertificateSecurityPolicy new];
    _dispatchQueue = [[NSOperationQueue alloc] init];
    _dispatchQueue.maxConcurrentOperationCount = 1;
  }

  return self;
}

- (void)connect {
  if (_socket) {
    return;
  }

  __weak auto weakSelf = self;
  [_dispatchQueue addOperationWithBlock:^{
    __strong auto strongSelf = weakSelf;

    // Before attempting to establish a connection, check if
    // there is a process listening at the specified port.
    // CFNetwork seems to be quite verbose when the host cannot be reached
    // causing unnecessary and annoying logs to be printed to the console.
    if (!facebook::flipper::ConnectionEndpointVerifier::verify(
            strongSelf->_url.host.UTF8String, strongSelf->_url.port.intValue)) {
      strongSelf->_eventHandler(facebook::flipper::SocketEvent::ERROR);
      return;
    }

    strongSelf->_socket = [[SRWebSocket alloc] initWithURL:self->_url
                                            securityPolicy:self->_policy];
    strongSelf->_socket.delegate = self;
    [strongSelf->_socket open];
  }];
}

- (void)disconnect {
  if ([_keepAlive isValid]) {
    [_keepAlive invalidate];
  }
  _keepAlive = nil;

  if (_socket) {
    // Clear the socket delegate before close. Ensures that we won't get
    // any messages after the disconnect takes place.
    [_socket setDelegate:nil];
    [_socket close];
    _socket = nil;
  };

  [_dispatchQueue cancelAllOperations];
  [_dispatchQueue waitUntilAllOperationsAreFinished];

  // Manually trigger a 'close' event as SocketRocket close method will
  // not notify the delegate. SocketRocket only triggers the close event
  // when the connection is closed from the server.
  _eventHandler(facebook::flipper::SocketEvent::CLOSE);
}

- (void)send:(NSString*)message
    withCompletionHandler:(void (^_Nullable)(NSError*))completionHandler {
  __weak auto weakSelf = self;
  [_dispatchQueue addOperationWithBlock:^{
    __strong auto strongSelf = weakSelf;
    if (strongSelf) {
      NSError* error = nil;
      [strongSelf->_socket sendString:message error:&error];
      if (completionHandler) {
        completionHandler(error);
      }
    }
  }];
}

- (void)setCertificateProvider:
    (facebook::flipper::SocketCertificateProvider)certificateProvider {
  _certificateProvider = certificateProvider;
  _policy.certificateProvider = certificateProvider;
}

- (void)sendScheduledKeepAlive:(NSTimer*)timer {
  __weak auto weakSelf = self;
  [_dispatchQueue addOperationWithBlock:^{
    __strong auto strongSelf = weakSelf;
    if (strongSelf) {
      [strongSelf->_socket sendPing:nil error:nil];
    }
  }];
}

#pragma mark - Web Socket internal handlers
- (void)_webSocketDidOpen {
  _eventHandler(facebook::flipper::SocketEvent::OPEN);

  if (!_keepAlive) {
    __weak auto weakSocket = _socket;
    _keepAlive =
        [NSTimer scheduledTimerWithTimeInterval:connectionKeepaliveSeconds
                                        repeats:YES
                                          block:^(NSTimer* timer) {
                                            auto _Nullable socket = weakSocket;
                                            [socket sendPing:nil error:nil];
                                          }];
  }
}

- (void)_webSocketDidFailWithError:(NSError*)error {
  /** Check for the error domain and code. Need to filter out SSL handshake
    errors and dispatch them accordingly. CFNetwork SSLHandshake failed:
    - Domain: NSOSStatusErrorDomain
    - Code: -9806
   */
  if ([[error domain] isEqual:NSOSStatusErrorDomain] && [error code] == -9806) {
    _eventHandler(facebook::flipper::SocketEvent::SSL_ERROR);
  } else {
    _eventHandler(facebook::flipper::SocketEvent::ERROR);
  }
  _socket = nil;
}

- (void)_webSocketDidClose {
  if ([_keepAlive isValid]) {
    [_keepAlive invalidate];
  }
  _keepAlive = nil;

  _eventHandler(facebook::flipper::SocketEvent::CLOSE);
}

- (void)_webSocketDidReceiveMessage:(id)message {
  if (message && _messageHandler) {
    NSString* response = message;
    _messageHandler([response UTF8String]);
  }
}

#pragma mark - Web Socket
- (void)webSocketDidOpen:(SRWebSocket*)webSocket {
  __weak auto weakSelf = self;
  [_dispatchQueue addOperationWithBlock:^{
    __strong auto strongSelf = weakSelf;
    [strongSelf _webSocketDidOpen];
  }];
}

- (void)webSocket:(SRWebSocket*)webSocket didFailWithError:(NSError*)error {
  __weak auto weakSelf = self;
  [_dispatchQueue addOperationWithBlock:^{
    __strong auto strongSelf = weakSelf;
    [strongSelf _webSocketDidFailWithError:error];
  }];
}

- (void)webSocket:(SRWebSocket*)webSocket
    didCloseWithCode:(NSInteger)code
              reason:(NSString*)reason
            wasClean:(BOOL)wasClean {
  __weak auto weakSelf = self;
  [_dispatchQueue addOperationWithBlock:^{
    __strong auto strongSelf = weakSelf;
    [strongSelf _webSocketDidClose];
  }];
}

- (void)webSocket:(SRWebSocket*)webSocket didReceiveMessage:(id)message {
  __weak auto weakSelf = self;
  [_dispatchQueue addOperationWithBlock:^{
    __strong auto strongSelf = weakSelf;
    [strongSelf _webSocketDidReceiveMessage:message];
  }];
}

@end

#endif
