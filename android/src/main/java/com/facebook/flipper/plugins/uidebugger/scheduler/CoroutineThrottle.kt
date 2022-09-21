/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.scheduler

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Throttle the execution of an executable for the specified interval.
 *
 * How does it work?
 *
 * The function `throttleLatest` returns a proxy for the given executable. This proxy captures the
 * latest argument/param that was used on the last invocation. If the throttle job does not exist or
 * has already completed, then create a new one.
 *
 * The job will wait on the waiting scope for the given amount of specified ms. Once it finishes
 * waiting, then it will execute the given executable on the main scope with the latest captured
 * param.
 */
fun <T> throttleLatest(
    intervalMs: Long,
    waitScope: CoroutineScope,
    mainScope: CoroutineScope,
    executable: (T) -> Unit
): (T) -> Unit {
  var throttleJob: Job? = null
  var latestParam: T
  return { param: T ->
    latestParam = param
    if (throttleJob == null || throttleJob?.isCompleted == true) {
      throttleJob =
          waitScope.launch {
            delay(intervalMs)
            mainScope.launch { executable(latestParam) }
          }
    }
  }
}
