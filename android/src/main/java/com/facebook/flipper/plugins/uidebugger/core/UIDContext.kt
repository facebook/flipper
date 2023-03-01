/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.app.Application
import com.facebook.flipper.core.FlipperConnection
import com.facebook.flipper.plugins.uidebugger.common.BitmapPool
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.model.FrameworkEventMetadata
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverFactory
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverManager
import com.facebook.flipper.plugins.uidebugger.scheduler.SharedThrottle
import com.facebook.flipper.plugins.uidebugger.traversal.PartialLayoutTraversal

data class UIDContext(
    val applicationRef: ApplicationRef,
    val connectionRef: ConnectionRef,
    val descriptorRegister: DescriptorRegister,
    val observerFactory: TreeObserverFactory,
    val frameworkEventMetadata: MutableList<FrameworkEventMetadata>
) {
  val layoutTraversal: PartialLayoutTraversal =
      PartialLayoutTraversal(descriptorRegister, observerFactory)

  val treeObserverManager = TreeObserverManager(this)
  val sharedThrottle: SharedThrottle = SharedThrottle()
  val bitmapPool = BitmapPool()

  companion object {
    fun create(application: Application): UIDContext {
      return UIDContext(
          ApplicationRef(application),
          ConnectionRef(null),
          descriptorRegister = DescriptorRegister.withDefaults(),
          observerFactory = TreeObserverFactory.withDefaults(),
          frameworkEventMetadata = mutableListOf())
    }
  }
}

data class ConnectionRef(var connection: FlipperConnection?)
