package com.facebook.flipper.plugins.leakcanary2

import com.facebook.flipper.android.AndroidFlipperClient
import leakcanary.DefaultOnHeapAnalyzedListener
import leakcanary.OnHeapAnalyzedListener
import shark.HeapAnalysis
import shark.HeapAnalysisSuccess

class FlipperLeakListener : OnHeapAnalyzedListener {
    private val leaks: MutableList<Leak> = mutableListOf()

    private val defaultListener = DefaultOnHeapAnalyzedListener.create()

    override fun onHeapAnalyzed(heapAnalysis: HeapAnalysis) {
        leaks.addAll(heapAnalysis.toLeakList())

        AndroidFlipperClient.getInstanceIfInitialized()?.let { client ->
            (client.getPlugin(LeakCanary2FlipperPlugin.ID) as? LeakCanary2FlipperPlugin)
                ?.reportLeaks(leaks)
        }

        defaultListener.onHeapAnalyzed(heapAnalysis)
    }

    private fun HeapAnalysis.toLeakList(): List<Leak> {
        return if (this is HeapAnalysisSuccess) {
            allLeaks.mapNotNull {
                if (it.leakTraces.isNotEmpty()) {
                    it.leakTraces[0].toLeak(it.shortDescription)
                } else {
                    null
                }
            }.toList()
        } else {
            emptyList()
        }
    }
}
