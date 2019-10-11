/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample.tutorial.ui

import android.graphics.Typeface
import com.facebook.flipper.sample.tutorial.MarineMammal
import com.facebook.litho.Column
import com.facebook.litho.Component
import com.facebook.litho.ComponentContext
import com.facebook.litho.annotations.LayoutSpec
import com.facebook.litho.annotations.OnCreateLayout
import com.facebook.litho.annotations.Prop
import com.facebook.litho.widget.Text
import com.facebook.yoga.YogaEdge.BOTTOM
import com.facebook.yoga.YogaEdge.LEFT
import com.facebook.yoga.YogaEdge.HORIZONTAL
import com.facebook.yoga.YogaPositionType.ABSOLUTE

@LayoutSpec
object MarineMammelComponentSpec {
    @OnCreateLayout
    fun onCreateLayout(
            c: ComponentContext,
            @Prop mammal: MarineMammal
    ): Component =
            Column.create(c)
                    .child(SingleImageComponent.create(c)
                            .image(mammal.picture_url)
                            .build()
                    )
                    .child(
                            Text.create(c)
                                    .text(mammal.title)
                                    .textStyle(Typeface.BOLD)
                                    .textSizeDip(24f)
                                    .backgroundColor(0xDDFFFFFF.toInt())
                                    .positionType(ABSOLUTE)
                                    .positionDip(BOTTOM, 4f)
                                    .positionDip(LEFT, 4f)
                                    .paddingDip(HORIZONTAL, 6f))
                    .build()

}
