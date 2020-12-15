/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android.utils;

import android.app.ActivityManager;
import android.content.Context;
import com.facebook.flipper.BuildConfig;
import java.util.List;

public final class FlipperUtils {

  private FlipperUtils() {}

  public static boolean shouldEnableFlipper(final Context context) {
    return (BuildConfig.IS_INTERNAL_BUILD || BuildConfig.LOAD_FLIPPER_EXPLICIT)
        && !isEndToEndTest()
        && isMainProcess(context)
        // Flipper has issue with ASAN build. They cannot be concurrently enabled.
        && !BuildConfig.IS_ASAN_BUILD;
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

  private static boolean isMainProcess(final Context context) {
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
