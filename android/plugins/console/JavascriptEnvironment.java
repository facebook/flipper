/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.console;

import com.facebook.sonar.plugins.console.iface.ScriptingEnvironment;
import java.util.HashMap;
import java.util.Map;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;

public class JavascriptEnvironment implements ScriptingEnvironment {

  private final Map<String, Object> mBoundVariables;
  private final ContextFactory mContextFactory;

  public JavascriptEnvironment() {
    mBoundVariables = new HashMap<>();
    mContextFactory =
        new ContextFactory() {
          @Override
          public boolean hasFeature(Context cx, int featureIndex) {
            return featureIndex == Context.FEATURE_ENHANCED_JAVA_ACCESS;
          }
        };
  }

  @Override
  public JavascriptSession startSession() {
    return new JavascriptSession(mContextFactory, mBoundVariables);
  }

  /**
   * Method for other plugins to register objects to a name, so that they can be accessed in all
   * console sessions.
   *
   * @param name The variable name to bind the object to.
   * @param object The reference to bind.
   */
  @Override
  public void registerGlobalObject(String name, Object object) {
    if (mBoundVariables.containsKey(name)) {
      throw new IllegalStateException(
          String.format(
              "Variable %s is already reserved for %s", name, mBoundVariables.get(name)));
    }
    mBoundVariables.put(name, object);
  }

  @Override
  public boolean isEnabled() {
    return true;
  }
}
