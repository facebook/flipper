/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.flipper.plugins.sharedpreferences;

import static android.content.Context.MODE_PRIVATE;

import android.content.Context;
import android.content.SharedPreferences;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import java.util.Map;

public class SharedPreferencesSonarPlugin implements FlipperPlugin {

  private FlipperConnection mConnection;
  private final SharedPreferences mSharedPreferences;
  private final SharedPreferences.OnSharedPreferenceChangeListener
      onSharedPreferenceChangeListener =
          new SharedPreferences.OnSharedPreferenceChangeListener() {
            @Override
            public void onSharedPreferenceChanged(SharedPreferences sharedPreferences, String key) {
              if (mConnection == null) {
                return;
              }
              mConnection.send(
                  "sharedPreferencesChange",
                  new FlipperObject.Builder()
                      .put("name", key)
                      .put("deleted", !mSharedPreferences.contains(key))
                      .put("time", System.currentTimeMillis())
                      .put("value", mSharedPreferences.getAll().get(key))
                      .build());
            }
          };

  /**
   * Creates a {@link android.content.SharedPreferences} plugin for Sonar
   *
   * @param context The context to retrieve the file from. Will use the package name as the file
   *     name with {@link Context#MODE_PRIVATE}.
   */
  public SharedPreferencesSonarPlugin(Context context) {
    this(context, context.getPackageName());
  }

  /**
   * Creates a {@link android.content.SharedPreferences} plugin for Sonar
   *
   * @param context The context to retrieve the file from. Will use the name as the file name with
   *     {@link Context#MODE_PRIVATE}.
   * @param name The preference file name.
   */
  public SharedPreferencesSonarPlugin(Context context, String name) {
    this(context, name, MODE_PRIVATE);
  }

  /**
   * Creates a {@link android.content.SharedPreferences} plugin for Sonar
   *
   * @param context The context to retrieve the file from.
   * @param name The preference file name.
   * @param mode The Context mode to utilize.
   */
  public SharedPreferencesSonarPlugin(Context context, String name, int mode) {
    mSharedPreferences = context.getSharedPreferences(name, mode);
    mSharedPreferences.registerOnSharedPreferenceChangeListener(onSharedPreferenceChangeListener);
  }

  @Override
  public String getId() {
    return "Preferences";
  }

  private FlipperObject getSharedPreferencesObject() {
    final FlipperObject.Builder builder = new FlipperObject.Builder();
    final Map<String, ?> map = mSharedPreferences.getAll();

    for (Map.Entry<String, ?> entry : map.entrySet()) {
      final Object val = entry.getValue();
      builder.put(entry.getKey(), val);
    }

    return builder.build();
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    mConnection = connection;

    connection.receive(
        "getSharedPreferences",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) {
            responder.success(getSharedPreferencesObject());
          }
        });

    connection.receive(
        "setSharedPreference",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder)
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
