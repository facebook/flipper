/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.android;

import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import com.facebook.sonar.core.SonarClient;

public final class AndroidSonarClient {
  private static boolean sIsInitialized = false;
  private static SonarThread sSonarThread;

  public static synchronized SonarClient getInstance(Context context) {
    if (!sIsInitialized) {
      sSonarThread = new SonarThread();
      sSonarThread.start();

      final Context app = context.getApplicationContext();
      SonarClientImpl.init(
          sSonarThread.getEventBase(),
          getServerHost(app),
          "Android",
          getFriendlyDeviceName(),
          getId(),
          getRunningAppName(app),
          getPackageName(app),
          context.getFilesDir().getAbsolutePath());
      sIsInitialized = true;
    }
    return SonarClientImpl.getInstance();
  }

  static boolean isRunningOnGenymotion() {
    return Build.FINGERPRINT.contains("vbox");
  }

  static boolean isRunningOnStockEmulator() {
    return Build.FINGERPRINT.contains("generic") && !Build.FINGERPRINT.contains("vbox");
  }

  static String getId() {
    return Build.SERIAL;
  }

  static String getFriendlyDeviceName() {
    if (isRunningOnGenymotion()) {
      // Genymotion already has a friendly name by default
      return Build.MODEL;
    } else {
      return Build.MODEL + " - " + Build.VERSION.RELEASE + " - API " + Build.VERSION.SDK_INT;
    }
  }

  static String getServerHost(Context context) {
    if (isRunningOnStockEmulator()) {
      return "10.0.2.2";
    } else if (isRunningOnGenymotion()) {
      // This is hand-wavy but works on but ipv4 and ipv6 genymotion
      final WifiManager wifi = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
      final WifiInfo info = wifi.getConnectionInfo();
      final int ip = info.getIpAddress();
      return String.format("%d.%d.%d.2", (ip & 0xff), (ip >> 8 & 0xff), (ip >> 16 & 0xff));
    } else {
      // Running on physical device. Sonar desktop will run `adb reverse tcp:8088 tcp:8088`
      return "localhost";
    }
  }

  static String getRunningAppName(Context context) {
    return context.getApplicationInfo().loadLabel(context.getPackageManager()).toString();
  }

  static String getPackageName(Context context) {
    return context.getPackageName();
  }
}
