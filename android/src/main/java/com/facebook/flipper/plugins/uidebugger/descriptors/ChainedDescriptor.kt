/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import com.facebook.flipper.core.FlipperDynamic
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.BoxData
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.Metadata
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.flipper.plugins.uidebugger.util.Immediate
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * A chained descriptor is a special type of descriptor that models the inheritance hierarchy in
 * native UI frameworks. With this setup you can define a descriptor for each class in the
 * inheritance chain and given that we record the super class's descriptor we can automatically
 * aggregate the results for each descriptor in the inheritance hierarchy in a chain.
 *
 * The result is that each descriptor in the inheritance chain only exports the attributes that it
 * knows about but we still get all the attributes from the parent classes
 */
abstract class ChainedDescriptor<T> : NodeDescriptor<T> {
  private var mSuper: ChainedDescriptor<T>? = null

  override fun getId(node: T): Id = System.identityHashCode(node)

  fun setSuper(superDescriptor: ChainedDescriptor<T>) {
    if (superDescriptor !== mSuper) {
      check(mSuper == null)
      mSuper = superDescriptor
    }
  }

  fun getSuper(): ChainedDescriptor<T>? {
    return mSuper
  }

  final override fun getBoxData(node: T): BoxData? = onGetBoxData(node) ?: mSuper?.getBoxData(node)

  open fun onGetBoxData(node: T): BoxData? = null

  final override fun getActiveChild(node: T): Any? {
    // ask each descriptor in the chain for an active child, if none available look up the chain
    // until no more super descriptors
    return onGetActiveChild(node) ?: mSuper?.getActiveChild(node)
  }

  /**
   * The name used to identify this node in the inspector. Does not need to be unique. A good
   * default is to use the class name of the node.
   */
  final override fun getName(node: T): String {
    return onGetName(node)
  }

  final override fun getQualifiedName(node: T): String {
    node?.let { n ->
      return n::class.qualifiedName ?: ""
    }
    return ""
  }

  final override fun getTags(node: T): Set<String> {
    val tags = onGetTags(node) ?: mSuper?.getTags(node)
    return tags ?: setOf()
  }

  open fun onGetTags(node: T): Set<String>? = null

  open fun onGetActiveChild(node: T): Any? = null

  abstract fun onGetName(node: T): String

  final override fun getBounds(node: T): Bounds {
    val bounds = onGetBounds(node) ?: mSuper?.getBounds(node)
    return bounds ?: Bounds(0, 0, 0, 0)
  }

  open fun onGetBounds(node: T): Bounds? = null

  final override fun getHiddenAttributes(node: T): JsonObject? {

    val descriptors = mutableListOf<ChainedDescriptor<T>>()

    var curDescriptor: ChainedDescriptor<T>? = this

    while (curDescriptor != null) {
      descriptors.add(curDescriptor)
      curDescriptor = curDescriptor.mSuper
    }

    // reverse the list so that subclasses can override attributes of the base class if they wish to
    descriptors.reverse()
    val builder = mutableMapOf<String, JsonElement>()

    descriptors.forEach { it.onGetHiddenAttributes(node, builder) }

    return if (builder.isNotEmpty()) {
      JsonObject(builder)
    } else {
      null
    }
  }

  open fun onGetHiddenAttributes(node: T, attributes: MutableMap<String, JsonElement>) {}

  final override fun getChildren(node: T): List<Any> {
    val children = onGetChildren(node) ?: mSuper?.getChildren(node)
    return children ?: listOf()
  }

  open fun onGetChildren(node: T): List<Any>? = null

  final override fun getAttributes(node: T): MaybeDeferred<Map<MetadataId, InspectableObject>> {
    val builder = mutableMapOf<MetadataId, InspectableObject>()

    var curDescriptor: ChainedDescriptor<T>? = this

    while (curDescriptor != null) {
      curDescriptor.onGetAttributes(node, builder)
      curDescriptor = curDescriptor.mSuper
    }

    return Immediate(builder)
  }

  /**
   * Get the data to show for this node in the sidebar of the inspector. Each key will be a have its
   * own section
   */
  open fun onGetAttributes(node: T, attributeSections: MutableMap<MetadataId, InspectableObject>) {}

  final override fun getInlineAttributes(node: T): Map<String, String> {

    val builder = mutableMapOf<String, String>()

    var curDescriptor: ChainedDescriptor<T>? = this

    while (curDescriptor != null) {
      curDescriptor.onGetInlineAttributes(node, builder)
      curDescriptor = curDescriptor.mSuper
    }

    return builder
  }

  open fun onGetInlineAttributes(node: T, attributes: MutableMap<String, String>) {}

  final override fun editAttribute(
      node: T,
      metadataPath: List<Metadata>,
      value: FlipperDynamic,
      hint: CompoundTypeHint?
  ) {

    var curDescriptor: ChainedDescriptor<T>? = this

    while (curDescriptor != null) {
      curDescriptor.onEditAttribute(node, metadataPath, value, hint)
      curDescriptor = curDescriptor.mSuper
    }
  }

  open fun onEditAttribute(
      node: T,
      metadataPath: List<Metadata>,
      value: FlipperDynamic,
      hint: CompoundTypeHint?
  ) {}
}
