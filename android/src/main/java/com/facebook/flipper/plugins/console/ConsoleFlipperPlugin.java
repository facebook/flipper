/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.console;

import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.plugins.console.iface.ConsoleCommandReceiver;

public class ConsoleFlipperPlugin implements FlipperPlugin {

  private final JavascriptEnvironment mJavascriptEnvironment;
  private JavascriptSession mJavascriptSession;

  public ConsoleFlipperPlugin(JavascriptEnvironment jsEnvironment) {
    this.mJavascriptEnvironment = jsEnvironment;
  }

  @Override
  public String getId() {
    return "Console";
  }

  @Override
  public void onConnect(FlipperConnection connection) throws Exception {
    ConsoleCommandReceiver.listenForCommands(connection, mJavascriptEnvironment);
  }

  public void onDisconnect() throws Exception {}

  @Override
  public boolean runInBackground() {
    return false;
  }
}
