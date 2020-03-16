/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.tutorial.plugin

import com.facebook.flipper.core.FlipperConnection
import com.facebook.flipper.core.FlipperObject
import com.facebook.flipper.core.FlipperPlugin
import com.facebook.flipper.sample.tutorial.MarineMammals

class SeaMammalFlipperPlugin : FlipperPlugin {
    private var connection: FlipperConnection? = null

    override fun getId(): String = "sea-mammals"

    override fun onConnect(connection: FlipperConnection?) {
        this.connection = connection

        MarineMammals.list.mapIndexed { index, (title, picture_url) ->
            FlipperObject.Builder()
                    .put("id", index)
                    .put("title", title)
                    .put("url", picture_url).build()
        }.forEach(this::newRow)
    }

    override fun onDisconnect() {
        connection = null
    }

    override fun runInBackground(): Boolean = true

    private fun newRow(row: FlipperObject) {
        connection?.send("newRow", row)
    }
}
