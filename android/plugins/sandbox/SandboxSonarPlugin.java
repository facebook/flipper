/*
 *  Copyright (c) 2004-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.sandbox;

import com.facebook.sonar.core.SonarArray;
import com.facebook.sonar.core.SonarConnection;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.core.SonarPlugin;
import com.facebook.sonar.core.SonarReceiver;
import com.facebook.sonar.core.SonarResponder;
import java.util.Map;

public class SandboxSonarPlugin implements SonarPlugin {
  public static final String ID = "Sandbox";

  private static final String SET_METHOD_NAME = "setSandbox";
  private static final String GET_METHOD_NAME = "getSandbox";

  private final SandboxSonarPluginStrategy mStrategy;

  public SandboxSonarPlugin(SandboxSonarPluginStrategy strategy) {
    mStrategy = strategy;
  }

  @Override
  public String getId() {
    return ID;
  }

  @Override
  public void onConnect(SonarConnection connection) {
    connection.receive(
        GET_METHOD_NAME,
        new SonarReceiver() {
          @Override
          public void onReceive(SonarObject params, final SonarResponder responder) {
            final SonarArray.Builder sandboxes = new SonarArray.Builder();
            Map<String, String> knownSandboxes = mStrategy.getKnownSandboxes();
            if (knownSandboxes == null) {
              responder.success(sandboxes.build());
              return;
            }
            for (String sandboxName : knownSandboxes.keySet()) {
              sandboxes.put(
                  new SonarObject.Builder()
                      .put("name", sandboxName)
                      .put("value", knownSandboxes.get(sandboxName)));
            }
            responder.success(sandboxes.build());
          }
        });
    connection.receive(
        SET_METHOD_NAME,
        new SonarReceiver() {
          @Override
          public void onReceive(SonarObject params, SonarResponder responder) throws Exception {
            String sandbox = params.getString("sandbox");
            mStrategy.setSandbox(sandbox);
            responder.success(new SonarObject.Builder().put("result", true).build());
          }
        });
  }

  @Override
  public void onDisconnect() {}
}
