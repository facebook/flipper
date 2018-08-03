/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.core;

public interface SonarClient {
  void addPlugin(SonarPlugin plugin);

  <T extends SonarPlugin> T getPlugin(String id);

  void removePlugin(SonarPlugin plugin);

  void start();

  void stop();
}
