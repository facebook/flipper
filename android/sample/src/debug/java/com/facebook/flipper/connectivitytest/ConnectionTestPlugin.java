/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.connectivitytest;

import android.app.Activity;
import android.widget.Toast;
import androidx.annotation.Nullable;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.flipper.sample.ExampleActions;
import com.facebook.flipper.sample.network.NetworkClient;

public class ConnectionTestPlugin implements FlipperPlugin {

  // We are reusing the existing "Example" logic here. That's generally a pretty bad idea,
  // but in war and in testing everything is fair.
  private static final String ID = "Example";

  private final Activity mActivity;

  @Nullable private FlipperConnection mConnection;

  public ConnectionTestPlugin(Activity activity) {
    mActivity = activity;
  }

  @Override
  public String getId() {
    return ID;
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

    mActivity.runOnUiThread(
        new Runnable() {
          @Override
          public void run() {
            final NetworkClient networkClient = NetworkClient.getInstance();
            ExampleActions.sendGetRequest(networkClient.getOkHttpClient());
            ExampleActions.sendPostRequest(networkClient.getOkHttpClient());
            // We want Flipper to properly disconnect at this point and actually shut down the app.
            mActivity.finish();
            android.os.Process.sendSignal(android.os.Process.myPid(), 15);
          }
        });
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
