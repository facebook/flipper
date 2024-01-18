/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import com.facebook.flipper.plugins.uidebugger.core.ConnectionListener
import com.facebook.flipper.plugins.uidebugger.core.UIDContext
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.litho.descriptors.*
import com.facebook.flipper.plugins.uidebugger.model.FrameworkEvent
import com.facebook.flipper.plugins.uidebugger.model.FrameworkEventMetadata
import com.facebook.litho.ComponentTree
import com.facebook.litho.DebugComponent
import com.facebook.litho.LithoView
import com.facebook.litho.MatrixDrawable
import com.facebook.litho.debug.LithoDebugEvent
import com.facebook.litho.widget.TextDrawable
import com.facebook.rendercore.debug.DebugEvent
import com.facebook.rendercore.debug.DebugEventBus
import com.facebook.rendercore.debug.DebugEventSubscriber
import com.facebook.rendercore.debug.DebugMarkerEvent
import com.facebook.rendercore.debug.DebugProcessEvent
import com.facebook.rendercore.debug.Duration

const val LithoTag = "Litho"
const val LithoMountableTag = "LithoMountable"

object UIDebuggerLithoSupport {

  fun enable(context: UIDContext) {
    addDescriptors(context.descriptorRegister)

    val eventMeta =
        listOf(
            // Litho
            FrameworkEventMetadata(
                LithoDebugEvent.StateUpdateEnqueued,
                "Set state was called, this will trigger resolve and then possibly layout and mount"),
            FrameworkEventMetadata(
                LithoDebugEvent.RenderRequest,
                "A request to render the component tree again. It can be requested due to 1) set root 2) state update 3) size change or measurement"),
            FrameworkEventMetadata(
                LithoDebugEvent.ComponentTreeResolve,
                "ComponentTree resolved the hierarchy into a LayoutState, non layout nodes are removed, see attributes for source of execution"),
            FrameworkEventMetadata(
                LithoDebugEvent.LayoutCommitted,
                "A new layout state created (resolved and measured result) being committed; this layout state could get mounted next."),

            // RenderCore

            FrameworkEventMetadata(
                DebugEvent.RenderTreeMounted, "The mount phase for the entire render tree"),
            FrameworkEventMetadata(
                "RenderCore.RenderTreeMount.Start",
                "The process to mount an entire render tree has started"),
            FrameworkEventMetadata(
                "RenderCore.RenderTreeMount.End",
                "The process to mount an entire render tree has ended"),
            FrameworkEventMetadata(
                DebugEvent.RenderUnitMounted,
                "Component was added into the view hierarchy (this doesn't mean it is visible)"),
            FrameworkEventMetadata(
                DebugEvent.RenderUnitUpdated,
                "The properties of a component's content were were rebinded"),
            FrameworkEventMetadata(
                DebugEvent.RenderUnitUnmounted, "Component was removed from the view hierarchy"),
            FrameworkEventMetadata(DebugEvent.RenderUnitOnVisible, "Component became visible"),
            FrameworkEventMetadata(DebugEvent.RenderUnitOnInvisible, "Component became invisible"),
            // TODO: Replace once a new Litho-OSS is released.
            FrameworkEventMetadata(
                "RenderCore.IncrementalMount.Start", "Incremental mount process starts"),
            FrameworkEventMetadata(
                "RenderCore.IncrementalMount.End", "Incremental mount process ends."),
        )

    val eventForwarder =
        object : DebugEventSubscriber(*eventMeta.map { it.type }.toTypedArray()) {
          override fun onEvent(event: DebugEvent) {
            val timestamp =
                when (event) {
                  is DebugMarkerEvent -> event.timestamp
                  is DebugProcessEvent -> event.timestamp
                }
            val treeId = event.renderStateId.toIntOrNull() ?: -1

            val globalKey =
                event.attributeOrNull<String>("key")?.let {
                  DebugComponent.generateGlobalKey(treeId, it).hashCode()
                }
            val duration = event.attributeOrNull<Duration>("duration")

            val attributes = mutableMapOf<String, String>()
            putAttributeInMap(event, attributes, "source")
            putAttributeInMap(event, attributes, "visibleRect")
            putAttributeInMap(event, attributes, "async")
            putAttributeInMap(event, attributes, "attribution")
            putAttributeInMap(event, attributes, "areBoundsVisible")
            putAttributeInMap(event, attributes, "numMountableOutputs")
            putAttributeInMap(event, attributes, "numItemsMounted")
            putAttributeInMap(event, attributes, "numItemsUnmounted")

            context.addFrameworkEvent(
                FrameworkEvent(
                    treeId,
                    globalKey ?: treeId,
                    event.type,
                    timestamp,
                    duration?.value,
                    event.threadName,
                    attributes))
          }
        }

    context.connectionListeners.add(
        object : ConnectionListener {
          override fun onConnect() {
            DebugEventBus.subscribe(eventForwarder)
          }

          override fun onDisconnect() {
            DebugEventBus.unsubscribe(eventForwarder)
          }
        })

    context.frameworkEventMetadata.addAll(eventMeta)
  }

  private fun putAttributeInMap(
      event: DebugEvent,
      attributes: MutableMap<String, String>,
      attributeName: String
  ) {
    event.attributeOrNull<Any?>(attributeName)?.let { attributes[attributeName] = it.toString() }
  }

  private fun addDescriptors(register: DescriptorRegister) {
    register.register(LithoView::class.java, LithoViewDescriptor)
    register.register(DebugComponent::class.java, DebugComponentDescriptor(register))
    register.register(TextDrawable::class.java, TextDrawableDescriptor)
    register.register(MatrixDrawable::class.java, MatrixDrawableDescriptor)
    register.register(ComponentTree::class.java, ComponentTreeDescriptor(register))
  }
}
