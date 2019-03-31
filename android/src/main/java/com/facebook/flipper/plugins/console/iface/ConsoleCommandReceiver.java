/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.console.iface;

import androidx.annotation.Nullable;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.flipper.plugins.common.MainThreadFlipperReceiver;
import org.json.JSONObject;

/**
 * Convenience class for adding console execution to a Flipper Plugin. Calling {@link
 * ConsoleCommandReceiver#listenForCommands(FlipperConnection, ScriptingEnvironment,
 * ContextProvider)} will add the necessary listeners for responding to command execution calls.
 */
public class ConsoleCommandReceiver {

  /**
   * Incoming command execution calls may reference a context ID that means something to your
   * plugin. Implement {@link ContextProvider} to provide a mapping from context ID to java object.
   * This will allow your Flipper plugin to control the execution context of the command.
   */
  public interface ContextProvider {
    @Nullable
    Object getObjectForId(String id);
  }

  public static void listenForCommands(
      final FlipperConnection connection,
      final ScriptingEnvironment scriptingEnvironment,
      final ContextProvider contextProvider) {

    final ScriptingSession session = scriptingEnvironment.startSession();
    final FlipperReceiver executeCommandReceiver =
        new MainThreadFlipperReceiver() {
          @Override
          public void onReceiveOnMainThread(FlipperObject params, FlipperResponder responder)
              throws Exception {
            final String command = params.getString("command");
            final String contextObjectId = params.getString("context");
            final Object contextObject = contextProvider.getObjectForId(contextObjectId);
            try {
              JSONObject o =
                  contextObject == null
                      ? session.evaluateCommand(command)
                      : session.evaluateCommand(command, contextObject);
              responder.success(new FlipperObject(o));
            } catch (Exception e) {
              responder.error(new FlipperObject.Builder().put("message", e.getMessage()).build());
            }
          }
        };
    final FlipperReceiver isEnabledReceiver =
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
            responder.success(
                new FlipperObject.Builder()
                    .put("isEnabled", scriptingEnvironment.isEnabled())
                    .build());
          }
        };

    connection.receive("executeCommand", executeCommandReceiver);
    connection.receive("isConsoleEnabled", isEnabledReceiver);
  }

  public static void listenForCommands(
      FlipperConnection connection, ScriptingEnvironment scriptingEnvironment) {
    listenForCommands(connection, scriptingEnvironment, nullContextProvider);
  }

  private static final ContextProvider nullContextProvider =
      new ContextProvider() {
        @Override
        @Nullable
        public Object getObjectForId(String id) {
          return null;
        }
      };
}
