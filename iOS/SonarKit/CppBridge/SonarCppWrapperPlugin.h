/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#ifndef __OBJC__
#error This header can only be included in .mm (ObjC++) files
#endif

#import <Sonar/SonarPlugin.h>
#import <SonarKit/SonarCppBridgingConnection.h>
#import <SonarKit/SonarPlugin.h>

namespace facebook {
namespace sonar {

using ObjCPlugin = NSObject<SonarPlugin> *;

/**
SonarCppWrapperPlugin is a simple C++ wrapper around Objective-C Sonar plugins
that can be passed to SonarClient. This class allows developers to write pure
Objective-C plugins if they want.
*/
class SonarCppWrapperPlugin final : public facebook::sonar::SonarPlugin {
public:
  // Under ARC copying objCPlugin *does* increment its retain count
  SonarCppWrapperPlugin(ObjCPlugin objCPlugin) : _objCPlugin(objCPlugin) {}

  std::string identifier() const override { return [[_objCPlugin identifier] UTF8String]; }

  void didConnect(std::shared_ptr<facebook::sonar::SonarConnection> conn) override
  {
    SonarCppBridgingConnection *const bridgingConn = [[SonarCppBridgingConnection alloc] initWithCppConnection:conn];
    [_objCPlugin didConnect:bridgingConn];
  }

  void didDisconnect() override { [_objCPlugin didDisconnect]; }

  ObjCPlugin getObjCPlugin() { return _objCPlugin; }

private:
  ObjCPlugin _objCPlugin;
};

} // namespace sonar
} // namespace facebook
