// @lint-ignore-every LICENSELINT
/*
 * The file was derived from FLEXNetworkRecorder.h.
 * All modifications to the original source are licensed under:
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

//
//  FLEXNetworkRecorder.m
//  Flipboard
//
//  Created by Ryan Olson on 2/4/15.
//  Copyright (c) 2020 FLEX Team. All rights reserved.
//

// Copyright (c) 2014-2016, Flipboard
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
// this
//   list of conditions and the following disclaimer in the documentation and/or
//   other materials provided with the distribution.
// * Neither the name of Flipboard nor the names of its
//   contributors may be used to endorse or promote products derived from
//   this software without specific prior written permission.
// * You must NOT include this project in an application to be submitted
//   to the App Store™, as this project uses too many private APIs.
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

#import "SKFLEXNetworkRecorder.h"

#import "SKFLEXNetworkTransaction.h"
#import "SKFLEXUtility.h"

NSString* const kSKFLEXNetworkRecorderNewTransactionNotification =
    @"kSKFLEXNetworkRecorderNewTransactionNotification";
NSString* const kSKFLEXNetworkRecorderTransactionUpdatedNotification =
    @"kSKFLEXNetworkRecorderTransactionUpdatedNotification";
NSString* const kSKFLEXNetworkRecorderUserInfoTransactionKey = @"transaction";
NSString* const kSKFLEXNetworkRecorderTransactionsClearedNotification =
    @"kSKFLEXNetworkRecorderTransactionsClearedNotification";

NSString* const kSKFLEXNetworkRecorderResponseCacheLimitDefaultsKey =
    @"com.skflex.responseCacheLimit";

@interface SKFLEXNetworkRecorder ()

@property(nonatomic, strong) NSCache* responseCache;
@property(nonatomic, strong)
    NSMutableArray<SKFLEXNetworkTransaction*>* orderedTransactions;
@property(nonatomic, strong)
    NSMutableDictionary<NSString*, SKFLEXNetworkTransaction*>*
        networkTransactionsForRequestIdentifiers;
@property(nonatomic, strong) dispatch_queue_t queue;
@property(nonatomic, strong)
    NSMutableDictionary<NSString*, NSNumber*>* identifierDict;
@end

@implementation SKFLEXNetworkRecorder

- (instancetype)init {
  self = [super init];
  if (self) {
    _responseCache = [NSCache new];
    NSUInteger responseCacheLimit = [[[NSUserDefaults standardUserDefaults]
        objectForKey:kSKFLEXNetworkRecorderResponseCacheLimitDefaultsKey]
        unsignedIntegerValue];
    if (responseCacheLimit) {
      [_responseCache setTotalCostLimit:responseCacheLimit];
    } else {
      // Default to 25 MB max. The cache will purge earlier if there is memory
      // pressure.
      [_responseCache setTotalCostLimit:25 * 1024 * 1024];
    }
    _orderedTransactions = [NSMutableArray array];
    _networkTransactionsForRequestIdentifiers =
        [NSMutableDictionary dictionary];

    // Serial queue used because we use mutable objects that are not thread safe
    _queue = dispatch_queue_create(
        "com.skflex.SKFLEXNetworkRecorder", DISPATCH_QUEUE_SERIAL);
    _identifierDict = [NSMutableDictionary dictionary];
  }
  return self;
}

+ (instancetype)defaultRecorder {
  static SKFLEXNetworkRecorder* defaultRecorder = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    defaultRecorder = [[[self class] alloc] init];
  });
  return defaultRecorder;
}

#pragma mark - Public Data Access

- (void)setDelegate:(id<SKNetworkReporterDelegate>)delegate {
  _delegate = delegate;
}

- (NSUInteger)responseCacheByteLimit {
  return [self.responseCache totalCostLimit];
}

- (void)setResponseCacheByteLimit:(NSUInteger)responseCacheByteLimit {
  [self.responseCache setTotalCostLimit:responseCacheByteLimit];
  [[NSUserDefaults standardUserDefaults]
      setObject:@(responseCacheByteLimit)
         forKey:kSKFLEXNetworkRecorderResponseCacheLimitDefaultsKey];
}

- (NSArray<SKFLEXNetworkTransaction*>*)networkTransactions {
  __block NSArray<SKFLEXNetworkTransaction*>* transactions = nil;
  dispatch_sync(self.queue, ^{
    transactions = [self.orderedTransactions copy];
  });
  return transactions;
}

- (NSData*)cachedResponseBodyForTransaction:
    (SKFLEXNetworkTransaction*)transaction {
  return [self.responseCache objectForKey:transaction.requestID];
}

- (void)clearRecordedActivity {
  dispatch_async(self.queue, ^{
    [self.responseCache removeAllObjects];
    [self.orderedTransactions removeAllObjects];
    [self.networkTransactionsForRequestIdentifiers removeAllObjects];
  });
}

#pragma mark - Network Events

- (void)recordRequestWillBeSentWithRequestID:(NSString*)requestID
                                     request:(NSURLRequest*)request
                            redirectResponse:(NSURLResponse*)redirectResponse {
  NSDate* requestDate = [NSDate date];
  dispatch_async(self.queue, ^{
    if (![self.identifierDict objectForKey:requestID]) {
      self.identifierDict[requestID] = [NSNumber random];
    }

    if (redirectResponse) {
      [self recordResponseReceivedWithRequestID:requestID
                                       response:redirectResponse];
      [self recordLoadingFinishedWithRequestID:requestID responseBody:nil];
    }

    SKRequestInfo* info = [[SKRequestInfo alloc]
        initWithIdentifier:self.identifierDict[requestID].longLongValue
                 timestamp:(uint64_t)[NSDate timestamp]
                   request:request
                      data:request.HTTPBody];
    [self.delegate didObserveRequest:info];

    SKFLEXNetworkTransaction* transaction = [SKFLEXNetworkTransaction new];
    transaction.requestID = requestID;
    transaction.request = request;
    transaction.startTime = requestDate;

    [self.orderedTransactions insertObject:transaction atIndex:0];
    [self.networkTransactionsForRequestIdentifiers setObject:transaction
                                                      forKey:requestID];
    transaction.transactionState =
        SKFLEXNetworkTransactionStateAwaitingResponse;
  });
}

/// Call when HTTP response is available.
- (void)recordResponseReceivedWithRequestID:(NSString*)requestID
                                   response:(NSURLResponse*)response {
  NSDate* responseDate = [NSDate date];

  dispatch_async(self.queue, ^{
    SKFLEXNetworkTransaction* transaction =
        self.networkTransactionsForRequestIdentifiers[requestID];
    if (!transaction) {
      return;
    }
    transaction.response = response;
    transaction.transactionState = SKFLEXNetworkTransactionStateReceivingData;
    transaction.latency =
        -[transaction.startTime timeIntervalSinceDate:responseDate];
  });
}

/// Call when data chunk is received over the network.
- (void)recordDataReceivedWithRequestID:(NSString*)requestID
                             dataLength:(int64_t)dataLength {
  dispatch_async(self.queue, ^{
    SKFLEXNetworkTransaction* transaction =
        self.networkTransactionsForRequestIdentifiers[requestID];
    if (!transaction) {
      return;
    }
    transaction.receivedDataLength += dataLength;
  });
}

/// Call when HTTP request has finished loading.
- (void)recordLoadingFinishedWithRequestID:(NSString*)requestID
                              responseBody:(NSData*)responseBody {
  NSDate* finishedDate = [NSDate date];
  dispatch_async(self.queue, ^{
    SKFLEXNetworkTransaction* transaction =
        self.networkTransactionsForRequestIdentifiers[requestID];
    if (!transaction) {
      return;
    }
    transaction.transactionState = SKFLEXNetworkTransactionStateFinished;
    transaction.duration =
        -[transaction.startTime timeIntervalSinceDate:finishedDate];
    SKResponseInfo* responseInfo = [[SKResponseInfo alloc]
        initWithIndentifier:self.identifierDict[requestID].longLongValue
                  timestamp:(uint64_t)[NSDate timestamp]
                   response:transaction.response
                       data:responseBody];
    self.identifierDict[requestID] = nil; // Clear the entry
    [self.delegate didObserveResponse:responseInfo];

    BOOL shouldCache = [responseBody length] > 0;
    if (!self.shouldCacheMediaResponses) {
      NSArray<NSString*>* ignoredMIMETypePrefixes =
          @[ @"audio", @"image", @"video" ];
      for (NSString* ignoredPrefix in ignoredMIMETypePrefixes) {
        shouldCache = shouldCache &&
            ![transaction.response.MIMEType hasPrefix:ignoredPrefix];
      }
    }

    if (shouldCache) {
      [self.responseCache setObject:responseBody
                             forKey:requestID
                               cost:[responseBody length]];
    }
  });
}

- (void)recordLoadingFailedWithRequestID:(NSString*)requestID
                                   error:(NSError*)error {
  dispatch_async(self.queue, ^{
    SKFLEXNetworkTransaction* transaction =
        self.networkTransactionsForRequestIdentifiers[requestID];
    if (!transaction) {
      return;
    }

    SKResponseInfo* responseInfo = [[SKResponseInfo alloc]
        initWithIndentifier:self.identifierDict[requestID].longLongValue
                  timestamp:(uint64_t)[NSDate timestamp]
                   response:transaction.response
                       data:nil];
    self.identifierDict[requestID] = nil; // Clear the entry
    [self.delegate didObserveResponse:responseInfo];
    transaction.transactionState = SKFLEXNetworkTransactionStateFailed;
    transaction.duration = -[transaction.startTime timeIntervalSinceNow];
    transaction.error = error;
  });
}

- (void)recordMechanism:(NSString*)mechanism forRequestID:(NSString*)requestID {
  dispatch_async(self.queue, ^{
    SKFLEXNetworkTransaction* transaction =
        self.networkTransactionsForRequestIdentifiers[requestID];
    if (!transaction) {
      return;
    }
    transaction.requestMechanism = mechanism;
  });
}

@end
