/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.console.iface;

import android.support.annotation.Nullable;
import com.facebook.sonar.core.SonarConnection;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.core.SonarReceiver;
import com.facebook.sonar.core.SonarResponder;
import com.facebook.sonar.plugins.common.MainThreadSonarReceiver;
import org.json.JSONObject;

/**
 * Convenience class for adding console execution to a Sonar Plugin. Calling {@link
 * ConsoleCommandReceiver#listenForCommands(SonarConnection, ScriptingEnvironment, ContextProvider)}
 * will add the necessary listeners for responding to command execution calls.
 */
public class ConsoleCommandReceiver {

  /**
   * Incoming command execution calls may reference a context ID that means something to your
   * plugin. Implement {@link ContextProvider} to provide a mapping from context ID to java object.
   * This will allow your sonar plugin to control the execution context of the command.
   */
  public interface ContextProvider {
    @Nullable
    Object getObjectForId(String id);
  }

  public static void listenForCommands(
      final SonarConnection connection,
      final ScriptingEnvironment scriptingEnvironment,
      final ContextProvider contextProvider) {

    final ScriptingSession session = scriptingEnvironment.startSession();
    final SonarReceiver executeCommandReceiver =
        new MainThreadSonarReceiver(connection) {
          @Override
          public void onReceiveOnMainThread(SonarObject params, SonarResponder responder)
              throws Exception {
            final String command = params.getString("command");
            final String contextObjectId = params.getString("context");
            final Object contextObject = contextProvider.getObjectForId(contextObjectId);
            try {
              JSONObject o =
                  contextObject == null
                      ? session.evaluateCommand(command)
                      : session.evaluateCommand(command, contextObject);
              responder.success(new SonarObject(o));
            } catch (Exception e) {
              responder.error(new SonarObject.Builder().put("message", e.getMessage()).build());
            }
          }
        };
    final SonarReceiver isEnabledReceiver =
        new SonarReceiver() {
          @Override
          public void onReceive(SonarObject params, SonarResponder responder) throws Exception {
            responder.success(
                new SonarObject.Builder()
                    .put("isEnabled", scriptingEnvironment.isEnabled())
                    .build());
          }
        };

    connection.receive("executeCommand", executeCommandReceiver);
    connection.receive("isConsoleEnabled", isEnabledReceiver);
  }

  public static void listenForCommands(
      SonarConnection connection, ScriptingEnvironment scriptingEnvironment) {
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
