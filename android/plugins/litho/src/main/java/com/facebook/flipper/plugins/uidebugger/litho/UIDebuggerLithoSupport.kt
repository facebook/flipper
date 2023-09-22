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
                DebugEvent.RenderUnitMounted,
                "Component was added into the view hierarchy (this doesn't mean it is visible)"),
            FrameworkEventMetadata(
                DebugEvent.RenderUnitUpdated,
                "The properties of a component's content were were rebinded"),
            FrameworkEventMetadata(
                DebugEvent.RenderUnitUnmounted, "Component was removed from the view hierarchy"),
            FrameworkEventMetadata(DebugEvent.RenderUnitOnVisible, "Component became visible"),
            FrameworkEventMetadata(DebugEvent.RenderUnitOnInvisible, "Component became invisible"),
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
            val source =
                event.attributeOrNull<String>(
                    "source") // todo replace magic strings with DebugEventAttribute.Source once
            // litho open source is released
            if (source != null) {
              attributes["source"] = source
            }
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

  private fun addDescriptors(register: DescriptorRegister) {
    register.register(LithoView::class.java, LithoViewDescriptor)
    register.register(DebugComponent::class.java, DebugComponentDescriptor(register))
    register.register(TextDrawable::class.java, TextDrawableDescriptor)
    register.register(MatrixDrawable::class.java, MatrixDrawableDescriptor)
    register.register(ComponentTree::class.java, ComponentTreeDescriptor(register))
  }
}
