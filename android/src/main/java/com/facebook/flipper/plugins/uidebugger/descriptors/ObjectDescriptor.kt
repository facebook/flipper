/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.Bitmap
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.MetadataId

object ObjectDescriptor : NodeDescriptor<Any> {

  override fun getActiveChild(node: Any): Any? = null

  override fun getName(node: Any): String {
    return node.javaClass.simpleName
  }

  override fun getChildren(node: Any) = listOf<Any>()

  override fun getData(node: Any) = mutableMapOf<MetadataId, InspectableObject>()

  override fun getBounds(node: Any): Bounds? = null

  override fun getTags(node: Any): Set<String> = setOf(BaseTags.Unknown)

  override fun getSnapshot(node: Any, bitmap: Bitmap?): Bitmap? = null
}
