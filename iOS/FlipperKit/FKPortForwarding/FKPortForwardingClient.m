/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "FKPortForwardingClient.h"

#import <CocoaAsyncSocket/GCDAsyncSocket.h>
#import <peertalk/PTChannel.h>
#import <peertalk/PTUSBHub.h>

#import "FKPortForwardingCommon.h"

static const NSTimeInterval ReconnectDelay = 1.0;

@interface FKPortForwardingClient ()<
    GCDAsyncSocketDelegate,
    PTChannelDelegate> {
  NSUInteger _destPort;
  NSUInteger _channelPort;
  NSNumber* _connectingToDeviceID;
  NSNumber* _connectedDeviceID;
  NSDictionary* _connectedDeviceProperties;
  BOOL _notConnectedQueueSuspended;
  PTChannel* _connectedChannel;
  dispatch_queue_t _notConnectedQueue;
  dispatch_queue_t _clientSocketsQueue;
  NSMutableDictionary* _clientSockets;
}

@property(atomic, readonly) NSNumber* connectedDeviceID;
@property(atomic, assign) PTChannel* connectedChannel;

@end

@implementation FKPortForwardingClient

@synthesize connectedDeviceID = _connectedDeviceID;

- (instancetype)init {
  if (self = [super init]) {
    _notConnectedQueue = dispatch_queue_create(
        "FKPortForwarding.notConnectedQueue", DISPATCH_QUEUE_SERIAL);
    _clientSocketsQueue = dispatch_queue_create(
        "FKPortForwarding.clients", DISPATCH_QUEUE_SERIAL);
    _clientSockets = [NSMutableDictionary dictionary];
  }
  return self;
}

- (void)forwardConnectionsToPort:(NSUInteger)port {
  _destPort = port;
}

- (void)connectToMultiplexingChannelOnPort:(NSUInteger)port {
  _channelPort = port;
  [self startListeningForDevices];
  [self enqueueConnectToLocalIPv4Port];
}

- (void)close {
  [self.connectedChannel close];
}

- (PTChannel*)connectedChannel {
  return _connectedChannel;
}

- (void)setConnectedChannel:(PTChannel*)connectedChannel {
  _connectedChannel = connectedChannel;

  if (!_connectedChannel) {
    for (GCDAsyncSocket* sock in [_clientSockets objectEnumerator]) {
      [sock setDelegate:nil];
      [sock disconnect];
    }
    [_clientSockets removeAllObjects];
  }

  // Toggle the notConnectedQueue_ depending on if we are connected or not
  if (!_connectedChannel && _notConnectedQueueSuspended) {
    dispatch_resume(_notConnectedQueue);
    _notConnectedQueueSuspended = NO;
  } else if (_connectedChannel && !_notConnectedQueueSuspended) {
    dispatch_suspend(_notConnectedQueue);
    _notConnectedQueueSuspended = YES;
  }

  if (!_connectedChannel && _connectingToDeviceID) {
    [self enqueueConnectToUSBDevice];
  }
}

#pragma mark - PTChannelDelegate

- (void)ioFrameChannel:(PTChannel*)channel
    didReceiveFrameOfType:(uint32_t)type
                      tag:(uint32_t)tag
                  payload:(PTData*)payload {
  // NSLog(@"received %@, %u, %u, %@", channel, type, tag, payload);

  if (type == FKPortForwardingFrameTypeOpenPipe) {
    GCDAsyncSocket* sock =
        [[GCDAsyncSocket alloc] initWithDelegate:self
                                   delegateQueue:_clientSocketsQueue];
    sock.userData = @(tag);
    _clientSockets[@(tag)] = sock;

    NSError* connectError;
    if (![sock connectToHost:@"localhost"
                      onPort:_destPort
                       error:&connectError]) {
      FBPFLog(
          @"Failed to connect to local %lu - %@",
          (unsigned long)_destPort,
          connectError);
    }

    FBPFTrace(@"open socket (%d)", tag);
  }

  if (type == FKPortForwardingFrameTypeWriteToPipe) {
    GCDAsyncSocket* sock = _clientSockets[@(tag)];
    [sock writeData:[NSData dataWithBytes:payload.data length:payload.length]
        withTimeout:-1
                tag:0];
    FBPFTrace(@"channel -> socket (%d) %zu bytes", tag, payload.length);
  }

  if (type == FKPortForwardingFrameTypeClosePipe) {
    GCDAsyncSocket* sock = _clientSockets[@(tag)];
    [sock disconnectAfterWriting];
    FBPFTrace(@"close socket (%d)", tag);
  }
}

