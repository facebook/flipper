/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android;

import android.util.Log;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;

class FlipperProps {

  private static final String FLIPPER_PORTS_PROP_NAME = "flipper.ports";
  private static final int DEFAULT_INSECURE_PORT = 8089;
  private static final int DEFAULT_SECURE_PORT = 8088;
  private static final String TAG = "Flipper";

  static int getInsecurePort() {
    String propValue = getFlipperPortsPropValue();
    return extractIntFromPropValue(propValue, 0, DEFAULT_INSECURE_PORT);
  }

  static int getSecurePort() {
    String propValue = getFlipperPortsPropValue();
    return extractIntFromPropValue(propValue, 1, DEFAULT_SECURE_PORT);
  }

  static int extractIntFromPropValue(String propValue, int index, int fallback) {
    if (propValue != null && !propValue.isEmpty()) {
      try {
        String[] values = propValue.split(",");
        if (values.length > index) {
          return Integer.parseInt(values[index]);
        }
      } catch (NumberFormatException e) {
        Log.e(TAG, "Failed to parse flipper.ports value: " + propValue);
      }
    }
    return fallback;
  }

  private static String flipperPortsPropValue = null;

  private static synchronized String getFlipperPortsPropValue() {
    if (flipperPortsPropValue != null) {
      return flipperPortsPropValue;
    }
    Process process = null;
    BufferedReader reader = null;
    try {
      process =
          Runtime.getRuntime().exec(new String[] {"/system/bin/getprop", FLIPPER_PORTS_PROP_NAME});
      reader =
          new BufferedReader(
              new InputStreamReader(process.getInputStream(), Charset.forName("UTF-8")));

      String lastLine = "";
      String line;
      while ((line = reader.readLine()) != null) {
        lastLine = line;
      }
      flipperPortsPropValue = lastLine;
    } catch (IOException e) {
      Log.e(TAG, "Failed to query for flipper.ports prop", e);
      flipperPortsPropValue = "";
    } finally {
      try {
        if (reader != null) {
          reader.close();
        }
      } catch (IOException e) {
        Log.e(TAG, "Failed to close BufferedReader when reading flipper.ports prop", e);
      }
      if (process != null) {
        process.destroy();
      }
    }
    return flipperPortsPropValue;
  }
}
