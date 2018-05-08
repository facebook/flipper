/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.android.utils;

import android.app.ActivityManager;
import android.content.Context;
import com.facebook.sonar.BuildConfig;
import java.util.List;

public final class SonarUtils {

  private SonarUtils() {}

  public static boolean shouldEnableSonar(Context context) {
    return BuildConfig.IS_INTERNAL_BUILD && !isEndToEndTest() && isMainProcess(context);
  }

  private static boolean isEndToEndTest() {
    final String value = System.getenv("BUDDY_SONAR_DISABLED");
    if (value == null || value.length() == 0) {
      return false;
    }

    try {
      return Boolean.parseBoolean(value);
    } catch (NumberFormatException e) {
      return false;
    }
  }

  private static boolean isMainProcess(Context context) {
    final int pid = android.os.Process.myPid();
    final ActivityManager manager =
        (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
    final List<ActivityManager.RunningAppProcessInfo> infoList = manager.getRunningAppProcesses();

    String processName = null;
    if (infoList != null) {
      for (ActivityManager.RunningAppProcessInfo info : infoList) {
        if (info.pid == pid) {
          processName = info.processName;
          break;
        }
      }
    }

    return context.getPackageName().equals(processName);
  }
}
