/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.annotation.SuppressLint
import android.util.Log
import android.view.Surface
import android.view.View
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.util.WindowManagerCommon
import java.lang.reflect.Field

/**
 * This class is related to root view resolver, it also accesses parts of the global window manager
 */
class WindowManagerUtility {

  private var initialized = false

  // type is RootViewImpl
  private var rootsImpls: ArrayList<*>? = null
  private var mSurfaceField: Field? = null
  private var mViewField: Field? = null

  /**
   * Find the surface for a given root view to allow snapshotting with pixelcopy. In the window
   * manager there exists 2 arrays that contain similar data
   * 1. mViews (this is what we track in the observable array in the root view resolver), these are
   *    the root decor views
   * 2. mRoots - this is an internal class that holds a reference to the decor view as well as other
   *    internal bits (including the surface).
   *
   *    Therefore we go through the roots and check for a view that matches the target, if it
   *    matches we return the surface. It is possible for us to observe these 2 arrays slightly out
   *    of sync with each other which is why we do this equality matching on the view field
   *
   *    The reason we do this and not just grab the last view is because sometimes there is a
   *    'empty' root view at the top we need to ignore. The decision to decide which view to
   *    snapshot is done else where as it needs to be synced with the observation and traversal
   */
  fun surfaceForRootView(rootView: View): Surface? {
    if (!initialized) {
      initialize()
    }

    val roots = rootsImpls ?: return null
    for (i in roots.size - 1 downTo 0) {
      val rootViewImpl = roots[i]
      val view = mViewField?.get(rootViewImpl)
      if (view == rootView) {
        return mSurfaceField?.get(rootViewImpl) as? Surface
      }
    }

    return null
  }

  @SuppressLint("PrivateApi")
  private fun initialize() {

    try {
      val (windowManager, windowManagerClass) =
          WindowManagerCommon.getGlobalWindowManager() ?: return

      val rootsField: Field = windowManagerClass.getDeclaredField(ROOTS_FIELD)
      rootsField.isAccessible = true
      rootsImpls = rootsField.get(windowManager) as ArrayList<*>?

      val rootViewImplClass = Class.forName(VIEW_ROOT_IMPL_CLAZZ)
      mSurfaceField = rootViewImplClass.getDeclaredField(SURFACE_FIELD)
      mSurfaceField?.isAccessible = true

      mViewField = rootViewImplClass.getDeclaredField(VIEW_FIELD)
      mViewField?.isAccessible = true

      initialized = true
    } catch (exception: Exception) {
      Log.e(LogTag, "Failed to initialize WindowManagerUtility", exception)
    }
  }

  companion object {
    private const val VIEW_ROOT_IMPL_CLAZZ = "android.view.ViewRootImpl"
    private const val SURFACE_FIELD = "mSurface"
    private const val VIEW_FIELD = "mView"
    private const val ROOTS_FIELD = "mRoots"
  }
}
