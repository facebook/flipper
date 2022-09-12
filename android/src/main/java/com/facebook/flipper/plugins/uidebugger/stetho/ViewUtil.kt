/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.stetho

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.View

object ViewUtil {
  fun tryGetActivity(view: View?): Activity? {
    if (view == null) {
      return null
    }
    val context = view.context
    val activityFromContext = tryGetActivity(context)
    if (activityFromContext != null) {
      return activityFromContext
    }
    val parent = view.parent
    if (parent is View) {
      val parentView = parent as View
      return tryGetActivity(parentView)
    }
    return null
  }

  private fun tryGetActivity(context: Context): Activity? {
    var ctx: Context? = context
    while (ctx != null) {
      ctx =
          when (ctx) {
            is Activity -> {
              return ctx
            }
            is ContextWrapper -> {
              ctx.baseContext
            }
            else -> {
              return null
            }
          }
    }
    return null
  }
}
