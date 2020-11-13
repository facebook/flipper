/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.tutorial

import android.app.Application
import com.facebook.drawee.backends.pipeline.Fresco
import com.facebook.flipper.android.AndroidFlipperClient
import com.facebook.flipper.plugins.fresco.FrescoFlipperPlugin
import com.facebook.flipper.plugins.inspector.DescriptorMapping
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin
import com.facebook.flipper.sample.tutorial.plugin.SeaMammalFlipperPlugin
import com.facebook.litho.config.ComponentsConfiguration
import com.facebook.litho.editor.flipper.LithoFlipperDescriptors
import com.facebook.soloader.SoLoader

class TutorialApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        SoLoader.init(this, false)
        Fresco.initialize(this)

        // Normally, you would want to make these dependent on BuildConfig.DEBUG.
        ComponentsConfiguration.isDebugModeEnabled = true
        ComponentsConfiguration.enableRenderInfoDebugging = true

        val flipperClient = AndroidFlipperClient.getInstance(this)
        val descriptorMapping = DescriptorMapping.withDefaults()
        LithoFlipperDescriptors.addWithSections(descriptorMapping)

        flipperClient.addPlugin(InspectorFlipperPlugin(this, descriptorMapping))
        flipperClient.addPlugin(FrescoFlipperPlugin())
        flipperClient.addPlugin(SeaMammalFlipperPlugin())
        flipperClient.start()
    }
}
