/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.util

class StopWatch() {
  private var startTime: Long = 0

  fun start() {
    startTime = System.currentTimeMillis()
  }

  fun stop(): Long {
    return System.currentTimeMillis() - startTime
  }

  companion object {

    fun <T> time(fn: () -> T): Pair<T, Long> {

      val start = System.currentTimeMillis()
      val result = fn()
      val elapsed = System.currentTimeMillis() - start
      return Pair(result, elapsed)
    }

    suspend fun <T> timeSuspend(fn: suspend () -> T): Pair<T, Long> {
      val start = System.currentTimeMillis()
      val result = fn()
      val elapsed = System.currentTimeMillis() - start
      return Pair(result, elapsed)
    }
  }
}
