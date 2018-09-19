/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import "SKPortForwardingServer.h"

#import <UIKit/UIKit.h>

#import <CocoaAsyncSocket/GCDAsyncSocket.h>
#import <peertalk/PTChannel.h>

#import "SKMacros.h"
#import "SKPortForwardingCommon.h"

@interface SKPortForwardingServer () <PTChannelDelegate, GCDAsyncSocketDelegate>

@property (nonatomic, weak) PTChannel *serverChannel;
@property (nonatomic, weak) PTChannel *peerChannel;

@property (nonatomic, strong) GCDAsyncSocket *serverSocket;
@property (nonatomic, strong) NSMutableDictionary *clientSockets;
@property (nonatomic, assign) UInt32 lastClientSocketTag;
@property (nonatomic, strong) dispatch_queue_t socketQueue;
@property (nonatomic, strong) PTProtocol *protocol;

@end

@implementation SKPortForwardingServer

- (instancetype)init
{
  if (self = [super init]) {
    _socketQueue = dispatch_queue_create("SKPortForwardingServer", DISPATCH_QUEUE_SERIAL);
    _lastClientSocketTag = 0;
    _clientSockets = [NSMutableDictionary dictionary];
    _protocol = [[PTProtocol alloc] initWithDispatchQueue:_socketQueue];
  }
  return self;
}

- (void)dealloc
{
  [self close];
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)forwardConnectionsFromPort:(NSUInteger)port
{
  [self _forwardConnectionsFromPort:port reportError:YES];
  [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationDidBecomeActiveNotification object:nil queue:nil usingBlock:^(NSNotification *note) {
    [self _forwardConnectionsFromPort:port reportError:NO];
  }];
}

- (void)_forwardConnectionsFromPort:(NSUInteger)port reportError:(BOOL)shouldReportError
{
  GCDAsyncSocket *serverSocket = [[GCDAsyncSocket alloc] initWithDelegate:self delegateQueue:_socketQueue];
  NSError *listenError;
  if ([serverSocket acceptOnPort:port error:&listenError]) {
    self.serverSocket = serverSocket;
  } else {
    if (shouldReportError) {
      SKLog(@"Failed to listen: %@", listenError);
    }
  }
}

- (void)listenForMultiplexingChannelOnPort:(NSUInteger)port
{
  [self _listenForMultiplexingChannelOnPort:port reportError:YES];
  [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationDidBecomeActiveNotification object:nil queue:nil usingBlock:^(NSNotification *note) {
    [self _listenForMultiplexingChannelOnPort:port reportError:NO];
  }];
}

- (void)_listenForMultiplexingChannelOnPort:(NSUInteger)port reportError:(BOOL)shouldReportError
{
  PTChannel *channel = [[PTChannel alloc] initWithProtocol:_protocol delegate:self];
  [channel listenOnPort:port IPv4Address:INADDR_LOOPBACK callback:^(NSError *error) {
    if (error) {
      if (shouldReportError) {
        SKLog(@"Failed to listen on 127.0.0.1:%lu: %@", (unsigned long)port, error);
      }
    } else {
      SKTrace(@"Listening on 127.0.0.1:%lu", (unsigned long)port);
      self.serverChannel = channel;
    }
  }];
}

- (void)close
{
  if (self.serverChannel) {
    [self.serverChannel close];
    self.serverChannel = nil;
  }
  [self.serverSocket disconnect];
}

#pragma mark - PTChannelDelegate

- (void)ioFrameChannel:(PTChannel *)channel didAcceptConnection:(PTChannel *)otherChannel fromAddress:(PTAddress *)address {
  // Cancel any other connection. We are FIFO, so the last connection
  // established will cancel any previous connection and "take its place".
  if (self.peerChannel) {
    [self.peerChannel cancel];
  }

  // Weak pointer to current connection. Connection objects live by themselves
  // (owned by its parent dispatch queue) until they are closed.
  self.peerChannel = otherChannel;
  self.peerChannel.userInfo = address;
  SKTrace(@"Connected to %@", address);
}

- (void)ioFrameChannel:(PTChannel *)channel didReceiveFrameOfType:(uint32_t)type tag:(uint32_t)tag payload:(PTData *)payload {
  //NSLog(@"didReceiveFrameOfType: %u, %u, %@", type, tag, payload);
  if (type == SKPortForwardingFrameTypeWriteToPipe) {
    GCDAsyncSocket *sock = self.clientSockets[@(tag)];
    [sock writeData:[NSData dataWithBytes:payload.data length:payload.length] withTimeout:-1 tag:0];
    SKTrace(@"channel -> socket (%d), %zu bytes", tag, payload.length);
  }

  if (type == SKPortForwardingFrameTypeClosePipe) {
    GCDAsyncSocket *sock = self.clientSockets[@(tag)];
    [sock disconnectAfterWriting];
  }
}

- (void)ioFrameChannel:(PTChannel *)channel didEndWithError:(NSError *)error {
  for (GCDAsyncSocket *sock in [_clientSockets objectEnumerator]) {
    [sock setDelegate:nil];
    [sock disconnect];
  }
  [self.clientSockets removeAllObjects];
  SKTrace(@"Disconnected from %@, error = %@", channel.userInfo, error);
}


#pragma mark - GCDAsyncSocketDelegate

- (void)socket:(GCDAsyncSocket *)sock didAcceptNewSocket:(GCDAsyncSocket *)newSocket
{
  dispatch_block_t block = ^() {
    if (!self.peerChannel) {
      [newSocket setDelegate:nil];
      [newSocket disconnect];
    }

    UInt32 tag = ++self->_lastClientSocketTag;
    newSocket.userData = @(tag);
    newSocket.delegate = self;
    self.clientSockets[@(tag)] = newSocket;
    [self.peerChannel sendFrameOfType:SKPortForwardingFrameTypeOpenPipe tag:self->_lastClientSocketTag withPayload:nil callback:^(NSError *error) {
      SKTrace(@"open socket (%d), error = %@", (unsigned int)tag, error);
      [newSocket readDataWithTimeout:-1 tag:0];
    }];
  };

  if (_peerChannel) {
    block();
  } else {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1 * NSEC_PER_SEC)), _socketQueue, block);
  }
}

- (void)socket:(GCDAsyncSocket *)sock didReadData:(NSData *)data withTag:(long)_
{
  UInt32 tag = [[sock userData] unsignedIntValue];
  SKTrace(@"Incoming data on socket (%d) - %lu bytes", (unsigned int)tag, (unsigned long)data.length);
  [_peerChannel sendFrameOfType:SKPortForwardingFrameTypeWriteToPipe tag:tag withPayload:NSDataToGCDData(data) callback:^(NSError *error) {
    SKTrace(@"socket (%d) -> channel %lu bytes, error = %@", (unsigned int)tag, (unsigned long)data.length, error);
    [sock readDataWithTimeout:-1 tag:_];
  }];
}

- (void)socketDidDisconnect:(GCDAsyncSocket *)sock withError:(NSError *)err
{
  UInt32 tag = [sock.userData unsignedIntValue];
  [_clientSockets removeObjectForKey:@(tag)];
  [_peerChannel sendFrameOfType:SKPortForwardingFrameTypeClosePipe tag:tag withPayload:nil callback:^(NSError *error) {
    SKTrace(@"socket (%d) disconnected, err = %@, peer error = %@", (unsigned int)tag, err, error);
  }];
}


@end
