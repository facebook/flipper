/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <Sonar/FlipperResponder.h>
#import <FlipperKit/FlipperResponder.h>

/**
SonarCppBridgingResponder is a simple ObjC wrapper around FlipperResponder
that forwards messages to the underlying C++ responder. This class allows
pure Objective-C plugins to send messages to the underlying responder.
*/
@interface SonarCppBridgingResponder : NSObject <FlipperResponder>
- (instancetype)initWithCppResponder:(std::unique_ptr<facebook::flipper::FlipperResponder>)responder;
@end
