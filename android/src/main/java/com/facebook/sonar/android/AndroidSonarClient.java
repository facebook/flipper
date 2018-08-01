/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.android;

import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.support.v4.content.ContextCompat;
import android.util.Log;
import com.facebook.sonar.core.SonarClient;

public final class AndroidSonarClient {
  private static boolean sIsInitialized = false;
  private static SonarThread sSonarThread;
  private static SonarThread sConnectionThread;
  private static final String[] REQUIRED_PERMISSIONS =
      new String[] {"android.permission.INTERNET", "android.permission.ACCESS_WIFI_STATE"};

  public static synchronized SonarClient getInstance(Context context) {
    if (!sIsInitialized) {
      checkRequiredPermissions(context);
      sSonarThread = new SonarThread("SonarEventBaseThread");
      sSonarThread.start();
      sConnectionThread = new SonarThread("SonarConnectionThread");
      sConnectionThread.start();

      final Context app =
          context.getApplicationContext() == null ? context : context.getApplicationContext();
      SonarClientImpl.init(
          sSonarThread.getEventBase(),
          sConnectionThread.getEventBase(),
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

  static void checkRequiredPermissions(Context context) {
    // Don't terminate for compatibility reasons. Not all apps have ACCESS_WIFI_STATE permission.
    for (String permission : REQUIRED_PERMISSIONS) {
      if (ContextCompat.checkSelfPermission(context, permission)
          == PackageManager.PERMISSION_DENIED) {
        Log.e("Sonar", String.format("App needs permission \"%s\" to work with sonar", permission));
      }
    }
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
