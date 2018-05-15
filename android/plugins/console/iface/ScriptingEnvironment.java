/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.console.iface;

public interface ScriptingEnvironment {

  ScriptingSession startSession();

  void registerGlobalObject(String name, Object object);

  boolean isEnabled();
}
