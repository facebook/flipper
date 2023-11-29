/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.util

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * This class will throttle calls into a callback. E.g if interval is 500ms and you receive triggers
 * at t=0, 100, 300 400, the callback will only be triggered at t=500
 */
class Throttler<T>(private val intervalMs: Long, val callback: suspend () -> T) {

  private val executionScope: CoroutineScope = CoroutineScope(Dispatchers.Main)
  private var throttleJob: Job? = null

  fun trigger() {
    if (throttleJob == null || throttleJob?.isCompleted == true) {
      throttleJob =
          executionScope.launch {
            delay(intervalMs)
            executionScope.launch { callback() }
          }
    }
  }
}