- (void)ioFrameChannel:(PTChannel*)channel didEndWithError:(NSError*)error {
  if (_connectedDeviceID &&
      [_connectedDeviceID isEqualToNumber:channel.userInfo]) {
    [self didDisconnectFromDevice:_connectedDeviceID];
  }

  if (_connectedChannel == channel) {
    FBPFTrace(@"Disconnected from %@", channel.userInfo);
    self.connectedChannel = nil;
  }
}

#pragma mark - GCDAsyncSocketDelegate

- (void)socket:(GCDAsyncSocket*)sock
    didConnectToHost:(NSString*)host
                port:(uint16_t)port {
  FBPFTrace(
      @"socket (%ld) connected to %@",
      (long)[sock.userData integerValue],
      host);
  [sock readDataWithTimeout:-1 tag:0];
}

- (void)socketDidDisconnect:(GCDAsyncSocket*)sock withError:(NSError*)err {
  UInt32 tag = [sock.userData unsignedIntValue];
  [_clientSockets removeObjectForKey:@(tag)];
  FBPFTrace(@"socket (%d) disconnected", (unsigned int)tag);

  [_connectedChannel sendFrameOfType:FKPortForwardingFrameTypeClosePipe
                                 tag:tag
                         withPayload:nil
                            callback:nil];
}

- (void)socket:(GCDAsyncSocket*)sock didReadData:(NSData*)data withTag:(long)_ {
  UInt32 tag = [sock.userData unsignedIntValue];
  [_connectedChannel sendFrameOfType:FKPortForwardingFrameTypeWriteToPipe
                                 tag:tag
                         withPayload:NSDataToGCDData(data)
                            callback:^(NSError* error) {
                              FBPFTrace(
                                  @"channel -> socket (%d), %lu bytes",
                                  (unsigned int)tag,
                                  (unsigned long)data.length);
                              [sock readDataWithTimeout:-1 tag:0];
                            }];
}

#pragma mark - Wired device connections

- (void)startListeningForDevices {
  NSNotificationCenter* nc = [NSNotificationCenter defaultCenter];

  __weak typeof(self) weakSelf = self;

  [nc addObserverForName:PTUSBDeviceDidAttachNotification
                  object:PTUSBHub.sharedHub
                   queue:nil
              usingBlock:^(NSNotification* note) {
                NSNumber* deviceID = [note.userInfo objectForKey:@"DeviceID"];
                // NSLog(@"PTUSBDeviceDidAttachNotification: %@",
                // note.userInfo);
                FBPFTrace(@"PTUSBDeviceDidAttachNotification: %@", deviceID);

                typeof(self) strongSelf = weakSelf;
                if (!strongSelf) {
                  return;
                }

                dispatch_async(strongSelf->_notConnectedQueue, ^{
                  [strongSelf didAttachToDevice:deviceID note:note];
                });
              }];

  [nc addObserverForName:PTUSBDeviceDidDetachNotification
                  object:PTUSBHub.sharedHub
                   queue:nil
              usingBlock:^(NSNotification* note) {
                NSNumber* deviceID = [note.userInfo objectForKey:@"DeviceID"];
                // NSLog(@"PTUSBDeviceDidDetachNotification: %@",
                // note.userInfo);
                FBPFTrace(@"PTUSBDeviceDidDetachNotification: %@", deviceID);

                [weakSelf didDetachFromDevice:deviceID];
              }];
}

