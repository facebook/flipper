/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android;

import android.os.StrictMode;
import android.util.Log;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;

class FlipperProps {

  private static final String FLIPPER_PORTS_PROP_NAME = "flipper.ports";
  private static final String FLIPPER_ALT_PORTS_PROP_NAME = "flipper.alt.ports";
  private static final int DEFAULT_INSECURE_PORT = 9089;
  private static final int DEFAULT_SECURE_PORT = 9088;
  private static final int DEFAULT_ALT_INSECURE_PORT = 9089;
  private static final int DEFAULT_ALT_SECURE_PORT = 9088;
  private static final String TAG = "Flipper";

  static int getInsecurePort() {
    String propValue = getFlipperDefaultPortsPropValue();
    return extractIntFromPropValue(propValue, 0, DEFAULT_INSECURE_PORT);
  }

  static int getSecurePort() {
    String propValue = getFlipperDefaultPortsPropValue();
    return extractIntFromPropValue(propValue, 1, DEFAULT_SECURE_PORT);
  }

  static int getAltInsecurePort() {
    String propValue = getFlipperDefaultAltPortsPropValue();
    return extractIntFromPropValue(propValue, 0, DEFAULT_ALT_INSECURE_PORT);
  }

  static int getAltSecurePort() {
    String propValue = getFlipperDefaultAltPortsPropValue();
    return extractIntFromPropValue(propValue, 1, DEFAULT_ALT_SECURE_PORT);
  }

  static int extractIntFromPropValue(String propValue, int index, int fallback) {
    if (propValue != null && !propValue.isEmpty()) {
      try {
        String[] values = propValue.split(",");
        if (values.length > index) {
          return Integer.parseInt(values[index]);
        }
      } catch (NumberFormatException e) {
        Log.e(TAG, "Failed to parse flipper ports value: " + propValue);
      }
    }
    return fallback;
  }

  private static String flipperPortsPropValue = null;

  private static synchronized String getFlipperDefaultPortsPropValue() {
    if (flipperPortsPropValue != null) {
      return flipperPortsPropValue;
    }
    flipperPortsPropValue = getFlipperPortsPropValue(FLIPPER_PORTS_PROP_NAME);
    return flipperPortsPropValue;
  }

  private static String flipperAltPortsPropValue = null;

  private static synchronized String getFlipperDefaultAltPortsPropValue() {
    if (flipperAltPortsPropValue != null) {
      return flipperAltPortsPropValue;
    }
    flipperAltPortsPropValue = getFlipperPortsPropValue(FLIPPER_ALT_PORTS_PROP_NAME);
    return flipperAltPortsPropValue;
  }

  private static synchronized String getFlipperPortsPropValue(String propsName) {
    String propValue = null;
    Process process = null;
    BufferedReader reader = null;

    // this function does not read from disk and this tool is for debug only
    StrictMode.ThreadPolicy oldPolicy = StrictMode.allowThreadDiskReads();
    try {
      process = Runtime.getRuntime().exec(new String[] {"/system/bin/getprop", propsName});
      reader =
          new BufferedReader(
              new InputStreamReader(process.getInputStream(), Charset.forName("UTF-8")));

      String lastLine = "";
      String line;
      while ((line = reader.readLine()) != null) {
        lastLine = line;
      }
      propValue = lastLine;
    } catch (IOException e) {
      Log.e(TAG, "Failed to query for flipper ports prop", e);
      propValue = "";
    } finally {
      try {
        if (reader != null) {
          reader.close();
        }
      } catch (IOException e) {
        Log.e(TAG, "Failed to close BufferedReader when reading flipper ports prop", e);
      }
      if (process != null) {
        process.destroy();
      }
      StrictMode.setThreadPolicy(oldPolicy);
    }
    return propValue;
  }
}
