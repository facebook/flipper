/*
 *  Copyright (c) 2004-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <Sonar/SonarConnection.h>
#import <SonarKit/SonarConnection.h>

/**
SonarCppBridgingConnection is a simple ObjC wrapper around SonarConnection
that forwards messages to the underlying C++ connection. This class allows
pure Objective-C plugins to send messages to the underlying connection.
*/
@interface SonarCppBridgingConnection : NSObject <SonarConnection>
- (instancetype)initWithCppConnection:(std::shared_ptr<facebook::sonar::SonarConnection>)conn;
@end
