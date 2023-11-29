/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.tutorial.ui

import android.net.Uri
import com.facebook.fresco.vito.litho.FrescoVitoImage2
import com.facebook.litho.Component
import com.facebook.litho.ComponentContext
import com.facebook.litho.annotations.LayoutSpec
import com.facebook.litho.annotations.OnCreateLayout
import com.facebook.litho.annotations.Prop
import com.facebook.litho.annotations.PropDefault

@LayoutSpec
object SingleImageComponentSpec {

  @get:PropDefault val imageAspectRatio = 1f

  @OnCreateLayout
  fun onCreateLayout(
      c: ComponentContext,
      @Prop image: Uri,
      @Prop(optional = true) imageAspectRatio: Float
  ): Component = FrescoVitoImage2.create(c).uri(image).imageAspectRatio(imageAspectRatio).build()
}
