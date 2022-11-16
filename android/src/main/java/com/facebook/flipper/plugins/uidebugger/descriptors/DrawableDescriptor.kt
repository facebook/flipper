/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.drawable.Drawable
import android.os.Build
import com.facebook.flipper.plugins.uidebugger.model.*

object DrawableDescriptor : ChainedDescriptor<Drawable>() {

  private const val NAMESPACE = "Drawable"
  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)
  private var AlphaAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "alpha")
  private var BoundsAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "bounds")

  override fun onGetName(node: Drawable): String = node.javaClass.simpleName

  override fun onGetBounds(node: Drawable): Bounds =
      Bounds(node.bounds.left, node.bounds.top, node.bounds.width(), node.bounds.height())

  override fun onGetData(
      node: Drawable,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
      val props = mutableMapOf<Int, Inspectable>()
      props[AlphaAttributeId] = InspectableValue.Number(node.alpha)

      val bounds = node.bounds
      props[BoundsAttributeId] = InspectableValue.Bounds(Bounds.fromRect(bounds))

      attributeSections[SectionId] = InspectableObject(props.toMap())
    }
  }

  override fun onGetTags(node: Drawable): Set<String> = BaseTags.NativeAndroid
}
