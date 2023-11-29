/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.util

import android.os.Build
import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag

object WindowManagerCommon {

  // provides access to
  // https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/core/java/android/view/WindowManagerGlobal.java
  fun getGlobalWindowManager(): Pair<Any, Class<*>>? {
    val accessClass =
        if (Build.VERSION.SDK_INT > 16) WINDOW_MANAGER_GLOBAL_CLAZZ else WINDOW_MANAGER_IMPL_CLAZZ
    val instanceMethod = if (Build.VERSION.SDK_INT > 16) GET_GLOBAL_INSTANCE else GET_DEFAULT_IMPL

    try {
      val clazz = Class.forName(accessClass)
      val getMethod = clazz.getMethod(instanceMethod)
      return Pair(getMethod.invoke(null), clazz)
    } catch (exception: Exception) {
      Log.e(LogTag, "Unable to get global window manager handle", exception)
      return null
    }
  }

  private const val GET_DEFAULT_IMPL = "getDefault"
  private const val GET_GLOBAL_INSTANCE = "getInstance"
  private const val WINDOW_MANAGER_IMPL_CLAZZ = "android.view.WindowManagerImpl"
  private const val WINDOW_MANAGER_GLOBAL_CLAZZ = "android.view.WindowManagerGlobal"
}
