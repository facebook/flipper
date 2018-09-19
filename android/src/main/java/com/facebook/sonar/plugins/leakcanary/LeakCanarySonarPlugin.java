/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.flipper.plugins.leakcanary;

import android.util.Log;
import com.facebook.flipper.core.SonarConnection;
import com.facebook.flipper.core.SonarObject;
import com.facebook.flipper.core.SonarPlugin;
import com.facebook.flipper.core.SonarReceiver;
import com.facebook.flipper.core.SonarResponder;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class LeakCanarySonarPlugin implements SonarPlugin {

  private static final String TAG = "LeakCanarySonarPlugin";

  private static final String REPORT_LEAK_EVENT = "reportLeak";
  private static final String CLEAR_EVENT = "clear";
  private static final String LEAKS_KEY = "leaks";

  private SonarConnection mConnection;

  private final List<String> leakList = new ArrayList<>();

  @Override
  public String getId() {
    return "LeakCanary";
  }

  @Override
  public void onConnect(SonarConnection connection) {
    mConnection = connection;
    sendLeakList();

    mConnection.receive(
        CLEAR_EVENT,
        new SonarReceiver() {
          @Override
          public void onReceive(SonarObject params, SonarResponder responder) throws Exception {
            leakList.clear();
          }
        });
  }

  @Override
  public void onDisconnect() throws Exception {
    mConnection = null;
  }

  private void sendLeakList() {
    if (mConnection != null) {
      JSONObject obj = new JSONObject();
      try {
        obj.put(LEAKS_KEY, new JSONArray(leakList));
        mConnection.send(REPORT_LEAK_EVENT, new SonarObject(obj));
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
