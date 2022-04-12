/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Flipper/FlipperTransportTypes.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Defines a WebSocket transport to be used by Flipper. It just acts as a
/// wrapper on top of a WebSocket connection mainly used to abstract the actual
/// used implementation.
@interface FlipperPlatformWebSocket : NSObject

/// An event handler used to dispatch socket events to the caller.
@property(nonatomic) facebook::flipper::SocketEventHandler eventHandler;

/// A message handler used to dispatch messages received from the server.
@property(nonatomic) facebook::flipper::SocketMessageHandler messageHandler;

/// A certificate provider used to obtain the client certificate used for
/// authentication.
@property(nonatomic)
    facebook::flipper::SocketCertificateProvider certificateProvider;

/// Initializes an instance of FliperWebSocketTransport with an endpoint URL.
/// @param url Endpoint URL used to establish the connection.
- (instancetype)initWithURL:(NSURL* _Nonnull)url;

/// Connect to the endpoint.
- (void)connect;

/// Disconnects from the endpoint.
- (void)disconnect;

/// Send a message to the endpoint.
/// @param message The message as text to be sent to the endpoint.
/// @param completionHandler  A completion handler for the send operation.
/// If an error occurs, the handler will be called with an `NSError` object
/// containing information about the error. You may specify `nil` to ignore the
/// error information.
- (void)send:(NSString*)message
    withCompletionHandler:(void (^_Nullable)(NSError*))completionHandler;

@end

NS_ASSUME_NONNULL_END

#endif
