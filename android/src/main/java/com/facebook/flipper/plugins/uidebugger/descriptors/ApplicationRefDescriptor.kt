/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Activity
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef

object ApplicationRefDescriptor : AbstractChainedDescriptor<ApplicationRef>() {

  override fun onGetActiveChild(node: ApplicationRef): Any? {
    return if (node.activitiesStack.isNotEmpty()) node.activitiesStack.last() else null
  }

  override fun onGetId(node: ApplicationRef): String {
    return node.application.packageName
  }

  override fun onGetName(node: ApplicationRef): String {
    val applicationInfo = node.application.applicationInfo
    val stringId = applicationInfo.labelRes
    return if (stringId == 0) applicationInfo.nonLocalizedLabel.toString()
    else node.application.getString(stringId)
  }

  override fun onGetChildren(node: ApplicationRef, children: MutableList<Any>) {
    for (activity: Activity in node.activitiesStack) {
      children.add(activity)
    }
  }
}
