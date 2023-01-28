/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.scheduler

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * The class makes the following guarantees
 * 1. All registered callbacks will be called on the same frame at the same time
 * 2. The callbacks will never be called more often than the min interval
 * 3. If it has been > min interval since the callbacks was last called we will call the callbacks
 *    immediately
 * 4. If an event comes in within the min interval of the last firing we will schedule another
 *    firing at the next possible moment
 *
 * The reason we need this is because with an independent throttle per observer you end up with
 * updates occurring across different frames,
 *
 * WARNING: Not thread safe, should only be called on main thread. Also It is important to
 * deregister to avoid leaks
 */
class SharedThrottle(
    private val executionScope: CoroutineScope = CoroutineScope(Dispatchers.Main)
) {

  private var job: Job? = null
  private val callbacks = mutableMapOf<Int, () -> Unit>()
  private var latestInvocationId: Long = 0

  fun registerCallback(id: Int, callback: () -> Unit) {
    callbacks[id] = callback
  }

  fun deregisterCallback(id: Int) {
    callbacks.remove(id)
  }

  fun trigger() {
    latestInvocationId += 1

    if (job == null || job?.isCompleted == true) {
      job =
          executionScope.launch {
            var i = 0
            do {
              val thisInvocationId = latestInvocationId

              callbacks.values.toList().forEach { callback -> callback() }

              val delayTime = exponentialBackOff(base = 250, exp = 1.5, max = 1000, i = i).toLong()
              delay(delayTime)
              i++

              // if we haven't received an call since we executed break out and let a new job be
              // created which, otherwise we loop which executes again at the next appropriate time
              // since we have already waited
            } while (thisInvocationId != latestInvocationId)
          }
    }
  }

  private fun exponentialBackOff(base: Long, exp: Double, max: Long, i: Int): Double {
    return Math.min(base * Math.pow(exp, i.toDouble()), max.toDouble())
  }
}
