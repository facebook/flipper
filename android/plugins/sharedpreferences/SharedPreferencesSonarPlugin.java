/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.sharedpreferences;

import static android.content.Context.MODE_PRIVATE;

import android.content.Context;
import android.content.SharedPreferences;
import com.facebook.sonar.core.SonarConnection;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.core.SonarPlugin;
import com.facebook.sonar.core.SonarReceiver;
import com.facebook.sonar.core.SonarResponder;
import java.util.Map;

public class SharedPreferencesSonarPlugin implements SonarPlugin {

  private SonarConnection mConnection;
  private final SharedPreferences mSharedPreferences;

  public SharedPreferencesSonarPlugin(Context context) {
    mSharedPreferences = context.getSharedPreferences(context.getPackageName(), MODE_PRIVATE);

    mSharedPreferences.registerOnSharedPreferenceChangeListener(
        new SharedPreferences.OnSharedPreferenceChangeListener() {
          @Override
          public void onSharedPreferenceChanged(SharedPreferences sharedPreferences, String key) {
            if (mConnection != null) {
              mConnection.send(
                  "sharedPreferencesChange",
                  new SonarObject.Builder()
                      .put("name", key)
                      .put("deleted", !mSharedPreferences.contains(key))
                      .put("time", System.currentTimeMillis())
                      .put("value", mSharedPreferences.getAll().get(key))
                      .build());
            }
          }
        });
  }

  @Override
  public String getId() {
    return "Preferences";
  }

  private SonarObject getSharedPreferencesObject() {
    final SonarObject.Builder builder = new SonarObject.Builder();
    final Map<String, ?> map = mSharedPreferences.getAll();

    for (Map.Entry<String, ?> entry : map.entrySet()) {
      final Object val = entry.getValue();
      builder.put(entry.getKey(), val);
    }

    return builder.build();
  }

  @Override
  public void onConnect(SonarConnection connection) {
    mConnection = connection;

    connection.receive(
        "getSharedPreferences",
        new SonarReceiver() {
          @Override
          public void onReceive(SonarObject params, SonarResponder responder) {
            responder.success(getSharedPreferencesObject());
          }
        });

    connection.receive(
        "setSharedPreference",
        new SonarReceiver() {
          @Override
          public void onReceive(SonarObject params, SonarResponder responder)
              throws IllegalArgumentException {

            String preferenceName = params.getString("preferenceName");
            Object originalValue = mSharedPreferences.getAll().get(preferenceName);
            SharedPreferences.Editor editor = mSharedPreferences.edit();

            if (originalValue instanceof Boolean) {
              editor.putBoolean(preferenceName, params.getBoolean("preferenceValue"));
            } else if (originalValue instanceof Long) {
              editor.putLong(preferenceName, params.getLong("preferenceValue"));
            } else if (originalValue instanceof Integer) {
              editor.putInt(preferenceName, params.getInt("preferenceValue"));
            } else if (originalValue instanceof Float) {
              editor.putFloat(preferenceName, params.getFloat("preferenceValue"));
            } else if (originalValue instanceof String) {
              editor.putString(preferenceName, params.getString("preferenceValue"));
            } else {
              throw new IllegalArgumentException("Type not supported: " + preferenceName);
            }

            editor.apply();

            responder.success(getSharedPreferencesObject());
          }
        });
  }

  @Override
  public void onDisconnect() {
    mConnection = null;
  }
}
