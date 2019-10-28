/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

@interface SKRequestInfo: NSObject
@property(assign, readwrite) int64_t identifier;
@property(assign, readwrite) uint64_t timestamp;
@property(strong, nonatomic) NSURLRequest* request;
@property(strong, nonatomic) NSString* body;

- (instancetype)initWithIdentifier:(int64_t)identifier timestamp:(uint64_t)timestamp request:(NSURLRequest*)request data:(NSData *)data;
- (void)setBodyFromData:(NSData * _Nullable)data;

@end