- (void)didAttachToDevice:(NSNumber*)deviceID note:(NSNotification*)note {
  if (!_connectingToDeviceID ||
      ![deviceID isEqualToNumber:_connectingToDeviceID]) {
    [self disconnectFromCurrentChannel];
    _connectingToDeviceID = deviceID;
    _connectedDeviceProperties = [note.userInfo objectForKey:@"Properties"];
    [self enqueueConnectToUSBDevice];
  }
}

- (void)didDetachFromDevice:(NSNumber*)deviceID {
  if ([_connectingToDeviceID isEqualToNumber:deviceID]) {
    _connectedDeviceProperties = nil;
    _connectingToDeviceID = nil;
    if (_connectedChannel) {
      [_connectedChannel close];
    }
  }
}

- (void)didDisconnectFromDevice:(NSNumber*)deviceID {
  FBPFLog(@"Disconnected from device #%@", deviceID);
  if ([_connectedDeviceID isEqualToNumber:deviceID]) {
    [self willChangeValueForKey:@"connectedDeviceID"];
    _connectedDeviceID = nil;
    [self didChangeValueForKey:@"connectedDeviceID"];
  }
}

- (void)disconnectFromCurrentChannel {
  if (_connectedDeviceID && _connectedChannel) {
    [_connectedChannel close];
    self.connectedChannel = nil;
  }
}

- (void)enqueueConnectToLocalIPv4Port {
  dispatch_async(_notConnectedQueue, ^{
    dispatch_async(dispatch_get_main_queue(), ^{
      [self connectToLocalIPv4Port];
    });
  });
}

- (void)connectToLocalIPv4Port {
  PTChannel* channel = [PTChannel channelWithDelegate:self];
  channel.userInfo =
      [NSString stringWithFormat:@"127.0.0.1:%lu", (unsigned long)_channelPort];
  [channel
      connectToPort:_channelPort
        IPv4Address:INADDR_LOOPBACK
           callback:^(NSError* error, PTAddress* address) {
             if (error) {
               if (error.domain == NSPOSIXErrorDomain &&
                   (error.code == ECONNREFUSED || error.code == ETIMEDOUT)) {
                 // this is an expected state
               } else {
                 FBPFTrace(
                     @"Failed to connect to 127.0.0.1:%lu: %@",
                     (unsigned long)_channelPort,
                     error);
               }
             } else {
               [self disconnectFromCurrentChannel];
               self.connectedChannel = channel;
               channel.userInfo = address;
               FBPFLog(@"Connected to %@", address);
             }
             [self performSelector:@selector(enqueueConnectToLocalIPv4Port)
                        withObject:nil
                        afterDelay:ReconnectDelay];
           }];
}

- (void)enqueueConnectToUSBDevice {
  dispatch_async(_notConnectedQueue, ^{
    dispatch_async(dispatch_get_main_queue(), ^{
      [self connectToUSBDevice];
    });
  });
}

- (void)connectToUSBDevice {
  PTChannel* channel = [PTChannel channelWithDelegate:self];
  channel.userInfo = _connectingToDeviceID;
  channel.delegate = self;

  [channel connectToPort:(int)_channelPort
              overUSBHub:PTUSBHub.sharedHub
                deviceID:_connectingToDeviceID
                callback:^(NSError* error) {
                  [self didConnectToChannel:channel withError:error];
                }];
}

- (void)didConnectToChannel:(PTChannel*)channel withError:(NSError*)error {
  if (error) {
    FBPFTrace(@"Failed to connect to device #%@: %@", channel.userInfo, error);
    if (channel.userInfo == _connectingToDeviceID) {
      [self performSelector:@selector(enqueueConnectToUSBDevice)
                 withObject:nil
                 afterDelay:ReconnectDelay];
    }
  } else {
    _connectedDeviceID = _connectingToDeviceID;
    self.connectedChannel = channel;
    FBPFLog(
        @"Connected to device #%@\n%@",
        _connectingToDeviceID,
        _connectedDeviceProperties);
  }
}

@end
