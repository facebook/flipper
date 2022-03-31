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
//  FLEXNetworkRecorder.h
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

#import <Foundation/Foundation.h>

#import <FlipperKitNetworkPlugin/SKNetworkReporter.h>

// Notifications posted when the record is updated
extern NSString* const kSKFLEXNetworkRecorderNewTransactionNotification;
extern NSString* const kSKFLEXNetworkRecorderTransactionUpdatedNotification;
extern NSString* const kSKFLEXNetworkRecorderUserInfoTransactionKey;
extern NSString* const kSKFLEXNetworkRecorderTransactionsClearedNotification;

@class SKFLEXNetworkTransaction;

@interface SKFLEXNetworkRecorder : NSObject

/// In general, it only makes sense to have one recorder for the entire
/// application.
+ (instancetype)defaultRecorder;

@property(nonatomic, weak) id<SKNetworkReporterDelegate> delegate;

/// Defaults to 25 MB if never set. Values set here are presisted across
/// launches of the app.
@property(nonatomic, assign) NSUInteger responseCacheByteLimit;

/// If NO, the recorder not cache will not cache response for content types with
/// an "image", "video", or "audio" prefix.
@property(nonatomic, assign) BOOL shouldCacheMediaResponses;

@property(nonatomic, copy) NSArray<NSString*>* hostBlacklist;

// Accessing recorded network activity

/// Array of SKFLEXNetworkTransaction objects ordered by start time with the
/// newest first.
- (NSArray<SKFLEXNetworkTransaction*>*)networkTransactions;

/// The full response data IFF it hasn't been purged due to memory pressure.
- (NSData*)cachedResponseBodyForTransaction:
    (SKFLEXNetworkTransaction*)transaction;

/// Dumps all network transactions and cached response bodies.
- (void)clearRecordedActivity;

// Recording network activity

/// Call when app is about to send HTTP request.
- (void)recordRequestWillBeSentWithRequestID:(NSString*)requestID
                                     request:(NSURLRequest*)request
                            redirectResponse:(NSURLResponse*)redirectResponse;

/// Call when HTTP response is available.
- (void)recordResponseReceivedWithRequestID:(NSString*)requestID
                                   response:(NSURLResponse*)response;

/// Call when data chunk is received over the network.
- (void)recordDataReceivedWithRequestID:(NSString*)requestID
                             dataLength:(int64_t)dataLength;

/// Call when HTTP request has finished loading.
- (void)recordLoadingFinishedWithRequestID:(NSString*)requestID
                              responseBody:(NSData*)responseBody;

/// Call when HTTP request has failed to load.
- (void)recordLoadingFailedWithRequestID:(NSString*)requestID
                                   error:(NSError*)error;

/// Call to set the request mechanism anytime after recordRequestWillBeSent...
/// has been called. This string can be set to anything useful about the API
/// used to make the request.
- (void)recordMechanism:(NSString*)mechanism forRequestID:(NSString*)requestID;

@end
