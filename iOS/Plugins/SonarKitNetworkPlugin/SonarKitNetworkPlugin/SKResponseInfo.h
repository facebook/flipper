//
//  SKResonseInfo.h
//  SonarKit
//
//  Created by Pritesh Nandgaonkar on 8/1/18.
//  Copyright © 2018 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface SKResponseInfo : NSObject

@property(assign, readwrite) int64_t identifier;
@property(assign, readwrite) uint64_t timestamp;
@property(strong, nonatomic) NSURLResponse* response;
@property(strong, nonatomic) NSString* body;

- (instancetype)initWithIndentifier:(int64_t)identifier timestamp:(uint64_t)timestamp response:(NSURLResponse *)response data:(NSData *)data;

@end
