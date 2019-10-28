/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.leakcanary;

import android.util.Log;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class LeakCanaryFlipperPlugin implements FlipperPlugin {

  private static final String TAG = "LeakCanaryFlipperPlugin";

  private static final String REPORT_LEAK_EVENT = "reportLeak";
  private static final String CLEAR_EVENT = "clear";
  private static final String LEAKS_KEY = "leaks";

  private FlipperConnection mConnection;

  private final List<String> leakList = new ArrayList<>();

  @Override
  public String getId() {
    return "LeakCanary";
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    mConnection = connection;
    sendLeakList();

    mConnection.receive(
        CLEAR_EVENT,
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
            leakList.clear();
          }
        });
  }

  @Override
  public void onDisconnect() throws Exception {
    mConnection = null;
  }

  @Override
  public boolean runInBackground() {
    return false;
  }

  private void sendLeakList() {
    if (mConnection != null) {
      JSONObject obj = new JSONObject();
      try {
        obj.put(LEAKS_KEY, new JSONArray(leakList));
        mConnection.send(REPORT_LEAK_EVENT, new FlipperObject(obj));
      } catch (JSONException e) {
        Log.w(TAG, "Failure to serialize leak list: ", e);
      }
    }
  }

  public void reportLeak(String leakInfo) {
    leakList.add(leakInfo);
    sendLeakList();
  }
}
