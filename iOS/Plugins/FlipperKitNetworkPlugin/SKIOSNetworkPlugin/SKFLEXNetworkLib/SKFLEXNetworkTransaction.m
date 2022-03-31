// @lint-ignore-every LICENSELINT
/*
 * The file was derived from FLEXNetworkTransaction.h.
 * All modifications to the original source are licensed under:
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

//
//  FLEXNetworkTransaction.m
//  Flipboard
//
//  Created by Ryan Olson on 2/8/15.
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

#import "SKFLEXNetworkTransaction.h"

@interface SKFLEXNetworkTransaction ()

@property(nonatomic, strong, readwrite) NSData* cachedRequestBody;

@end

@implementation SKFLEXNetworkTransaction

- (NSString*)description {
  NSString* description = [super description];

  description =
      [description stringByAppendingFormat:@" id = %@;", self.requestID];
  description =
      [description stringByAppendingFormat:@" url = %@;", self.request.URL];
  description =
      [description stringByAppendingFormat:@" duration = %f;", self.duration];
  description =
      [description stringByAppendingFormat:@" receivedDataLength = %lld",
                                           self.receivedDataLength];

  return description;
}

- (NSData*)cachedRequestBody {
  if (!_cachedRequestBody) {
    if (self.request.HTTPBody != nil) {
      _cachedRequestBody = self.request.HTTPBody;
    } else if ([self.request.HTTPBodyStream
                   conformsToProtocol:@protocol(NSCopying)]) {
      NSInputStream* bodyStream = [self.request.HTTPBodyStream copy];
      const NSUInteger bufferSize = 1024;
      uint8_t buffer[bufferSize];
      NSMutableData* data = [NSMutableData data];
      [bodyStream open];
      NSInteger readBytes = 0;
      do {
        readBytes = [bodyStream read:buffer maxLength:bufferSize];
        [data appendBytes:buffer length:readBytes];
      } while (readBytes > 0);
      [bodyStream close];
      _cachedRequestBody = data;
    }
  }
  return _cachedRequestBody;
}

+ (NSString*)readableStringFromTransactionState:
    (SKFLEXNetworkTransactionState)state {
  NSString* readableString = nil;
  switch (state) {
    case SKFLEXNetworkTransactionStateUnstarted:
      readableString = @"Unstarted";
      break;

    case SKFLEXNetworkTransactionStateAwaitingResponse:
      readableString = @"Awaiting Response";
      break;

    case SKFLEXNetworkTransactionStateReceivingData:
      readableString = @"Receiving Data";
      break;

    case SKFLEXNetworkTransactionStateFinished:
      readableString = @"Finished";
      break;

    case SKFLEXNetworkTransactionStateFailed:
      readableString = @"Failed";
      break;
  }
  return readableString;
}

@end
