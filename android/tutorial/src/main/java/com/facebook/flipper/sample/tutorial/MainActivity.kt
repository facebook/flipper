/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.tutorial

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.facebook.flipper.sample.tutorial.ui.RootComponent
import com.facebook.litho.LithoView
import com.facebook.litho.sections.SectionContext

class MainActivity : AppCompatActivity() {

  private val sectionContext: SectionContext by lazy { SectionContext(this) }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    setContentView(LithoView.create(this, RootComponent.create(sectionContext).build()))
  }
}
