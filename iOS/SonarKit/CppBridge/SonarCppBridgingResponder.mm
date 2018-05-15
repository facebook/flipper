/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import "SonarCppBridgingResponder.h"

#import "SKUtils.h"

@implementation SonarCppBridgingResponder {
  std::unique_ptr<facebook::sonar::SonarResponder> responder_;
}

- (instancetype)initWithCppResponder:(std::unique_ptr<facebook::sonar::SonarResponder>)responder
{
  if (!responder) {
    return nil;
  }

  if (self = [super init]) {
    responder_ = std::move(responder);
  }

  return self;
}

#pragma mark - SonarResponder

- (void)success:(NSDictionary *)response { responder_->success([SKUtils convertIdToFollyDynamic:response]); }

- (void)error:(NSDictionary *)response { responder_->error([SKUtils convertIdToFollyDynamic:response]); }

@end
