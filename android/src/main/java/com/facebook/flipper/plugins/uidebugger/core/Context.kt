/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import com.facebook.flipper.core.FlipperConnection
import com.facebook.flipper.plugins.uidebugger.PartialLayoutTraversal
import com.facebook.flipper.plugins.uidebugger.TreeObserverManager
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverFactory

data class Context(
    val applicationRef: ApplicationRef,
    val connectionRef: ConnectionRef,
    val descriptorRegister: DescriptorRegister,
    val observerFactory: TreeObserverFactory,
) {
  val layoutTraversal: PartialLayoutTraversal =
      PartialLayoutTraversal(descriptorRegister, observerFactory)

  val treeObserverManager = TreeObserverManager(this)
}

data class ConnectionRef(var connection: FlipperConnection?)
