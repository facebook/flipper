/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import com.facebook.flipper.core.FlipperDynamic
import com.facebook.flipper.plugins.uidebugger.descriptors.CompoundTypeHint
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

class EditValueException(message: String) : Exception(message)

class AttributeEditor(
    private val applicationRef: ApplicationRef,
    private val descriptorRegister: DescriptorRegister
) {

  private val mainScope: CoroutineScope = CoroutineScope(Dispatchers.Main)

  fun editValue(
      nodeId: Id,
      metadataIds: List<MetadataId>,
      value: FlipperDynamic,
      compoundTypeHint: CompoundTypeHint?
  ) {

    runBlocking(mainScope.coroutineContext) {
      val targetNode = findTargetNode(nodeId)
      if (targetNode == null) {
        throw EditValueException("Could not find target node ${nodeId}")
      }

      val metadataPath =
          metadataIds.map {
            MetadataRegister.get(it)
                ?: throw EditValueException("Metadata ${it} could not be found")
          }

      val descriptor = descriptorRegister.descriptorForClassUnsafe(targetNode.javaClass)
      descriptor.editAttribute(targetNode, metadataPath, value, compoundTypeHint)
    }
  }

  private fun findTargetNode(nodeId: Id): Any? {

    val stack = mutableListOf<Any>(applicationRef)
    while (stack.isNotEmpty()) {
      val curNode = stack.removeLast()
      val curDescriptor = descriptorRegister.descriptorForClassUnsafe(curNode.javaClass)
      if (curDescriptor.getId(curNode) == nodeId) {
        return curNode
      }

      stack.addAll(curDescriptor.getChildren(curNode))
    }

    return null
  }
}
