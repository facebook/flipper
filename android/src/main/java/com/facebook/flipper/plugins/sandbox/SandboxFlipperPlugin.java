/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.sandbox;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import java.util.Map;

public class SandboxFlipperPlugin implements FlipperPlugin {
  public static final String ID = "Sandbox";

  private static final String SET_METHOD_NAME = "setSandbox";
  private static final String GET_METHOD_NAME = "getSandbox";

  private final SandboxFlipperPluginStrategy mStrategy;

  public SandboxFlipperPlugin(SandboxFlipperPluginStrategy strategy) {
    mStrategy = strategy;
  }

  @Override
  public String getId() {
    return ID;
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    connection.receive(
        GET_METHOD_NAME,
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, final FlipperResponder responder) {
            final FlipperArray.Builder sandboxes = new FlipperArray.Builder();
            Map<String, String> knownSandboxes = mStrategy.getKnownSandboxes();
            if (knownSandboxes == null) {
              responder.success(sandboxes.build());
              return;
            }
            for (String sandboxName : knownSandboxes.keySet()) {
              sandboxes.put(
                  new FlipperObject.Builder()
                      .put("name", sandboxName)
                      .put("value", knownSandboxes.get(sandboxName)));
            }
            responder.success(sandboxes.build());
          }
        });
    connection.receive(
        SET_METHOD_NAME,
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
            String sandbox = params.getString("sandbox");
            mStrategy.setSandbox(sandbox);
            responder.success(new FlipperObject.Builder().put("result", true).build());
          }
        });
  }

  @Override
  public void onDisconnect() {}

  @Override
  public boolean runInBackground() {
    return false;
  }
}
