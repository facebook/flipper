/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import com.facebook.flipper.plugins.uidebugger.core.UIDContext

interface TreeObserverBuilder<T> {
  fun canBuildFor(node: Any): Boolean
  fun build(context: UIDContext): TreeObserver<T>
}

class TreeObserverFactory {

  private val builders = mutableListOf<TreeObserverBuilder<*>>()

  fun <T> register(builder: TreeObserverBuilder<T>) {
    builders.add(builder)
  }

  // TODO: Not very efficient, need to cache this. Builders cannot be removed
  fun hasObserverFor(node: Any): Boolean {
    return builders.any { it.canBuildFor(node) }
  }

  // TODO: Not very efficient, need to cache this. Builders cannot be removed.
  fun createObserver(node: Any, context: UIDContext): TreeObserver<*>? {
    return builders.find { it.canBuildFor(node) }?.build(context)
  }

  companion object {
    fun withDefaults(): TreeObserverFactory {
      val factory = TreeObserverFactory()
      // TODO: Only builder for DecorView, maybe more are needed.
      factory.register(DecorViewTreeObserverBuilder)

      return factory
    }
  }
}
