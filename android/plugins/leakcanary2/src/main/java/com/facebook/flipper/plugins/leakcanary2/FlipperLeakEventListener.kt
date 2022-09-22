/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.leakcanary2

import com.facebook.flipper.android.AndroidFlipperClient
import leakcanary.EventListener
import shark.HeapAnalysis
import shark.HeapAnalysisSuccess

class FlipperLeakEventListener : EventListener {
  private val leaks: MutableList<Leak> = mutableListOf()

  override fun onEvent(event: EventListener.Event) {
    if (event is EventListener.Event.HeapAnalysisDone.HeapAnalysisSucceeded) {
      val heapAnalysis = event.heapAnalysis
      leaks.addAll(heapAnalysis.toLeakList())

      AndroidFlipperClient.getInstanceIfInitialized()?.let { client ->
        (client.getPlugin(LeakCanary2FlipperPlugin.ID) as? LeakCanary2FlipperPlugin)?.reportLeaks(
            leaks)
      }
    }
  }

  private fun HeapAnalysis.toLeakList(): List<Leak> {
    return if (this is HeapAnalysisSuccess) {
      allLeaks
          .mapNotNull {
            if (it.leakTraces.isNotEmpty()) {
              it.leakTraces[0].toLeak(it.shortDescription)
            } else {
              null
            }
          }
          .toList()
    } else {
      emptyList()
    }
  }
}
