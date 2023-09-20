/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.flipper.plugins.uidebugger.util.Immediate
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred
import com.facebook.flipper.plugins.uidebugger.util.objectIdentity

data class WarningMessage(val message: String, val parentBounds: Bounds)

object WarningMessageDescriptor : NodeDescriptor<WarningMessage> {
  override fun getId(node: WarningMessage): Id = node.message.objectIdentity()

  override fun getBounds(node: WarningMessage): Bounds = node.parentBounds.copy(x = 0, y = 0)

  override fun getName(node: WarningMessage): String = node.message

  override fun getQualifiedName(node: WarningMessage): String = ""

  override fun getChildren(node: WarningMessage): List<Any> = listOf()

  override fun getActiveChild(node: WarningMessage): Any? = null

  override fun getAttributes(
      node: WarningMessage
  ): MaybeDeferred<Map<MetadataId, InspectableObject>> = Immediate(mapOf())

  override fun getTags(node: WarningMessage): Set<String> = setOf("Warning")
}
