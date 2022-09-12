/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import com.facebook.flipper.plugins.uidebugger.TreeObserver
import com.facebook.flipper.plugins.uidebugger.core.Context

interface TreeObserverBuilder<T> {

  fun canBuildFor(node: Any): Boolean
  fun build(context: Context): TreeObserver<T>
}

class TreeObserverFactory() {

  private val builders = mutableListOf<TreeObserverBuilder<*>>()

  fun <T> register(builder: TreeObserverBuilder<T>) {
    builders.add(builder)
  }

  fun hasObserverFor(node: Any): Boolean {
    return builders.any { it.canBuildFor(node) }
  }

  fun createObserver(node: Any, context: Context): TreeObserver<*>? {
    return builders.find { it.canBuildFor(node) }?.build(context)
  }

  companion object {
    fun withDefaults(): TreeObserverFactory {
      val factory = TreeObserverFactory()
      factory.register(DecorViewTreeObserverBuilder)

      return factory
    }
  }
}
