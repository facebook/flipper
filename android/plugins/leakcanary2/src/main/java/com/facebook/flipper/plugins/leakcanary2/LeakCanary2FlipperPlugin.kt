package com.facebook.flipper.plugins.leakcanary2

import com.facebook.flipper.core.FlipperConnection
import com.facebook.flipper.core.FlipperPlugin

private const val REPORT_LEAK_EVENT = "reportLeak2"
private const val CLEAR_EVENT = "clear"

class LeakCanary2FlipperPlugin : FlipperPlugin {
    private val leaks: MutableList<Leak> = mutableListOf()
    private val alreadySeenLeakSignatures: MutableSet<String> = mutableSetOf()
    private var connection: FlipperConnection? = null

    override fun getId() = ID

    override fun onConnect(connection: FlipperConnection?) {
        this.connection = connection
        connection?.receive(CLEAR_EVENT) { _, _ -> leaks.clear() }
        sendLeakList()
    }

    override fun onDisconnect() {
        connection = null
    }

    override fun runInBackground() = false

    internal fun reportLeaks(leaks: List<Leak>) {
        for (leak in leaks) {
            if (leak.signature !in alreadySeenLeakSignatures) {
                this.leaks.add(leak)
                alreadySeenLeakSignatures.add(leak.signature)
            }
        }

        sendLeakList()
    }

    private fun sendLeakList() {
        connection?.send(REPORT_LEAK_EVENT, LeakCanary2Report(leaks).toFlipperObject())
    }

    companion object {
        const val ID = "LeakCanary"
    }
}
