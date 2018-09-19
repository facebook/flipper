/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.console;

import com.facebook.flipper.core.SonarConnection;
import com.facebook.flipper.core.SonarPlugin;
import com.facebook.flipper.plugins.console.iface.ConsoleCommandReceiver;

public class ConsoleSonarPlugin implements SonarPlugin {

  private final JavascriptEnvironment mJavascriptEnvironment;
  private JavascriptSession mJavascriptSession;

  public ConsoleSonarPlugin(JavascriptEnvironment jsEnvironment) {
    this.mJavascriptEnvironment = jsEnvironment;
  }

  @Override
  public String getId() {
    return "Console";
  }

  @Override
  public void onConnect(SonarConnection connection) throws Exception {
    ConsoleCommandReceiver.listenForCommands(connection, mJavascriptEnvironment);
  }

  public void onDisconnect() throws Exception {
  }
}
