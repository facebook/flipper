/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.util

/**
 * This abstracts over a value which could be available immediately or calculated later. The use
 * case is for shifting computation to a background thread.
 */
abstract class MaybeDeferred<T> {
  abstract fun value(): T

  /** similar to map on an Option or Functor in a functional language. */
  abstract fun <U> map(fn: (T) -> U): MaybeDeferred<U>
}

class Immediate<T>(private val value: T) : MaybeDeferred<T>() {
  override fun value(): T = value

  override fun <U> map(fn: (T) -> U): MaybeDeferred<U> = Immediate(fn(value))
}

class Deferred<T>(private val lazyLoader: () -> T) : MaybeDeferred<T>() {
  override fun value(): T = lazyLoader()
  override fun <U> map(fn: (T) -> U): MaybeDeferred<U> {
    return Deferred { fn(lazyLoader()) }
  }
}
