/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.example;

import android.app.Activity;
import android.widget.Toast;
import androidx.annotation.Nullable;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;

public class ExampleFlipperPlugin implements FlipperPlugin {

  public static final String ID = "Example";

  @Nullable private Activity mActivity;

  @Nullable private FlipperConnection mConnection;

  private int mNotificationsSent = 0;

  @Override
  public String getId() {
    return ID;
  }

  /*
   * Activity to be used to display incoming messages
   */
  public void setActivity(Activity activity) {
    mActivity = activity;
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    mConnection = connection;
    connection.receive(
        "displayMessage",
        new FlipperReceiver() {
          @Override
          public void onReceive(final FlipperObject params, FlipperResponder responder) {
            if (mActivity != null) {
              mActivity.runOnUiThread(
                  new Runnable() {
                    @Override
                    public void run() {
                      Toast.makeText(mActivity, params.getString("message"), Toast.LENGTH_SHORT)
                          .show();
                    }
                  });
            }

            responder.success(new FlipperObject.Builder().put("greeting", "Hello").build());
          }
        });
  }

  public void triggerNotification() {
    if (mConnection != null) {
      mConnection.send(
          "triggerNotification", new FlipperObject.Builder().put("id", mNotificationsSent).build());
      mNotificationsSent++;
    }
  }

  @Override
  public void onDisconnect() {
    mConnection = null;
  }

  @Override
  public boolean runInBackground() {
    return true;
  }
}
