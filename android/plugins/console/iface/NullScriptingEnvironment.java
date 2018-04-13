/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.console.iface;

import org.json.JSONException;
import org.json.JSONObject;

public class NullScriptingEnvironment implements ScriptingEnvironment {

  @Override
  public ScriptingSession startSession() {
    return new NoOpScriptingSession();
  }

  @Override
  public void registerGlobalObject(String name, Object object) {}

  static class NoOpScriptingSession implements ScriptingSession {

    @Override
    public JSONObject evaluateCommand(String userScript) throws JSONException {
      throw new UnsupportedOperationException("Console plugin not enabled in this app");
    }

    @Override
    public JSONObject evaluateCommand(String userScript, Object context) throws JSONException {
      return evaluateCommand(userScript);
    }

    @Override
    public void close() {}
  }

  @Override
  public boolean isEnabled() {
    return false;
  }
}
